---
type: guide
title: Quickstart
description: Where to look for what in base-ui-solid-gpuix, the Solid + gpuix port of the @base-ui/react 1.9.0 primitives that Fluid Functionalism uses. Routes each task to a repo doc or a wiki page.
tags: [quickstart, routing, overview]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T00:13:17.331Z
sources:
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
generated: { by: "claude-code", at: "2026-10-17T00:13:17.331Z" }
---

# Quickstart

base-ui-solid-gpuix ports the Base UI 1.9.0 primitives to Solid on gpuix, limited to what Fluid Functionalism (FF) uses. Each primitive is a headless `create*` function, and FF consumes the source directly. The repo docs are the primary reference. This wiki adds the reasons, the history and the constraints the docs don't hold.

## Start here

| Task | Read |
|---|---|
| Install, import, run checks | [README.md](../README.md) (install from FF's root, never here) |
| Find the port file for an upstream file, or sync to a new Base UI release | [UPSTREAM.md](../UPSTREAM.md): pin, sync steps, file map, port-only files |
| Check whether a behaviour matches Base UI | [BASE-UI-AUDIT.md](../BASE-UI-AUDIT.md), the section's table and its "FF-vs-Base-UI conflicts" list |
| Work in the code (layout, imports, gotchas) | [AGENTS.md](../AGENTS.md) |
| What this repo is for, and why the pin is 1.9.0 | [Overview](product/overview.md) |
| Why the API is shaped this way (refs as functions, controllable highlight, two composite helpers, packaging rules) | [API decisions](decisions/api-and-layout.md) |
| Popup focus, or "Base UI does X but we do Y" | [Focus model and FF conflicts](decisions/focus-model-and-ff-conflicts.md) |
| Something gpuix can't do, or browser-like event behaviour that differs | [gpuix gaps and divergences](gpuix/gaps-and-divergences.md) |
| How the repo came to be, stale audit Notes, mismatches kept on purpose | [Extraction history](history/extraction.md) |

## Before changing behaviour

1. Look the behaviour up in the audit. If it is listed under "FF-vs-Base-UI conflicts", FF's behaviour is the target, not Base UI's.
2. Check whether the row's Note is one of the [known stale ones](history/extraction.md#known-stale-audit-notes).
3. A change to a primitive's shape must also land in FF. Run `pnpm check` in FF as well as here.
