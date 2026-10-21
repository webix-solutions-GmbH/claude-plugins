---
title: Testing a mod
area: architecture
verified_commit: 240f2bc
confidence: high
---

# Testing a mod

`claude plugin test <mod>` runs `<mod>/tests/*.test.ts` against a test engine.

- **Stand-ins** answer ops with `{ value: ... }`, e.g. `on('session.cwd', () => ({ value }))`;
  hooks are `($, e, next)`.
- **A bottom `ui.render` hook** must exist when the mod calls `next(e)` there. See `mountAt` in
  `wbx-hud/tests/render.test.ts` and `mountPane` in `wbx-hud/tests/pane.test.ts:102`.
- **JSX splits text**: `+{n}` or `{a} {b}` become separate text children, so `toContain` on the
  serialized tree misses the joined text. Build such texts as one template string.
- **Timers fire on clock jumps**: the test engine fires `$.clock.every` timers when the stand-in
  clock jumps. An `agent.list` stand-in must list a test's agent as running, or the 30 s prune
  drops it ([agents.md](../domains/wbx-hud/agents.md)).
- **Classic hooks pass tests and never run live** ([no-classic-hooks.md](no-classic-hooks.md)).
- Tests cannot show the paint: colors and layout are checked by eye in a real terminal.

Checks before a change is done: see `CLAUDE.md`.
