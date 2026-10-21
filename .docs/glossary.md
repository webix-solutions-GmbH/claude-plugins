# Glossary

| Word | Means |
|---|---|
| mod | a Claude Code plugin with a hooks module that changes Claude Code's own interface or behaviour |
| hooks module | the mod's `hooks/register.tsx`, named in `hooks/hooks.json`; exports `register(on, options)` |
| engine | Claude Code as the mod sees it: events, `$`, the drawing surfaces |
| `$` | the engine interface a hook receives; each call is noun then method (`$.ui.open`) |
| hook | `($, e, next)` registered with `on(event, matcher?, hook)`; `next(e)` runs the rest |
| atom | a `$.state` value a drawing reads; a write redraws its readers |
| store | `$.store`, values kept across sessions |
| bar | wbx-hud's line under the prompt, above Claude Code's hint line |
| sidebar, pane | wbx-hud's panel; docked beside the transcript (fullscreen, from 110 columns) or inline above the prompt |
| settings tab | wbx-hud's second pane, beside the sidebar |
| area | one of the three measured things: `context`, `five_hour`, `seven_day` |
| level | 0..3 (green, yellow, orange, red) of an area, from its three thresholds |
| pace | how fast a limit rises per hour, and whether it fills before it resets |
| burn | the stored 5h readings the 5h pace is figured from |
| reading | one `readAll`: usage, model, directory, git, all at once |
| `@inline` | the plugin id suffix of a mod loaded through `CLAUDE_CODE_PLUGIN_DIRS` |
