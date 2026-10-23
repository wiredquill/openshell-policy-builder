<script setup lang="ts">
import { usePolicyBuilder } from './usePolicyBuilder.js';
import PalettePane from './components/PalettePane.vue';
import EditorPane from './components/EditorPane.vue';
import YamlPane from './components/YamlPane.vue';

const builder = usePolicyBuilder();
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="logo">OpenShell <span>Policy Builder</span></div>
      <div class="badge">schema v0.1.5</div>
      <div class="spacer" />
      <button class="btn" @click="builder.importModalOpen.value = true">Import</button>
      <button class="btn" @click="builder.copyYaml()">Copy YAML</button>
      <button class="btn primary" @click="builder.downloadYaml()">Download .yaml</button>
    </header>
    <div class="layout">
      <PalettePane :builder="builder" />
      <EditorPane :builder="builder" />
      <YamlPane :builder="builder" />
    </div>
  </div>
</template>

<style>
:root {
  --bg: #0d1117; --panel: #161b22; --panel2: #1c232c; --border: #2d333b;
  --text: #e6edf3; --muted: #8b949e; --accent: #7ee787; --accent2: #58a6ff;
  --danger: #f85149; --warn: #d29922; --ok: #7ee787;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: var(--bg); color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; }
#app { height: 100vh; }
.app { display: grid; grid-template-rows: auto 1fr; height: 100vh; }
.topbar { display: flex; align-items: center; gap: 14px; padding: 10px 18px;
  background: var(--panel); border-bottom: 1px solid var(--border); }
.logo { font-weight: 700; font-size: 16px; }
.logo span { color: var(--accent2); }
.badge { font-size: 11px; padding: 2px 8px; border: 1px solid var(--border);
  border-radius: 10px; color: var(--muted); }
.spacer { flex: 1; }
.btn { background: var(--panel2); color: var(--text); border: 1px solid var(--border);
  border-radius: 6px; padding: 6px 12px; font-size: 13px; cursor: pointer; transition: .15s; }
.btn:hover { border-color: var(--accent2); color: var(--accent2); }
.btn.primary { background: var(--accent); color: #06140a; border-color: var(--accent); font-weight: 600; }
.layout { display: grid; grid-template-columns: 236px 1fr 1fr; min-height: 0; }
.pane { border-right: 1px solid var(--border); min-width: 0; overflow: auto; }
.pane:last-child { border-right: none; }
.pane h3 { margin: 0; padding: 12px 14px 8px; font-size: 11px; text-transform: uppercase;
  letter-spacing: .8px; color: var(--muted); border-bottom: 1px solid var(--border);
  position: sticky; top: 0; background: var(--bg); z-index: 2; }
</style>
