---
"ghia-base-ui": patch
---

Declare the menu item's `role` and `aria-haspopup`, and the tabs list's `role`, as their literal types instead of `string`, so spreading them onto an `@ghia/solid` element type-checks.
