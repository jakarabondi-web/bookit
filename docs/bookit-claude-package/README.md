# Bookit Claude Package

This package is intended to be handed directly to Claude / Claude Code.

Files:
- `BOOKIT_FRONTEND_CLAUDE_PROMPT.md` — exact UI/UX/frontend implementation prompt.
- `BOOKIT_BACKEND_CLAUDE_PROMPT.md` — backend, database, payments, ticketing, booking, security and antifraud implementation prompt.
- `assets/references/bookit_design_board.png` — visual reference board based on the chosen warm 1B direction.
- `assets/images/` — extracted homepage/event/booking visual assets.
- `assets/icons/` — original minimalist SVG icons for Bookit.

Recommended use:
1. Put this package inside the Bookit repository, for example `/design/bookit-claude-package/`.
2. Give Claude Code `BOOKIT_FRONTEND_CLAUDE_PROMPT.md` first and ask it to match `assets/references/bookit_design_board.png`.
3. Then give it `BOOKIT_BACKEND_CLAUDE_PROMPT.md`.
4. Tell Claude to reference local assets rather than inventing remote URLs.

Note:
The image assets were prepared as design/reference assets from the generated Bookit concept board. They are suitable for prototyping and visual implementation. Replace or upscale specific photography later for final production marketing if needed.
