<script setup lang="ts">
import { ref, computed } from 'vue';
import { SUSE_BINARIES, BINARY_CATEGORIES } from '../suse-binaries.js';

const emit = defineEmits<{
  pick: [path: string];
}>();

const open = ref(false);
const search = ref('');

const filtered = computed(() => {
  if (!search.value) return SUSE_BINARIES;
  const q = search.value.toLowerCase();
  return SUSE_BINARIES.filter(
    (b) => b.label.toLowerCase().includes(q) || b.path.toLowerCase().includes(q),
  );
});

const grouped = computed(() => {
  const map: Record<string, typeof SUSE_BINARIES> = {};
  for (const cat of BINARY_CATEGORIES) map[cat] = [];
  for (const b of filtered.value) {
    if (!map[b.category]) map[b.category] = [];
    map[b.category].push(b);
  }
  return Object.entries(map).filter(([, v]) => v.length > 0);
});

function toggle() {
  open.value = !open.value;
  if (open.value) search.value = '';
}

function select(path: string) {
  emit('pick', path);
  open.value = false;
  search.value = '';
}

function onSearchEnter() {
  // If filtered to exactly one, pick it; else if search looks like a path, use it directly
  const f = filtered.value;
  if (f.length === 1) {
    select(f[0].path);
  } else if (search.value.startsWith('/')) {
    select(search.value);
  }
}
</script>

<template>
  <div class="binary-picker">
    <button class="add-chip" @click="toggle">+ add binary</button>
    <div v-if="open" class="dropdown" @click.self="open = false">
      <input
        class="search"
        v-model="search"
        placeholder="Search or type /full/path…"
        @keydown.enter="onSearchEnter"
        @keydown.escape="open = false"
        autofocus
      />
      <div class="groups">
        <div v-for="[cat, bins] in grouped" :key="cat" class="group">
          <div class="cat-label">{{ cat }}</div>
          <button
            v-for="b in bins"
            :key="b.path"
            class="bin-option"
            @click="select(b.path)"
          >
            <span class="bin-name">{{ b.label }}</span>
            <span class="bin-path">{{ b.path }}</span>
          </button>
        </div>
        <div v-if="grouped.value?.length === 0 || grouped.length === 0" class="no-results">
          No matches. Type a full path like /usr/bin/my-tool and press Enter.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.binary-picker { position: relative; }
.add-chip { background: none; border: 1px dashed var(--border); border-radius: 6px;
  color: var(--muted); padding: 4px 10px; font-size: 12px; cursor: pointer; }
.add-chip:hover { border-color: var(--accent2); color: var(--accent2); }
.dropdown { position: absolute; top: calc(100% + 4px); left: 0; z-index: 50;
  background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.4); width: 340px; max-height: 360px;
  display: flex; flex-direction: column; overflow: hidden; }
.search { margin: 8px; padding: 8px 10px; background: var(--bg); border: 1px solid var(--border);
  border-radius: 6px; color: var(--text); font-size: 13px; outline: none; }
.search:focus { border-color: var(--accent2); }
.groups { overflow-y: auto; padding: 0 8px 8px; }
.group { margin-bottom: 6px; }
.cat-label { font-size: 10px; text-transform: uppercase; letter-spacing: .5px;
  color: var(--muted); padding: 6px 6px 4px; }
.bin-option { display: flex; justify-content: space-between; align-items: center;
  width: 100%; background: none; border: none; border-radius: 6px;
  padding: 7px 10px; cursor: pointer; text-align: left; transition: .1s; }
.bin-option:hover { background: var(--panel2); }
.bin-name { color: var(--text); font-size: 13px; font-weight: 500; }
.bin-path { color: var(--muted); font-size: 11px; font-family: monospace; }
.no-results { padding: 12px; color: var(--muted); font-size: 12px; text-align: center; }
</style>
