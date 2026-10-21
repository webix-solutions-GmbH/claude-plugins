# Architecture: Claude Code's mod API

What holds for any mod in this repository. The full API is the engine's `claude-code.d.ts`.

| Note | In one line |
|---|---|
| [api-reference.md](api-reference.md) | where the API's types are, and the engine rules the validator enforces |
| [state-and-store.md](state-and-store.md) | `$.state` atoms for what a drawing reads, `$.store` for what outlives the session |
| [user-config.md](user-config.md) | `userConfig` options: how they arrive, where they are stored, plugin ids |
| [render-sites.md](render-sites.md) | `PromptHint`, `Pane` and `AbovePrompt`: what a mod can and cannot draw there |
| [no-classic-hooks.md](no-classic-hooks.md) | `classic.*` events never reach user mods; what to hook instead |
| [gating-hooks.md](gating-hooks.md) | an observing gating hook ends in a pass-through `.catch` |
| [terminal-glyphs.md](terminal-glyphs.md) | powerline glyphs, missing Nerd Font, wide emoji, one background per cell |
| [testing.md](testing.md) | how the test engine's stand-ins answer, and its traps |
| [distribution.md](distribution.md) | the marketplace on GitHub, local loading, plugin themes, releases |
