# OpenShell Policy Builder

A visual drag-and-drop builder for [NVIDIA OpenShell](https://docs.nvidia.com/openshell/latest/) sandbox policy YAML (schema v0.1.5). Auto-lints as you edit. Standalone Vite app today; SUSE Rancher extension next.

## What it does

- **Drag-and-drop section palette** — filesystem, landlock, process, network policies, middleware
- **Copy/duplicate any section** with one click
- **Add/remove endpoints, binaries, rules** inline
- **Live YAML output** — updates as you edit
- **Live linter** — validates against OpenShell v0.1.5 schema constraints as you type
- **Import/Export** — paste YAML to import, copy to clipboard, or download `.yaml`

## Quick start

```bash
npm install        # install deps
npm run dev        # Vite dev server (http://localhost:5173)
npm run build      # production build → dist-app/
npm run preview    # serve the production build
npm test           # 55 tests, all passing
npm run typecheck  # tsc --noEmit
```

## Architecture

```
src/
  schema.ts           — OpenShell v0.1.5 policy type definitions
  linter.ts           — lint(policy): LintResult[] — 20+ constraint checks
  yaml.ts             — serialize(policy) / parse(yaml) with js-yaml
  operations.ts       — addSection, copySection, removeSection, reorder, addEndpoint, ...
  usePolicyBuilder.ts — Vue 3 reactive composable wrapping the core
  App.vue             — root component (three-pane layout)
  main.ts             — Vue app entry point
  components/
    PalettePane.vue   — drag-and-drop section palette
    EditorPane.vue    — policy canvas with section cards
    YamlPane.vue      — live YAML output + lint results

test/
  schema.test.ts      — 6 tests
  linter.test.ts       — 29 tests (every constraint, RED→GREEN)
  yaml.test.ts         — 8 tests (round-trip, empty omission, dup-key, parse errors)
  operations.test.ts   — 12 tests (immutability + correctness)

demo/
  openshell-builder.html — self-contained UI (no build step, no external deps)

index.html             — Vite entry point
vite.config.ts         — Vite + Vue plugin config
```

The TypeScript core (`schema.ts`, `linter.ts`, `yaml.ts`, `operations.ts`) is framework-agnostic. The same functions power both the Vite app (via `usePolicyBuilder.ts`) and the self-contained HTML demo. This design lets the core port to a SUSE Rancher Vue extension without rewrite.

## Tests

```bash
npm test           # 55 tests, all passing
npm run typecheck  # tsc --noEmit, clean
npm run build      # vite build → dist-app/ (151 KB JS bundle)
```

## Linter constraints covered (OpenShell v0.1.5)

| Code | Constraint |
|------|-----------|
| `unknown-field` | No unknown top-level fields |
| `path-not-absolute` | Filesystem paths must be absolute |
| `path-dotdot` | Paths must not contain `..` |
| `read-write-root` | `read_write` cannot contain `/` |
| `too-many-paths` | Max 256 paths |
| `root-uid` / `uid-out-of-range` | Process UID: `sandbox` or 1..4294967294 |
| `reserved-key-prefix` | Network policy keys can't start with `_provider_` |
| `port-ports-exclusive` | Set `port` OR `ports`, not both |
| `missing-access-or-rules` | REST/WebSocket/GraphQL need `access` or `rules` |
| `access-rules-exclusive` | `access` and `rules` can't combine |
| `deny-rules-require-protocol` | `deny_rules` require `protocol` |
| `tcp-requires-host-port` | `protocol: tcp` needs host + port |
| `tcp-no-request-fields` | `protocol: tcp` accepts no request fields |
| `wildcard-host-labels` | Wildcard hosts need ≥3 DNS labels |
| `tls-skip-with-protocol` | `tls: skip` incompatible with request protocols |
| `mcp-needs-rules-or-all-methods` | MCP needs `rules` or `allow_all_known_mcp_methods` |
| `too-many-middlewares` | Max 10 middlewares |
| `duplicate-order` | Middleware `order` values must be unique |
| `too-many-host-patterns` | Max 32 host patterns per middleware |
| `policy-too-large` | Max 4 MiB |

## Roadmap: SUSE Rancher extension

The Vite app's Vue 3 components (`App.vue`, `PalettePane.vue`, `EditorPane.vue`, `YamlPane.vue`) and the `usePolicyBuilder` composable are already structured to port into a Rancher UI extension:

1. Wrap the components in a `@rancher/extension` skeleton
2. Register the product + routes via the Rancher extension DSL
3. Package as a Helm chart (`yarn build-pkg` → `dist-pkg/`)
4. The `usePolicyBuilder` composable feeds Rancher's form-validation hooks directly

Reference: [Rancher UI Extensions guide](https://extensions.rancher.io/extensions/v2/extensions-getting-started)
