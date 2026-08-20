# Sprint 67 — Per-block editing · section jumper · note-styling refresh

Three threads for working in big notes: edit one block at a time, jump between
sections without an overlay, and a typography/component polish pass. All
frontend; no DB/IPC/migration.

## 1. Per-block editing

Hover any block in a note's preview → a **pencil** appears (right margin);
click it → a small **in-place textarea** opens over just that block, seeded with
that block's raw markdown; Save (⌘↩) splices it back into the note and commits,
Esc/Cancel bails. The note stays one string — this is an editing-UX layer, not a
storage change.

Enabling primitives:
- **Source ranges on every block.** `addLineNumbers` now stamps `data-line` +
  `data-end-line` (start + exclusive end, from `token.map`) on regular blocks;
  a `withSourceRange()` wrapper on the fence rule injects the same attrs into the
  outer element of every powered/code block (they build HTML by hand and ignore
  token attrs) — so paragraphs, lists, quotes, tables, fences, mermaid all carry
  a precise range.
- **`replaceLinesInSource(src, start, end, text)`** — the splice helper (sibling
  of `toggleTaskInSource`).
- **Editor wiring** (`MarkdownEditor`): a `previewWrap` (relative) hosts the
  pencil + overlay; `onPreviewMove` finds the hovered block via
  `closest("[data-line][data-end-line]")`; `editHoveredBlock` slices the range;
  `saveBlock` splices + commits. Notes only (`!readOnly`), preview mode only.
- **Pencil placement + hover-intent.** The pencil sits in the RIGHT margin
  (`right: -1.75rem`) so it never collides with a block's own top-right controls
  (📷 copy / GIF) or the progress steppers — the original top-right position
  clobbered those. Because reaching for it briefly leaves the preview, hiding is
  on a 240ms delay that the pencil's own `mouseenter` cancels, so it doesn't
  vanish mid-reach.

## 2. Section jumper (replaces the floating outline)

The always-on right-side heading column overlapped the note. Replaced with an
on-demand **"≡ Sections"** button stacked just above the Edit FAB (bottom-right,
`flex-col items-end`); clicking opens a compact popover of h1–h3 (indented by
level), click a heading to smooth-scroll and close. Shows only for notes with ≥2
headings, hidden while split or block-editing.

## 3. Note-styling refresh

All theme-accent-driven (recolors with the sidebar tint).

- **Headings → serif.** h1/h2/h3 use a serif display face
  (`ui-serif` → system "New York" / Iowan), h1 with a hairline rule — headings
  read as titles, not just larger body. (Scoped in `MarkdownEditor`.) Chosen from
  a 3-font mockup (serif / rounded / tight-grotesque).
- **Inline code → copyable badge.** `code_inline` now renders
  `<code class="md-badge" data-code="…">text<button class="md-badge-copy">…</button></code>`:
  an accent-tinted rounded chip with an **always-visible copy button** (clipboard
  icon → green check on click). `installInlineCopy` (delegated, capture-phase,
  like `installCodeCopy`) copies the exact text (`data-code` is entity-encoded;
  the browser decodes it on read). Applies to inline code everywhere it renders.
- **Plain `>` → soft note.** A blockquote WITHOUT a `[!TYPE]` tag
  (`blockquote:not(.callout)`) becomes a tinted card: accent bar + faint tint +
  a quote glyph.
- **Callouts redesign.** `[!NOTE]/[!TIP]/[!IMPORTANT]/[!WARNING]/[!CAUTION]/
  [!COMMENT]` are now rounded, tinted panels with a solid left bar **and a
  per-type icon** (info / bulb / star / triangle / triangle / speech-bubble) — one
  family with the soft note. Icons via a `CALLOUT_ICON` map injected into the
  `callout-label`; styling in app.css with dark-mode label colors.
- **Sublists.** Bullets step **● → ○ → ▪**, numbers **1. → a. → i.**, a bullet
  list under a number stays a bullet, and `::marker` is accent-tinted. Fix: the
  scoped `ul`/`ol` `list-style` was out-specifying the nested rules, so all list
  styling moved to app.css (base + nested), the component keeps only spacing.
- **Task checkboxes** use the theme accent (`accent-color: var(--accent)`).

### Specificity gotchas fixed
- Scoped `.markdown-body ul{list-style}` beat app.css `ul ul` → sublists showed
  the top-level marker. Fixed by moving list-style entirely to app.css.
- A generic `.md-badge-copy svg { display:block }` out-specified the
  "hide the check icon" rule → both copy + check showed. Removed the generic
  display; the check is hidden until `.md-copied`.

## Files

- `src/lib/markdownit.ts` — `data-end-line` in `addLineNumbers`,
  `withSourceRange` fence wrapper, `replaceLinesInSource`, `code_inline` badge +
  `installInlineCopy`, `CALLOUT_ICON` + callout-label icon, `INLINE_COPY_ICON`.
- `src/lib/components/MarkdownEditor.svelte` — block-edit state/handlers +
  pencil/overlay markup + hover-intent, section-jump popover, serif headings +
  soft-note blockquote (scoped), list spacing (list-style removed).
- `src/app.css` — callouts redesign, badge styles, list base+nested+marker,
  task-checkbox accent.

svelte-check 0/0, build ✓. DOM/interaction features (pencil hover, in-place
overlay, badge copy, scroll) — exercised live in `pnpm tauri dev`.

## Deferred
Per-*list-item* editing (a list edits as one block); a surgical single-block DOM
re-render (perf lever for very large notes — v1 re-renders the whole preview on
save); the extra style ideas not taken this round (quieter link chips, fancy
divider, reading-rhythm pass).
