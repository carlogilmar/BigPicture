# Sprint 64 — Reference list blocks (`links` / `linkchips`)

## Why

I keep a running list of related entities at the top/bottom of notes as a
markdown bullet list of internal links:

```
- [MAS-2964 Tickets](blueprint:7)
- [Message Operations Decoupling](note:21)
- [Weather Pipeline 1st PR Testing Notes](note:24)
- [Weather Pipeline Blueprint](blueprint:1)
```

Rendered, those were just the generic blue link-chips (Sprint 23) stacked in a
`<ul>` — functional but flat, and they don't read as a *set of destinations*.
This sprint wraps that list in two dedicated powered-markdown blocks so a
"related items" list looks like a first-class component.

Mocked up four presentations first (rows / cards / chips / grouped, published as
an Artifact); the user picked **rows** (Option A) and **chips** (Option C), so we
shipped both as separate blocks.

## What shipped

Two synchronous fence renderers in `src/lib/markdownit.ts`, sharing one parser.
Because the label is authored inline in the markdown, no store/IPC lookup is
needed — they render synchronously like `list`/`files`/`stats` (so they also
work in blueprint cards / any markdown surface), unlike the async board embed.

### `parseEntityLinks(source)`

One markdown link per line, `[label](target)`, tolerating a leading list marker
(`- ` / `* ` / `1. `). `target` is either:

- `kind:id` for a known entity kind → resolves to a color + kind label + icon
  via `LINK_KIND` / `LINK_ICONS`. Kinds: **note** (blue `#2563eb`), **blueprint**
  (violet `#7c3aed`), **board** (teal `#0d9488`), **list** (green `#16a34a`),
  **storyboard** (pink `#db2777`), **flashcard** (amber `#d97706`, label "Card").
- an external `https://…` URL → globe icon, gray, hostname as the kind label,
  opened in a new tab.

Anything else on a line is skipped.

### ` ```links [title] ` → `renderLinks`

A bordered "related items" list (`.md-links`) with a `blockHeader` bar (the
fence title, default **References**, + a count). One row per link, an `<a
href="kind:id">`:

```
[icon tile] Label ……………………… KIND  ↗
```

- `.md-link-ico` — a `1.65rem` rounded tile, `color: var(--lc)` on a
  `color-mix(--lc 15%)` tint. The per-kind color rides in as `--lc` set inline,
  so the CSS is **kind-agnostic** (one rule set, any color).
- `.md-link-label` — flex-1, ellipsised.
- `.md-link-kind` — small uppercase muted kind word.
- `.md-link-go` — an arrow that fades/slides in on row hover.
- Row hover tints with `color-mix(--lc 8%)`.
- PNG-copyable (`withImgCopy`), like the other PR/doc blocks.

### ` ```linkchips [title] ` → `renderLinkChips`

The same links as compact "see also" pills (`.md-linkchips`): a kind-colored dot
(`--lc`) + label, wrapping, white/tinted, with an optional small uppercase title.
Lightweight/inline — **no** PNG button.

## Navigation — `board:` became a first-class entity link

The block anchors reuse the editor's existing entity-link handling
(`MarkdownEditor.onPreviewClick` → `navigateEntity`). Boards were previously
reachable in markdown only via the `{{board N}}` embed, not as a `kind:id` link,
so a `[Title](board:3)` would not navigate. Added `board` to:

- the entity-link regex in `onPreviewClick`
  (`/^(note|list|flashcard|blueprint|storyboard|board):(\d+)$/`), and
- `navigateEntity` (→ `app.openFeedbackBoard(id)`, guarded by
  `app.feedbackBoards`, with a "no longer exists" flash).

`CARD_ENTITY` (the ` ```cards ` link regex) was intentionally left unchanged.

## The one real gotcha — the generic chip rule ate the anchors

First cut rendered wrong: the rows looked like bordered cards and the chips like
plain blue buttons. Cause: the Sprint 23 link-chip style in `MarkdownEditor`'s
scoped CSS —

```css
.markdown-body :global(a:not(.md-card)) { border; blue bg; padding; … }
```

— matches **every** anchor except `.md-card`, so it boxed each `.md-link-row` in
a blue pill and painted each `.md-linkchip` blue. Fix: extend the opt-out the way
`.md-card` already does, to
`a:not(.md-card):not(.md-link-row):not(.md-linkchip)` (base + `:hover` + both
dark variants). Any future block that renders its own anchors must add itself to
this exclusion.

## Wiring

- Slash menu (`SlashMenu.svelte`, category **Lists & ideas**): "Reference list"
  (`links`) + "Reference chips" (`linkchips`), each with a seeded snippet.
- `FormattingHelp.svelte`: two rows documenting the syntax + kinds.

## Files

- `src/lib/markdownit.ts` — fence dispatch (`links` / `linkchips`),
  `LINK_ICONS` / `LINK_KIND` / `LINK_GO`, `parseEntityLinks`, `renderLinks`,
  `renderLinkChips`.
- `src/app.css` — `.md-links` / `.md-link-*` and `.md-linkchips` / `.md-linkchip`
  (light + `html.dark`).
- `src/lib/components/MarkdownEditor.svelte` — `board` in the entity regex +
  `navigateEntity`; the chip-rule exclusion.
- `src/lib/components/SlashMenu.svelte` — snippets + two commands.
- `src/lib/components/FormattingHelp.svelte` — two help rows.

Frontend-only; no backend / migration / store change. svelte-check 0/0, build
clean. Clicking through the anchors needs a live `pnpm tauri dev` run.
