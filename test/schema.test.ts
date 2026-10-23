import { describe, it, expect } from 'vitest';
import type { Policy, NetworkPolicyRule, Endpoint } from '../src/schema.js';
import { toPolicy, EMPTY_POLICY } from '../src/schema.js';

describe('schema', () => {
  describe('toPolicy', () => {
    it('accepts the canonical full-example policy from the OpenShell docs', () => {
      const input: Policy = {
        version: 1,
        filesystem_policy: {
          include_workdir: true,
          read_only: ['/usr', '/lib', '/etc'],
          read_write: ['/tmp'],
        },
        network_policies: {
          github_rest_api: {
            endpoints: [
              {
                host: 'api.github.com',
                port: 443,
                protocol: 'rest',
                enforcement: 'enforce',
                access: 'read-only',
              },
            ],
            binaries: [{ path: '/usr/bin/gh' }],
          },
        },
      };
      const p = toPolicy(input);
      expect(p.version).toBe(1);
      expect(p.filesystem_policy?.read_only).toEqual(['/usr', '/lib', '/etc']);
      expect(p.network_policies?.github_rest_api.endpoints[0].host).toBe('api.github.com');
    });

    it('EMPTY_POLICY has version 1 and no sections', () => {
      expect(EMPTY_POLICY.version).toBe(1);
      expect(EMPTY_POLICY.filesystem_policy).toBeUndefined();
      expect(EMPTY_POLICY.landlock).toBeUndefined();
      expect(EMPTY_POLICY.process).toBeUndefined();
      expect(EMPTY_POLICY.network_policies).toBeUndefined();
      expect(EMPTY_POLICY.network_middlewares).toBeUndefined();
    });

    it('rejects version other than 1', () => {
      expect(() => toPolicy({ version: 2 } as unknown as Policy)).toThrow();
      expect(() => toPolicy({ version: 0 } as unknown as Policy)).toThrow();
    });

    it('accepts a minimal policy with only version', () => {
      const p = toPolicy({ version: 1 });
      expect(p.version).toBe(1);
    });
  });

  describe('endpoint protocol union', () => {
    it('accepts all documented protocol values', () => {
      const protocols = ['rest', 'websocket', 'graphql', 'mcp', 'json-rpc', 'tcp'] as const;
      for (const protocol of protocols) {
        const e: Endpoint = { host: 'x.example.com', port: 443, protocol };
        expect(e.protocol).toBe(protocol);
      }
    });
  });

  describe('NetworkPolicyRule', () => {
    it('allows name override and empty binaries list', () => {
      const rule: NetworkPolicyRule = {
        name: 'my-rule',
        endpoints: [],
        binaries: [],
      };
      expect(rule.name).toBe('my-rule');
      expect(rule.binaries).toEqual([]);
    });
  });
});
