---
title: Glyphs in the terminal
area: architecture
verified_commit: 240f2bc
confidence: medium
---

# Glyphs in the terminal

- **Private-use glyphs** (powerline U+E0B0, U+E0B4, U+E0B6, U+E0BB) are stripped when written as
  literal characters in a file. Write `String.fromCodePoint(0xe0b6)` in code
  (`wbx-hud/hooks/register.tsx:41-45`).
- **No Nerd Font**: the development terminal uses Cascadia Mono, which has no powerline glyphs;
  Windows Terminal draws U+E0B0..E0BF itself (rounded caps, arrows, the slants E0BA/E0BB/E0BC).
  Nerd Font icons do not show: use plain Unicode for symbols.
- **Emoji-capable symbols** (⚙ and the like) draw two cells wide and eat the following space.
  Stick to plain text symbols: ≡ ◆ ⌂ ⎇ ● ○.
- **One background per cell**: a thin glyph like the slash E0BB cannot part two backgrounds
  along its diagonal. wbx-hud draws the slash only between segments that share a background,
  and the fill edge elsewhere ([bar.md](../domains/wbx-hud/bar.md)).

Related: [render-sites.md](render-sites.md)
