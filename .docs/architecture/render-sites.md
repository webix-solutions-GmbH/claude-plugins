---
title: Render sites: PromptHint, Pane, AbovePrompt
area: architecture
verified_commit: 240f2bc
confidence: medium
---

# Render sites: PromptHint, Pane, AbovePrompt

A mod draws by a `ui.render` hook on a component; elements come from `$.ui.resolve(e)`.

- **`PromptHint`**: the hook may return a tree that includes `await next(e)`, the engine's own
  hint line. That puts wbx-hud's bar under the prompt and above the hint, visible while Claude
  works (`wbx-hud/hooks/register.tsx:707`).
- **`Pane`**: opened with `$.ui.open({ id, title, columns? })`, drawn by a hook matching
  `{ component: 'Pane', requestId: id }`; the answer's `isPlaced` says whether it shows. Docked
  beside the transcript in fullscreen from 110 columns, else inline above the prompt; opened
  unasked it seats only from 144 columns. `e.props.bodyColumns` is the width inside the frame.
- **The frame is the engine's.** No prop colors it; no theme key does either. A `Box` with a
  `backgroundColor` or a border fills only the area inside the frame and reads as a box within
  a box. The dock's background is the Claude Code theme key `composerSidebarBackground`
  (fullscreen only), which wbx-hud's theme sets ([themes.md](../domains/wbx-hud/themes.md)).
- **`AbovePrompt`**: a band above the prompt; return `next(e)` alone when there is nothing to
  show, else a tree that keeps it (`wbx-hud/hooks/register.tsx:1136`).

Related: [terminal-glyphs.md](terminal-glyphs.md)
