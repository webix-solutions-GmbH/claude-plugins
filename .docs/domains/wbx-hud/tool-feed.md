---
title: The tool feed
area: wbx-hud
verified_commit: 240f2bc
confidence: high
---

# The tool feed

- A `tool.call` hook with a pass-through `.catch` (`wbx-hud/hooks/register.tsx:531-541`,
  [gating-hooks.md](../../architecture/gating-hooks.md)) adds each call as it starts
  (`startRun`) and sets its outcome and duration when it ends (`endRun`): running, ok, error,
  denied.
- The `tools` atom keeps the session's last `HISTORY` = 200; the sidebar shows the last `FEED` =
  10, or all of them newest first while `allTools` is set
  (`wbx-hud/hooks/register.tsx:76-77`).
- A row is cut to the width; a click opens it to the whole command, path or query (`expanded`),
  a second closes it. MCP tools show as `server:tool` (`toolName`,
  `wbx-hud/hooks/sidebar.ts:233`); `↳` marks a subagent's call.
