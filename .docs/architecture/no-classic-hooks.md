---
title: No classic.* hooks
area: architecture
verified_commit: 240f2bc
confidence: medium
---

# No classic.* hooks

The built-in guard `cc-plugin-sec-default`, loaded with a Team or Enterprise login or managed
settings, has `on('classic.*', ($, e, next) => next.to(e, 'append'))`: user mods never see a
`classic.*` event, and a notice says the hook was skipped.

The test engine does not load the guard, so a classic hook passes its tests and never runs live.

Instead of the classic events wbx-hud hooks:

| Classic event | In its place |
|---|---|
| `SessionStart` after `/clear` | `session.end` with `reason: 'clear'` ([clear.md](../domains/wbx-hud/clear.md)) |
| `CwdChanged` | `command.run` `cd` (`wbx-hud/hooks/register.tsx:625`) |
| `PostModelSwitch` | `command.run` `model`, `config.set` with a key matching /model/ (`wbx-hud/hooks/register.tsx:578,631`) |

Related: [testing.md](testing.md)
