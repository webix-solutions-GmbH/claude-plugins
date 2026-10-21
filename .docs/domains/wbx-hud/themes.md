---
title: Themes
area: wbx-hud
verified_commit: 240f2bc
confidence: high
---

# Themes

**The mod's themes** are the entries of `THEMES` in `wbx-hud/hooks/themes.ts`; `/wbx-hud theme`
and the settings tab offer every entry. The `Theme` type documents each field: segment fills,
`edges` and `slash`, ring colors by level (`ok warn alert hot`), `ink` for text on a fill,
`accent` for the panes' title and headings, `rule` for the sidebar's separators.

- `webix` (default, also the fallback for an unknown name): the webix design system's palette,
  as on the company's public website (the `wx-*` comments name the tokens); slanted edges.
- `gruvbox-dark`: coralline's colors, from the gruvbox palette; round edges.

**The Claude Code theme** `wbx dark` ships as `wbx-hud/themes/wbx-dark.json`: base `dark`,
`composerSidebarBackground` black, so the docked sidebar sits on black. It does not color the
pane's frame ([render-sites.md](../../architecture/render-sites.md)). A `▌` before the headings
was tried in 0.10.0 and turned down.
