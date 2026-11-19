---
title: Cost at API prices
area: wbx-hud
verified_commit: 72a8242
confidence: high
---

# Cost at API prices

What the work would cost on the API, for comparing a subscription seat with API usage per
developer. Off by default: the opt-in item `cost` ([settings-tab.md](settings-tab.md)).

- **Source**: `$.session.usage().cost.usd`, the session's total as `/cost` has it: Claude Code's
  local estimate from token counts at list prices (or managed `modelPricing`), subagents and
  mods' `$.model` calls included. The engine's types ask a mod to label it an estimate; on a
  subscription it is not billed at all. `hasUnknownPrice` shows as `(a price guessed)`.
- **History** (`wbx-hud/hooks/cost.ts`): the store's `costs` holds a `CostLedger`
  (`wbx-hud/types/index.d.ts`): each local day's cost and each session's last total. Each
  reading ([readings.md](readings.md)) adds the session's growth since its last total to today
  (`recordCost`, `wbx-hud/hooks/cost.ts:59`); a total below the remembered one started over (a
  new process, `/resume`) and counts whole. Days kept 60, sessions remembered 35 days, at most 500.
- **Session id with the usage**: `readAll` reads `$.session.id()` in the same batch as the usage
  (`wbx-hud/hooks/register.tsx:196`); read after git, a `/clear` in between filed the ended
  session's total under the new id and counted it twice (found by the test).
- **Shared store**: `recordCosts` (`wbx-hud/hooks/register.tsx:261`) reads, adds and writes at
  once, and only when the total, name or folder moved (`isNews`); two sessions writing in the
  same moment can still lose one growth. The `costDays` and `costSessions` atoms follow the store
  at every reading, so other sessions' costs show too.
- **Sessions**: each ledger entry keeps its total, first and last reading, folder (the cwd's last
  part) and a name. The name (`sessionName` atom, `betterName`, `wbx-hud/hooks/cost.ts:104`)
  ranks `/rename` (a `command.run` hook, `wbx-hud/hooks/register.tsx:746`) over Claude's title
  over the first typed prompt's first line (`prompt.submit`, `wbx-hud/hooks/register.tsx:739`).
  No API names a session: the title and a `/rename` are read from the transcript's last 64 KB
  (`readTitle`, `wbx-hud/hooks/register.tsx:285`; its `ai-title` and `custom-title` lines,
  `parseTitles`) at each main turn's end. A session that never had a name shows its folder.
- **Days**: local calendar days (`dayKey`); `lastDays` steps by date, not 24 h, so a change of
  summer time skips none (`wbx-hud/hooks/cost.ts:129`).
- **Month projected** (`projectMonth`, `wbx-hud/hooks/cost.ts:144`): the last 30 days' sum over
  the days since the first with a cost, times 30; weekends stay in, as a month has them.
- **Drawn**: the sidebar's COST section after the limits (`wbx-hud/hooks/register.tsx:1287`):
  session, today, 7 and 30 days, the month, a sparkline of up to 30 days, `▸ details`. The
  costs tab, id `wbx-hud-costs` (`wbx-hud/hooks/register.tsx:1541`), opened by that button, `$ costs` in
  the sidebar's title row (there with the section off too) or `/wbx-hud costs`; the ledger is
  kept whether the section is on or not: the sums, the last 10 sessions that cost anything (name and cost, then
  folder and last run; this one marked `●`), then a bar per day newest first, weekends dim.
  The sessions are only in the tab, not the sidebar.
- **Not counted**: sessions without the mod, before 0.12.0, other machines, claude.ai. Pooling
  developers' figures would need a shared place; on the roadmap.
- The bar's `$` segment for API-key users (no rate limits) is older and apart from this
  ([bar.md](bar.md)).

Related: [state-and-store.md](../../architecture/state-and-store.md), [sidebar.md](sidebar.md)
