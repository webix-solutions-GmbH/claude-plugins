---
title: Distribution and local loading
area: architecture
verified_commit: 240f2bc
confidence: high
---

# Distribution and local loading

- **The marketplace** is this repository: `.claude-plugin/marketplace.json`, name `webix`, owner
  webix solutions GmbH, public on GitHub as `webix-solutions-GmbH/claude-plugins`, MIT
  (`LICENSE`). Each mod has an entry `{ name, source: "./<mod>", description }`.
- **Users install** with `/plugin install <mod> --marketplace webix-solutions-GmbH/claude-plugins`,
  or `/plugin install <mod>@webix` once the marketplace is added; the id is then `<mod>@webix`.
- **A release** is a push to `main` with the mod's `version` bumped in its `plugin.json` and a
  section for it in the mod's `CHANGELOG.md` ([whats-new.md](../domains/wbx-hud/whats-new.md));
  installs pick it up at Claude Code's next update check (or `/plugin marketplace update webix`).
  `main` is protected by a ruleset: no force push, no deletion.
- **While developing**, the mod folders are listed in `CLAUDE_CODE_PLUGIN_DIRS` (the `env` block
  of `~/.claude/settings.json`, `;`-separated on Windows); the id is then `<mod>@inline`, and an
  interactive session reloads a mod when its files change. A mod installed from the marketplace
  at the same time would load twice.
- **Plugin themes**: a mod ships Claude Code themes as `themes/<slug>.json`, no manifest entry.
  They show in `/theme` under their `name`; selecting one stores `custom:<plugin>:<slug>`.
  Installing never switches the theme.
- **Public repository**: no secrets, internal hostnames or local paths in tracked files.

Related: [user-config.md](user-config.md)
