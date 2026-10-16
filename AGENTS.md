Headless Base UI primitives for Solid on `@gpuix/solid`, ported from `@base-ui/react` 1.9.0 (tag v1.9.0, ad7ecda). Consumed as source by `../fluid-functionalism-gpuix`; no build step, no styling, no theme tokens.

## Layout
- `src/<folder>/.../<kebab-name>.ts` mirrors `packages/react/src/<folder>/.../<PascalName>.ts` upstream (reference clone: `~/.claude/notes/base-ui-source`), so syncing maps file to file. Each folder has an `index.ts`.
- `package.json` `exports` is `"./*": "./src/*/index.ts"`: consumers import `base-ui-solid-gpuix/<folder>` (nested folders work: `base-ui-solid-gpuix/internals/composite`). New folders need no config.
- Files use relative imports, never `#/*`: the consumer compiles this source with its own tsconfig.
- Primitives take timings and sizes as options; the consumer owns styling constants.

## Commands
- `pnpm check:type` / `pnpm check:test` (bun test, headless) / `pnpm check` / `pnpm format`

## Gotchas
- Exactly one runtime instance of `solid-js` and `@gpuix/solid` may exist across this repo and its consumer. `file:` deps get a per-project store path, so the consumer's pnpm workspace includes this folder and **installs from the consumer's root**; a bare `pnpm install` here links a second `@gpuix/solid`. The consumer's `scripts/check-single-instance.ts` verifies it. `pnpm-workspace.yaml` sets `verifyDepsBeforeRun: false` so pnpm scripts (`pnpm check`) never auto-install from here; keep it, and install standalone only for a clone without the consumer.
- `tsconfig` keeps `noUncheckedIndexedAccess` on; no `!` and no fake fallbacks to satisfy it.
