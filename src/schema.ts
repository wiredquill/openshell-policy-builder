// OpenShell policy schema — types and a guarded constructor.
// Source: NVIDIA OpenShell v0.1.5 Policy Schema Reference
// https://docs.nvidia.com/openshell/latest/how-it-works/policies/schema

export const PROTOCOLS = ['rest', 'websocket', 'graphql', 'mcp', 'json-rpc', 'tcp'] as const;
export type Protocol = (typeof PROTOCOLS)[number];

export const ENFORCEMENTS = ['enforce', 'audit'] as const;
export type Enforcement = (typeof ENFORCEMENTS)[number];

export const ACCESS_PRESETS = ['read-only', 'read-write', 'full'] as const;
export type AccessPreset = (typeof ACCESS_PRESETS)[number];

export const TLS_MODES = ['skip', 'terminate'] as const;
export type TlsMode = (typeof TLS_MODES)[number];

export const LANDLOCK_COMPAT = ['best_effort', 'hard_requirement'] as const;
export type LandlockCompat = (typeof LANDLOCK_COMPAT)[number];

export const ON_ERROR = ['fail_closed', 'fail_open'] as const;
export type OnError = (typeof ON_ERROR)[number];

export interface FilesystemPolicy {
  include_workdir?: boolean;
  read_only?: string[];
  read_write?: string[];
}

export interface LandlockPolicy {
  compatibility?: LandlockCompat;
}

export interface ProcessPolicy {
  run_as_user?: string;
  run_as_group?: string;
}

export interface Binary {
  path: string;
}

export interface CredentialBinding {
  provider: string;
}

export interface McpOptions {
  versions?: string[];
  max_body_bytes?: number;
  strict_tool_names?: boolean;
  allow_all_known_mcp_methods?: boolean;
}

export interface JsonRpcOptions {
  max_body_bytes?: number;
}

export interface RestRule {
  method: string;
  path: string;
  query?: Record<string, string | { any: string[] }>;
}

export interface GraphQLRule {
  operation_type: 'query' | 'mutation' | 'subscription';
  operation_name?: string;
  fields?: string[];
}

export interface McpRule {
  method: string;
  tool?: string | { any: string[] };
  'params.name'?: string | { any: string[] };
}

export interface JsonRpcRule {
  method: string;
}

export type Rule =
  | RestRule
  | GraphQLRule
  | McpRule
  | JsonRpcRule
  | (RestRule & { path: string; method: string });

export interface AllowRule {
  allow: Rule;
}

export interface Endpoint {
  host?: string;
  port?: number;
  ports?: number[];
  path?: string;
  allowed_ips?: string[];
  protocol?: Protocol;
  tls?: TlsMode;
  enforcement?: Enforcement;
  access?: AccessPreset;
  rules?: AllowRule[];
  deny_rules?: Rule[];
  allow_encoded_slash?: boolean;
  credential_binding?: CredentialBinding;
  request_body_credential_rewrite?: boolean;
  websocket_credential_rewrite?: boolean;
  allow_uninspected_credentials?: boolean;
  credential_signing?: 'sigv4' | 'sigv4:body' | 'sigv4:no_body';
  signing_service?: string;
  signing_region?: string;
  mcp?: McpOptions;
  json_rpc?: JsonRpcOptions;
  persisted_queries?: 'deny' | 'allow_registered';
  graphql_persisted_queries?: Record<string, unknown>;
  graphql_max_body_bytes?: number;
}

export interface NetworkPolicyRule {
  name?: string;
  endpoints: Endpoint[];
  binaries: Binary[];
}

export interface MiddlewareEndpointSet {
  include: string[];
  exclude?: string[];
}

export interface NetworkMiddleware {
  middleware: string;
  endpoints: MiddlewareEndpointSet;
  order?: number;
  config?: Record<string, unknown>;
  on_error?: OnError;
  name?: string;
}

export interface Policy {
  version: 1;
  filesystem_policy?: FilesystemPolicy;
  landlock?: LandlockPolicy;
  process?: ProcessPolicy;
  network_policies?: Record<string, NetworkPolicyRule>;
  network_middlewares?: Record<string, NetworkMiddleware>;
}

export const EMPTY_POLICY: Policy = { version: 1 };

export const ALLOWED_TOP_LEVEL = new Set<keyof Policy>([
  'version',
  'filesystem_policy',
  'landlock',
  'process',
  'network_policies',
  'network_middlewares',
]);

/** Validate the version and return a typed Policy; throw on a bad version. */
export function toPolicy(input: Partial<Policy> & { version?: number }): Policy {
  if (input.version !== 1) {
    throw new Error(`version must be 1, got ${String(input.version)}`);
  }
  return { ...input, version: 1 } as Policy;
}
