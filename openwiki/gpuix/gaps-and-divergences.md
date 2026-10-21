---
type: constraint
title: gpuix gaps and divergences that shape the primitives
description: Which Base UI behaviours are still blocked by gpuix, which are gaps where gpuix now has the API but the port has not adopted it, and which gpuix DOM-parity changes (event bubbling, pointer capture, focus timing, window mousemove, event targets as elements, appRegion) the primitives depend on.
tags: [gpuix, constraints, events, focus, pointer-capture, audit]
sources:
  - id: openwiki-source-e0c02c9e374a589840154900
    resource: repo://BASE-UI-AUDIT.md
  - id: openwiki-source-aca8becc0eaa71ad36246041
    resource: repo://src/floating-ui-solid/hooks/use-hover-reference-interaction.ts
  - id: openwiki-source-697b5f0115297cf4278345dc
    resource: repo://src/internals/composite/root/row-list.ts
  - id: openwiki-source-2b3b3171534e73f44a729911
    resource: repo://src/internals/composite/root/use-composite-root.ts
  - id: openwiki-source-f9664de5df0da5568df4fcea
    resource: repo://src/menu/list/menu-list.ts
  - id: openwiki-source-79b702fb2c84220a5979ae59
    resource: repo://src/scroll-area/root/use-scroll-area-root.test.ts
  - id: openwiki-source-42dde63d015c4866f0828162
    resource: repo://src/scroll-area/root/use-scroll-area-root.ts
  - id: openwiki-source-206c60a394d51b4a55786f42
    resource: repo://src/scroll-area/scrollbar/use-scroll-area-scrollbar.test.ts
  - id: openwiki-source-607590a00ea4f736c2f7f0b2
    resource: repo://src/scroll-area/scrollbar/use-scroll-area-scrollbar.ts
  - id: openwiki-source-0e84506537834fa0856dadb8
    resource: repo://src/slider/control/slider-control.ts
  - id: openwiki-source-4c72bca77537fec6d6aafc43
    resource: repo://src/switch/thumb/switch-thumb.ts
  - id: openwiki-source-b61569aa58d027fe6855060d
    resource: repo://src/utils/pointer-capture.ts
generated: { by: "claude-code", at: "2026-10-21T16:24:16.572Z" }
verified:
  - by: openwiki/0.7.2
    at: 2026-10-21T16:24:16.572Z
---

# gpuix gaps and divergences that shape the primitives

gpuix is a GPU-rendered UI runtime with a DOM-like API, not a browser. Its fork has been moving towards DOM semantics (where the DOM and old gpuix behaviour disagree, the DOM wins), and many of the port's past gaps closed when gpuix did. This page records what still limits the primitives and which gpuix changes they rely on. The row-level details are in [BASE-UI-AUDIT.md](../../BASE-UI-AUDIT.md#summary), and FORK.md in the gpuix repo describes each gpuix deviation.

## Blocked by gpuix (3 audit rows)

gpuix still lacks the capability, so the port cannot match Base UI:

| gpuix lacks | Affected behaviour |
|---|---|
| CSS `transform` scale and rotate (quads, shadows and hit boxes carry no matrix) | Select and Combobox popup `scaleY` entrance (two rows). FF's popup does opacity plus a 4 px slide instead. |
| `<input type="range">` (gpuix's `InputType` has no `range`) | A native range input under each slider thumb. Thumbs are `role="slider"` with ARIA attributes instead. |

## No longer blocked: the safe polygon

The tooltip and menu submenus used to be "blocked" on an exact safe polygon, because a geometric polygon needs `mousemove` while the pointer is over nothing that listens, and gpuix delivered none. A grace timer (tooltip) and a dwell timer (menu, 120 ms) stood in. gpuix's window `mousemove` now reaches a window listener over bare background (gpuix Round 4, item 5: window and document listener types, with a null target for a move outside the root), so the port runs Base UI's `safePolygon` from a window listener that exists only between the trigger's leave and the popup's close, and both timers are gone. How the pieces are shared is in [API decisions](../decisions/api-and-layout.md#hover-close-is-shared-open-delays-are-not). When a gap of this kind closes upstream in gpuix, re-probe the audit's "blocked" rows before treating them as permanent: this one stayed listed as blocked after the capability existed.

## Gaps: gpuix has the API, the port has not adopted it

A gpuix capability the port has not picked up yet counts as a **gap**, not as blocked. The audit names the API to use for each:

- `display: contents`: menu `RadioGroup`'s `role="group"` wrapper.
- `<input disabled>`: Combobox `disabled` (still `readOnly` plus `tabIndex` -1).
- `maskImage`, `onScroll` offsets and rounded overflow clip: scroll fade and thumb inside Select and Combobox popups.
- Motion values (`createMotionValue` / `createSpring`): a switch drag that starts from the live thumb mid-spring.
- Per-element pointer enter and leave without capturing the ancestor: switch hover count.

Each one is small. Fixing one means changing the row's status to `fixed (sha)`.

## gpuix behaviour the primitives depend on

These gpuix changes from the 2026-10-15 to 2026-10-17 fork reviews explain code here that looks odd from a browser's point of view:

- **Pointer capture is explicit.** gpuix dropped implicit pointer capture, so a drag gets its moves and release outside the element only if it asks. That is why the port-only `utils/pointer-capture.ts` exists, used by the slider control and the switch thumb drag: call capture from the press, and end the drag on lost capture too.
- **Events bubble along the logical tree, with DOM capture, target and bubble phases.** A keydown on a focused row reaches the popup panel, which is where the menu handles its keys. Bubbling also means a key can act twice: gpuix's `buttonProps` once clicked a nested element twice on Enter, which was fixed in gpuix. The menu and composite nav keys call `stopPropagation` and ignore Ctrl/Cmd/Alt chords so an outer handler does not act on them as well. The row list deliberately does neither (see [API decisions](../decisions/api-and-layout.md)).
- **Focus timing.** Focus events from `focus()`, `blur()` and `focusNext` are delivered synchronously on macOS, in DOM order (pointerdown, mousedown, blur, focus). The press's own focus move, or blur when nothing focusable is under the pointer, runs after the `mousedown` handlers return, as in a browser; `preventDefault` on mousedown cancels it. Three consequences in the port: a popup-opening press toggle calls `preventDefault` so the press does not pull focus back from the popup it just focused; a scrollbar press calls it too, because native scrollbars never move focus and gpuix would otherwise blur the focused element; and an outside press that closes a popup needs `refocusAfterPress` to win focus back for the trigger (see [focus model](../decisions/focus-model-and-ff-conflicts.md)). On Windows and Linux the handler runs after native moved focus, where `preventDefault` changes nothing. Reading focus inside a press handler used to throw (`VIEW_BUSY`), which stopped any popup from opening by pointer; that is fixed. The tab order of a newly mounted popup exists only after it paints, which is why `FocusFirst` waits a tick.
- **Event targets are elements.** Since Round 4, `target`, `currentTarget` and `relatedTarget` on every event are elements, not ids. Code from before that compared ids.
- **The test renderer is not a live window.** It can disagree with a live macOS window on pointer opens. Its `press` now sends a key-down then a key-up, so Space-on-key-up (switch) fits a committed scenario; only a held Space still needs the native key-down alone, and `style.active` does not show for it. The audit's harness note has the details.
- **A scroller's integer range is exact since gpuix f7b62f11.** Before it, gpuix rounded `scrollHeight` and `clientHeight` half up while `scrollTop` was clamped to the real fractional range, so with fractional content (29 rows of 19.5 px plus 16 px padding = 581.5 px) `scrollHeight - clientHeight` was 419 against a real end of 418. A "clamp to the range and compare" check then claimed to have moved at the end, and the scroll-area track wheel kept its event instead of chaining to the page. `scrollAlong` worked around it by reading the position back after `scrollTo`. That read-back is gone: the scroller's range now ends exactly at `scrollHeight - clientHeight`, so `scrollAlong` clamps to it, compares with the current position, and returns true after writing. Its test fakes a scroller that clamps `scrollTo` to that range, like Chrome. On a gpuix older than f7b62f11 the wheel sticks at the end again with fractional content.
- **appRegion** (window-drag regions, now one per line fragment for inline spans) matters to FF's frame bar, not to any primitive here. A primitive inside a drag region would lose its presses to the window drag.

macOS only: Windows and Linux keep async dispatch and are out of scope.

## Related

- [Focus model and FF-vs-Base-UI conflicts](../decisions/focus-model-and-ff-conflicts.md)
- [Design decisions: API shape, layout and packaging](../decisions/api-and-layout.md): refs as functions, because a spread `ref` applies late in gpuix JSX.
