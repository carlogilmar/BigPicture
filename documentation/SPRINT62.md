# Sprint 62 — Embed a feedback board in a note (`{{board N}}`)

Build a board in the kanban, then drop a **read-only reference** into any note.

## Syntax + id

- `{{board N}}` on its own line → a read-only embed of feedback board `N`.
- Boards now show an **id chip** in the board-view header (`IdChip kind="board"`),
  which displays + copies **`{{board N}}`** (boards embed, they aren't an entity
  link) — so you grab the exact snippet to paste.

## Rendering (hydrated, like mermaid)

A synchronous fence can't reach the store/IPC, so `{{board N}}` is a **core
rule** (`addBoardEmbeds`) that replaces a paragraph consisting solely of the
marker with a placeholder `<div class="md-board-embed" data-board="N">`.
`hydrateBoardEmbeds(el)` (exported, called from MarkdownEditor's hydration
effect + its MutationObserver, guarded per-placeholder via `data-rendered`) then
fetches the board (`listFeedbackBoards` for the title + `listFeedbackColumns` +
`listFeedbackCards`) and fills in `boardEmbedHtml`: a **mini read-only kanban** —
a header (title + card count), columns (name + count), and card chips (title +
`cardAccent` color rail + comment count).

- **Kanban look**: the board area carries a subtle tint, columns are transparent,
  cards are white — columns `flex: 1 1 0` so they fill the note's width (scroll
  when too many). Gets the 📷 PNG-copy button.
- **Click the embed header** → opens the full board (`app.openFeedbackBoard`, via
  MarkdownEditor's `onPreviewClick`; flashes if the board was deleted).

## Notes

- Read-only by design — edit in the real board; the embed reflects current data
  on each render.
- Slash "Embed a board" (Lists & ideas) + FormattingHelp row. The interim
  ```` ```board `` fence was removed in favour of `{{board N}}`.

## Checks

`svelte-check` 0/0, `pnpm build` clean. Board data loads via IPC, so the embed
needs a live `pnpm tauri dev` run to see real content.
