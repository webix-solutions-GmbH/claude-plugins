# claude-plugins

Claude Code mods (hooks-module plugins), one folder per mod, the repository a marketplace
(`.claude-plugin/marketplace.json`, name `webix`; public on GitHub as
`webix-solutions-GmbH/claude-plugins`, MIT). README.md describes the mods for users;
this file is for working on them.

## Conventions

- Mods are named `wbx-<name>`, folder = plugin name = slash command (`/wbx-hud`).
- Each new mod needs an entry in `.claude-plugin/marketplace.json` and its folder appended to
  `CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json` (`;`-separated on Windows). The
  setting lists mod folders, not this parent folder.
- Commit messages end with the Co-Authored-By line; commit only when asked.

## Checks (run all before calling a change done)

```
claude plugin validate <mod>      # manifest + hooks module as the engine loads it
claude plugin validate .          # marketplace file
claude plugin test <mod>          # *.test.ts in <mod>/tests
npx -y -p typescript@5.6.3 tsc -p <mod>   # needs <mod>/.claude-plugin/types/, written by the engine on load
```

TypeScript is not installed globally. If `<mod>/.claude-plugin/types/` is missing (mod never
loaded), type-check with a temporary tsconfig outside the mod folder whose `include` names the
bundled `claude-code.d.ts` of the plugin-authoring skill plus the mod's `hooks`, `types`, `tests`.

## API knowledge (Claude Code 2.1.303, early access)

- The full API is the `claude-code.d.ts` the plugin-authoring skill names when it loads; grep
  it for the event or noun at hand. Load that skill before changing a mod.
- `$` may only be passed to functions declared at the top level of the module (validator rule).
- `$.clock.every` returns a `Timer` (`.cancel()`), not a stop function.
- Values a drawing reads go in `$.state` atoms (declared in `types/index.d.ts`, keys quoted when
  hyphenated: `'wbx-hud': {...}`); values that must survive sessions go in `$.store` too.
- `userConfig` fields arrive as `options` in `register(on, options)`; a change reloads the
  module. Stored under `pluginConfigs["<name>@inline"].options` for a `CLAUDE_CODE_PLUGIN_DIRS`
  mod.
- `ui.render` on `PromptHint` can return a tree that includes `await next(e)` (the engine's own
  hint line); that is how wbx-hud sits under the prompt and above the hint, always visible.
- `e.viewport?.columns` is the terminal width for layout decisions.

## Gotchas

- Private-use glyphs (powerline U+E0B0/E0B4/E0B6) get stripped when written as literal
  characters. Always write `String.fromCodePoint(0xe0b6)` in code.
- No Nerd Font is installed; the terminal uses Cascadia Mono, which has no powerline glyphs
  either: Windows Terminal draws U+E0B0..E0BF itself (rounded caps, arrows, slants E0BA/E0BB/E0BC).
  Nerd Font icons do not show; use plain Unicode for symbols.
- Emoji-capable symbols (⚙ and the like) draw two cells wide and eat the following space;
  stick to plain text symbols (≡ ◆ ⌂ ⎇ ● ○).
- A terminal cell has one background, so a thin glyph (the slash E0BB) cannot part two
  backgrounds along its diagonal. wbx-hud draws the slash only between segments that share a
  background and the fill edge elsewhere.
- Shell edits mangle `\\` and `\n` in strings; use the Edit tool for those.
- JSX splits `+{n}` or `{a} {b}` into separate text children, so a test's `toContain` on the
  serialized tree misses the joined text. Build such texts as one template string.
- A `Pane` body cannot take a background: a `backgroundColor` Box fills only the area inside
  the engine's frame and reads as a box within a box. The frame and dock are the engine's;
  their color is the Claude Code theme's `composerSidebarBackground` (fullscreen only). The
  user's custom theme `~/.claude/themes/wbx-dark.json` (base `dark`) sets it to black.
- No `classic.*` hooks: the built-in guard `cc-plugin-sec-default` (loaded with a Team or
  Enterprise login or managed settings) has `on('classic.*', ($, e, next) => next.to(e, 'append'))`,
  so user mods never see a classic event and a notice says the hook was skipped. The test
  engine does not load the guard, so such hooks pass their tests and never run live.
- A gating hook (`tool.call`, ...) that only observes should end in `.catch(($, e, next) => next(e))`:
  `next` is replay-safe there, so a failure passes the call on without running it twice.
- Test stand-ins answer ops with `{ value: ... }` (e.g. `on('session.cwd', () => ({ value }))`),
  hooks are `($, e, next)`, and a bottom `ui.render` hook must exist when the mod calls
  `next(e)` there. See `wbx-hud/tests/render.test.ts` `mountAt`.

## State of things

- 0.10.0 style: each theme has `accent` (the panes' title `webix HUD` and headings) and `rule`
  (the `─` lines under the title and between the sidebar's sections, in place of empty lines).
  A `▌` before the headings was tried and turned down. The mod ships the Claude Code theme
  `themes/wbx-dark.json` (black `composerSidebarBackground`); the pane's frame color cannot be
  set by a mod or a theme key.
- 0.9.1: no classic hooks left (see Gotchas); `/clear` via `session.end`, see 0.7.2 below.
- 0.9.0 alerts: `levelOf` 0..3 in `hooks/levels.ts`; from `FILL_FROM` (context 1, limits 2)
  the bar segment and sidebar heading fill with the level color and the theme's `ink`; from
  orange (2) the context adds `→ /clear`; `toastLevels` (end of `readAll`) toasts on reaching 2 or 3, the levels
  reached kept in the store as `alerted`; at 3 an `AbovePrompt` band per area. `alertsOff`
  atom + store. `thresholds` atom = /config options (`base`) under the settings tab's, stored
  as `levels` (Input per area, empty resets).
- wbx-hud 0.8.0: bar under the prompt (path, git, model, context, 5h/7d rings, optional pace
  `↗12%/h` green when the limit resets first, red when it fills first), themes via
  `/wbx-hud theme` (each with `edges`: `round` caps and arrows, or `slant` with a dim `slash`
  color for usage segments; webix slants), `/wbx-hud demo` preview, per-area thresholds in `/config`.
  Sidebar pane (`/wbx-hud pane`, `sidebar` option auto/manual): diff stat, context by category,
  per-limit pace and forecast: 5h over the last hour (`burn` atom, 5h readings only, kept in
  the store and restored at session start; a reading's `resetsAt` moving over a minute starts
  it over), 7d over the week so far (`windowRate`, from `resetsAt` minus 7 days, no history), tool feed (`tools` atom, the session's last 200, the last 10 shown or all via `allTools`,
  a `tool.call` hook with a pass-through `.catch`). Pure helpers live in `hooks/sidebar.ts`.
  `/wbx-hud show both|bar|sidebar` (`show` atom, kept in the store) picks what is drawn; on
  `sidebar` the bar's hook still runs to read the terminal width, then returns the hint alone.
- Settings tab: a second pane (`wbx-hud-settings`, `/wbx-hud settings` or the sidebar's
  `≡ settings`) with theme, show, an items table (sidebar and bar columns; `ITEMS` in `hooks/sidebar.ts`,
  parts with a `parent`, `isOn` checks both; `hidden` atom + store as `{ sidebar, bar }`, the
  bar's pace off by default; `restoreHidden` reads the pre-0.8 sections list and
  `isEffortShown`), and a name field that runs `/rename` via `$.command.run`. The
  `effort` atom starts from `CLAUDE_CODE_EFFORT_LEVEL` (`$.env.get`), else
  `$.settings.read({ key: 'effortLevel' })` (stand-in answers the whole object), else a
  `$.config.list()` row whose key matches /effort/; then each
  main-loop `turn.step` (a streaming event: its hook is an `async function*` with
  `yield* next(e)`), which stores it; neither of the first two showed it live. A directory or
  model switch refreshes from `command.run` `cd` / `model` and a `config.set` whose key
  matches /model/ (0.9.1, in place of the classic hooks).
- Agents (0.7.0): `agents` atom, the running agents only. In from `agent.spawn` (type, task,
  model; gating, pass-through `.catch`) or an agent's `turn.start` (type and task from
  `$.agent.list()`); out at its `turn.complete`, and a module-level `ended` set keeps a late
  spawn answer from bringing one back. Context = the agent's last `turn.step` result's
  `usage` input side (`inputTokens`); window by `agentWindow`. A 1 s `$.clock.every` writes
  the `tick` atom while any run; the 30 s timer prunes agents the list shows ended or omits
  (older than a minute). Sidebar section `agents` (only while one runs or one is viewed), a
  row's press is `$.ui.view({ agentId })`; bar segment `↳ N agents` last in the usage group.
  The test engine fires `clock.every` timers when the stand-in clock jumps: an `agent.list`
  stand-in must list the agent as running or the prune drops it.
- 0.7.1 hardening: `refresh` shares one reading in flight (`reading`), every caller catches it
  (a failed first reading no longer stops `session.start`); the 30 s timer is kept as `poll`
  and cancelled on a new start; a ticker whose ticks stopped (a refused period) restarts at
  the next agent request; `$.ui.view` answers `{ deny }`, not a rejection: `viewAgent` toasts
  it. Fire-and-forget presses end in `.catch`.
- 0.7.2 `/clear`: a new session id, the session's `$.state` values start over, and no `session.start`
  fires. Since 0.9.1 a `session.end` hook with `reason: 'clear'` starts `clearWatch`, a 100 ms
  `$.clock.every` (at most `CLEAR_TRIES`), and `afterClear` runs `restore` (stored settings,
  last effort, kept in the store as `effort`) and a reading once `$.session.id()` is no longer
  the ended one. `readAll` takes the stored burn readings when the atom is empty, so a reading
  after a clear never overwrites them. Not yet confirmed live.
- Users install from GitHub (`wbx-hud@webix`); here the mods load via `CLAUDE_CODE_PLUGIN_DIRS`.
  The repository is public: no secrets, internal hostnames or local paths in tracked files.
