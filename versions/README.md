# QBChallenge Version Archive

## ⚠️ RULE: Each index.html MUST reference its own JS file, NOT "game.js"
## When adding a new version: copy index.html, then sed 's/game.js/vN-name.js/' 
## NEVER leave src="game.js" in any versions/ HTML file

Each version preserved as `vN-name.js` + `vN-index.html`.

| Version | File | Description |
|---------|------|-------------|
| V1 | v1-initial.js | Initial pixel-style 5v5 flag football roguelike |
| V2 | v2-rewrite.js | Complete rewrite with creative director review |
| V2.5 | v2.5-major-features.js | TD celebration, calamity events, defense evolution, audibles, build paths |
| V3-V10 | ⚠️ LOST | Built iteratively but never committed — overwritten each time |
| V11 | v11-dynasty-mode.js | Dynasty Edition: career saves, WR trust, halftime adjustments, challenge codes |

## Lesson Learned (V3-V10 Loss)
V3 through V10 were built in a single session, each overwriting game.js without committing.
When the session ended, all intermediate versions were lost.
**Rule: Every runnable version → git commit immediately + save to versions/**
