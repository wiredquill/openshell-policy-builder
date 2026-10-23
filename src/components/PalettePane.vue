<script setup lang="ts">
import type { PolicyBuilder } from '../usePolicyBuilder.js';

const props = defineProps<{ builder: PolicyBuilder }>();

const sections = [
  { key: 'filesystem_policy', label: 'Filesystem', desc: 'read / write paths', icon: '📁' },
  { key: 'landlock', label: 'Landlock', desc: 'kernel isolation mode', icon: '🔒' },
  { key: 'process', label: 'Process', desc: 'uid / gid identity', icon: '👤' },
  { key: 'network_policies', label: 'Network Policy', desc: 'endpoints + binaries', icon: '🌐' },
  { key: 'network_middlewares', label: 'Middleware', desc: 'traffic inspection', icon: '🧩' },
];

function onDragStart(e: DragEvent, key: string) {
  e.dataTransfer?.setData('text/section', key);
}
</script>

<template>
  <div class="pane palette-pane">
    <h3>Sections</h3>
    <div class="palette">
      <div
        v-for="s in sections"
        :key="s.key"
        class="palette-item"
        draggable="true"
        @dragstart="onDragStart($event, s.key)"
        @click="props.builder.addSection(s.key)"
      >
        <span class="icon">{{ s.icon }}</span>
        <div>
          <div class="label">{{ s.label }}</div>
          <div class="desc">{{ s.desc }}</div>
        </div>
      </div>
    </div>
    <div class="info">
      Drag a section onto the canvas, or click to add. Reorder network rules by dragging.
      Copy any section with the duplicate button. The right panel live-lints against
      OpenShell v0.1.5 as you edit.
    </div>
  </div>
</template>

<style scoped>
.palette { padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.palette-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  background: var(--panel); border: 1px solid var(--border); border-radius: 8px;
  cursor: grab; transition: .15s; }
.palette-item:hover { border-color: var(--accent2); transform: translateX(2px); }
.palette-item .icon { width: 22px; height: 22px; border-radius: 6px; display: grid;
  place-items: center; font-size: 13px; background: var(--panel2); }
.palette-item .label { font-size: 13px; font-weight: 500; }
.palette-item .desc { font-size: 11px; color: var(--muted); }
.info { padding: 10px 14px; font-size: 11px; color: var(--muted); line-height: 1.55; }
</style>
