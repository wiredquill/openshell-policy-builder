<script setup lang="ts">
import { ref, watch } from 'vue';
import type { PolicyBuilder } from '../usePolicyBuilder.js';

const props = defineProps<{ builder: PolicyBuilder }>();

const importText = ref('');

// Sync local text when modal opens
watch(() => props.builder.importModalOpen.value, (open) => {
  if (open) importText.value = props.builder.yaml.value;
});

function applyImport() {
  const errors = props.builder.importYaml(importText.value);
  if (errors.length > 0) {
    alert(errors.join('\n'));
  } else {
    props.builder.importModalOpen.value = false;
  }
}
</script>

<template>
  <div class="pane">
    <h3>Live YAML &amp; Lint</h3>
    <div class="yaml-wrap">
      <pre class="yaml-out">{{ props.builder.yaml.value }}</pre>
      <div class="lint-bar">
        <span class="dot" :class="{ ok: props.builder.isValid.value, err: !props.builder.isValid.value }" />
        <b v-if="props.builder.isValid.value">Valid policy</b>
        <b v-else>{{ props.builder.lintErrors.value.length }} error{{ props.builder.lintErrors.value.length !== 1 ? 's' : '' }}</b>
        <span class="muted">{{ props.builder.lintResults.value.length }} lint finding{{ props.builder.lintResults.value.length !== 1 ? 's' : '' }}</span>
      </div>
      <div class="lint-list">
        <div v-if="props.builder.lintResults.value.length === 0" class="empty">
          No issues. Policy is valid against OpenShell v0.1.5.
        </div>
        <div
          v-for="(r, i) in props.builder.lintResults.value"
          :key="i"
          class="lint-item"
          :class="r.level === 'error' ? 'err' : 'warn'"
        >
          <span class="bullet" :class="r.level === 'error' ? 'err' : 'warn'">●</span>
          <div>
            <div><b>{{ r.code }}</b> <span class="code">{{ r.path }}</span></div>
            <div class="msg">{{ r.message }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="props.builder.importModalOpen.value" class="overlay" @click.self="props.builder.importModalOpen.value = false">
      <div class="modal">
        <h3>Import YAML</h3>
        <textarea v-model="importText" />
        <div class="modal-actions">
          <button class="btn" @click="props.builder.importModalOpen.value = false">Cancel</button>
          <button class="btn primary" @click="applyImport">Apply</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.yaml-wrap { display: flex; flex-direction: column; height: 100%; }
.yaml-out { margin: 0; padding: 12px 14px; font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 12.5px; line-height: 1.6; white-space: pre-wrap; word-break: break-word;
  flex: 1; overflow: auto; }
.lint-bar { display: flex; align-items: center; gap: 14px; padding: 8px 14px;
  border-top: 1px solid var(--border); background: var(--panel2); font-size: 12px; }
.dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; }
.dot.ok { background: var(--ok); }
.dot.err { background: var(--danger); }
.muted { color: var(--muted); }
.lint-list { padding: 6px 14px 14px; max-height: 42vh; overflow: auto; }
.empty { color: var(--muted); font-size: 13px; padding: 14px; text-align: center; }
.lint-item { display: flex; gap: 8px; padding: 7px 10px; border-radius: 6px;
  margin-bottom: 5px; font-size: 12.5px; align-items: flex-start; }
.lint-item.err { background: rgba(248, 81, 73, .10); border: 1px solid rgba(248, 81, 73, .3); }
.lint-item.warn { background: rgba(210, 153, 34, .10); border: 1px solid rgba(210, 153, 34, .3); }
.bullet.err { color: var(--danger); }
.bullet.warn { color: var(--warn); }
.code { color: var(--muted); font-family: monospace; font-size: 11px; }
.msg { color: var(--muted); }
.overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, .6); z-index: 98;
  display: grid; place-items: center; }
.modal { background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
  padding: 16px; width: 520px; max-width: 90vw; }
.modal h3 { margin: 0 0 10px; font-size: 14px; }
.modal textarea { width: 100%; height: 280px; background: var(--bg); color: var(--text);
  border: 1px solid var(--border); border-radius: 8px; font-family: monospace;
  padding: 10px; font-size: 13px; resize: vertical; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px; }
.btn { background: var(--panel2); color: var(--text); border: 1px solid var(--border);
  border-radius: 6px; padding: 7px 16px; font-size: 13px; cursor: pointer; }
.btn:hover { border-color: var(--accent2); }
.btn.primary { background: var(--accent); color: #06140a; border-color: var(--accent); font-weight: 600; }
</style>
