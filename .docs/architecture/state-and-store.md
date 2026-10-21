---
title: $.state atoms and $.store
area: architecture
verified_commit: 240f2bc
confidence: high
---

# $.state atoms and $.store

- **Atoms** hold what a drawing reads: `atom({ plugin, key }, initial)`, `read($, atom)` while
  drawing, `update($, atom, fn)` elsewhere; a write redraws the readers. wbx-hud's atoms:
  `wbx-hud/hooks/register.tsx:47-66`.
- **The contract**: every atom is declared in the mod's `types/index.d.ts` under
  `interface PluginState`, the key quoted when hyphenated (`'wbx-hud': {...}`), and named in
  `plugin.json` as `"types"`. `claude plugin validate` holds each key the module uses to it.
- **The store** keeps values across sessions: `$.store.get/set`. A setting lives in both: the
  atom for drawing, the store for the next session, restored at start
  (`wbx-hud/hooks/register.tsx:436`). wbx-hud stores `theme`, `show`, `hidden`, `levels`,
  `alertsOff`, `alerted`, `burn`, `effort`.
- **Settings are commands, not `/config`**: toggles go in `/wbx-hud` subcommands and the
  settings tab, kept in the store; only the thresholds and the sidebar mode are `userConfig`
  ([user-config.md](user-config.md)).
- **The store is shared**: one file for every session running at once, so a value that differs
  per session (the context's toasted level) belongs in `$.state`, not the store.
- `$.state` starts over on `/clear` (a new session id); the store does not
  ([clear.md](../domains/wbx-hud/clear.md)).

Related: [api-reference.md](api-reference.md)
