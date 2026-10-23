import { describe, it, expect } from 'vitest';
import {
  addNetworkPolicy,
  copyNetworkPolicy,
  removeNetworkPolicy,
  reorderNetworkPolicies,
  addEndpoint,
  copyEndpoint,
  removeEndpoint,
  addBinary,
} from '../src/operations.js';
import type { Policy } from '../src/schema.js';

describe('operations', () => {
  const base: Policy = {
    version: 1,
    network_policies: {
      alpha: { endpoints: [{ host: 'a.example.com', port: 443, protocol: 'rest', access: 'full' }], binaries: [{ path: '/bin/a' }] },
    },
  };

  describe('addNetworkPolicy', () => {
    it('adds a new named rule', () => {
      const p = addNetworkPolicy(base, 'beta', { endpoints: [], binaries: [] });
      expect(Object.keys(p.network_policies!)).toEqual(['alpha', 'beta']);
    });
    it('does not mutate the original', () => {
      addNetworkPolicy(base, 'beta', { endpoints: [], binaries: [] });
      expect(Object.keys(base.network_policies!)).toEqual(['alpha']);
    });
    it('throws on a duplicate key', () => {
      expect(() => addNetworkPolicy(base, 'alpha', { endpoints: [], binaries: [] })).toThrow();
    });
  });

  describe('copyNetworkPolicy', () => {
    it('duplicates an existing rule under a new key with a _copy suffix', () => {
      const p = copyNetworkPolicy(base, 'alpha');
      expect(p.network_policies!['alpha_copy']).toBeDefined();
      expect(p.network_policies!['alpha_copy'].endpoints[0].host).toBe('a.example.com');
    });
    it('throws when source does not exist', () => {
      expect(() => copyNetworkPolicy(base, 'nope')).toThrow();
    });
  });

  describe('removeNetworkPolicy', () => {
    it('removes a rule', () => {
      const p = removeNetworkPolicy(base, 'alpha');
      expect(p.network_policies).toEqual({});
    });
  });

  describe('reorderNetworkPolicies', () => {
    it('reorders by a new key sequence', () => {
      const two = addNetworkPolicy(base, 'beta', { endpoints: [], binaries: [] });
      const reordered = reorderNetworkPolicies(two, ['beta', 'alpha']);
      expect(Object.keys(reordered.network_policies!)).toEqual(['beta', 'alpha']);
    });
    it('throws if the new order omits a key', () => {
      const two = addNetworkPolicy(base, 'beta', { endpoints: [], binaries: [] });
      expect(() => reorderNetworkPolicies(two, ['alpha'])).toThrow();
    });
  });

  describe('endpoint operations', () => {
    it('addEndpoint appends', () => {
      const p = addEndpoint(base, 'alpha', { host: 'b.example.com', port: 80, protocol: 'rest', access: 'read-only' });
      expect(p.network_policies!['alpha'].endpoints).toHaveLength(2);
    });
    it('copyEndpoint duplicates within a rule', () => {
      const p = copyEndpoint(base, 'alpha', 0);
      expect(p.network_policies!['alpha'].endpoints).toHaveLength(2);
      expect(p.network_policies!['alpha'].endpoints[1].host).toBe('a.example.com');
    });
    it('removeEndpoint removes by index', () => {
      const p = removeEndpoint(base, 'alpha', 0);
      expect(p.network_policies!['alpha'].endpoints).toHaveLength(0);
    });
  });

  describe('addBinary', () => {
    it('appends a binary', () => {
      const p = addBinary(base, 'alpha', '/bin/bash');
      expect(p.network_policies!['alpha'].binaries.map((b) => b.path)).toEqual(['/bin/a', '/bin/bash']);
    });
  });
});
