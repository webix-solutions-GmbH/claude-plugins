---
title: The bar
area: wbx-hud
verified_commit: 240f2bc
confidence: high
---

# The bar

A `PromptHint` render hook that returns the bar above `await next(e)`, the engine's hint line
(`wbx-hud/hooks/register.tsx:707`).

- **Segments**: path (shortened past four levels), git (branch or short hash, `+ ! ?` marks,
  `⇡ ⇣`), model with effort, context ring with percentage and tokens, 5h and 7d rings with reset
  countdowns, optional pace `↗12%/h`, `↳ N agents` last in the usage group. Without rate limits
  the session cost shows instead.
- **Edges** per theme (`edges` in `wbx-hud/hooks/themes.ts`): `round` caps with arrows between
  segments, or `slant`; a slanted bar draws the dim `slash` color between usage segments that
  share a background, and the fill edge elsewhere
  ([terminal-glyphs.md](../../architecture/terminal-glyphs.md)).
- **Width**: one line when it fits `e.viewport.columns`, else two (where / usage). The width it
  reads is kept as `terminalColumns` and sizes the sidebar ([sidebar.md](sidebar.md)).
- Which items show is per place ([settings-tab.md](settings-tab.md)); the bar's pace is off by
  default (`DEFAULT_HIDDEN`, `wbx-hud/hooks/sidebar.ts:40`).
- Colors by level: [alerts.md](alerts.md).
