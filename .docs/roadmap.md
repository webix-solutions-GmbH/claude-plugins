# Roadmap

Open ideas, none started. Strike an item when it ships (the feature's note then describes it).

## wbx-hud

- GitHub Releases, only if outsiders follow the repo (kept small on purpose until then): tags
  `wbx-hud--v<version>`, a GitHub Actions workflow on the tag push makes the release with `gh`
  (preinstalled on Actions runners), the text taken from the version's section in
  `wbx-hud/CHANGELOG.md` ([whats-new.md](domains/wbx-hud/whats-new.md)).

- Cost per turn (`cost.usd` between `turn.start` and `turn.complete`), the last turns and the
  session average. Doubtful: the cost was taken out of the sidebar once.
- Claude's own changes this session: only Edit/Write calls, not the user's edits.
- Recent commits (the last 3 of `git log`) and the stash count.
- Quick actions where they matter, not a toolbar; each an items-table row, run via
  `$.command.run` once idle as the rename is. Need not yet clear:
  - `compact` and `clear` in the context section from orange, the alert's hint made a button;
    `clear` asks first.
  - The model line opens `/model`; a click on the effort steps through the levels.
  - A click on a limit opens `/usage`.
  - Not theme or demo: the settings tab has the theme, the demo is for developing.
- `panel` as an alias for `sidebar` in `/wbx-hud show`.

## New mods

Each needs a `marketplace.json` entry and its folder in `CLAUDE_CODE_PLUGIN_DIRS`.

- wbx-guard: the commit flow as a gating hook ([gating-hooks.md](architecture/gating-hooks.md))
  rather than a rule Claude has to remember. Asks before `git push`, a merge into main or a
  commit on main; warns when the first edit lands on main. Smallest of the three, used daily.
  - Possibly part of it: a warning when a branch changes code but no `.docs/` note.
- wbx-devops: the Azure DevOps work item of the current branch (number, title, state) in the
  bar, plus its PR and the PR's build status; a click opens the item.
- wbx-time: active time per branch or work item in the bar, a button that books it via the
  time-tracking MCP server. Only if booking is a real chore today.

## Skills

A plugin can ship `skills/<name>/SKILL.md` beside or instead of a hooks module, listed in
the same marketplace. Public repo: no internal hostnames or paths in them.

- wbx-git-flow: branch before the first edit, run the checks, ask "fold or new commit",
  Co-Authored-By line, merge and push only on explicit word. Portable across repos.
- wbx-knowledgebase: the `.docs/` method ([CONVENTIONS.md](CONVENTIONS.md)) for other repos:
  set up, start at README, one fact per note, `verified_commit`.
- wbx-devops-flow: work item → branch name → PR with the item linked, via the Azure DevOps MCP.
- wbx-mudblazor: house conventions for MudBlazor components; check a component in the
  MudBlazor MCP before writing it.

## Small leftovers

- Untested paths: the demo sweep, the resize reopen, the effort/cwd/model-switch hooks.
