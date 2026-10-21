---
title: Running agents
area: wbx-hud
verified_commit: 240f2bc
confidence: high
---

# Running agents

- **In**: from `agent.spawn` (type, task, model; gating, pass-through `.catch`) or an agent's
  `turn.start` (type and task from `$.agent.list()`) (`wbx-hud/hooks/register.tsx:558-569`).
  `upsertAgent` adds or fills one (`wbx-hud/hooks/register.tsx:234`).
- **Out**: at its `turn.complete` (`endAgent`, `wbx-hud/hooks/register.tsx:260`). The
  module-level `ended` set keeps a late spawn answer from bringing one back.
- **Context**: the input side of the agent's last `turn.step` result (`inputTokens`,
  `wbx-hud/hooks/sidebar.ts:121`); the window from `agentWindow` (`:129`): the session's when
  the agent runs on the session's model, else 1M for a `[1m]` model and 200k otherwise.
- **Ticks**: a 1 s `$.clock.every` writes the `tick` atom while any run, for the elapsed times;
  a ticker whose ticks stopped (a refused period) restarts at the next agent request.
- **Prune**: the 30 s timer drops agents the list shows ended or omits, if older than a minute
  (`pruneAgents`, `wbx-hud/hooks/register.tsx:277`).
- **Drawn**: a sidebar section only while one runs or one is viewed; a row's press is
  `$.ui.view({ agentId })`, which answers `{ deny }` rather than rejecting: `viewAgent` toasts it
  (`wbx-hud/hooks/register.tsx:270`). In the bar: `↳ N agents`.

Testing trap: [testing.md](../../architecture/testing.md).
