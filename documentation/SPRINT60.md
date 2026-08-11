# Sprint 60 — Workflow card · slash categories · `list` block

Post-Sprint-59 polish: three independent improvements to the powered-markdown
authoring experience.

## Workflow in a card

`renderWorkflow` now wraps the numbered chain in a **card** (`.md-workflow-block`
— border, rounded, light/dark bg) with:

- a **header** from the fence info, defaulting to **"Workflow"** + the step
  count when no title is given (```` ```workflow Deploy steps ````);
- a per-step **hover** highlight;
- a **📷 PNG copy** button (via `withImgCopy`, no GIF — it's static).

Fence dispatch accepts `workflow` and `workflow <title>`.

## Slash menu — categorized

`SlashMenu.svelte` commands gained a `cat` field and are grouped under headers
in menu order: **Basic · Lists & ideas · PR blocks · Charts & visuals**. A
`.slash-cat` header renders whenever the category changes; filtering and
keyboard nav are unchanged (headers only show for categories with matches).

## ```list — a list of ideas

New block for non-workflow lists (brainstorms, notes). `renderList`: one idea
per line, rendered **like the files block** — a container card with rows split
by a hairline and a **colored left rail**. Per line:

```
idea title [— description] [- <color>]
```

- Trailing ` - <color>` (any of the 10 `NAMED_COLORS`) tints the row's left
  rail; default neutral gray.
- Optional ` — ` (or ` -- ` / ` # `) adds a muted **description** row beneath.
- Title + description support inline markdown. **Hover** tints the row in its
  color. **No export buttons** — it's for thinking, not PRs.

CSS under `/* ```list */` in `app.css`; slash command "List of ideas" (under
Lists & ideas) + a FormattingHelp row.

## Checks

`svelte-check` 0/0, `pnpm build` clean.
