---
type: product
title: What ghia-base-ui is
description: The Solid + @ghia/solid port of the @base-ui/react 1.9.0 primitives that Fluid Functionalism uses, published to npm as ghia-base-ui, pinned to mui/base-ui v1.9.0 and consumed as source by FF; only what FF uses is ported.
tags: [product, base-ui, ghia, solid, fluid-functionalism, scope]
sources:
  - id: openwiki-source-4d1d392666be6dfdd7a91a2e
    resource: repo://.github/workflows/release.yml
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-ff18555ad70362de0f452788
    resource: repo://UPSTREAM.md
generated: { by: "claude-code", at: "2026-11-03T23:38:47.409Z" }
verified:
  - by: openwiki/0.7.3
    at: 2026-11-03T23:38:47.409Z
---

# What ghia-base-ui is

A port of the [Base UI](https://github.com/mui/base-ui) primitives to Solid on ghia (`@ghia/solid` over the `@ghia/native` renderer), a GPU-rendered UI runtime with a DOM-like API. It is built for one consumer: **Fluid Functionalism (FF)**, the ghia port of the Fluid Functionalism component library (`fluid-functionalism-gpuix`), which renders all the visuals and takes its behaviour (keyboard, focus, ARIA, popups, list navigation, typeahead, presence) from here.

Setup, commands and imports are in the [README](../../README.md). This page covers scope and the pin, which the code does not explain.

## The pin, and why it is this one

| | |
|---|---|
| Upstream | `github.com/mui/base-ui`, package `@base-ui/react` |
| Version | 1.9.0, tag `v1.9.0` |
| Commit | `ad7ecda5296b0295b41a51ecb01fce6204acd099` |
| Licence | MIT (Base UI: Copyright (c) 2019 Material-UI SAS); this repo is MIT too |

The version was not chosen on merit. It is what FF's own upstream ([mickadesign/fluid-functionalism](https://github.com/mickadesign/fluid-functionalism)) pins in its `package-lock.json`, and the port exists to reproduce what that library does. Move the pin only when FF's upstream moves; [UPSTREAM.md](../../UPSTREAM.md#syncing-with-upstream) has the sync procedure.

## Scope: only what FF uses

Only the components, parts and props FF actually uses are ported. Upstream folders FF never touches (`popover` until the color picker needed it, `field`, `toast`, `navigation-menu` ...) and parts FF styles itself (`Portal`, `Positioner`, `Backdrop`, `Arrow`, `Indicator`, data-attribute and CSS-variable files) are left out on purpose. Don't add unused API "for completeness". The [file map](../../UPSTREAM.md#file-map) lists exactly what exists.

FF-only layers that are not Base UI stay in FF (fluid hover, focus-ring visuals, the inline `Dropdown` panel, command menu, sidebar and the rest). The exceptions live here because they are woven into a primitive's key handling: the menu search field, the slider's `steps` mapping and the switch thumb drag (see [API decisions](../decisions/api-and-layout.md)).

## Status

Published to npm as `ghia-base-ui` (public, MIT), released only from CI: a Changesets version PR, then publish on merge to `main`. Published consumers get the tsdown build in `dist/`, with `solid-js` and `@ghia/solid` as peer dependencies. FF does not use the build: it consumes the TypeScript source through a `link:` dependency and a shared pnpm workspace. The scope is still FF's, so "published" does not mean a general-purpose Base UI port. How closely the port matches Base UI is tracked row by row in [BASE-UI-AUDIT.md](../../BASE-UI-AUDIT.md). At the time of writing that is 426 rows: 190 ported, 182 fixed, 17 gap, 3 blocked by ghia and 34 n/a ([tally](../../UPSTREAM.md#deviations)).

## Related

- [Extraction history (2026-10-17)](../history/extraction.md): how this repo split off from FF.
- [@ghia/solid gaps and divergences](../ghia/gaps-and-divergences.md)
- [Focus model and FF-vs-Base-UI conflicts](../decisions/focus-model-and-ff-conflicts.md)
