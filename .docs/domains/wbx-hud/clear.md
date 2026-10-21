---
title: After /clear
area: wbx-hud
verified_commit: 240f2bc
confidence: medium
---

# After /clear

`/clear` goes on under a new session id with the session's `$.state` values started over, and
no `session.start` fires.

- A `session.end` hook with `reason: 'clear'` starts `clearWatch`, a 100 ms `$.clock.every`, at
  most `CLEAR_TRIES` = 50 times (`wbx-hud/hooks/register.tsx:423,602-621`).
- `afterClear` (`wbx-hud/hooks/register.tsx:427`) waits until `$.session.id()` is no longer the
  ended one, then runs `restore` (stored settings, the last effort,
  `wbx-hud/hooks/register.tsx:436`) and a reading.
- `readAll` takes the stored burn readings when the atom is empty, so a reading after a clear
  never overwrites them (`wbx-hud/hooks/register.tsx:199-203`).

Confidence medium: covered by tests, not yet confirmed live.

Related: [no-classic-hooks.md](../../architecture/no-classic-hooks.md)
