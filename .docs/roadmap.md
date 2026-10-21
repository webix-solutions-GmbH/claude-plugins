# Roadmap

Open ideas for wbx-hud, none started. Strike an item when it ships (the feature's note then
describes it).

## Ideas

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

## Small leftovers

- Untested paths: the demo sweep, the resize reopen, the effort/cwd/model-switch hooks.
