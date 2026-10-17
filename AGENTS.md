Headless Base UI primitives for Solid on `@gpuix/solid`, ported from `@base-ui/react` 1.9.0 (tag v1.9.0, ad7ecda). Consumed as source by `../fluid-functionalism-gpuix` (FF); no build step, no styling, no theme tokens. Only what FF uses is ported.

## Layout
- `src/<folder>/<part>/<kebab-name>.ts` mirrors `packages/react/src/<folder>/<part>/<PascalName>.tsx` upstream (reference clone: `~/.claude/notes/base-ui-source`). Each folder has an `index.ts`; `exports` is `"./*": "./src/*/index.ts"`, so consumers import `base-ui-solid-gpuix/<folder>`, nested folders included (`.../internals/composite`).
- Component folders: `accordion collapsible tabs checkbox checkbox-group radio radio-group switch slider menu select combobox dialog drawer tooltip scroll-area`. Each exports `create*` functions returning state and prop objects, not components.
- Shared: `internals/` (composite key navigation and `createRowList`, `filter`, `use-transition-status`, `use-anchor-positioning`), `floating-ui-solid/` (click, typeahead, `safe-polygon` with the hover tracker that runs it, `mark-others`), `utils/` (`pointer-capture`, `form-value`).
- [UPSTREAM.md](UPSTREAM.md) — the pin, how to sync, the upstream-to-port file map and the port-only files; read before moving the pin or adding a primitive.
- [BASE-UI-AUDIT.md](BASE-UI-AUDIT.md) — Base UI vs port, row by row, with `src/...` and `ff:src/...` refs; update the rows you touch.
- Files use relative imports, never `#/*`: the consumer compiles this source with its own tsconfig.
- Primitives take timings and sizes as options; the consumer owns styling constants. Refs are returned as functions because a spread `ref` applies late in gpuix JSX.

## Commands
- `pnpm check:type` / `pnpm check:test` (bun test, headless) / `pnpm check` / `pnpm format`

## Gotchas
- Exactly one runtime instance of `solid-js` and `@gpuix/solid` may exist across this repo and its consumer. `file:` deps get a per-project store path, so the consumer's pnpm workspace includes this folder and **installs from the consumer's root**; a bare `pnpm install` here links a second `@gpuix/solid`. The consumer's `scripts/check-single-instance.ts` verifies it. `pnpm-workspace.yaml` sets `verifyDepsBeforeRun: false` so pnpm scripts (`pnpm check`) never auto-install from here; keep it, and install standalone only for a clone without the consumer.
- `tsconfig` keeps `noUncheckedIndexedAccess` on; no `!` and no fake fallbacks to satisfy it.

<!-- OPENWIKI:START -->

## OpenWiki

This repository has a generated `openwiki/` evidence index. It is optional just-in-time context, not required startup reading.

- Do not enumerate, preload, or search wikis at task start. Use retrieval when the user asks for it, when unfamiliar architecture or dependency behavior materially affects the task, or when source inspection leaves an important uncertainty. Stop once the question is grounded.
- When those conditions apply and OpenWiki retrieval tools are available, use `openwiki_search` for just-in-time context and `openwiki_read` for the relevant complete sections. If search returns `workspace_required`, ask which listed workspace to use and retry with its ID.
- Use `openwiki_list_workspaces` or `openwiki_list_wikis` when workspace membership itself needs to be discovered.
- If the retrieval tools are unavailable, read `openwiki/quickstart.md` and follow its links to the relevant pages.
- Treat source code and tests as authoritative. A brief's unknowns and review items are verification gaps, not automatic requirements.
- Prefer the narrowest quiet validation that proves the changed behavior. Preserve complete failure output.

Do not hand-edit generated OpenWiki pages unless explicitly asked; update source code/docs and regenerate the wiki with the OpenWiki agent.

<!-- OPENWIKI:END -->
