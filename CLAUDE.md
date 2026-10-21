# claude-plugins

Claude Code mods (hooks-module plugins), one folder per mod, the repository a marketplace
(`.claude-plugin/marketplace.json`, name `webix`; public on GitHub as
`webix-solutions-GmbH/claude-plugins`, MIT). README.md describes the mods for users;
this file is for working on them.

## Knowledgebase (`.docs/`)

- **Start at `.docs/README.md` for non-trivial tasks**: then the area `index.md`, then the one note you need.
- **Update affected notes in the same commit as the code change**; bump `verified_commit` when re-confirming.
- One fact = one note; link instead of duplicating. Template, rules and checklist: `.docs/CONVENTIONS.md`.

## Conventions

- Mods are named `wbx-<name>`, folder = plugin name = slash command (`/wbx-hud`).
- Each new mod needs an entry in `.claude-plugin/marketplace.json` and its folder appended to
  `CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json` (`;`-separated on Windows). The
  setting lists mod folders, not this parent folder.
- Load the plugin-authoring skill before changing a mod; its `claude-code.d.ts` is the API.
- Fire-and-forget calls (button presses, timers) end in `.catch`.
- The repository is public: no secrets, internal hostnames or local paths in tracked files.
- Work on a branch; commit only when asked. Commit messages end with the Co-Authored-By line.
- Shell edits mangle `\\` and `\n` in strings; use the Edit tool for those.

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
