# Sprint 63 — Split view: a read-only reference pane

See a second entity beside the one you're editing — the main pane stays fully
editable, the second is a read-only **reference**.

## Layout

`+page.svelte`: a toolbar **split button** (`app.toggleSplit`) opens a second
pane. The main content area becomes a horizontal flex row with a **draggable
divider** (pointer-capture, `splitFraction` clamped 0.25–0.82). Left = the app
as-is (global selection drives it — sidebar / nav / palette unchanged); right =
`SecondaryPane`. Closing (✕) clears it.

Store: `splitOpen` + `splitRef {kind:"note"|"blueprint"|"board", id, title}`
(`null` while open → the pane shows a picker). `toggleSplit` / `openSplitRef` /
`closeSplit`.

## SecondaryPane

- **Empty state** = a picker: a search box + a **"Recently edited"** list of
  notes / blueprints / boards (sorted by `updatedAt`, like Home's Jump-back-in);
  loads blueprints/boards on mount so the list is complete.
- **Reference** (only note / blueprint / board):
  - **note** → the SAME `MarkdownEditor` in read-only mode (see below) → renders
    identically to the main pane (env + mermaid/board hydration included).
  - **board** → the read-only mini-kanban via its `{{board N}}` embed (through
    the same read-only MarkdownEditor).
  - **blueprint** → a static, fit-to-width **SVG overview** (`get_blueprint` →
    cards at their saved positions + edges; no xyflow).
- Header: title + kind, **open-in-main** (navigate the left pane), **Change**
  (back to the picker), **✕** (close).

## `readOnly` on MarkdownEditor

New `readOnly` prop renders the preview only: `startEditing` no-ops; the top /
bottom Edit buttons + floating FAB are hidden; the section-persist hook
(`data-md-sections`) is dropped; and source-mutating preview clicks
(checkbox / stepper / section toggle) are ignored (links still navigate). This
is why a referenced note looks byte-identical to the main pane — same component,
same render path — instead of a bare `md.render` (the earlier style mismatch).

Also: the floating heading **outline** is hidden while the split is open
(`!app.splitOpen`) since it's viewport-fixed and would overlap the pane.

## Notes / follow-ups

- Read-only reference by design (main pane for editing).
- Known rough edge: the note's floating Edit **FAB** in the main pane is
  viewport-fixed, so it can sit over the reference pane's corner — left as-is.

## Checks

`svelte-check` 0/0, `pnpm build` clean. Reference content loads via IPC, so it
needs a live `pnpm tauri dev` run to see real data.
