<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PolicyBuilder } from '../usePolicyBuilder.js';

const props = defineProps<{ builder: PolicyBuilder }>();

const policy = computed(() => props.builder.state.policy);
const sections = computed(() => Object.keys(policy.value).filter((k) => k !== 'version'));

const PROTOS = ['rest', 'websocket', 'graphql', 'mcp', 'json-rpc', 'tcp'];
const ACCESS = ['read-only', 'read-write', 'full'];

// Inline input state — replaces native prompt()
const addingPath = ref<{ field: 'read_only' | 'read_write'; value: string } | null>(null);
const addingBinary = ref<string | null>(null);  // rule key
const addingMwInclude = ref<string | null>(null);  // middleware key
const addingMwExclude = ref<string | null>(null);  // middleware key
const addingMwKey = ref(false);

function startAddPath(field: 'read_only' | 'read_write') {
  addingPath.value = { field, value: '' };
}
function confirmAddPath() {
  if (!addingPath.value) return;
  const { field, value } = addingPath.value;
  if (value && value.startsWith('/')) {
    const fs = policy.value.filesystem_policy!;
    if (!fs[field]) fs[field] = [];
    fs[field]!.push(value);
  }
  addingPath.value = null;
}

function startAddBinary(ruleKey: string) {
  addingBinary.value = '';
  // Store key on the ref via closure
  pendingBinaryRule.value = ruleKey;
}
const pendingBinaryRule = ref('');
function confirmAddBinary() {
  if (addingBinary.value && pendingBinaryRule.value) {
    props.builder.addNetworkBinary(pendingBinaryRule.value, addingBinary.value);
  }
  addingBinary.value = null;
  pendingBinaryRule.value = '';
}

function startAddMwInclude(key: string) {
  addingMwInclude.value = '';
  pendingMwKey.value = key;
}
function startAddMwExclude(key: string) {
  addingMwExclude.value = '';
  pendingMwKey.value = key;
}
const pendingMwKey = ref('');
function confirmAddMwInclude() {
  if (addingMwInclude.value && pendingMwKey.value) {
    const mw = policy.value.network_middlewares?.[pendingMwKey.value];
    if (mw) mw.endpoints.include.push(addingMwInclude.value);
  }
  addingMwInclude.value = null;
  pendingMwKey.value = '';
}
function confirmAddMwExclude() {
  if (addingMwExclude.value && pendingMwKey.value) {
    const mw = policy.value.network_middlewares?.[pendingMwKey.value];
    if (mw) {
      if (!mw.endpoints.exclude) mw.endpoints.exclude = [];
      mw.endpoints.exclude.push(addingMwExclude.value);
    }
  }
  addingMwExclude.value = null;
  pendingMwKey.value = '';
}

const newMwKey = ref('');
function confirmAddMiddleware() {
  if (newMwKey.value) {
    if (!policy.value.network_middlewares) policy.value.network_middlewares = {};
    policy.value.network_middlewares[newMwKey.value] = {
      middleware: 'openshell/regex',
      endpoints: { include: [] },
    };
  }
  newMwKey.value = '';
  addingMwKey.value = false;
}

function addEndpointInline(ruleKey: string) {
  props.builder.addNetworkEndpoint(ruleKey);
}
function removeEndpointInline(ruleKey: string, i: number) {
  props.builder.removeNetworkEndpoint(ruleKey, i);
}
function copyEndpointInline(ruleKey: string, i: number) {
  props.builder.copyNetworkEndpoint(ruleKey, i);
}
function removeBinary(ruleKey: string, i: number) {
  const rule = policy.value.network_policies?.[ruleKey];
  if (rule) rule.binaries.splice(i, 1);
}
function onDragStartRule(e: DragEvent, key: string) {
  e.dataTransfer?.setData('text/np', key);
}
function onDragOver(e: DragEvent) {
  e.preventDefault();
}
function onDrop(e: DragEvent) {
  e.preventDefault();
  const sec = e.dataTransfer?.getData('text/section');
  if (sec) { props.builder.addSection(sec); return; }
  const npk = e.dataTransfer?.getData('text/np');
  if (npk) {
    const keys = Object.keys(policy.value.network_policies ?? {});
    const filtered = keys.filter((k) => k !== npk);
    props.builder.reorderNetworkRules([...filtered, npk]);
  }
}
</script>

<template>
  <div class="pane editor-pane" @dragover="onDragOver" @drop="onDrop">
    <h3>Policy Canvas</h3>
    <div class="editor">
      <div v-if="sections.length === 0" class="empty">
        Drag a section from the left, or click one to add it.
      </div>

      <!-- Filesystem -->
      <div v-if="policy.filesystem_policy" class="card">
        <div class="card-head">
          <span class="grip">⋮⋮</span>
          <span class="title">Filesystem Policy</span>
          <span class="tag">startup</span>
          <span class="spacer" />
          <button class="icon-btn" @click="props.builder.removeSection('filesystem_policy')">✕</button>
        </div>
        <div class="card-body">
          <label class="row">
            <span class="lbl">include_workdir</span>
            <input type="checkbox" v-model="policy.filesystem_policy!.include_workdir" />
          </label>
          <div class="field">
            <span class="lbl">Read-only paths</span>
            <div class="chips">
              <span v-for="(p, i) in policy.filesystem_policy!.read_only" :key="i" class="chip">
                {{ p }} <button @click="policy.filesystem_policy!.read_only!.splice(i, 1)">✕</button>
              </span>
              <button class="add-chip" @click="startAddPath('read_only')" v-if="!addingPath || addingPath.field !== 'read_only'">+ add path</button>
              <input
                v-if="addingPath && addingPath.field === 'read_only'"
                class="inline-input"
                v-model="addingPath.value"
                placeholder="/absolute/path"
                @keydown.enter="confirmAddPath"
                @blur="confirmAddPath"
                autofocus
              />
            </div>
          </div>
          <div class="field">
            <span class="lbl">Read-write paths</span>
            <div class="chips">
              <span v-for="(p, i) in policy.filesystem_policy!.read_write" :key="i" class="chip">
                {{ p }} <button @click="policy.filesystem_policy!.read_write!.splice(i, 1)">✕</button>
              </span>
              <button class="add-chip" @click="startAddPath('read_write')" v-if="!addingPath || addingPath.field !== 'read_write'">+ add path</button>
              <input
                v-if="addingPath && addingPath.field === 'read_write'"
                class="inline-input"
                v-model="addingPath.value"
                placeholder="/absolute/path"
                @keydown.enter="confirmAddPath"
                @blur="confirmAddPath"
                autofocus
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Landlock -->
      <div v-if="policy.landlock" class="card">
        <div class="card-head">
          <span class="grip">⋮⋮</span>
          <span class="title">Landlock</span>
          <span class="tag">startup</span>
          <span class="spacer" />
          <button class="icon-btn" @click="props.builder.removeSection('landlock')">✕</button>
        </div>
        <div class="card-body">
          <div class="field">
            <span class="lbl">compatibility</span>
            <select v-model="policy.landlock!.compatibility">
              <option>best_effort</option>
              <option>hard_requirement</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Process -->
      <div v-if="policy.process" class="card">
        <div class="card-head">
          <span class="grip">⋮⋮</span>
          <span class="title">Process</span>
          <span class="tag">startup</span>
          <span class="spacer" />
          <button class="icon-btn" @click="props.builder.removeSection('process')">✕</button>
        </div>
        <div class="card-body">
          <div class="field">
            <span class="lbl">run_as_user</span>
            <input v-model="policy.process!.run_as_user" placeholder="sandbox or numeric UID" />
          </div>
          <div class="field">
            <span class="lbl">run_as_group</span>
            <input v-model="policy.process!.run_as_group" placeholder="sandbox or numeric GID" />
          </div>
        </div>
      </div>

      <!-- Network Policies -->
      <div v-if="policy.network_policies" class="card">
        <div class="card-head">
          <span class="grip">⋮⋮</span>
          <span class="title">Network Policies</span>
          <span class="tag">live</span>
          <span class="spacer" />
          <button class="icon-btn" @click="props.builder.removeSection('network_policies')">✕</button>
        </div>
        <div class="card-body">
          <div v-for="(rule, key) in policy.network_policies" :key="key" class="sub-card">
            <div class="sub-head">
              <span class="grip" draggable="true" @dragstart="onDragStartRule($event, key as string)">⋮⋮</span>
              <span class="sub-title">{{ key }}</span>
              <span class="spacer" />
              <button class="icon-btn" @click="props.builder.copyNetworkRule(key as string)" title="Copy">⧉</button>
              <button class="icon-btn" @click="props.builder.removeNetworkRule(key as string)">✕</button>
            </div>
            <div class="field">
              <span class="lbl">display name</span>
              <input v-model="rule.name" :placeholder="String(key)" />
            </div>
            <!-- Endpoints -->
            <div v-for="(ep, i) in rule.endpoints" :key="i" class="ep-card">
              <div class="sub-head">
                <span class="sub-title">endpoint #{{ i + 1 }}</span>
                <span class="spacer" />
                <button class="icon-btn" @click="copyEndpointInline(key as string, i)" title="Copy">⧉</button>
                <button class="icon-btn" @click="removeEndpointInline(key as string, i)">✕</button>
              </div>
              <div class="grid-row">
                <div class="field"><span class="lbl">host</span><input v-model="ep.host" placeholder="host / wildcard" /></div>
                <div class="field"><span class="lbl">port</span><input type="number" v-model="ep.port" placeholder="443" /></div>
                <div class="field"><span class="lbl">protocol</span>
                  <select v-model="ep.protocol"><option :value="undefined">(none)</option><option v-for="p in PROTOS" :key="p" :value="p">{{ p }}</option></select>
                </div>
                <div class="field"><span class="lbl">enforcement</span>
                  <select v-model="ep.enforcement"><option :value="undefined">(audit)</option><option value="enforce">enforce</option></select>
                </div>
                <div class="field"><span class="lbl">access</span>
                  <select v-model="ep.access"><option :value="undefined">(none)</option><option v-for="a in ACCESS" :key="a" :value="a">{{ a }}</option></select>
                </div>
              </div>
            </div>
            <button class="add-chip" @click="addEndpointInline(key as string)">+ add endpoint</button>
            <!-- Binaries -->
            <div class="field" style="margin-top:8px">
              <span class="lbl">binaries</span>
              <div class="chips">
                <span v-for="(b, i) in rule.binaries" :key="i" class="chip">
                  {{ b.path }} <button @click="removeBinary(key as string, i)">✕</button>
                </span>
                <button class="add-chip" v-if="addingBinary === null || pendingBinaryRule !== key" @click="startAddBinary(key as string)">+ add binary</button>
                <input
                  v-if="addingBinary !== null && pendingBinaryRule === key"
                  class="inline-input"
                  v-model="addingBinary"
                  placeholder="/usr/bin/..."
                  @keydown.enter="confirmAddBinary"
                  @blur="confirmAddBinary"
                  autofocus
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Network Middlewares -->
      <div v-if="policy.network_middlewares" class="card">
        <div class="card-head">
          <span class="grip">⋮⋮</span>
          <span class="title">Network Middlewares</span>
          <span class="tag">live</span>
          <span class="spacer" />
          <button class="icon-btn" @click="props.builder.removeSection('network_middlewares')">✕</button>
        </div>
        <div class="card-body">
          <div v-for="(mw, key) in policy.network_middlewares" :key="key" class="sub-card">
            <div class="sub-head">
              <span class="sub-title">{{ key }}</span>
              <span class="spacer" />
              <button class="icon-btn" @click="delete policy.network_middlewares![key]">✕</button>
            </div>
            <div class="field"><span class="lbl">middleware</span><input v-model="mw.middleware" placeholder="openshell/regex" /></div>
            <div class="field"><span class="lbl">name</span><input v-model="mw.name" /></div>
            <div class="field"><span class="lbl">order</span><input type="number" v-model="mw.order" /></div>
            <div class="field"><span class="lbl">include patterns</span>
              <div class="chips">
                <span v-for="(p, i) in mw.endpoints.include" :key="i" class="chip">
                  {{ p }} <button @click="mw.endpoints.include.splice(i, 1)">✕</button>
                </span>
                <button class="add-chip" v-if="addingMwInclude === null || pendingMwKey !== key" @click="startAddMwInclude(key as string)">+ add</button>
                <input
                  v-if="addingMwInclude !== null && pendingMwKey === key"
                  class="inline-input"
                  v-model="addingMwInclude"
                  placeholder="*.example.com"
                  @keydown.enter="confirmAddMwInclude"
                  @blur="confirmAddMwInclude"
                  autofocus
                />
              </div>
            </div>
            <div class="field"><span class="lbl">exclude patterns</span>
              <div class="chips">
                <span v-for="(p, i) in mw.endpoints.exclude" :key="i" class="chip">
                  {{ p }} <button @click="mw.endpoints.exclude!.splice(i, 1)">✕</button>
                </span>
                <button class="add-chip" v-if="addingMwExclude === null || pendingMwKey !== key" @click="startAddMwExclude(key as string)">+ add</button>
                <input
                  v-if="addingMwExclude !== null && pendingMwKey === key"
                  class="inline-input"
                  v-model="addingMwExclude"
                  placeholder="trusted.example.com"
                  @keydown.enter="confirmAddMwExclude"
                  @blur="confirmAddMwExclude"
                  autofocus
                />
              </div>
            </div>
          </div>
          <div v-if="addingMwKey" class="mw-key-input">
            <input
              class="inline-input"
              v-model="newMwKey"
              placeholder="middleware key, e.g. redactor"
              @keydown.enter="confirmAddMiddleware"
              @blur="confirmAddMiddleware"
              autofocus
            />
          </div>
          <button class="add-chip" v-else @click="addingMwKey = true">+ add middleware</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor { padding: 12px; }
.empty { color: var(--muted); text-align: center; padding: 24px 14px; font-size: 13px; }
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
  margin-bottom: 12px; overflow: hidden; }
.card-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  border-bottom: 1px solid var(--border); background: var(--panel2); }
.card-head .grip { color: var(--muted); cursor: grab; }
.card-head .title { font-weight: 600; font-size: 14px; }
.card-head .tag { font-size: 10px; padding: 2px 7px; border-radius: 10px;
  border: 1px solid var(--border); color: var(--muted); }
.spacer { flex: 1; }
.icon-btn { background: none; border: none; color: var(--muted); cursor: pointer;
  font-size: 15px; padding: 3px 7px; border-radius: 5px; }
.icon-btn:hover { background: var(--border); color: var(--text); }
.card-body { padding: 12px 14px; }
.row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.field { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 120px; margin-bottom: 8px; }
.lbl { font-size: 11px; color: var(--muted); }
.field input, .field select { background: var(--bg); border: 1px solid var(--border);
  border-radius: 6px; color: var(--text); padding: 7px 9px; font-size: 13px; }
.field input:focus, .field select:focus { outline: none; border-color: var(--accent2); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.chip { display: inline-flex; align-items: center; gap: 6px; background: var(--bg);
  border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; font-size: 12px; }
.chip button { background: none; border: none; color: var(--danger); cursor: pointer; font-size: 13px; }
.add-chip { background: none; border: 1px dashed var(--border); border-radius: 6px;
  color: var(--muted); padding: 4px 8px; font-size: 12px; cursor: pointer; }
.add-chip:hover { border-color: var(--accent2); color: var(--accent2); }
.inline-input { background: var(--bg); border: 1px solid var(--accent2); border-radius: 6px;
  color: var(--text); padding: 5px 8px; font-size: 12px; width: 160px; outline: none; }
.mw-key-input { margin-top: 8px; }
.sub-card { background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
  padding: 10px; margin-top: 8px; }
.sub-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.sub-head .grip { color: var(--muted); cursor: grab; }
.sub-title { font-size: 12px; font-weight: 600; color: var(--muted); }
.ep-card { background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
  padding: 10px; margin-top: 6px; }
.grid-row { display: flex; gap: 10px; flex-wrap: wrap; }
</style>
