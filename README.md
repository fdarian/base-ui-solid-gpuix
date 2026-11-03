# ghia-base-ui

Headless [Base UI](https://github.com/mui/base-ui) primitives for Solid on [`@ghia/solid`](https://github.com/fdarian/ghia), ported from `@base-ui/react` 1.9.0.

Each primitive is a `create*` function that returns state and prop objects to spread on your own `@ghia/solid` elements. There is no styling, no theme tokens and no animation in here; timings and sizes arrive as options.

## Status

This is a port of only what [Fluid Functionalism](https://github.com/fdarian/fluid-functionalism-gpuix) (FF) uses: accordion, collapsible, tabs, checkbox, checkbox-group, radio, radio-group, switch, slider, menu, select, combobox, dialog, drawer, tooltip and scroll-area, plus the shared pieces under `internals/`, `floating-ui-solid/` and `utils/`. Base UI parts and props FF never touches are not ported. FF consumes the source directly, with no build step; everyone else installs the built package from npm.

Where the port differs from Base UI 1.9.0, [BASE-UI-AUDIT.md](BASE-UI-AUDIT.md) says so row by row.

## Install

```bash
pnpm add ghia-base-ui @ghia/solid solid-js
```

Peer dependencies are `solid-js` 1.9.15 and `@ghia/solid`. Exactly one runtime instance of each may exist in your app.

### Local development with the consumer

FF links the source instead of installing from npm, as a workspace member of the consumer:

```yaml
# pnpm-workspace.yaml
packages:
  - .
  - ../ghia-base-ui
```

```jsonc
// package.json
"ghia-base-ui": "link:../ghia-base-ui"
```

**Run `pnpm install` from the consumer's root**; a bare `pnpm install` here resolves a second `@ghia/solid` (the consumer's `scripts/check-single-instance.ts` catches it).

## Use it

Import by folder:

```ts
import { createSelectRoot } from 'ghia-base-ui/select';
import { createRowList } from 'ghia-base-ui/internals/composite';
```

`package.json` maps `ghia-base-ui/<folder>` to `src/<folder>/index.ts` (`dist/<folder>/index.js` once published); nested folders work, and a new folder needs no config. Primitive files mirror upstream's layout (`accordion/root/use-accordion-root.ts` for `accordion/root/AccordionRoot.tsx`); the [file map](UPSTREAM.md#file-map) lists all of them.

## Commands

```bash
pnpm check:type   # tsc
pnpm check:test   # bun test, headless
pnpm check        # both
pnpm format       # biome check --write
pnpm build        # tsdown into dist/
```

<details>
<summary>Installing without the consumer</summary>

Run `pnpm install` here; `@ghia/solid` comes from npm. Do this only for a standalone clone: next to a consumer it creates the second instance described above.

</details>

## More

- [UPSTREAM.md](UPSTREAM.md): the Base UI pin, how to sync with a new release, the upstream-to-port file map and how the API differs from React's.
- [BASE-UI-AUDIT.md](BASE-UI-AUDIT.md): Base UI 1.9.0's behaviour against this port, per primitive.
- [AGENTS.md](AGENTS.md): orientation for coding agents working in this repo.
- [LICENSE](LICENSE): MIT. Base UI is MIT, Copyright (c) 2019 Material-UI SAS.
