---
title: The version, the changes tab and the what's-new toast
area: wbx-hud
verified_commit: 391acc7
confidence: high
---

# The version, the changes tab and the what's-new toast

- **The version** is read from the mod's own `plugin.json`, at
  `${$.plugin.root}/.claude-plugin/plugin.json` with `$.fs.read` (`readVersion`,
  `wbx-hud/hooks/register.tsx:479`); there is no API for a plugin's own version. It goes into the
  `version` atom (`wbx-hud/hooks/register.tsx:70`), drawn dim beside the sidebar's title as a
  button that opens the changes tab ([sidebar.md](sidebar.md)). A failed read leaves the title
  without it.
- **The changelog** `wbx-hud/CHANGELOG.md` ships with the mod: a `## <version> — <date>` section
  per version, newest first, user-facing bullets. `parseChangelog`
  (`wbx-hud/hooks/changelog.ts:18`) reads it into releases, a bullet's indented continuation
  joined, backticks dropped. The first line of a version is written to stand alone in the toast.
  A release adds its section in the same commit as the version bump.
- **When**: `readVersion` runs at the end of `restore` (`wbx-hud/hooks/register.tsx:473`), so at
  session start, on a reload and after a `/clear` ([clear.md](clear.md)). It keeps the newest
  three releases (`RECENT`) in the `changes` atom (`wbx-hud/hooks/register.tsx:71`).
- **The changes tab**: a pane, id `wbx-hud-changes` (`CHANGES`, `wbx-hud/hooks/register.tsx:81`),
  opened by the version button or `/wbx-hud changes` beside the sidebar at its width, Escape
  closing it (`openChanges`, `wbx-hud/hooks/register.tsx:311`). Drawn at
  `wbx-hud/hooks/register.tsx:1343`: per release the version in `accent`, the date dim, each line
  after a dim `· `; then "Older versions in CHANGELOG.md." and a close button. Without a
  changelog it says "No changelog found."
- **The toast**: `wbx-hud <version>: <line>`, the version's first line; without one,
  `wbx-hud updated to <version>`.
- **Once**: the version toasted is kept in the store as `seenVersion`. A stored one that differs
  toasts; none stored toasts only when the store holds `burn`, which every reading writes, so an
  install of before 0.10.1 is told and a new install stays quiet (`isUpdate`,
  `wbx-hud/hooks/changelog.ts:38`; `restore` runs before the first reading).

Related: [alerts.md](alerts.md) (the other toasts), [settings-tab.md](settings-tab.md) (the other
tab), [distribution.md](../../architecture/distribution.md)
