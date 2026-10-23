import { describe, it, expect } from 'vitest';
import { serialize, parse } from '../src/yaml.js';
import type { Policy } from '../src/schema.js';

describe('yaml', () => {
  describe('serialize', () => {
    it('round-trips the canonical full example', () => {
      const p: Policy = {
        version: 1,
        filesystem_policy: { include_workdir: true, read_only: ['/usr', '/lib'], read_write: ['/tmp'] },
        landlock: { compatibility: 'best_effort' },
        process: { run_as_user: 'sandbox', run_as_group: 'sandbox' },
        network_policies: {
          github: {
            endpoints: [{ host: 'api.github.com', port: 443, protocol: 'rest', enforcement: 'enforce', access: 'read-only' }],
            binaries: [{ path: '/usr/bin/gh' }],
          },
        },
      };
      const yaml = serialize(p);
      expect(yaml).toContain('version: 1');
      expect(yaml).toContain('api.github.com');
      const parsed = parse(yaml);
      expect(parsed.errors).toEqual([]);
      expect(parsed.policy.network_policies?.github.endpoints[0].host).toBe('api.github.com');
    });

    it('omits empty optional sections', () => {
      const yaml = serialize({ version: 1 });
      expect(yaml.trim()).toBe('version: 1');
    });

    it('omits landlock/process/network_policies/middlewares when undefined', () => {
      const yaml = serialize({ version: 1, filesystem_policy: { read_only: ['/x'] } });
      expect(yaml).not.toContain('landlock');
      expect(yaml).not.toContain('process');
      expect(yaml).not.toContain('network_');
    });

    it('serializes ports as a list', () => {
      const p: Policy = {
        version: 1,
        network_policies: { r: { endpoints: [{ host: 'a.example.com', ports: [80, 443], protocol: 'rest', access: 'full' }], binaries: [] } },
      };
      const yaml = serialize(p);
      expect(yaml).toMatch(/ports:\n\s+- 80/);
    });
  });

  describe('parse', () => {
    it('reports duplicate-key errors', () => {
      const dup = 'version: 1\nfilesystem_policy:\n  read_only: [/a]\nfilesystem_policy:\n  read_only: [/b]\n';
      const res = parse(dup);
      expect(res.errors.length).toBeGreaterThan(0);
    });
    it('reports YAML syntax errors', () => {
      const res = parse('version: 1\n  bad: : :');
      expect(res.errors.length).toBeGreaterThan(0);
    });
    it('parses a minimal policy', () => {
      const res = parse('version: 1\n');
      expect(res.errors).toEqual([]);
      expect(res.policy.version).toBe(1);
    });
    it('rejects an unknown top-level field on parse', () => {
      const res = parse('version: 1\nbogus: true\n');
      expect(res.errors.some((e) => e.includes('unknown') || e.includes('bogus'))).toBe(true);
    });
  });
});
