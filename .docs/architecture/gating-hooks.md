---
title: Observing a gating hook safely
area: architecture
verified_commit: 240f2bc
confidence: high
---

# Observing a gating hook safely

A gating event (`tool.call`, `agent.spawn`, ...) holds the action until the hooks answer. A hook
that only observes ends in `.catch(($, e, next) => next(e))`: `next` is replay-safe there, so a
failure in the observer passes the call on, its result replayed, without running it twice.

In wbx-hud: the tool feed (`wbx-hud/hooks/register.tsx:531-541`) and the agents' spawn
(`wbx-hud/hooks/register.tsx:558-563`). Inside, the mod's own work runs in `try/finally` or
ends in `.catch(() => {})`, so the call's result always goes back.

Related: [tool-feed.md](../domains/wbx-hud/tool-feed.md), [agents.md](../domains/wbx-hud/agents.md)
