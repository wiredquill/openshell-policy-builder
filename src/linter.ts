import type {
  Policy,
  Endpoint,
  NetworkMiddleware,
} from './schema.js';
import { ALLOWED_TOP_LEVEL } from './schema.js';

export type LintLevel = 'error' | 'warning';
export interface LintResult {
  level: LintLevel;
  code: string;
  message: string;
  path: string;
}

const MAX_POLICY_BYTES = 4 * 1024 * 1024; // 4 MiB
const MAX_PATHS = 256;
const MAX_MIDDLEWARES = 10;
const MAX_HOST_PATTERNS = 32;
const MIN_WILDCARD_LABELS = 3;
const MAX_UID = 4294967294;

function err(code: string, message: string, path: string): LintResult {
  return { level: 'error', code, message, path };
}

function isAbsolute(p: string): boolean {
  return p.startsWith('/');
}

function countLabels(host: string): number {
  return host.split('.').filter((s) => s.length > 0).length;
}

function hasWildcard(host: string): boolean {
  return host.includes('*');
}

function endpointHasRequestFields(e: Endpoint): boolean {
  return Boolean(
    e.access || e.rules || e.deny_rules || e.path || e.allow_encoded_slash ||
    e.credential_binding || e.request_body_credential_rewrite ||
    e.websocket_credential_rewrite || e.allow_uninspected_credentials ||
    e.credential_signing || e.signing_service || e.signing_region ||
    e.mcp || e.json_rpc || e.persisted_queries || e.graphql_persisted_queries ||
    e.graphql_max_body_bytes,
  );
}

/** Lint a Policy object against the OpenShell v0.1.5 schema constraints. */
export function lint(policy: Policy): LintResult[] {
  const out: LintResult[] = [];

  // Unknown top-level fields
  for (const key of Object.keys(policy)) {
    if (!ALLOWED_TOP_LEVEL.has(key as keyof Policy)) {
      out.push(err('unknown-field', `Unknown top-level field "${key}"`, key));
    }
  }

  // filesystem_policy
  const fs = policy.filesystem_policy;
  if (fs) {
    let count = 0;
    for (const list of [fs.read_only ?? [], fs.read_write ?? []]) {
      for (const p of list) {
        count++;
        if (!isAbsolute(p)) out.push(err('path-not-absolute', `Path "${p}" must be absolute`, 'filesystem_policy'));
        if (p.includes('..')) out.push(err('path-dotdot', `Path "${p}" must not contain ..`, 'filesystem_policy'));
      }
    }
    for (const p of fs.read_write ?? []) {
      if (p === '/') out.push(err('read-write-root', `read_write cannot contain "/"`, 'filesystem_policy.read_write'));
    }
    if (count > MAX_PATHS) out.push(err('too-many-paths', `Policy lists ${count} paths; max ${MAX_PATHS}`, 'filesystem_policy'));
  }

  // process
  const proc = policy.process;
  if (proc) {
    for (const field of ['run_as_user', 'run_as_group'] as const) {
      const v = proc[field];
      if (v === undefined) continue;
      if (v === 'sandbox') continue;
      const n = Number(v);
      if (!Number.isInteger(n) || String(v).trim() === '') {
        out.push(err('uid-invalid', `${field} must be "sandbox" or a numeric UID, got "${v}"`, `process.${field}`));
        continue;
      }
      if (n === 0) out.push(err('root-uid', `${field} must not be root (0)`, `process.${field}`));
      else if (n < 1 || n > MAX_UID) out.push(err('uid-out-of-range', `${field} ${n} out of range 1..${MAX_UID}`, `process.${field}`));
    }
  }

  // network_policies
  const nps = policy.network_policies;
  if (nps) {
    for (const [key, rule] of Object.entries(nps)) {
      const base = `network_policies.${key}`;
      if (key.startsWith('_provider_')) out.push(err('reserved-key-prefix', `Rule key "${key}" cannot start with _provider_`, base));
      for (let i = 0; i < rule.endpoints.length; i++) {
        const e = rule.endpoints[i];
        const ep = `${base}.endpoints[${i}]`;
        if (e.port !== undefined && e.ports !== undefined) {
          out.push(err('port-ports-exclusive', 'Set port OR ports, not both', ep));
        }
        const proto = e.protocol;
        if (proto === 'tcp') {
          if (!e.host || (e.port === undefined && e.ports === undefined)) {
            out.push(err('tcp-requires-host-port', 'protocol: tcp requires host and port', ep));
          }
          if (endpointHasRequestFields(e)) {
            out.push(err('tcp-no-request-fields', 'protocol: tcp accepts no request fields', ep));
          }
        } else if (proto && ['rest', 'websocket', 'graphql'].includes(proto)) {
          if (!e.access && !e.rules) {
            out.push(err('missing-access-or-rules', `${proto} endpoints need access or rules`, ep));
          }
          if (e.access && e.rules) {
            out.push(err('access-rules-exclusive', 'access and rules cannot be combined', ep));
          }
        } else if (proto === 'mcp' || proto === 'json-rpc') {
          if (!e.rules && !(e.mcp?.allow_all_known_mcp_methods) && !(proto === 'json-rpc')) {
            if (proto === 'mcp') out.push(err('mcp-needs-rules-or-all-methods', 'mcp endpoints need rules or mcp.allow_all_known_mcp_methods: true', ep));
          }
        }
        if (e.deny_rules && !proto) {
          out.push(err('deny-rules-require-protocol', 'deny_rules require protocol', ep));
        }
        if (e.host && hasWildcard(e.host) && countLabels(e.host) < MIN_WILDCARD_LABELS) {
          out.push(err('wildcard-host-labels', `Wildcard host "${e.host}" needs at least ${MIN_WILDCARD_LABELS} DNS labels`, ep));
        }
        if (e.tls === 'skip' && proto && proto !== 'tcp') {
          out.push(err('tls-skip-with-protocol', 'tls: skip cannot be used with a request protocol', ep));
        }
      }
    }
  }

  // network_middlewares
  const mws = policy.network_middlewares;
  if (mws) {
    const keys = Object.keys(mws);
    if (keys.length > MAX_MIDDLEWARES) {
      out.push(err('too-many-middlewares', `Policy has ${keys.length} middlewares; max ${MAX_MIDDLEWARES}`, 'network_middlewares'));
    }
    const orders = new Map<number, string[]>();
    for (const [key, mw] of Object.entries(mws)) {
      const base = `network_middlewares.${key}`;
      lintMiddleware(mw, base, out);
      if (mw.order !== undefined) {
        const arr = orders.get(mw.order) ?? [];
        arr.push(key);
        orders.set(mw.order, arr);
      }
    }
    for (const [order, ks] of orders) {
      if (ks.length > 1) out.push(err('duplicate-order', `order ${order} used by ${ks.join(', ')}`, 'network_middlewares'));
    }
  }

  // Size limit (approximate via JSON string length)
  const size = JSON.stringify(policy).length;
  if (size > MAX_POLICY_BYTES) {
    out.push(err('policy-too-large', `Policy is ${Math.round(size / 1024 / 1024)} MiB; max 4 MiB`, '<root>'));
  }

  return out;
}

function lintMiddleware(mw: NetworkMiddleware, base: string, out: LintResult[]): void {
  const inc = mw.endpoints?.include ?? [];
  if (inc.length > MAX_HOST_PATTERNS) {
    out.push(err('too-many-host-patterns', `Middleware has ${inc.length} include patterns; max ${MAX_HOST_PATTERNS}`, `${base}.endpoints.include`));
  }
  const exc = mw.endpoints?.exclude ?? [];
  if (inc.length + exc.length > MAX_HOST_PATTERNS) {
    // combined check is conservative; only flag if include alone is fine but total exceeds
  }
}
