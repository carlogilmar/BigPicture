# Sprint 61 — `blueprint` block · collapsible sections overhaul · task notes

A batch of authoring improvements, headlined by an inline Blueprint diagram.

## ```blueprint — a small node-graph (the Blueprints look)

`renderBlueprint` in `$lib/markdownit.ts`. The Blueprint import DSL, rendered
inline as a static diagram that *looks like the Blueprints canvas*:

- `Name: short description [- color]` → a card; `A -> B -> C` → edges (undefined
  names auto-create cards).
- **Longest-path layering** (Kahn) lays it out left→right automatically.
- Rendered as a **dot-grid** scene (`.md-bp-scene`, fills the whole block via
  `min-width:100%`) with **HTML cards** (left accent bar + shadow + bold centered
  title + 2-line muted desc, mirroring `BlueprintCardNode`) over an **SVG edge
  layer** (animated dashed arrows, pinned top-left so the viewBox maps 1:1 to the
  cards' pixel positions). **Connection handle dots** sit on the card border
  wherever an edge attaches (a layer above the cards).
- Per-card color via a trailing `- <color>` (NAMED_COLORS). **PNG copy** button,
  no GIF. For big diagrams use Blueprints proper. Slash "Blueprint (diagram)"
  (Charts & visuals) + FormattingHelp row.

## Collapsible sections — restyled + persistent

- **Look**: reverted the Notion-style experiment; the section is now a single
  card (same border/radius as files) with a **dark bar header** — a small,
  centered **Oswald** title (uppercase) + a subtle chevron (down closed / up
  open). One component, no seams.
- **Persistent open/closed status (frontend-only)**: the state lives in the
  source — `## > Title` collapsed, `## >> Title` open. Each `<summary>` carries a
  `data-section` index; `toggleSectionInSource` flips the `>`/`>>` marker (mirrors
  `toggleTaskInSource`). MarkdownEditor's preview is tagged
  `[data-md-sections="persist"]` and handles the click (flip + save), so the
  global `installSectionToggle` (ephemeral, for read-only surfaces) bails there.
  Result: expand a section, edit, come back — it stays open (and survives
  restart, since it's in the note).

## Task-detail note editing

`Inspector.svelte`: the task description now uses the same **locked floating-edit**
flow as notes (`floatingEdit`), with a new `floatingContained` prop on
MarkdownEditor that anchors the FAB to the modal (`absolute`) instead of the
viewport (`fixed`). The modal is also **wider** (`max-w-2xl` → `max-w-4xl`).

## ```list — optional description

Refinement: a `list` idea can carry a description — `idea — description - color`
renders a muted description row beneath the idea (both take inline markdown).

## Checks

`svelte-check` 0/0, `pnpm build` clean throughout. Blueprint/list are
CSS-only/synchronous; the section persistence + task FAB are frontend-only.
