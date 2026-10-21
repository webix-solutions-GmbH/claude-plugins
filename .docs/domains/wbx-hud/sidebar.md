---
title: The sidebar
area: wbx-hud
verified_commit: 92d1814
confidence: high
---

# The sidebar

A pane with id `wbx-hud`, title `HUD` (`wbx-hud/hooks/register.tsx:74,286`), drawn by the
render hook at `wbx-hud/hooks/register.tsx:849`.

- **Layout**: the title row (`webix HUD` in the theme's `accent`, the mod's version dim beside
  it ([whats-new.md](whats-new.md)), `≡ settings` on the right),
  a rule, then the sections where, context, limits, agents, tools, a `─` rule in the theme's
  `rule` color between those shown. Headings are bold in `accent`. Padding one column each side
  (`PAD`).
- **Sections**: where (model with effort, folder, git, diff stat); context (ring, tokens, bar,
  by category); limits (per limit: ring, countdown, bar, pace, [pace.md](pace.md)); agents
  ([agents.md](agents.md)); tools ([tool-feed.md](tool-feed.md)). Each shows per the items
  table ([settings-tab.md](settings-tab.md)).
- **Width**: a quarter of the terminal less the frame's 2 columns, at least 28 (`dockColumns`,
  `wbx-hud/hooks/sidebar.ts:87-93`), set anew when the terminal is resized; a width the user
  drags wins.
- **Opening**: with the `sidebar` option on `auto` it opens at session start once the bar has
  read the width (`isPaneDue`, `wbx-hud/hooks/register.tsx:520-525`); `manual` only by
  `/wbx-hud pane`. Not while `show` is `bar`.

Related: [render-sites.md](../../architecture/render-sites.md), [themes.md](themes.md)
