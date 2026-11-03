# Files

- [Design decisions: API shape, layout and packaging](api-and-layout.md) - Why the port is headless create* functions laid out file-for-file like upstream Base UI, why refs come back as functions, why highlight is controllable, and the packaging rules (peer deps, single instance, relative imports, no JSX in src) that keep it consumable both as source and as the published npm package.
- [Focus model and FF-vs-Base-UI conflicts](focus-model-and-ff-conflicts.md) - The 2026-10-16 decision that popup focus follows Base UI (focus moves into the popup), and the rule that every other disagreement between Fluid Functionalism and Base UI 1.9.0 is resolved in FF's favour, grouped by category with links to the audit's per-section lists.
