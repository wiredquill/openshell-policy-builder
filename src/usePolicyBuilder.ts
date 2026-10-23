import { reactive, computed } from 'vue';
import type { Policy } from './schema.js';
import { EMPTY_POLICY } from './schema.js';
import { lint } from './linter.js';
import type { LintResult } from './linter.js';
import { serialize, parse } from './yaml.js';
import {
  addNetworkPolicy,
  copyNetworkPolicy,
  removeNetworkPolicy,
  reorderNetworkPolicies,
  addEndpoint,
  copyEndpoint,
  removeEndpoint,
  addBinary,
  addFilesystemSection,
  addLandlockSection,
  addProcessSection,
} from './operations.js';

export function usePolicyBuilder() {
  const state = reactive<{ policy: Policy }>({ policy: structuredClone(EMPTY_POLICY) });

  const yaml = computed(() => serialize(state.policy));
  const lintResults = computed<LintResult[]>(() => lint(state.policy));
  const lintErrors = computed(() => lintResults.value.filter((r) => r.level === 'error'));
  const lintWarnings = computed(() => lintResults.value.filter((r) => r.level === 'warning'));
  const isValid = computed(() => lintErrors.value.length === 0);

  function setPolicy(p: Policy) {
    Object.assign(state.policy, p);
  }

  function addSection(key: string) {
    if (key === 'filesystem_policy') state.policy = addFilesystemSection(state.policy);
    else if (key === 'landlock') state.policy = addLandlockSection(state.policy);
    else if (key === 'process') state.policy = addProcessSection(state.policy);
    else if (key === 'network_policies') {
      const k = `rule_${Date.now().toString(36).slice(-4)}`;
      state.policy = addNetworkPolicy(state.policy, k, { endpoints: [], binaries: [] });
    } else if (key === 'network_middlewares') {
      if (!state.policy.network_middlewares) state.policy.network_middlewares = {};
      state.policy.network_middlewares[`mw_${Date.now().toString(36).slice(-4)}`] = {
        middleware: 'openshell/regex',
        endpoints: { include: [] },
      };
    }
  }

  function removeSection(key: string) {
    const p = state.policy as Record<string, unknown>;
    delete p[key];
  }

  function copyNetworkRule(key: string) {
    state.policy = copyNetworkPolicy(state.policy, key);
  }

  function removeNetworkRule(key: string) {
    state.policy = removeNetworkPolicy(state.policy, key);
  }

  function addNetworkEndpoint(key: string) {
    state.policy = addEndpoint(state.policy, key, { host: '', port: 443 });
  }

  function copyNetworkEndpoint(key: string, index: number) {
    state.policy = copyEndpoint(state.policy, key, index);
  }

  function removeNetworkEndpoint(key: string, index: number) {
    state.policy = removeEndpoint(state.policy, key, index);
  }

  function addNetworkBinary(key: string, path: string) {
    state.policy = addBinary(state.policy, key, path);
  }

  function reorderNetworkRules(order: string[]) {
    state.policy = reorderNetworkPolicies(state.policy, order);
  }

  function importYaml(text: string): string[] {
    const { policy, errors } = parse(text);
    if (errors.length > 0) return errors;
    setPolicy(policy);
    return [];
  }

  function exportYaml(): string {
    return yaml.value;
  }

  function downloadYaml() {
    const blob = new Blob([yaml.value], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'policy.yaml';
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    state,
    yaml,
    lintResults,
    lintErrors,
    lintWarnings,
    isValid,
    addSection,
    removeSection,
    copyNetworkRule,
    removeNetworkRule,
    addNetworkEndpoint,
    copyNetworkEndpoint,
    removeNetworkEndpoint,
    addNetworkBinary,
    reorderNetworkRules,
    importYaml,
    exportYaml,
    downloadYaml,
  };
}

export type PolicyBuilder = ReturnType<typeof usePolicyBuilder>;
