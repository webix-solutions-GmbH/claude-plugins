---
title: Readings
area: wbx-hud
verified_commit: 240f2bc
confidence: high
---

# Readings

- **One at a time**: `refresh` shares a reading in flight (`reading`), as a main turn's end raises
  both `session.measure` and `turn.complete` (`wbx-hud/hooks/register.tsx:148-156`). Every
  caller catches it, so a failed reading never stops the hook that asked.
- **`readAll`** (`wbx-hud/hooks/register.tsx:158-211`) reads directory, model,
  `$.session.usage({ breakdown: 'summary' })` (estimated locally, no request) and the clock;
  then `git status --porcelain=v2 --branch`, and `git diff --shortstat HEAD` when dirty (2 s
  timeout each, the only external processes). It writes the `snap` atom, adds a 5h sample to
  `burn` ([pace.md](pace.md)) and toasts reached levels ([alerts.md](alerts.md)).
- **Triggers**: session start; every 30 s (`poll`, cancelled and replaced on a new start,
  `wbx-hud/hooks/register.tsx:515-519`); `session.measure`; `turn.complete`; `/cd` and `/model`;
  a `config.set` whose key matches /model/ (`wbx-hud/hooks/register.tsx:578-635`).

Related: [no-classic-hooks.md](../../architecture/no-classic-hooks.md)
