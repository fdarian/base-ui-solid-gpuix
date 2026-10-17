# Upstream

This is a port of **[Base UI](https://github.com/mui/base-ui)** (`@base-ui/react`, MIT, Copyright (c) MUI) to Solid
on gpuix, limited to the primitives and props that [Fluid Functionalism](https://github.com/fdarian/fluid-functionalism-gpuix)
(FF) uses. Nothing here is a git fork: the upstream is React and DOM, so every file is rewritten, and staying current
means reading upstream diffs and porting them by hand. [BASE-UI-AUDIT.md](BASE-UI-AUDIT.md) records where the port
still differs; this file is how to keep it in step.

## The pin

| | |
|---|---|
| Repository | `github.com/mui/base-ui` |
| Package | `@base-ui/react` 1.9.0 |
| Tag | `v1.9.0` |
| Commit | `ad7ecda5296b0295b41a51ecb01fce6204acd099` |

The version is not a choice: it is what FF's upstream, [mickadesign/fluid-functionalism](https://github.com/mickadesign/fluid-functionalism),
pins in its `package-lock.json`, and the port exists to match that behaviour. Move the pin only when FF's upstream does.

## Syncing with upstream

The reference clone is `~/.claude/notes/base-ui-source/`. If it is gone:

```bash
git clone https://github.com/mui/base-ui ~/.claude/notes/base-ui-source
git -C ~/.claude/notes/base-ui-source checkout v1.9.0
```

1. **Find what changed in the folders the port has.** From the clone, with the new tag as `<new-tag>`:

   ```bash
   B=~/.claude/notes/base-ui-source
   git -C $B fetch --tags
   git -C $B diff --stat v1.9.0 <new-tag> -- \
     packages/react/src/{accordion,collapsible,tabs,checkbox,checkbox-group,radio,radio-group,switch,slider,menu,select,combobox,dialog,drawer,tooltip,scroll-area,popover} \
     packages/react/src/internals/{composite,filter.ts,useTransitionStatus.ts,useAnchorPositioning.ts} \
     packages/react/src/floating-ui-react/hooks/{useClick,useTypeahead}.ts \
     packages/react/src/floating-ui-react/utils/markOthers.ts
   ```

   Drop `--stat` and narrow the paths to read one component's diff. Folders upstream has and the port does not
   (`field`, `toast`, `navigation-menu` and the rest) are out of scope until FF uses them.
2. **Walk the audit rows of every changed file.** The audit's "Base UI ref" column cites upstream as
   `<folder>/<part>/<File>.tsx:lines`, so `grep -n 'accordion/root/AccordionRoot' BASE-UI-AUDIT.md` lists the rows a
   change to that file can touch. For each: does the behaviour still hold? Update the port and the row's Status and
   Notes; add a row for a new behaviour FF uses. Upstream line numbers move with every edit, so re-pin the "Base UI
   ref" cells of changed files as you go.
3. **Port each change** to the file the [map](#file-map) names, then refresh the port refs in the audit rows
   (`src/...:lines` for this repo, `ff:src/...:lines` for FF code).
4. **Check FF.** A primitive's shape change (a renamed option, a moved prop) lands in FF's consumer too. Run
   `pnpm check` in FF, which installs and links this folder; this repo's own `pnpm check` is `tsc` plus headless
   `bun test`.
5. **Move the pin.** Change the version, tag and commit in the table above, the header of
   [BASE-UI-AUDIT.md](BASE-UI-AUDIT.md), `AGENTS.md`, `README.md` and the `package.json` description.

## File map

Upstream paths are relative to `packages/react/src/`; port paths to `src/`. A grouped row reads as "each file on the
left lands in the matching file on the right". Upstream names are PascalCase (`AccordionRoot.tsx`); the port's are
kebab-case, `use-*.ts` where upstream has a `use*` hook and `create*` is the exported function.

| Upstream | Port |
|---|---|
| `accordion/root/AccordionRoot.tsx` | `accordion/root/use-accordion-root.ts` (and its test) |
| `accordion/item/AccordionItem.tsx` | `accordion/item/use-accordion-item.ts` |
| `accordion/trigger/AccordionTrigger.tsx` | `accordion/trigger/use-accordion-trigger.ts` |
| `accordion/panel/AccordionPanel.tsx` | `accordion/panel/use-accordion-panel.ts` |
| `collapsible/root/useCollapsibleRoot.ts` | `collapsible/root/use-collapsible-root.ts` (and its test) |
| `collapsible/trigger/CollapsibleTrigger.tsx` | `collapsible/trigger/use-collapsible-trigger.ts` |
| `collapsible/panel/useCollapsiblePanel.ts` | `collapsible/panel/use-collapsible-panel.ts` |
| `tabs/root/TabsRoot.tsx` | `tabs/root/use-tabs-root.ts` (and its test) |
| `tabs/{list/TabsList,tab/TabsTab,panel/TabsPanel}.tsx` | `tabs/{list/use-tabs-list,tab/use-tabs-tab,panel/use-tabs-panel}.ts` |
| `checkbox/root/CheckboxRoot.tsx` | `checkbox/root/checkbox-root.ts` |
| `checkbox-group/CheckboxGroup.tsx` | `checkbox-group/checkbox-group.ts` (rows from `createRowList`; no `useCheckboxGroupParent`) |
| `radio/root/RadioRoot.tsx` | `radio/root/radio-root.ts` |
| `radio-group/RadioGroup.tsx` | `radio-group/radio-group.ts` |
| `switch/root/SwitchRoot.tsx` | `switch/root/switch-root.ts` |
| `switch/thumb/SwitchThumb.tsx` | `switch/thumb/switch-thumb.ts` (plus the port-only thumb drag) |
| `slider/{root/SliderRoot,control/SliderControl,thumb/SliderThumb,value/SliderValue}.tsx` | `slider/{root/slider-root,control/slider-control,thumb/slider-thumb,value/slider-value}.ts` |
| `slider/utils/roundValueToStep.ts` | `slider/utils/round-value-to-step.ts` (and its test) |
| `slider/utils/getSliderValue.ts`, `utils/valueToPercent.ts` | `slider/utils/value-pixel.ts` (partly port-only, see below) |
| `menu/root/MenuRoot.tsx` | `menu/root/menu-root.ts` |
| `menu/trigger/MenuTrigger.tsx` | `menu/trigger/menu-trigger.ts` |
| `menu/list/MenuList.tsx` | `menu/list/menu-list.ts` |
| `menu/item/{MenuItem.tsx,useMenuItem.ts}` | `menu/item/menu-item.ts` |
| `menu/submenu-root/MenuSubmenuRoot.tsx` | `menu/submenu-root/menu-submenu-root.ts` |
| `menu/submenu-trigger/MenuSubmenuTrigger.tsx` | `menu/submenu-trigger/menu-submenu-trigger.ts` |
| `select/root/SelectRoot.tsx` (with the behaviour of `SelectTrigger`, `SelectItem`, `SelectList`) | `select/root/use-select-root.ts` |
| `combobox/root/{ComboboxRoot,AriaCombobox}.tsx` (with `ComboboxInput`, `ComboboxItem`, `ComboboxList`) | `combobox/root/use-combobox-root.ts` |
| `dialog/root/{DialogRoot.tsx,useDialogRoot.ts,DialogRootContext.ts}` | `dialog/root/{use-dialog-root,dialog-root-context}.ts` |
| `dialog/{popup/DialogPopup,title/DialogTitle,description/DialogDescription,trigger/DialogTrigger}.tsx` | `dialog/{popup/use-dialog-popup,title/use-dialog-title,description/use-dialog-description,trigger/use-dialog-trigger}.ts` |
| `drawer/root/DrawerRoot.tsx` | `drawer/root/use-drawer-root.ts` |
| `tooltip/root/TooltipRoot.tsx` | `tooltip/root/tooltip-root.ts` |
| `tooltip/trigger/TooltipTrigger.tsx`, `tooltip/popup/TooltipPopup.tsx` | `tooltip/trigger/tooltip-trigger.ts`, `tooltip/popup/tooltip-popup.ts` |
| `tooltip/provider/TooltipProvider.tsx` | `tooltip/provider/tooltip-provider.ts` (and its test) |
| `popover/root/PopoverRoot.tsx` (with `useDismiss`'s outside press and Escape) | `popover/root/popover-root.ts` |
| `popover/trigger/PopoverTrigger.tsx` | `popover/trigger/popover-trigger.ts` |
| `popover/{popup/PopoverPopup,positioner/PopoverPositioner}.tsx` | `popover/popup/popover-popup.ts` (the positioner's side, align and offset fold in) |
| `scroll-area/constants.ts` | `scroll-area/constants.ts` (`ARROW_PX`, `PAGE_SHARE`, `USER_SCROLL_MS` are port-only) |
| `scroll-area/root/ScrollAreaRoot.tsx` | `scroll-area/root/use-scroll-area-root.ts` |
| `scroll-area/scrollbar/ScrollAreaScrollbar.tsx` | `scroll-area/scrollbar/use-scroll-area-scrollbar.ts` |
| `scroll-area/viewport/ScrollAreaViewport.tsx` (thumb sizing and position) | `scroll-area/viewport/get-thumb.ts` (and its test) |
| `internals/composite/composite.ts` | `internals/composite/composite.ts` (and its test) |
| `internals/composite/root/useCompositeRoot.ts` | `internals/composite/root/use-composite-root.ts` |
| `internals/filter.ts` | `internals/filter.ts` (`contains` only; and its test) |
| `internals/useTransitionStatus.ts` | `internals/use-transition-status.ts` (`createPresence`: a timed exit, not CSS animations) |
| `internals/useAnchorPositioning.ts` | `internals/use-anchor-positioning.ts` (placement state; the flip itself is gpuix's `<anchored>`) |
| `floating-ui-react/hooks/useClick.ts` | `floating-ui-solid/hooks/use-click.ts` |
| `floating-ui-react/hooks/useTypeahead.ts` | `floating-ui-solid/hooks/use-typeahead.ts` (and its test) |
| `floating-ui-react/utils/markOthers.ts` | `floating-ui-solid/utils/mark-others.ts` |
| the hidden `<input>` inside `CheckboxRoot`, `SwitchRoot`, `RadioRoot` | `utils/form-value.tsx` |

Each folder also has an `index.ts`, which is what `base-ui-solid-gpuix/<folder>` resolves to. Upstream parts with no
counterpart are not ported because FF styles them itself or never uses them: every `*DataAttributes.ts`, `*CssVars.ts`
and `*Context.ts` (except the dialog's), `Portal`, `Positioner`, `Backdrop`, `Arrow`, `Indicator`, `Header`, `Label`,
the store and handle classes, and the whole `Item`/`Group`/`Chip` family of Select and Combobox beyond what the root
hook folds in.

### Port-only files

No upstream file; each exists because gpuix or FF needs it.

| Port file | Why |
|---|---|
| `utils/pointer-capture.ts` | gpuix captures a pointer only when asked, so a drag calls `createPointerCapture`; React uses `setPointerCapture` inline in `SliderControl` and the scroll bar. |
| `internals/composite/root/row-list.ts` | `createRowList` stands in for `CompositeRoot`'s key handling over a list of rows that radio-group and checkbox-group share (ordered by index, Space and Enter activate). Kept apart from `use-composite-root.ts`: different ordering, modifier and `preventDefault` rules. |
| `menu/input/menu-search.ts` | A search field woven into the menu's list keys. It is FF's layer (`dropdown-search`), not `Menu.Input`, which is Base UI's virtual-focus filter. |
| `slider/utils/value-pixel.ts` | Value to pixel mapping for a thumb that stays inside the track, with the `steps` list FF's slider adds (Base UI works on indices). |
| `switch/thumb/switch-thumb.ts` (the drag part) | FF's switch thumb can be dragged; Base UI's cannot. |
| `scroll-area/viewport/get-key-scroll.ts` | What a browser does for a focused scroller (arrows, pages, Home and End); gpuix has no native keyboard scrolling. |
| `scroll-area/utils/scroll-math.ts` | `clamp` (Base UI imports it from `@base-ui/utils`) and `pointerAlong`. |
| `dialog/popup/focus-first.tsx` | Moves focus from the popup to its first tab stop, as Base UI's focus manager does; gpuix focuses the popup itself. |
| `dialog/root/dialog-root-context.ts` | The dialog parts share state through a context; upstream's store classes are not ported. |

## API shape

Base UI is React compound components; this port is headless `create*` functions.

- **A function per part, not a component.** `createSelectRoot(options)` returns accessors and prop objects
  (`triggerProps`, `popupProps`, `itemProps(item, index)`) that the consumer spreads on its own gpuix elements. There is
  no styling, no theme token and no animation library in this repo; timings and sizes arrive as options.
- **Refs are returned as functions.** A spread `ref` applies late in gpuix JSX, after props that depend on the element
  (for instance a row's `tabIndex` against the open's focus), so the primitives return ref functions and the consumer
  sets props and refs one by one where order matters.
- **Controllable highlight with reasons.** Select, Combobox and Menu take the highlighted index as an option and report
  every change through `onHighlightChange(index, reason)` with a reason (`keyboard`, `typeahead`, `focus`, `pointer`,
  `reset`, and so on), so the consumer's own highlight (fluid hover) can follow or ignore it.
- **Pointer highlight belongs to the consumer.** Base UI highlights on hover itself. Here the consumer's fluid hover owns
  it, and the menu list takes its pointer handlers (`pointer: { onMouseEnter, onMouseMove, onMouseLeave }`).
- **Dialogs build on gpuix's `Dialog` family.** The dialog and drawer hooks return props for gpuix's `Dialog` and its
  popup instead of re-implementing the layer, focus trap and Escape stack; `FocusFirst` and `mark-others` cover what
  Base UI's focus manager and `markOthers` do beyond it.
- **One gpuix instance.** The primitives import `@gpuix/solid` and `solid-js` as peers; see the README for the
  single-instance rule.

## Deviations

[BASE-UI-AUDIT.md](BASE-UI-AUDIT.md) compares one primitive per section, limited to the parts and props FF uses, against
Base UI 1.9.0's source and this port, row by row. Port refs read `src/...:lines` for this repo and
`ff:src/...:lines` for code that stayed in FF. Each row has one **Status**:

- **ported** (191): same behaviour.
- **gap** (18): fixable in the port and not fixed. Six are gpuix capabilities the port has not adopted yet (the note
  names the API to use); six are the popover's missing controlled `open`, Escape from anywhere, close on focus-out,
  focus into the popup, focus back to the trigger and Space on key-up; six are FF-only layers that are not Base UI or limits of the demos (select gap click,
  combobox `onCreate`, `variant`, `error` and `size`, mount-order indices for accordion items and tabs, tabs-subtle
  overflow).
- **fixed (sha)** (177): was a gap, fixed in this port at that commit.
- **blocked by gpuix** (5): gpuix still lacks the capability: CSS `transform` scale and rotate (the select and combobox
  popup entrance), pointer position over empty space (an exact safe polygon for tooltip and submenus), and
  `<input type="range">` (a native range input under each slider thumb).
- **n/a** (33): FF overrides the behaviour, or it is out of scope (`DirectionProvider` and RTL, the `active` and
  `asChild` button props, the inline `Dropdown` panel, which is FF's own code, the popover's modal mode, portal,
  trigger id and Title / Description names).

| Section | Rows | ported | gap | fixed | blocked | n/a |
|---|---|---|---|---|---|---|
| [Accordion](BASE-UI-AUDIT.md#accordion-base-uireactaccordion) | 20 | 9 | 1 | 8 | 0 | 2 |
| [Collapsible](BASE-UI-AUDIT.md#collapsible-base-uireactcollapsible) | 11 | 7 | 0 | 3 | 0 | 1 |
| [Tabs](BASE-UI-AUDIT.md#tabs-base-uireacttabs) | 25 | 12 | 2 | 9 | 0 | 2 |
| [Button](BASE-UI-AUDIT.md#button-base-uireactbutton) | 11 | 7 | 0 | 2 | 0 | 2 |
| [Checkbox](BASE-UI-AUDIT.md#checkbox-base-uireactcheckbox) | 21 | 12 | 0 | 6 | 0 | 3 |
| [RadioGroup + Radio](BASE-UI-AUDIT.md#radiogroup--radio-base-uireactradio-group-base-uireactradio) | 18 | 10 | 0 | 5 | 0 | 3 |
| [Switch](BASE-UI-AUDIT.md#switch-base-uireactswitch) | 17 | 10 | 1 | 4 | 0 | 2 |
| [Slider](BASE-UI-AUDIT.md#slider-base-uireactslider) | 29 | 14 | 0 | 13 | 1 | 1 |
| [Menu](BASE-UI-AUDIT.md#menu-base-uireactmenu) (with the inline Dropdown and the color picker format menu) | 71 | 34 | 1 | 32 | 1 | 3 |
| [DirectionProvider](BASE-UI-AUDIT.md#directionprovider-base-uireactdirection-provider) | 5 | 1 | 0 | 0 | 0 | 4 |
| [Select](BASE-UI-AUDIT.md#select-base-uireactselect) | 44 | 13 | 2 | 26 | 1 | 2 |
| [Combobox](BASE-UI-AUDIT.md#combobox-base-uireactcombobox) | 47 | 14 | 4 | 27 | 1 | 1 |
| [Dialog](BASE-UI-AUDIT.md#dialog-base-uireactdialog) (with the mobile drawer) | 32 | 16 | 1 | 15 | 0 | 0 |
| [Tooltip](BASE-UI-AUDIT.md#tooltip-base-uireacttooltip) | 23 | 11 | 0 | 10 | 1 | 1 |
| [ScrollArea](BASE-UI-AUDIT.md#scrollarea-base-uireactscroll-area) | 31 | 12 | 0 | 17 | 0 | 2 |
| [Popover](BASE-UI-AUDIT.md#popover-base-uireactpopover) | 19 | 9 | 6 | 0 | 0 | 4 |
| **Total** | **424** | **191** | **18** | **177** | **5** | **33** |

The audit's [Summary](BASE-UI-AUDIT.md#summary) groups what is left by cause.

### FF-vs-Base-UI conflicts

Where Base UI and FF disagree, the port follows FF, because the port exists to be what FF renders. Each audit section
ends with an "FF-vs-Base-UI conflicts" list (54 entries in all), for example: FF's docs pages show the Radix registry's
keyboard behaviour (the accordion's Up, Down, Home and End, which Base UI 1.9.0 does not have), the tooltip provider's
delays are 200 and 300 ms against Base UI's 600 and 400, and the menu's search field is a tab stop of its own. Those
behaviours are kept on purpose and listed per section, so a sync does not "fix" them back.

Tooltip has no ARIA (a recorded gap), and `clamp` exists twice, in `scroll-area/utils/scroll-math.ts` and in FF's
scroll area, because neither exports it.
