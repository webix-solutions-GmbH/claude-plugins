---
title: Pace and forecast
area: wbx-hud
verified_commit: 240f2bc
confidence: high
---

# Pace and forecast

- **5h** (`last hour`): from the `burn` atom, 5h readings only, one added per reading
  (`wbx-hud/hooks/register.tsx:201-209`), kept in the store and restored at session start.
  `BURN_WINDOW_MS` is an hour, and it shows once the readings span `BURN_MIN_SPAN_MS` (5 min)
  and the usage rose (`wbx-hud/hooks/sidebar.ts:84-85`, `burnRate` at `:173`). A reading
  whose percentage fell, or whose `resetsAt` moved by more than a minute, is a new window and
  starts the readings over (`isNewWindow`, `addSample`, `wbx-hud/hooks/sidebar.ts:135-148`).
- **7d** (`this week`): the share used since the week began, from `resetsAt` minus 7 days
  (`windowRate`, `wbx-hud/hooks/sidebar.ts:188`); no history. Shows from the week's second hour.
- **Forecast** (`forecast`, `wbx-hud/hooks/sidebar.ts:198`): `+12%/h … · full in 4h20m`, or
  `resets first`. In the bar the pace is colored by `paceLevel` (`wbx-hud/hooks/sidebar.ts:242`):
  green when the window resets first; the 7d yellow when it is full only outside work hours
  (`WORK_HOURS`, Mon–Fri 8–19 local, `hasWorkTime`), as nothing of the work week is lost; red
  when full within 4 hours (5h) or a day (7d); orange otherwise. Off there by default; the
  sidebar's pace is dim.
- After a `/clear` the stored readings go on, not start over ([clear.md](clear.md)).
