# claude-plugins

[Claude Code](https://claude.com/claude-code) mods by webix: plugins that change Claude Code's own interface
or behaviour through a hooks module. Each subfolder is one mod, and the repository is a
marketplace (`.claude-plugin/marketplace.json`) that lists them.

> Mods are an early-access feature of Claude Code (last tested with 2.1.306); the API may change
> between releases.

## Mods

### wbx-hud

A native replacement for command-based status lines such as coralline. It is drawn under the
prompt, above Claude Code's hint line, and stays visible while Claude works.

```
 C:/Development/…/mods  ⎇ main+!  ◆ Opus 5.5 (1M)  ◑ 38% 380.0k  5h ◔ 21% ↺3h12m  7d ◑ 55% ↺4d06h
```

- **Path**: the session's directory, shortened past four levels.
- **Git**: branch (or the short commit hash on a detached HEAD), `+` staged, `!` modified,
  `?` untracked, `⇡`/`⇣` ahead/behind. Orange when dirty, green when clean.
- **Model**: the readable name, e.g. `claude-opus-5-5[1m]` → `Opus 5.5 (1M)`, with the effort
  in use beside it (`Opus 5.5 (1M) · high`). The effort is read at start from
  `CLAUDE_CODE_EFFORT_LEVEL` or the settings' `effortLevel`, else the last one in use (also
  after a `/clear`), again after `/effort`, and from each turn of the main conversation (the
  level actually applied).
- **Context**: a fill ring, the percentage of the window used, and the input tokens.
- **Rate limits**: the 5-hour and 7-day windows with rings and reset countdowns. Without a
  subscription the session cost is shown instead. The pace (`↗12%/h`, off by default in the
  bar) is green while the window resets before that pace would fill it, red when it fills first.

Each item, and parts of one like the effort or the reset countdown, can be switched off in the
bar and in the sidebar separately, in the settings tab.
- **Agents**: `↳ 2 agents` while subagents run, gone when the last one ends.

Rings fill in quarters (`○ ◔ ◑ ◕ ●`). Their color shows the usage level: green, then yellow,
orange and red from three thresholds per area. The bar is one line when it fits the terminal
and splits into two (where / usage) when it does not.

**Alerts**: from orange an area gets louder, each step switchable in the settings tab:
the bar's segment and the sidebar's heading are filled with the level color (the context's
from yellow already); the context
segment suggests `→ /clear`; a toast says so once per level reached (`context at 31%: a good
point to /clear`, `5h limit at 72%, resets in 1h10m`; kept across sessions, so a limit does
not repeat itself); at red a band above the prompt (`▲ context at 52%: /clear or /compact`)
stays until the area falls back.

**Thresholds**: each area has its own setting, three ascending percentages separated by commas
(yellow, orange, red), set in the settings tab (an empty field goes back to the `/config` value),
or in Claude Code's config menu (`/config`) or `~/.claude/settings.json`; the settings tab's
value wins. A repeated value skips a level: `50,50,75` goes from green straight to orange.

```json
"pluginConfigs": { "wbx-hud@inline": { "options": { "sevenDayLevels": "60,80,95" } } }
```

(`wbx-hud@inline` while the mod is loaded through `CLAUDE_CODE_PLUGIN_DIRS`.)

| Option | Ring | Default | Means |
|---|---|---|---|
| `sidebar` | – | `auto` | `auto` opens the sidebar at session start, `manual` only on `/wbx-hud pane` |
| `contextLevels` | context | `20,30,50` | yellow from 20%, orange from 30%, red from 50% |
| `fiveHourLevels` | 5-hour limit | `50,70,90` | yellow from 50%, orange from 70%, red from 90% |
| `sevenDayLevels` | 7-day limit | `50,75,90` | yellow from 50%, orange from 75%, red from 90% |

A value that is not three ascending numbers from 0 to 100 falls back to the default for that
area.

**Preview**: `/wbx-hud demo` sweeps the context and both limits from 0 to 100% over ten
seconds, `/wbx-hud demo <percent>` pins them, `/wbx-hud demo off` ends it. A dim `demo`
segment marks the bar while simulated figures are shown. The alerts follow the simulated
figures; a demo's toasts read `wbx-hud demo: …`, start afresh with each demo, and leave the real
ones untouched.

**What is shown**: `/wbx-hud show` lists the choices, `/wbx-hud show <name>` switches at once
and is kept across sessions like the theme: `both` (default), `bar` (the bar under the prompt
only; the sidebar closes and `/wbx-hud pane` stays off), or `sidebar` (the sidebar only;
Claude Code's own hint line stays under the prompt).

**Themes**: `/wbx-hud theme` lists them and marks the one in use, `/wbx-hud theme <name>`
switches at once. The choice is kept in the mod's store, so it holds across sessions.

| Theme | Look |
|---|---|
| `gruvbox-dark` | coralline's colors: teal path, green/orange git, purple model |
| `webix` (default) | Webix Internal design system: slanted edges, grey path, brand-green git, coral model, dark text on color, a dim slash between the limits |

A theme is one entry in `wbx-hud/hooks/themes.ts`; the command offers every entry there.

**Settings tab**: `≡ settings` at the top of the sidebar, or `/wbx-hud settings`, opens a
second pane beside the sidebar (a `Settings` tab next to `HUD`; Esc or `✕ close` closes it).
Click a row to pick the theme and what is shown (both, bar, sidebar). The items table switches
each item on or off per place; a part (indented) is dimmed while the item it belongs to is off,
and a blank cell is one that place has no room for. Below it, ALERTS switches each alert on
or off and THRESHOLDS holds a field per area (Enter sets it). Each choice is kept across
sessions. Its name field renames the session: Enter runs `/rename <name>` once the session is
idle.

```
ITEMS         sidebar  bar
Folder          [x]    [x]
Git branch      [x]    [x]
  diff stat     [x]
Model           [x]    [x]
  effort        [x]    [x]
Context used    [x]    [x]
  tokens        [x]    [x]
  by category   [x]
5h limit        [x]    [x]
  reset         [x]    [x]
  pace          [x]    [ ]
7d limit        [x]    [x]
  reset         [x]    [x]
  pace          [x]    [ ]
Agents          [x]    [x]
Tools           [x]
```

**Sidebar**: a pane with the bar's figures in full and what the bar has no room for.

```
≡ settings
◆ Opus 5.5 (1M) · high
⌂ C:/Development/…/mods
⎇ main !
  3 files changed  +84 −12

CONTEXT  ◔ 23%  231.0k / 1.0M
▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱
Messages      172.0k  ██████████
System prompt  12.0k  ▊

LIMITS
5h ◑ 48%  ↺2h14m
▰▰▰▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱▱
+12%/h last hour · full in 4h20m

7d ◔ 21%  ↺4d06h
▰▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱
+0.3%/h this week · resets first

AGENTS  click one to view it
● Explore find hooks…  ◔ 21% 41.0k 1:42
● general-purpose…      ○ 4% 8.2k 0:20

TOOLS  click one for all of it
✓ Bash git status            0.4s
✓ Edit register.tsx          0.1s
↳ ✓ Read sidebar.ts          0.0s
● Bash claude plugin test …     …
  Bash
  claude plugin test wbx-hud 2>&1 |
  grep -E pass
```

- **Changes**: files changed against `HEAD` with added and removed lines (tracked files only).
- **Context by category**: as `/context` breaks it down, estimated locally (no extra request).
- **Pace**: each limit's rise per hour and when it would be full at that pace, or
  `resets first` when the window resets before; on a narrow sidebar the outcome takes a row
  of its own.
  - **5h** (`last hour`): over the last hour of readings. It shows once they span five
    minutes and the usage rose; a reset starts them over. The readings are kept across
    sessions.
  - **7d** (`this week`): the share used since the week began (7 days before its reset),
    so nights and breaks count and one busy hour does not read as the week's pace. It shows
    from the week's second hour.
- **Agents**: shown only while subagents or teammates run, one row each: type and task, the
  context of its last request (ring, percentage, tokens) and how long it has run. The context
  counts up with each of the agent's requests; the window is the session's when the agent runs
  on the session's model, else 1M for a `[1m]` model and 200k otherwise. A row leaves as soon
  as the agent's turn ends. Click one to put its transcript in the main view; `◂ back to the
  main conversation` returns. When Claude Code cannot show it (no row for it in the tasks
  list, say), a toast says why.
- **Tools**: the last ten tool calls, running (`●`), done (`✓`), failed (`✗`) or denied (`⊘`),
  with how long each took. `↳` marks a subagent's call; MCP tools show as `server:tool`. A row
  is cut to the sidebar's width; click it (or Tab to it and press Enter) to see the whole
  command, path or query wrapped below it, and click again to close it. The session keeps its
  last 200 calls: past ten, `▸ all N calls` under the feed lists them all, newest first, to
  scroll with the mouse wheel; `◂ back to the last 10` returns.

The terminal docks the pane beside the transcript in fullscreen from 110 columns, a quarter of
the terminal wide (at least 28 columns) and kept at a quarter when the terminal is resized; a
width you drag the dock to wins. Narrower it sits above the prompt. With the `sidebar` option on `auto` (the default) it opens at session
start where there is room (from 144 columns) and waits otherwise; `/wbx-hud pane` opens or
closes it at any width. Set `sidebar` to `manual` to open it only by the command.

It updates when usage changes, at the end of each turn, on a directory or model switch, and
every 30 seconds; the tool feed as each call starts and ends; the agents on each request
and every second while one runs. Only `git status` and
`git diff --shortstat` run as external processes; everything else comes from Claude Code
directly.

**Font**: the rounded caps and separators are powerline glyphs (U+E0B0, U+E0B4, U+E0B6).
Cascadia Mono, Windows Terminal's default font, has them; no Nerd Font is needed.

## Using the mods

### Installing

At the prompt of a Claude Code session in a terminal:

```
/plugin install wbx-hud --marketplace webix-solutions-GmbH/claude-plugins
```

Answer `y` to add the marketplace, then pick a scope. Claude Code checks the marketplace for
new versions by itself.

### While developing

Name each mod folder in `CLAUDE_CODE_PLUGIN_DIRS`, in the `env` block of
`~/.claude/settings.json` (several folders separated by `;` on Windows, `:` elsewhere):

```json
"env": {
  "CLAUDE_CODE_PLUGIN_DIRS": "<clone>\\wbx-hud"
}
```

Every session started afterwards loads the mods, and an interactive session reloads a mod as
soon as its files change. For a single session, `claude --plugin-dir <mod folder>` does the same.

### From a local clone

Register the clone as a local marketplace and install from it:

```
claude plugin marketplace add <clone>
claude plugin install wbx-hud@webix
```

An installed mod is read from the clone, but it does not reload by itself: run
`/reload-plugins` after an edit. Remove the mod from `CLAUDE_CODE_PLUGIN_DIRS` when you switch,
so it is not loaded twice.

## Working on a mod

Start `claude` in this folder. Each mod has the same layout:

```
<mod>/
├── .claude-plugin/plugin.json   name, version, description, author, types
├── hooks/hooks.json             { "modules": ["./register.tsx"] }
├── hooks/register.tsx           the hooks module
├── types/index.d.ts             the mod's $.state contract
├── tests/*.test.ts              run by `claude plugin test`
└── tsconfig.json                extends the types Claude Code generates
```

Checks, run from this folder:

```
claude plugin validate <mod>     manifest and hooks module, as Claude Code will load them
claude plugin test <mod>         the mod's tests
npx -p typescript tsc -p <mod>   type check (once the mod has loaded and its types exist)
claude plugin validate .         the marketplace file
```

`.claude-plugin/types/` inside a mod is generated by Claude Code when it loads the mod and is
ignored by git.

### Adding a mod

1. Create `<mod>/` with the layout above.
2. Add an entry to `.claude-plugin/marketplace.json`:
   `{ "name": "<mod>", "source": "./<mod>", "description": "..." }`.
3. Add the folder to `CLAUDE_CODE_PLUGIN_DIRS`, or reinstall from the marketplace.
4. Run `claude plugin validate .` and `claude plugin validate <mod>`.

## Credits

wbx-hud was inspired by [coralline](https://github.com/Nanako0129/coralline); its `gruvbox-dark`
theme uses coralline's colors, from the [gruvbox](https://github.com/morhetz/gruvbox) palette by
Pavel Pertsev (morhetz).

## License

[MIT](LICENSE), © 2026 webix solutions GmbH.
