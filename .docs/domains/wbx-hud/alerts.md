---
title: Levels and alerts
area: wbx-hud
verified_commit: 240f2bc
confidence: high
---

# Levels and alerts

- **Levels**: `levelOf` (`wbx-hud/hooks/levels.ts:50`) gives 0..3 (green, yellow, orange, red)
  from an area's three thresholds; `levelColor` picks the theme's color. Defaults:
  `DEFAULT_LEVELS` (`wbx-hud/hooks/levels.ts:7`): context 20,30,50; 5h 50,70,90; 7d 50,75,90.
- **Thresholds**: the `/config` options are the base (`wbx-hud/hooks/register.tsx:489-493`); the
  settings tab's, stored as `levels`, go over them; the `thresholds` atom holds the result.
  A value that is not three ascending numbers from 0 to 100 falls back to the default.
- **Fill**: from `FILL_FROM` (context 1, limits 2, `wbx-hud/hooks/register.tsx:366`) the bar
  segment and the sidebar heading fill with the level color and the theme's `ink`.
- **Hint**: from orange the context adds `→ /clear` (bar) or `→ a good point to /clear` (sidebar).
- **Toasts**: `toastLevels` (`wbx-hud/hooks/register.tsx:385`, called at the end of `readAll`)
  toasts on reaching 2 or 3; the levels reached are kept in the store as `alerted`, so a limit
  does not repeat itself across sessions.
- **Band**: at 3, an `AbovePrompt` band per area until it falls back
  (`wbx-hud/hooks/register.tsx:1136`).
- Each of fill, hint, toast and band can be switched off: the `alertsOff` atom and store
  (`ALERTS`, `wbx-hud/hooks/register.tsx:354`).
