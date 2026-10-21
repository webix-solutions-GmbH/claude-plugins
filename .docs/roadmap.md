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
- Turn timer and turn count (`$.session.turns()`).
- Claude's own changes this session: only Edit/Write calls, not the user's edits.
- Recent commits (the last 3 of `git log`) and the stash count.
- Quick-action buttons in the sidebar: `/compact`, theme, demo.
- `panel` as an alias for `sidebar` in `/wbx-hud show`.

## Small leftovers

- In `/wbx-hud show|pane`, a failing `setShow` or `$.ui.close` makes the command print nothing.
- Untested paths: countdown `now`, token counts under 1000, the cost segment, the demo sweep,
  the resize reopen, the effort/cwd/model-switch hooks.
