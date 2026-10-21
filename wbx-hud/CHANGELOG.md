# Changelog

What changed in wbx-hud, newest first. The first line of a version is the one the
"what's new" toast shows after an update.

## 0.11.0 — 2026-10-21

- Click the version in the sidebar's title to see the latest changes in a tab beside it.
- /wbx-hud changes opens the same tab.
- An empty line above the bar parts it from the line over it.

## 0.10.2 — 2026-10-21

- /wbx-hud says why when the sidebar can't be opened or closed, instead of nothing.

## 0.10.1 — 2026-10-21

- The sidebar's title shows the version, and a toast says what's new once after an update.
- This changelog.

## 0.10.0 — 2026-10-21

- The sidebar opens with a "webix HUD" title row beside "≡ settings".
- Headings in both panes take the theme's accent color; a rule parts the sidebar's sections.
- New Claude Code theme "wbx dark" with a black sidebar background (pick it in `/theme`).

## 0.9.1 — 2026-10-20

- `/clear` keeps your settings and readings again.
- Switching directory or model updates the bar at once.
- The context fills from yellow, the limits still from orange.

## 0.9.0 — 2026-10-20

- Alerts at the thresholds: from orange, the context and limits fill with the level color.
- A toast once per level reached, and a band above the prompt at red until the area falls back.
- Each alert can be switched off, and each area's thresholds set, in the settings tab.
- `/wbx-hud demo` shows them all, its toasts marked as the demo's.

## 0.8.0 — 2026-10-20

- One items table in the settings tab: each item and its parts on or off in the sidebar and
  the bar separately.
- The bar can show each limit's pace (↗12%/h): green while the window resets first, red when
  it fills first; off by default.
- "By category" hides the context's breakdown rows and keeps its figures.

## 0.7.2 — 2026-10-20

- Survives `/clear`: the stored settings and the last effort come back.

## 0.7.1 — 2026-10-20

- A failed reading no longer stops the session start; the next one fills the bar.
- A click on an agent that can't be shown says why in a toast.

## 0.7.0 — 2026-10-20

- Running subagents and teammates in the sidebar: type, task, context and time; a click shows
  the transcript.
- The bar shows "↳ N agents" while agents run.
