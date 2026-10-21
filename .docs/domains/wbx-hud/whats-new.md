---
title: The version and the what's-new toast
area: wbx-hud
verified_commit: 92d1814
confidence: high
---

# The version and the what's-new toast

- **The version** is read from the mod's own `plugin.json`, at
  `${$.plugin.root}/.claude-plugin/plugin.json` with `$.fs.read` (`readVersion`,
  `wbx-hud/hooks/register.tsx:460`); there is no API for a plugin's own version. It goes into the
  `version` atom (`wbx-hud/hooks/register.tsx:69`), drawn dim beside the sidebar's title
  ([sidebar.md](sidebar.md)). A failed read leaves the title without it.
- **When**: `readVersion` runs at the end of `restore` (`wbx-hud/hooks/register.tsx:455`), so at
  session start, on a reload and after a `/clear` ([clear.md](clear.md)).
- **The toast**: `wbx-hud <version>: <line>`, the line the first bullet of the version's
  `## <version>` section in `wbx-hud/CHANGELOG.md`, backticks dropped (`whatsNew`,
  `wbx-hud/hooks/changelog.ts:14`); without one, `wbx-hud updated to <version>`.
- **Once**: the version toasted is kept in the store as `seenVersion`. A stored one that differs
  toasts; none stored toasts only when the store holds `burn`, which every reading writes, so an
  install of before 0.10.1 is told and a new install stays quiet (`isUpdate`,
  `wbx-hud/hooks/changelog.ts:28`; `restore` runs before the first reading).
- **The changelog**: a section per version, newest first, user-facing lines; the first line of a
  version is written to stand alone in the toast. A release adds its section in the same commit
  as the version bump.

Related: [alerts.md](alerts.md) (the other toasts), [distribution.md](../../architecture/distribution.md)
