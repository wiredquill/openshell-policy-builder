import { dump as yamlDump, load as yamlLoad } from 'js-yaml';
import type { Policy } from './schema.js';
import { ALLOWED_TOP_LEVEL } from './schema.js';

export interface ParseResult {
  policy: Policy;
  errors: string[];
}

function dropEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

/** Serialize a Policy to YAML, omitting empty/undefined sections. */
export function serialize(policy: Policy): string {
  const cleaned = dropEmpty(policy as unknown as Record<string, unknown>);
  // version is always present
  return yamlDump(cleaned, { indent: 2, lineWidth: 100, noRefs: true });
}

/** Parse a YAML string into a Policy, collecting structural errors. */
export function parse(text: string): ParseResult {
  const errors: string[] = [];
  let obj: unknown;
  try {
    obj = yamlLoad(text, { json: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`YAML syntax error: ${msg}`);
    return { policy: { version: 1 }, errors };
  }
  if (obj === null || obj === undefined) {
    return { policy: { version: 1 }, errors: ['empty policy'] };
  }
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return { policy: { version: 1 }, errors: ['policy must be a mapping'] };
  }
  const rec = obj as Record<string, unknown>;
  // Detect duplicate top-level keys (js-yaml silently overwrites them).
  const seen = new Set<string>();
  for (const line of text.split('\n')) {
    const m = /^([A-Za-z_][\w.-]*):\s*$/.exec(line);
    if (m) {
      if (seen.has(m[1])) errors.push(`duplicate key: ${m[1]}`);
      else seen.add(m[1]);
    }
  }
  for (const key of Object.keys(rec)) {
    if (!ALLOWED_TOP_LEVEL.has(key as keyof Policy)) {
      errors.push(`unknown top-level field: ${key}`);
    }
  }
  if (rec.version !== 1) {
    errors.push(`version must be 1, got ${String(rec.version)}`);
  }
  const policy = { ...rec, version: 1 } as unknown as Policy;
  return { policy, errors };
}
