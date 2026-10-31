---
type: decision-record
title: "Design decisions: API shape, layout and packaging"
description: Why the port is headless create* functions laid out file-for-file like upstream Base UI, why refs come back as functions, why highlight is controllable, and the packaging rules (peer deps, single instance, relative imports) that keep it consumable as source.
tags: [decisions, api, layout, packaging, gpuix, solid]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T05:21:17.049Z
sources:
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-40275cb92c3610938f16ade3
    resource: repo://pnpm-workspace.yaml
  - id: openwiki-source-aca8becc0eaa71ad36246041
    resource: repo://src/floating-ui-solid/hooks/use-hover-reference-interaction.ts
  - id: openwiki-source-697b5f0115297cf4278345dc
    resource: repo://src/internals/composite/root/row-list.ts
  - id: openwiki-source-2b3b3171534e73f44a729911
    resource: repo://src/internals/composite/root/use-composite-root.ts
  - id: openwiki-source-d5c45c0ba0fe9f5bc5e86ee4
    resource: repo://src/internals/use-anchor-positioning.ts
  - id: openwiki-source-cfcbab82e9d82f0ea528ced8
    resource: repo://src/menu/input/menu-search.ts
  - id: openwiki-source-f9664de5df0da5568df4fcea
    resource: repo://src/menu/list/menu-list.ts
  - id: openwiki-source-4cebc6c168c351b2426b73f4
    resource: repo://src/menu/submenu-trigger/menu-submenu-trigger.ts
  - id: openwiki-source-f4b24653c67c1599a4df3bce
    resource: repo://src/select/root/use-select-root.ts
  - id: openwiki-source-25d8786996ca4a96ca5c6d6f
    resource: repo://src/tooltip/trigger/tooltip-trigger.ts
  - id: openwiki-source-ff18555ad70362de0f452788
    resource: repo://UPSTREAM.md
generated: { by: "claude-code", at: "2026-10-17T05:21:17.049Z" }
---

# Design decisions: API shape, layout and packaging

These were settled when the primitives were extracted from Fluid Functionalism (FF) on 2026-10-17. The *what* is already in [UPSTREAM.md, "API shape"](../../UPSTREAM.md#api-shape), the [file map](../../UPSTREAM.md#file-map) and [AGENTS.md](../../AGENTS.md); this page keeps the *why*, and the alternatives that were rejected.

## Headless `create*` functions, not compound components

Base UI is React compound components (`<Select.Root>`, `<Select.Trigger>` ...). The port instead gives each part a Solid function that returns state accessors and prop objects for the consumer to spread on its own gpuix elements.

Why: FF already owns every visual (fluid hover, focus rings, popup surfaces, springs), and a gpuix popup needs gpuix's own components (`<anchored>`, `DismissableLayer`, `Dialog`). Hook-shaped primitives let FF keep its markup and styling and still take behaviour from one place. The extraction itself was a pure refactor: FF's checks and screenshots had to pass unchanged after each slice.

## Layout mirrors upstream, file for file

`src/<component>/<part>/<kebab-name>.ts` corresponds to `packages/react/src/<component>/<part>/<PascalName>.tsx`. Nothing here is a git fork (React/DOM to Solid/gpuix rewrites every line), so staying current means reading upstream diffs and porting them by hand. A one-to-one layout makes that a lookup instead of a search: an upstream diff path names the port file, and the audit's "Base UI ref" column can be grepped for the rows a change touches. Shared code lives where upstream keeps it (`internals/`, `floating-ui-solid/` for `floating-ui-react/`, `utils/`).

`package.json` exports `"./*": "./src/*/index.ts"` so adding a folder never edits a shared file. That mattered during extraction, when five component groups were built in parallel branches and would otherwise all have collided on one exports map.

## Controllable highlight with reasons

Select, Combobox and Menu accept the highlighted index as an option and report every change through `onHighlightChange(index, reason)`. Base UI highlights the hovered item itself; FF's fluid hover picks the nearest row (including in the gaps between rows) and animates to it, so FF must own pointer highlighting. The reason lets FF follow keyboard, typeahead, focus, open and reset changes while the pointer path stays entirely in FF. The menu list never reports a pointer reason: the pointer moves the highlight through FF's own hover, and the list only takes FF's pointer handlers so it can tell keyboard from pointer.

## Hover close is shared, open delays are not

The tooltip and menu submenus both leave their popup open while the pointer travels toward it. The port uses Base UI's safe polygon (`floating-ui-solid/safe-polygon.ts`) for both, run by one tracker (`createHoverHandleClose` in `hooks/use-hover-reference-interaction.ts`) that listens to the window `mousemove` from the trigger's leave until the polygon closes the popup. This replaced a tooltip grace timer and a menu dwell timer. The tracker is split from the open logic because the two consumers open differently: the tooltip has a rest delay and the submenu has its own hover-intent, so each trigger keeps its own open timers and only the close decision is shared. See [gaps](../gpuix/gaps-and-divergences.md) for why this was impossible before gpuix delivered window moves over bare background.

Base UI's `blockPointerEvents` is approximated, not reproduced. Upstream sets `pointer-events: none` on the parent popup while the pointer is on its way to a submenu. Here the menu list ignores pointer movement for that row (`blockedIndex`), so the trigger stays lit under whatever row the pointer crosses, but a click on a sibling row still lands.

## Refs as functions, and Select rows set props one by one

A spread `ref` in gpuix JSX applies in an effect after the element is created, which is after props that depend on that element have been read. The concrete failure: a Select open focuses a row as the popup mounts, and if the row's `tabIndex` arrived through a spread it landed too late for that focus. So primitives return `triggerRef`, `popupRef`, `itemRef(...)` as separate functions to pass as `ref={...}`, and FF's Select rows set their props individually rather than spreading `itemProps`. Keep this in mind before "simplifying" a consumer back to a single spread.

## Dialogs build on gpuix's `Dialog` family

The dialog and drawer primitives return props for gpuix's `Dialog` and its popup instead of re-implementing the layer, focus trap and Escape stack. Re-implementing would duplicate gpuix's dismiss-layer stack, which other popups (the tooltip) also join. The two pieces gpuix does not cover are port-only files: `focus-first.tsx` (gpuix focuses the popup itself; Base UI's focus manager moves on to the first tab stop, see [focus model](focus-model-and-ff-conflicts.md)) and `mark-others`.

## What stays in the consumer and what lives here

Styling constants stay in FF: popup exit durations, dialog fallback timings and top offset, slide offsets, focus-ring visuals. Primitives take timings and sizes as options, so this repo has no theme tokens or animation library.

The one exception is `POPUP_MARGIN`. It looks like a styling constant, but it is Base UI's default collision padding (how far a popup keeps from the window edge), which is behaviour Base UI ships, so it lives in `internals/use-anchor-positioning.ts`.

## `createCompositeRoot` and `createRowList` stay separate

Both handle arrow keys over a list, and consolidation considered merging them. They were kept apart because their semantics differ in ways that each consumer depends on: the composite root stands in for upstream's `useCompositeRoot` for Tabs and Accordion (one orientation's step keys, a modifier-key guard, `preventDefault` and `stopPropagation` on consumed keys), while the row list that radio-group and checkbox-group share orders rows by index, activates with Space and Enter, works on both axes and applies no modifier guard or `stopPropagation`. A merged version would need a flag for every one of those, and either consumer would silently change behaviour if the defaults moved.

## Menu search is FF's layer, woven into the list

`menu/input/menu-search.ts` has no upstream file. Base UI's `Menu.Input` is a virtual-focus filter; FF's dropdown search is a real-focus field that sits in the arrow ring as one more stop. It is FF behaviour, but it lives here because its key handling is interleaved with the menu list's own keys and cannot be layered on from outside. The full list of port-only files and why each exists is in [UPSTREAM.md, "Port-only files"](../../UPSTREAM.md#port-only-files).

## Packaging rules

- **Relative imports only.** FF compiles this source directly with FF's own tsconfig (no build step), so a `#/*` alias here would resolve into FF's tree.
- **Peer dependencies and exactly one runtime instance** of `solid-js` and `@ghia/solid` across both repos. Two instances break context and reactivity silently. A plain `link:` was tried first and failed: `file:` dependencies get a store path per project directory, so each repo got its own `@ghia/solid`. The fix is that FF's pnpm workspace includes this folder and installs run from FF's root; FF's single-instance check guards it. See the [README](../../README.md#use-it).
- **`verifyDepsBeforeRun: false`** in `pnpm-workspace.yaml`. pnpm 12 auto-installs before running a script; run from this folder that install relinked a second `@ghia/solid`, so a plain `pnpm check` here broke the consumer. Keep it off.
- **`noUncheckedIndexedAccess` stays on** here (FF itself turned it off at extraction because it produced hundreds of errors in code that was about to be rewritten). Satisfy it without `!` or fake fallbacks.
