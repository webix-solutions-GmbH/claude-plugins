---
title: /wbx-hud
area: wbx-hud
verified_commit: d477e86
confidence: high
---

# /wbx-hud

Registered at `session.start` (`wbx-hud/hooks/register.tsx:531`), answered by a `command.run`
hook (`wbx-hud/hooks/register.tsx:662-729`). A subcommand that fails (an engine refusing to
open or close a pane, say) answers `wbx-hud: <reason>` from the hook's `.catch`, the engine's
prefixes stripped (`failureReason`, `wbx-hud/hooks/register.tsx:290`):

| Subcommand | Does |
|---|---|
| `theme [name]` | lists the themes or switches, kept in the store ([themes.md](themes.md)) |
| `show [both\|bar\|sidebar]` | what is drawn, kept in the store; on `sidebar` the bar's hook still runs to read the width, then returns the hint alone |
| `settings` | opens the settings tab ([settings-tab.md](settings-tab.md)) |
| `pane` | opens or closes the sidebar; refused while `show` is `bar` |
| `demo [percent\|off]` | sweeps the context and both limits 0..100% in 10 s (a 100 ms timer), or pins them, or ends it |

**The demo** writes the `demo` atom; drawings use `withDemo` (`wbx-hud/hooks/register.tsx:489`)
and mark the bar with a dim `demo` segment. Alerts follow the simulated figures; demo toasts
read `wbx-hud demo: …`, start afresh each demo (`demoReached`) and leave the real `alerted`
alone. The pace is hidden during a demo.

Toggles are subcommands and settings-tab rows, not `/config` options
([state-and-store.md](../../architecture/state-and-store.md)).
