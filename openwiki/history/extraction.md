---
type: history
title: Extraction history (2026-10-17) and known stale notes
description: How the primitives were split out of Fluid Functionalism's port on 2026-10-17 (filter-repo history, five parallel component groups, consolidation, docs), which BASE-UI-AUDIT.md Notes are known to be stale, and which behaviour mismatches with Base UI are kept on purpose.
tags: [history, extraction, audit, maintenance]
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
  - id: openwiki-source-ff18555ad70362de0f452788
    resource: repo://UPSTREAM.md
generated: { by: "claude-code", at: "2026-10-17T00:13:17.331Z" }
---

# Extraction history (2026-10-17) and known stale notes

## Before 2026-10-17

The primitives were first written inside the Fluid Functionalism (FF) gpuix port itself, as `src/lib` helpers and component code, from 2026-10-13 on. `BASE-UI-AUDIT.md` was started there on 2026-10-14, and about 175 of its gaps were fixed in that codebase. On 2026-10-16 the popup focus model was switched to Base UI's (see [focus model](../decisions/focus-model-and-ff-conflicts.md)). That is why this repo's history begins before the repo existed.

## The extraction (2026-10-17)

The goal was a pure refactor. FF's behaviour had to stay the same, and every FF check and screenshot had to pass after each slice. Bugs found along the way were written down rather than fixed in the same commit.

1. **Foundation.** The seven `src/lib` files that became primitives, plus `BASE-UI-AUDIT.md`, were carried over with `git filter-repo`, so `git log --follow` on them reaches back past the split. They were then moved to their upstream-shaped homes: presence to `internals/use-transition-status`, typeahead to `floating-ui-solid/hooks/use-typeahead`, list navigation to `internals/composite/composite`, the popup trigger to `floating-ui-solid/hooks/use-click`, modal to `floating-ui-solid/utils/mark-others`, pointer capture and form value to `utils/`, and the placement part of FF's popup to `internals/use-anchor-positioning`. The scaffold commit is `e78d0e6`.
2. **Five component groups in parallel**, each on its own branch in both repos: **menus** (Menu, menu search, Tooltip), **listbox** (Select, Combobox), **disclosure** (Collapsible, Accordion, Tabs), **controls** (Switch, Checkbox, CheckboxGroup, Radio, RadioGroup, Slider) and **overlays** (Dialog, Drawer, ScrollArea). The merges are `6401a10`, `4eb41ff`, `f643f0c`, `bbcfd6a` and `4d57542`. The `"./*"` exports pattern exists so these branches never collided on a shared file.
3. **Consolidation.** The two key-navigation helpers that controls and disclosure had each produced were moved under `internals/composite/root` but kept as two helpers (`8076342`; why is in [API decisions](../decisions/api-and-layout.md)). `verifyDepsBeforeRun: false` fixed the second-`@gpuix/solid` relink (`0dc9c74`). Biome was migrated (`15d7f8b`), and the combobox filter moved to `internals/filter` (`30c8dca`). `clamp` was left duplicated in FF's scroll area and `scroll-area/utils/scroll-math.ts`, because neither exports it.
4. **Docs.** README, UPSTREAM and AGENTS (`3b48070`). Every audit port ref was refreshed to `src/...` or `ff:src/...` (up to `cc35540`).

The popover primitive and the color picker's adoption of Menu came after this, as a follow-up.

## Known stale audit Notes

The audit refresh left these Notes knowingly out of date, to fix once the color-picker follow-up lands. Don't trust their prose without re-reading the code:

- the **switch key-repeat** row;
- **tabs `activateOnFocus`** (the pointer-activation-timing Note);
- the **Tab rows of the menu and of the color picker's format menu**;
- **dialog rows at lines 679 and 684** (focus return after the exit, and nested dialogs ignoring Escape and outside press).

The color picker's own rows also still need their refs updated.

## Mismatches kept on purpose

These differ from Base UI 1.9.0 and are meant to. A sync should not "fix" them:

- **Radio** selects on Enter, Home and End (Base UI ignores Enter and turns Home and End off).
- **Checkbox** acts on Space keydown (Base UI acts on keyup) and toggles on Enter.
- **Slider** PageUp and PageDown step amount (see the Slider PageUp row and its judgement call; Base UI moves 10 value units without snapping to `step`).
- **Tooltip** has no ARIA. This is a recorded gap.
- **Tooltip provider** delays are 200 and 300 ms (FF), not Base UI's 600 and 400.
- **Accordion** calling `onValueChange` without a value is an FF quirk. It is kept, and it lives in FF, not here.

The full per-section lists are under "FF-vs-Base-UI conflicts" in [BASE-UI-AUDIT.md](../../BASE-UI-AUDIT.md).

## Related

- [What base-ui-solid-gpuix is](../product/overview.md)
- [Focus model and FF-vs-Base-UI conflicts](../decisions/focus-model-and-ff-conflicts.md)
