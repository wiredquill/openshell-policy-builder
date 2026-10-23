import type { Policy, NetworkPolicyRule, Endpoint, Binary } from './schema.js';

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function ensureMap(policy: Policy): Record<string, NetworkPolicyRule> {
  if (!policy.network_policies) (policy as { network_policies: Record<string, NetworkPolicyRule> }).network_policies = {};
  return policy.network_policies!;
}

export function addNetworkPolicy(policy: Policy, key: string, rule: NetworkPolicyRule): Policy {
  const next = clone(policy);
  const map = ensureMap(next);
  if (key in map) throw new Error(`network policy "${key}" already exists`);
  map[key] = clone(rule);
  return next;
}

export function copyNetworkPolicy(policy: Policy, key: string, newKey?: string): Policy {
  const next = clone(policy);
  const map = ensureMap(next);
  if (!(key in map)) throw new Error(`network policy "${key}" not found`);
  const dst = newKey ?? `${key}_copy`;
  let candidate = dst;
  let i = 1;
  while (candidate in map) candidate = `${dst}_${i++}`;
  map[candidate] = clone(map[key]);
  return next;
}

export function removeNetworkPolicy(policy: Policy, key: string): Policy {
  const next = clone(policy);
  if (next.network_policies) delete next.network_policies[key];
  return next;
}

export function reorderNetworkPolicies(policy: Policy, order: string[]): Policy {
  const next: Policy = { ...clone(policy) };
  const src = policy.network_policies ?? {};
  const existing = Object.keys(src);
  if (order.length !== existing.length || !order.every((k) => existing.includes(k))) {
    throw new Error('reorder order must list every existing key exactly once');
  }
  const rebuilt: Record<string, NetworkPolicyRule> = {};
  for (const k of order) rebuilt[k] = clone(src[k]);
  next.network_policies = rebuilt;
  return next;
}

export function addEndpoint(policy: Policy, key: string, endpoint: Endpoint): Policy {
  const next = clone(policy);
  const map = ensureMap(next);
  if (!(key in map)) throw new Error(`network policy "${key}" not found`);
  map[key].endpoints.push(clone(endpoint));
  return next;
}

export function copyEndpoint(policy: Policy, key: string, index: number): Policy {
  const next = clone(policy);
  const map = ensureMap(next);
  if (!(key in map)) throw new Error(`network policy "${key}" not found`);
  const ep = map[key].endpoints[index];
  if (!ep) throw new Error(`endpoint ${index} not found in "${key}"`);
  map[key].endpoints.push(clone(ep));
  return next;
}

export function removeEndpoint(policy: Policy, key: string, index: number): Policy {
  const next = clone(policy);
  const map = ensureMap(next);
  if (!(key in map)) throw new Error(`network policy "${key}" not found`);
  map[key].endpoints.splice(index, 1);
  return next;
}

export function addBinary(policy: Policy, key: string, path: string): Policy {
  const next = clone(policy);
  const map = ensureMap(next);
  if (!(key in map)) throw new Error(`network policy "${key}" not found`);
  map[key].binaries.push({ path } as Binary);
  return next;
}

export function addFilesystemSection(policy: Policy): Policy {
  const next = clone(policy);
  if (!next.filesystem_policy) next.filesystem_policy = { include_workdir: false };
  return next;
}

export function addLandlockSection(policy: Policy): Policy {
  const next = clone(policy);
  if (!next.landlock) next.landlock = { compatibility: 'best_effort' };
  return next;
}

export function addProcessSection(policy: Policy): Policy {
  const next = clone(policy);
  if (!next.process) next.process = { run_as_user: 'sandbox', run_as_group: 'sandbox' };
  return next;
}
