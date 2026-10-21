---
title: /wbx-hud
area: wbx-hud
verified_commit: 240f2bc
confidence: high
---

# /wbx-hud

Registered at `session.start` (`wbx-hud/hooks/register.tsx:506`), answered by a `command.run`
hook (`wbx-hud/hooks/register.tsx:637-704`):

| Subcommand | Does |
|---|---|
| `theme [name]` | lists the themes or switches, kept in the store ([themes.md](themes.md)) |
| `show [both\|bar\|sidebar]` | what is drawn, kept in the store; on `sidebar` the bar's hook still runs to read the width, then returns the hint alone |
| `settings` | opens the settings tab ([settings-tab.md](settings-tab.md)) |
| `pane` | opens or closes the sidebar; refused while `show` is `bar` |
| `demo [percent\|off]` | sweeps the context and both limits 0..100% in 10 s (a 100 ms timer), or pins them, or ends it |

**The demo** writes the `demo` atom; drawings use `withDemo` (`wbx-hud/hooks/register.tsx:464`)
and mark the bar with a dim `demo` segment. Alerts follow the simulated figures; demo toasts
read `wbx-hud demo: …`, start afresh each demo (`demoReached`) and leave the real `alerted`
alone. The pace is hidden during a demo.

Toggles are subcommands and settings-tab rows, not `/config` options
([state-and-store.md](../../architecture/state-and-store.md)).
