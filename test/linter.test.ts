import { describe, it, expect } from 'vitest';
import { lint } from '../src/linter.js';
import type { Policy } from '../src/schema.js';

const ok = (p: Policy) => expect(lint(p)).toEqual([]);

function policyWith(rules: Record<string, unknown>): Policy {
  return { version: 1, ...rules } as unknown as Policy;
}

describe('linter', () => {
  describe('top-level', () => {
    it('passes a minimal valid policy', () => {
      ok({ version: 1 });
    });
    it('passes the canonical full example', () => {
      ok({
        version: 1,
        filesystem_policy: { include_workdir: true, read_only: ['/usr'], read_write: ['/tmp'] },
        network_policies: {
          github: {
            endpoints: [{ host: 'api.github.com', port: 443, protocol: 'rest', enforcement: 'enforce', access: 'read-only' }],
            binaries: [{ path: '/usr/bin/gh' }],
          },
        },
      } as Policy);
    });
    it('errors on unknown top-level field', () => {
      const res = lint(policyWith({ bogus_section: {} }));
      expect(res.some((r) => r.code === 'unknown-field' && r.path === 'bogus_section')).toBe(true);
    });
  });

  describe('filesystem_policy', () => {
    it('errors on a non-absolute path', () => {
      const res = lint(policyWith({ filesystem_policy: { read_only: ['relative/path'] } }));
      expect(res.some((r) => r.code === 'path-not-absolute')).toBe(true);
    });
    it('errors on a path containing ..', () => {
      const res = lint(policyWith({ filesystem_policy: { read_only: ['/usr/../etc'] } }));
      expect(res.some((r) => r.code === 'path-dotdot')).toBe(true);
    });
    it('errors when read_write contains bare /', () => {
      const res = lint(policyWith({ filesystem_policy: { read_write: ['/'] } }));
      expect(res.some((r) => r.code === 'read-write-root')).toBe(true);
    });
    it('errors when more than 256 paths total', () => {
      const many = Array.from({ length: 257 }, (_, i) => `/d${i}`);
      const res = lint(policyWith({ filesystem_policy: { read_only: many } }));
      expect(res.some((r) => r.code === 'too-many-paths')).toBe(true);
    });
    it('passes 256 paths', () => {
      const many = Array.from({ length: 256 }, (_, i) => `/d${i}`);
      ok(policyWith({ filesystem_policy: { read_only: many } }));
    });
  });

  describe('process', () => {
    it('errors on root UID 0', () => {
      const res = lint(policyWith({ process: { run_as_user: '0' } }));
      expect(res.some((r) => r.code === 'root-uid')).toBe(true);
    });
    it('errors on UID out of range (4294967295)', () => {
      const res = lint(policyWith({ process: { run_as_user: '4294967295' } }));
      expect(res.some((r) => r.code === 'uid-out-of-range')).toBe(true);
    });
    it('accepts sandbox as run_as_user', () => {
      ok(policyWith({ process: { run_as_user: 'sandbox', run_as_group: 'sandbox' } }));
    });
    it('accepts numeric uid 1500', () => {
      ok(policyWith({ process: { run_as_user: '1500', run_as_group: '1500' } }));
    });
  });

  describe('network_policies keys', () => {
    it('errors on a key starting with _provider_', () => {
      const res = lint(policyWith({ network_policies: { _provider_foo: { endpoints: [], binaries: [] } } }));
      expect(res.some((r) => r.code === 'reserved-key-prefix')).toBe(true);
    });
    it('errors when an endpoint sets both port and ports', () => {
      const res = lint(policyWith({ network_policies: { r: { endpoints: [{ host: 'a.com', port: 443, ports: [8080] }], binaries: [] } } }));
      expect(res.some((r) => r.code === 'port-ports-exclusive')).toBe(true);
    });
    it('errors when rest endpoint has neither access nor rules', () => {
      const res = lint(policyWith({ network_policies: { r: { endpoints: [{ host: 'a.com', port: 443, protocol: 'rest' }], binaries: [] } } }));
      expect(res.some((r) => r.code === 'missing-access-or-rules')).toBe(true);
    });
    it('errors when access and rules are both set', () => {
      const res = lint(policyWith({ network_policies: { r: { endpoints: [{ host: 'a.com', port: 443, protocol: 'rest', access: 'full', rules: [{ allow: { method: 'GET', path: '/' } }] }], binaries: [] } } }));
      expect(res.some((r) => r.code === 'access-rules-exclusive')).toBe(true);
    });
    it('errors when deny_rules present without protocol', () => {
      const res = lint(policyWith({ network_policies: { r: { endpoints: [{ host: 'a.com', port: 443, access: 'full', deny_rules: [{ method: 'GET', path: '/' }] }], binaries: [] } } }));
      expect(res.some((r) => r.code === 'deny-rules-require-protocol')).toBe(true);
    });
    it('errors when protocol tcp carries request fields (access)', () => {
      const res = lint(policyWith({ network_policies: { r: { endpoints: [{ host: 'a.com', port: 443, protocol: 'tcp', access: 'full' }], binaries: [] } } }));
      expect(res.some((r) => r.code === 'tcp-no-request-fields')).toBe(true);
    });
    it('errors when protocol tcp has no host', () => {
      const res = lint(policyWith({ network_policies: { r: { endpoints: [{ port: 443, protocol: 'tcp' }], binaries: [] } } }));
      expect(res.some((r) => r.code === 'tcp-requires-host-port')).toBe(true);
    });
    it('errors when a wildcard host has fewer than 3 labels', () => {
      const res = lint(policyWith({ network_policies: { r: { endpoints: [{ host: '*.com', port: 443, protocol: 'rest', access: 'full' }], binaries: [] } } }));
      expect(res.some((r) => r.code === 'wildcard-host-labels')).toBe(true);
    });
    it('accepts a 3-label wildcard host', () => {
      ok(policyWith({ network_policies: { r: { endpoints: [{ host: '*.example.com', port: 443, protocol: 'rest', access: 'full' }], binaries: [] } } }));
    });
    it('errors when tls skip is combined with a request protocol', () => {
      const res = lint(policyWith({ network_policies: { r: { endpoints: [{ host: 'a.com', port: 443, protocol: 'rest', tls: 'skip', access: 'full' }], binaries: [] } } }));
      expect(res.some((r) => r.code === 'tls-skip-with-protocol')).toBe(true);
    });
    it('errors when mcp endpoint has neither rules nor allow_all_known_mcp_methods', () => {
      const res = lint(policyWith({ network_policies: { r: { endpoints: [{ host: 'm.com', port: 443, protocol: 'mcp' }], binaries: [] } } }));
      expect(res.some((r) => r.code === 'mcp-needs-rules-or-all-methods')).toBe(true);
    });
    it('accepts mcp endpoint with allow_all_known_mcp_methods', () => {
      ok(policyWith({ network_policies: { r: { endpoints: [{ host: 'm.example.com', port: 443, protocol: 'mcp', mcp: { allow_all_known_mcp_methods: true } }], binaries: [] } } }));
    });
  });

  describe('network_middlewares', () => {
    it('errors when more than 10 middlewares', () => {
      const m: Record<string, unknown> = {};
      for (let i = 0; i < 11; i++) m[`m${i}`] = { middleware: 'openshell/regex', endpoints: { include: ['*.x.com'] } };
      const res = lint(policyWith({ network_middlewares: m }));
      expect(res.some((r) => r.code === 'too-many-middlewares')).toBe(true);
    });
    it('errors on duplicate order values', () => {
      const res = lint(policyWith({ network_middlewares: { a: { middleware: 'openshell/regex', endpoints: { include: ['*.x.com'] }, order: 5 }, b: { middleware: 'openshell/regex', endpoints: { include: ['*.y.com'] }, order: 5 } } }));
      expect(res.some((r) => r.code === 'duplicate-order')).toBe(true);
    });
    it('errors when more than 32 host patterns in include', () => {
      const inc = Array.from({ length: 33 }, (_, i) => `*.x${i}.com`);
      const res = lint(policyWith({ network_middlewares: { a: { middleware: 'openshell/regex', endpoints: { include: inc } } } }));
      expect(res.some((r) => r.code === 'too-many-host-patterns')).toBe(true);
    });
    it('accepts a valid middleware', () => {
      ok(policyWith({ network_middlewares: { redact: { middleware: 'openshell/regex', order: 10, config: { mode: 'redact' }, on_error: 'fail_closed', endpoints: { include: ['*.example.com'], exclude: ['trusted.example.com'] } } } }));
    });
  });

  describe('size limit', () => {
    it('errors when serialized policy exceeds 4 MiB', () => {
      const huge = Array.from({ length: 300000 }, (_, i) => `/path/number/${i}/with/a/long/name`);
      const res = lint(policyWith({ filesystem_policy: { read_only: huge } }));
      expect(res.some((r) => r.code === 'policy-too-large')).toBe(true);
    });
  });
});
