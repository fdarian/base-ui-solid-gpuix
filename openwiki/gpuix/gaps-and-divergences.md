---
type: constraint
title: gpuix gaps and divergences that shape the primitives
description: Which Base UI behaviours are still blocked by gpuix, which are gaps where gpuix now has the API but the port has not adopted it, and which gpuix DOM-parity changes (event bubbling, pointer capture, focus timing, event targets as elements, appRegion) the primitives depend on.
tags: [gpuix, constraints, events, focus, pointer-capture, audit]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T00:13:17.331Z
sources:
  - id: openwiki-source-e0c02c9e374a589840154900
    resource: repo://BASE-UI-AUDIT.md
  - id: openwiki-source-697b5f0115297cf4278345dc
    resource: repo://src/internals/composite/root/row-list.ts
  - id: openwiki-source-2b3b3171534e73f44a729911
    resource: repo://src/internals/composite/root/use-composite-root.ts
  - id: openwiki-source-f9664de5df0da5568df4fcea
    resource: repo://src/menu/list/menu-list.ts
  - id: openwiki-source-0e84506537834fa0856dadb8
    resource: repo://src/slider/control/slider-control.ts
  - id: openwiki-source-4c72bca77537fec6d6aafc43
    resource: repo://src/switch/thumb/switch-thumb.ts
  - id: openwiki-source-b61569aa58d027fe6855060d
    resource: repo://src/utils/pointer-capture.ts
generated: { by: "claude-code", at: "2026-10-17T00:13:17.331Z" }
---

# gpuix gaps and divergences that shape the primitives

gpuix is a GPU-rendered UI runtime with a DOM-like API, not a browser. Its fork has been moving towards DOM semantics (where the DOM and old gpuix behaviour disagree, the DOM wins), and many of the port's past gaps closed when gpuix did. This page records what still limits the primitives and which gpuix changes they rely on. The row-level details are in [BASE-UI-AUDIT.md](../../BASE-UI-AUDIT.md#summary), and FORK.md in the gpuix repo describes each gpuix deviation.

## Blocked by gpuix (5 audit rows)

gpuix still lacks the capability, so the port cannot match Base UI:

| gpuix lacks | Affected behaviour |
|---|---|
| CSS `transform` scale and rotate (quads, shadows and hit boxes carry no matrix) | Select and Combobox popup `scaleY` entrance. FF's popup does opacity plus a 4 px slide instead. |
| Pointer position over empty space (a geometric safe polygon needs `mousemove` while the pointer is over nothing that listens) | Exact safe polygon for tooltip and menu submenus. A dwell timer (menu, 120 ms) and a grace timer (tooltip) stand in. |
| `<input type="range">` (gpuix's `InputType` has no `range`) | A native range input under each slider thumb. Thumbs are `role="slider"` with ARIA attributes instead. |

**Check this first:** the gpuix review log records the window/document `mousemove` gap as fixed in gpuix's demo-fixes pass of 2026-10-16 (Round 4, item 5: native learns window and document listener types, and a move outside the root reaches them with a null target). If FF's pinned gpuix includes that fix, the two safe-polygon rows may no longer be blocked. Re-probe before porting `safePolygon`, and update the rows either way.

## Gaps: gpuix has the API, the port has not adopted it

A gpuix capability the port has not picked up yet counts as a **gap**, not as blocked. The audit names the API to use for each:

- `display: contents`: menu `RadioGroup`'s `role="group"` wrapper.
- `<input disabled>`: Combobox `disabled` (still `readOnly` plus `tabIndex` -1).
- `position: absolute` against the nearest positioned ancestor: dialog `container`.
- `maskImage`, `onScroll` offsets and rounded overflow clip: scroll fade and thumb inside Select and Combobox popups.
- Motion values (`createMotionValue` / `createSpring`): a switch drag that starts from the live thumb mid-spring.
- Per-element pointer enter and leave without capturing the ancestor: switch hover count.

Each one is small. Fixing one means changing the row's status to `fixed (sha)`.

## gpuix behaviour the primitives depend on

These gpuix changes from the 2026-10-15 to 2026-10-17 fork reviews explain code here that looks odd from a browser's point of view:

- **Pointer capture is explicit.** gpuix dropped implicit pointer capture, so a drag gets its moves and release outside the element only if it asks. That is why the port-only `utils/pointer-capture.ts` exists, used by the slider control and the switch thumb drag: call capture from the press, and end the drag on lost capture too.
- **Events bubble along the logical tree, with DOM capture, target and bubble phases.** A keydown on a focused row reaches the popup panel, which is where the menu handles its keys. Bubbling also means a key can act twice: gpuix's `buttonProps` once clicked a nested element twice on Enter, which was fixed in gpuix. The menu and composite nav keys call `stopPropagation` and ignore Ctrl/Cmd/Alt chords so an outer handler does not act on them as well. The row list deliberately does neither (see [API decisions](../decisions/api-and-layout.md)).
- **Focus timing.** Focus events from `focus()`, `blur()` and `focusNext` are delivered synchronously on macOS, in DOM order (pointerdown, mousedown, blur, focus). `preventDefault` on mousedown keeps focus where it is. Reading focus inside a press handler used to throw (`VIEW_BUSY`), which stopped any popup from opening by pointer; that is fixed. The tab order of a newly mounted popup exists only after it paints, which is why `FocusFirst` waits a tick.
- **Event targets are elements.** Since Round 4, `target`, `currentTarget` and `relatedTarget` on every event are elements, not ids. Code from before that compared ids.
- **The test renderer is not a live window.** Its `press` sends key-down only, and it can disagree with a live macOS window on pointer opens. Behaviour that depends on key-up (switch Space) was checked with a temporary native script, as the audit's harness note says.
- **appRegion** (window-drag regions, now one per line fragment for inline spans) matters to FF's frame bar, not to any primitive here. A primitive inside a drag region would lose its presses to the window drag.

macOS only: Windows and Linux keep async dispatch and are out of scope.

## Related

- [Focus model and FF-vs-Base-UI conflicts](../decisions/focus-model-and-ff-conflicts.md)
- [Design decisions: API shape, layout and packaging](../decisions/api-and-layout.md): refs as functions, because a spread `ref` applies late in gpuix JSX.
