# base-ui-solid-gpuix

Headless [Base UI](https://github.com/mui/base-ui) primitives for Solid on [`@ghia/solid`](https://github.com/fdarian/ghia), ported from `@base-ui/react` 1.9.0.

Each primitive is a `create*` function that returns state and prop objects to spread on your own gpuix elements. There is no styling, no theme tokens and no animation in here; timings and sizes arrive as options.

## Status

This is a port of only what [Fluid Functionalism](https://github.com/fdarian/fluid-functionalism-gpuix) (FF) uses: accordion, collapsible, tabs, checkbox, checkbox-group, radio, radio-group, switch, slider, menu, select, combobox, dialog, drawer, tooltip and scroll-area, plus the shared pieces under `internals/`, `floating-ui-solid/` and `utils/`. Base UI parts and props FF never touches are not ported. It is private and unpublished; FF consumes the source directly, with no build step.

Where the port differs from Base UI 1.9.0, [BASE-UI-AUDIT.md](BASE-UI-AUDIT.md) says so row by row.

## Use it

It is consumed as source through a `link:` dependency, as a workspace member of the consumer. FF does it like this:

```yaml
# pnpm-workspace.yaml
packages:
  - .
  - ../base-ui-solid-gpuix
```

```jsonc
// package.json
"base-ui-solid-gpuix": "link:../base-ui-solid-gpuix"
```

Peer dependencies are `solid-js` 1.9.15 and `@ghia/solid`. Exactly one runtime instance of each may exist across this repo and the consumer, so **run `pnpm install` from the consumer's root**; a bare `pnpm install` here links a second `@ghia/solid` (the consumer's `scripts/check-single-instance.ts` catches it).

Import by folder:

```ts
import { createSelectRoot } from 'base-ui-solid-gpuix/select';
import { createRowList } from 'base-ui-solid-gpuix/internals/composite';
```

`package.json` maps `base-ui-solid-gpuix/<folder>` to `src/<folder>/index.ts`; nested folders work, and a new folder needs no config. Primitive files mirror upstream's layout (`accordion/root/use-accordion-root.ts` for `accordion/root/AccordionRoot.tsx`); the [file map](UPSTREAM.md#file-map) lists all of them.

## Commands

```bash
pnpm check:type   # tsc
pnpm check:test   # bun test, headless
pnpm check        # both
pnpm format       # biome check --write
```

<details>
<summary>Installing without the consumer</summary>

Clone the sibling `ghia` repository next to this one (the dev dependencies point at `../ghia/packages/*`) and run `pnpm install` here. Do this only for a standalone clone: next to a consumer it creates the second instance described above.

</details>

## More

- [UPSTREAM.md](UPSTREAM.md): the Base UI pin, how to sync with a new release, the upstream-to-port file map and how the API differs from React's.
- [BASE-UI-AUDIT.md](BASE-UI-AUDIT.md): Base UI 1.9.0's behaviour against this port, per primitive.
- [AGENTS.md](AGENTS.md): orientation for coding agents working in this repo.
- [LICENSE](LICENSE): MIT. Base UI is MIT, Copyright (c) 2019 Material-UI SAS.
