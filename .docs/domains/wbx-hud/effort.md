---
title: The effort beside the model
area: wbx-hud
verified_commit: 240f2bc
confidence: high
---

# The effort beside the model

- **At start** `restore` sets the last effort in use, kept in the store as `effort`
  (`wbx-hud/hooks/register.tsx:449-451`); then `readEffort` (`wbx-hud/hooks/register.tsx:323`)
  replaces it with a configured one if any: `CLAUDE_CODE_EFFORT_LEVEL` (`$.env.get`), else
  `$.settings.read({ key: 'effortLevel' })` (the test stand-in answers the whole object), else
  a `$.config.list()` row whose key matches /effort/. Neither of the first two showed it live.
- **Then** each main-loop `turn.step` names the effort actually applied, after any downgrade,
  and stores it (`wbx-hud/hooks/register.tsx:546-555`). `turn.step` is a streaming event: its
  hook is an `async function*` with `yield* next(e)`.
- `/effort` and a `config.set` whose key matches /effort/ read it again at once
  (`wbx-hud/hooks/register.tsx:572-583`).
