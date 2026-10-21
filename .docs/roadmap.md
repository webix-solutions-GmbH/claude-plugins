# Roadmap

Open ideas for wbx-hud, none started. Strike an item when it ships (the feature's note then
describes it).

## Ideas

- Cost per turn (`cost.usd` between `turn.start` and `turn.complete`), the last turns and the
  session average. Doubtful: the cost was taken out of the sidebar once.
- Turn timer and turn count (`$.session.turns()`).
- Claude's own changes this session: only Edit/Write calls, not the user's edits.
- Recent commits (the last 3 of `git log`) and the stash count.
- Quick-action buttons in the sidebar: `/compact`, theme, demo.
- `panel` as an alias for `sidebar` in `/wbx-hud show`.

## Not yet confirmed on screen

- The settings tab beside the sidebar: which one is in front.
- `/rename` from the settings tab's name field.
- The all-calls view of the tool feed: wheel scroll, button contrast.
- The `/clear` restore ([clear.md](domains/wbx-hud/clear.md)).

## Small leftovers

- In `/wbx-hud show|pane`, a failing `setShow` or `$.ui.close` makes the command print nothing.
- Untested paths: countdown `now`, token counts under 1000, the cost segment, the demo sweep,
  the resize reopen, the effort/cwd/model-switch hooks.
