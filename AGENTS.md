Headless Base UI primitives for Solid on `@gpuix/solid`, ported from `@base-ui/react` 1.9.0 (tag v1.9.0, ad7ecda). Consumed as source by `../fluid-functionalism-gpuix` (FF); no build step, no styling, no theme tokens. Only what FF uses is ported.

## Layout
- `src/<folder>/<part>/<kebab-name>.ts` mirrors `packages/react/src/<folder>/<part>/<PascalName>.tsx` upstream (reference clone: `~/.claude/notes/base-ui-source`). Each folder has an `index.ts`; `exports` is `"./*": "./src/*/index.ts"`, so consumers import `base-ui-solid-gpuix/<folder>`, nested folders included (`.../internals/composite`).
- Component folders: `accordion collapsible tabs checkbox checkbox-group radio radio-group switch slider menu select combobox dialog drawer tooltip scroll-area`. Each exports `create*` functions returning state and prop objects, not components.
- Shared: `internals/` (composite key navigation and `createRowList`, `filter`, `use-transition-status`, `use-anchor-positioning`), `floating-ui-solid/` (click, typeahead, `mark-others`), `utils/` (`pointer-capture`, `form-value`).
- [UPSTREAM.md](UPSTREAM.md) — the pin, how to sync, the upstream-to-port file map and the port-only files; read before moving the pin or adding a primitive.
- [BASE-UI-AUDIT.md](BASE-UI-AUDIT.md) — Base UI vs port, row by row, with `src/...` and `ff:src/...` refs; update the rows you touch.
- Files use relative imports, never `#/*`: the consumer compiles this source with its own tsconfig.
- Primitives take timings and sizes as options; the consumer owns styling constants. Refs are returned as functions because a spread `ref` applies late in gpuix JSX.

## Commands
- `pnpm check:type` / `pnpm check:test` (bun test, headless) / `pnpm check` / `pnpm format`

## Gotchas
- Exactly one runtime instance of `solid-js` and `@gpuix/solid` may exist across this repo and its consumer. `file:` deps get a per-project store path, so the consumer's pnpm workspace includes this folder and **installs from the consumer's root**; a bare `pnpm install` here links a second `@gpuix/solid`. The consumer's `scripts/check-single-instance.ts` verifies it. `pnpm-workspace.yaml` sets `verifyDepsBeforeRun: false` so pnpm scripts (`pnpm check`) never auto-install from here; keep it, and install standalone only for a clone without the consumer.
- `tsconfig` keeps `noUncheckedIndexedAccess` on; no `!` and no fake fallbacks to satisfy it.
