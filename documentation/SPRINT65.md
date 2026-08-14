# Sprint 65 — Check-in polish · animated canvas tints · theme accent · shortcut cleanup

A grab-bag sprint of UX + theming work. Five threads, all frontend-leaning
(one small backend command).

## 1. Camera check-in polish (`checkin.ts`, `ActivityView`, `export.rs`)

Three asks on the "lolcommits for todo lists" gallery:

- **Live preview before the shot.** `captureCheckinGif` now mounts a small,
  non-invasive self-view (180×135, bottom-right, mirrored, inline-styled — no
  global CSS) with a **3 → 2 → 1 countdown** so you can frame yourself, then a
  "● Recording" hint while the frames are grabbed; it fades out on finish.
  Reuses the same `getUserMedia` stream. Off when `preview: false`.
- **Date stamp burned into the GIF.** A `label` option draws a soft bottom
  gradient bar + caption on each frame (drawn AFTER the mirror transform so it
  reads normally, auto-shrunk to fit). The store passes
  `checkinStamp(new Date())` → e.g. "Thursday · Aug 14, 2026".
- **Download / share.** Per-GIF **Download** button (hover) → native Save As
  dialog (`check-in-YYYY-MM-DD.gif`) writing a copy anywhere. Backend
  `read_binary_file(path)` reads the bytes, the existing `save_binary_file`
  writes the copy — reuses the `dialog:allow-save` permission. (First tried the
  opener plugin's open-folder / reveal-in-Finder, but its path scope blocked it;
  the Download flow sidesteps that entirely — the opener path/reveal permissions
  were reverted.)

## 2. Three animated canvas sidebar tints (`SidebarFx.svelte`, theme store)

New tint family driven by a hand-rolled `<canvas>` + rAF loop (no library —
matches the Mirror / aurora approach, offline/CSP-clean), in the same
`z-index:-1` backdrop slot the aurora blobs use:

- **Glitter** — drifting, twinkling gold + iridescent dots + a slow shimmer sweep.
- **Fireworks** — periodic starbursts (core flash + radiating, trailing, gravity
  sparks).
- **Meteor shower** — a slow twinkling starfield crossed by occasional
  shooting-star streaks (deliberately bridges the other two).

`SidebarFx.svelte` handles DPR, `ResizeObserver`, and tears down its rAF on
destroy; `{#key}` remounts it on tint switch. **Reduced-motion → one static
frame.** Three `SIDEBAR_TINTS` entries with a new `fx` field + `base` color;
`theme.sidebarFx` getter (light-mode only, like aurora); `applyTint` uses `base`
for fx tints. TopNav swatches get distinct gradient previews.

Prototyped as an approved Artifact mockup first (four presentations → rows +
chips… no wait, that was the links block; here: Glitter/Fireworks/Meteor, with
the interactions removed per feedback — the tints are purely ambient).

## 3. Screensaver uses the animated tints + a quick-enter button

- **Focus mode** now fills its whole stage with the selected tint's canvas
  animation when it's an fx tint (`theme.selectedFx` — works in BOTH light/dark
  since the stage is always dark, unlike the sidebar), else the existing aurora
  backdrop. Same `SidebarFx` component.
- **Quick-enter button.** A prominent **Enter Focus** button in the sidebar
  footer — above the divider, centered, filled with the theme accent, uppercase.
  (The old TopNav Focus icon was later removed, see §5.)

## 4. Theme accent — primary buttons follow the selected tint

Buttons were hardcoded blue; now they follow the theme.

- Each tint contributes an **accent** color (`tintAccent`): hue tints derive
  `hsl(hue 65% 48%)`, ink/animated/fx tints set it explicitly (Fireworks red,
  Meteor blue, Glitter violet, Aurora teal, …). The store publishes it as
  `--accent` on `<html>` in `applyTint` — in BOTH light and dark mode.
- New **`.btn-accent`** class (app.css): fills with `var(--accent)`, white text,
  hover/active darken via `color-mix`, solid when disabled.
- Swept the primary CTAs onto it: sidebar **Enter Focus** + **＋ Add**, Home
  **New list** / **Create today's list**, Library **+ New**, AddEntityModal
  create, note editor **Edit FAB**, Storyboard **Save PNG**, Flash Deck
  new/Add, Passwords create/unlock/add, feedback card **Save**.
- The **TopNav toolbar** also follows the accent (§5): hub pills + active
  destination icon + the split-view active state use `var(--accent)` instead of
  blue. (Selection *highlights* — the light blue-tinted today's-list / backlog
  rows — were intentionally left as-is; they're states, not action buttons.)

## 5. Shortcut cleanup — a tight, Stream-Deck-friendly set

Replaced the sprawling shortcut map with **⌘1–⌘8** only:

| Key | Action |
|-----|--------|
| ⌘1 | Home |
| ⌘2 | Add — new entity picker |
| ⌘3 | The Mirror |
| ⌘4 | Activity |
| ⌘5 | Passwords vault |
| ⌘6 | Screensaver (Focus mode) |
| ⌘7 | Split view |
| ⌘8 | Random sidebar theme |

**Removed:** `⌘F` (sidebar search), `⌘[` (back), `⌘\` (sidebar toggle), `⌘N`,
`⌘E`, `⌘⇧C/T/B/N/S`, and the old `⌘2/⌘3/⌘5/⌘7` view nav (Blueprints / Library /
Feedback / Flash Deck). Those views stay reachable via the TopNav icons + the
command palette. **Kept** (structural, not feature-nav): `⌘K` (palette), `Esc`,
`?`, `Enter`, `Tab`.

Kept everything honest across the surfaces that *display* shortcuts:
- `+page.svelte` `handleKeydown` rewritten to a `switch`; the now-unused
  `sidebar` bind removed.
- **HelpModal** rewritten to the two-section set.
- **CommandPalette** hints corrected + added "Add… (⌘2)", "Toggle split view
  (⌘7)", "Random sidebar theme (⌘8)", "Enter Focus (⌘6)".
- **TopNav** tooltips remapped; **Focus icon removed** from the toolbar (it's in
  the sidebar now); back button no longer claims `⌘[`.
- Sidebar **Add** (⌘2), **Enter Focus** (⌘6) and the toolbar **split** (⌘7)
  buttons show their keys.

## 6. Removed the build/commit footer

The `build <hash>` button + commit popover at the sidebar bottom (and its
`__APP_COMMIT__*` bindings) are gone — no longer useful. Footer is now
**Enter Focus → brand label → Shortcuts**. (The Vite commit `define`s are left in
place, harmless and unreferenced.)

## Files

- `src/lib/checkin.ts` — preview UI, date stamp, `checkinStamp`.
- `src/lib/components/ActivityView.svelte` — per-GIF Download button.
- `src-tauri/src/commands/export.rs` (+ `lib.rs`) — `read_binary_file`.
- `src/lib/components/SidebarFx.svelte` — the three canvas effects (new).
- `src/lib/stores/theme.svelte.ts` — `fx` + `accent` fields, `tintAccent`,
  `sidebarFx`/`selectedFx` getters, `--accent` in `applyTint`.
- `src/app.css` — `.btn-accent`, `--accent` default.
- `src/lib/components/{Sidebar,TopNav,FocusMode}.svelte`,
  `src/routes/+page.svelte` — accent wiring, Focus button move, toolbar recolor,
  shortcut hints, commit-footer removal.
- `src/lib/components/{HelpModal,CommandPalette}.svelte` — shortcut surfaces.
- Primary-CTA sweep across `Welcome`, `LibraryView`, `AddEntityModal`,
  `MarkdownEditor`, `StoryboardEditor`, `FlashDeckView`, `PasswordsView`,
  `FeedbackCardPanel`.

Frontend + one backend command; no migration. svelte-check 0/0, cargo check ✓,
build ✓. The camera preview / stamped GIF / save dialog, the canvas animations,
and the toolbar recolor all need a live `pnpm tauri dev` run to exercise.
