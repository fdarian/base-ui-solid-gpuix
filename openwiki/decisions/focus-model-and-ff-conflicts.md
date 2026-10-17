---
type: decision-record
title: Focus model and FF-vs-Base-UI conflicts
description: The 2026-10-16 decision that popup focus follows Base UI (focus moves into the popup), and the rule that every other disagreement between Fluid Functionalism and Base UI 1.9.0 is resolved in FF's favour, grouped by category with links to the audit's per-section lists.
tags: [decisions, focus, popups, base-ui, fluid-functionalism, audit]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T00:13:17.331Z
sources:
  - id: openwiki-source-e0c02c9e374a589840154900
    resource: repo://BASE-UI-AUDIT.md
  - id: openwiki-source-55befb3be408cce0e4d2cba7
    resource: repo://src/dialog/popup/focus-first.tsx
  - id: openwiki-source-f9664de5df0da5568df4fcea
    resource: repo://src/menu/list/menu-list.ts
  - id: openwiki-source-ff18555ad70362de0f452788
    resource: repo://UPSTREAM.md
generated: { by: "claude-code", at: "2026-10-17T00:13:17.331Z" }
---

# Focus model and FF-vs-Base-UI conflicts

Two rules decide what "correct" means when Base UI 1.9.0 and Fluid Functionalism (FF) disagree. Check both before a sync or a bug fix "corrects" a behaviour back.

## Popups: focus moves into the popup, as in Base UI (2026-10-16)

On 2026-10-16 the user decided the popup focus model should match Base UI: when a popup opens, real focus moves into it, rather than staying on the trigger while the popup shows a separate visual highlight. Before that, the port's dropdown, select and combobox handled focus their own ways. The decision was carried out in a series of focus slices (the audit cites them as F1 to F6) before the primitives moved into this repo, and they show up in the code as:

- **Rows are real focus targets.** Menu and Select rows take focus with a roving `tabIndex`, and the highlighted row is the focused row. The menu search field is a real focus stop too, not Base UI's virtual-focus `Menu.Input`.
- **Dialogs focus their first tab stop.** gpuix's `Dialog` focuses the popup element itself; `dialog/popup/focus-first.tsx` moves focus on to the first tab stop, where Base UI's focus manager puts it. The move waits one tick: gpuix's tab order exists only once the popup has painted, and a synchronous attempt left focus on the popup.
- **Focus goes back on close** to the trigger, but only when focus was still in the popup or nowhere. A control that took focus in the meantime keeps it.
- **Combobox is the exception by design.** Focus stays in the input and the rows are highlighted. That is how Base UI's Combobox works too, so it already fits the rule.

The per-row evidence is in the audit's [Menu](../../BASE-UI-AUDIT.md#menu-base-uireactmenu), [Select](../../BASE-UI-AUDIT.md#select-base-uireactselect) and [Dialog](../../BASE-UI-AUDIT.md#dialog-base-uireactdialog) tables. Some timing details deliberately copy FF instead (below).

## Everything else: the port follows FF

The port exists to be what FF renders, so where Base UI and FF disagree, FF wins. Each audit section ends with an "FF-vs-Base-UI conflicts" list (54 entries in total, see [UPSTREAM.md](../../UPSTREAM.md#ff-vs-base-ui-conflicts)). Those lists are the source of truth. By category:

- **Keyboard behaviour FF's docs show, from the Radix build.** FF's docs pages import the Radix registry, not `registry/base`. So the accordion's Up, Down, Home and End (Base UI 1.9.0 has no accordion arrow keys at all) and tab roving that skips disabled tabs are kept.
- **Activation keys.** Checkbox toggles on Enter and acts on Space keydown (Base UI refuses Enter and acts on keyup). Radio selects on Enter, Home and End (Base UI turns Home and End off), and re-selecting the current value fires `onValueChange` again.
- **Pointer and hover ownership.** FF's fluid hover lights the nearest row, including over gaps. A click anywhere on a switch row toggles it, and dragging the thumb past the midpoint toggles too. The slider uses FF's own track, drag and collision logic, and gives a press on stacked thumbs to thumb 0.
- **Popup opening and closing.** A pointer-opened menu focuses its panel first and then its first row (FF's two-frame effect), where Base UI lights nothing. Select is non-modal, does not align the selected item with the trigger, and closes 300 ms after a pick. Combobox uses `autoHighlight="always"`. Menu radio items close on click for single selection.
- **Timings.** The tooltip provider's delays are 200 and 300 ms; Base UI's are 600 and 400.
- **Structure.** FF's inline `Dropdown` is a `role="group"`, not a menu, and stays FF code. Submenus open on a physical side (right). A dialog reports a replayed close once. The scroll area keeps the Base UI-style bars because gpuix has no touch.

Some disagreements are still open and listed under "Open judgement calls" in each audit section, for example whether arrow keys should land on disabled rows. Those are undecided, not settled.

## Related

- [Design decisions: API shape, layout and packaging](api-and-layout.md): why highlight is controllable and the consumer owns the pointer.
- [Extraction history and known stale notes](../history/extraction.md): the mismatches that were kept on purpose, and the audit Notes known to be stale.
