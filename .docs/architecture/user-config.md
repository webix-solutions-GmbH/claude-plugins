---
title: userConfig options and plugin ids
area: architecture
verified_commit: 240f2bc
confidence: medium
---

# userConfig options and plugin ids

- Fields under `userConfig` in `plugin.json` (`wbx-hud/.claude-plugin/plugin.json`) show in
  `/config` and arrive as `options` in `register(on, options)`
  (`wbx-hud/hooks/register.tsx:487-493`). A change reloads the module.
- They are stored in `~/.claude/settings.json` under `pluginConfigs["<plugin id>"].options`.
- **The plugin id** depends on how the mod is loaded: `wbx-hud@inline` through
  `CLAUDE_CODE_PLUGIN_DIRS`, `wbx-hud@webix` when installed from the marketplace. The two keep
  separate options.

Related: [distribution.md](distribution.md), [state-and-store.md](state-and-store.md)
