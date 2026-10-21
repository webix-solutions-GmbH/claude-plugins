# Conventions

## Notes

- **One concept per note**; a fact lives in exactly one note, others link to it.
- **Indexes navigate**: each area's `index.md` lists every note with one line, and holds no facts.
- **Anchored**: claims name their source as `path:line`, relative to the repository root
  (e.g. `wbx-hud/hooks/register.tsx:504`). Line numbers drift: re-read before trusting.
- **Language**: English, the same plain style as the code comments.
- **Same commit**: a code change updates the notes it affects in the same commit.

Template:

```markdown
---
title: <what the note explains>
area: architecture | wbx-hud
verified_commit: <short SHA the facts were last checked against>
confidence: high | medium | low
---

# <title>

<the facts, with path:line anchors>

Related: [<note>](<relative path>)
```

`confidence`: **high** = checked against the code at `verified_commit`; **medium** = observed
live or taken from the engine's types, not provable from this repository; **low** = unverified,
with a line saying why.

## Commit hook

`.githooks/pre-commit` prints a hint when a commit changes a mod's code but no `.docs/` note.
It never blocks. Turn it on once per clone:

```
git config core.hooksPath .githooks
```

## Maintenance

- **After a code change**: find the note in the area's `index.md`, fix its facts and anchors,
  set `verified_commit` to the current short SHA, and fix the index line if its meaning changed.
- **New concept**: check the index first, write one note from the template, add its index line
  and new words to `glossary.md`, all in the same commit.
- **Drift check**: `git diff --stat <verified_commit>..HEAD -- <anchored paths>`; nothing changed
  means it likely holds. Re-read the anchors, then bump `verified_commit`, or fix the note, or
  set `confidence: low` with a line why.
- A shipped [roadmap](roadmap.md) item leaves the roadmap; its note describes it.
