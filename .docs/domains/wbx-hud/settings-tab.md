---
title: The settings tab
area: wbx-hud
verified_commit: 240f2bc
confidence: high
---

# The settings tab

A second pane, id `wbx-hud-settings` (`wbx-hud/hooks/register.tsx:75`), opened by
`/wbx-hud settings` or the sidebar's `≡ settings`, beside the sidebar at its width; drawn at
`wbx-hud/hooks/register.tsx:1163`; opened, it is the tab in front (seen in the terminal,
2026-10-21). Every choice is kept in the store. An empty line opens it, as it parts its sections.

- **Theme** and **show**: radio rows.
- **Items table**: an item per row (`ITEMS`, `wbx-hud/hooks/sidebar.ts:18`), a sidebar and a bar
  column. Parts (effort, tokens, reset, pace, ...) have a `parent`; `isOn` checks both
  (`wbx-hud/hooks/sidebar.ts:72`). The `hidden` atom and store hold `{ sidebar, bar }`;
  `restoreHidden` (`wbx-hud/hooks/sidebar.ts:54`) also reads the pre-0.8 sections list and
  `isEffortShown`.
- **Alerts**: a check row per alert, the `alertsOff` atom and store ([alerts.md](alerts.md)).
- **Thresholds**: an `Input` per area; an empty field goes back to the `/config` value. The
  mobile app draws no field, so these rows and the rename are left out there.
- **Name field**: Enter runs `/rename <name>` via `$.command.run` once the session is idle.
