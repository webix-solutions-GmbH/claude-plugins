---
title: The API reference and the engine's rules
area: architecture
verified_commit: 240f2bc
confidence: medium
---

# The API reference and the engine's rules

- **The reference** is `claude-code.d.ts` (about 14,000 lines), written by the engine: the
  plugin-authoring skill names its path when it loads; once a mod has loaded, the same lies in
  `<mod>/.claude-plugin/types/` (ignored by git through its own `.gitignore`). Grep it for the
  event or noun at hand (`'tool.call'`, `Pane: {`). Its header: the surface is early access and
  may change between releases. Load the plugin-authoring skill before changing a mod.
- **`$` only to top-level functions**: the validator refuses passing `$` to a function not
  declared at the module's top level. wbx-hud's helpers (`refresh`, `readAll`, `startRun`, ...)
  are top-level for that reason (`wbx-hud/hooks/register.tsx:151`).
- **`$.clock.every` returns a `Timer`** with `.cancel()`, not a stop function
  (`wbx-hud/hooks/register.tsx:515-516`).
- **A reload** (a file change in a hot-reloading session, or a `userConfig` change) runs
  `register` and `session.start` again; `$.state` and `$.store` stay, module variables start over.
- **The terminal width** for layout decisions is `e.viewport?.columns` in a render hook.

Related: [state-and-store.md](state-and-store.md), [testing.md](testing.md)
