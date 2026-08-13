<script lang="ts">
  import { onMount } from "svelte";
  import { app } from "$lib/stores/app.svelte";
  import { theme } from "$lib/stores/theme.svelte";
  import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";
  import {
    noteById,
    getBlueprint,
    type BlueprintNode,
    type BlueprintEdge,
  } from "$lib/ipc";
  import { cardAccent } from "$lib/cardColors";

  type Kind = "note" | "blueprint" | "board";
  type PickItem = { kind: Kind; id: number; title: string; updatedAt: string };

  let query = $state("");
  let noteBody = $state("");
  let bpNodes = $state<BlueprintNode[]>([]);
  let bpEdges = $state<BlueprintEdge[]>([]);
  let loading = $state(false);

  const KIND_DOT: Record<Kind, string> = {
    note: "#2563eb",
    blueprint: "#7c3aed",
    board: "#0d9488",
  };

  // Blueprints/boards load lazily elsewhere — make sure the picker is complete.
  onMount(() => {
    if (app.blueprints.length === 0) void app.refreshBlueprints();
    if (!app.feedbackBoardsLoaded) void app.refreshFeedbackBoards();
  });

  // All embeddable entities (note · blueprint · board), for search + recents.
  let items = $derived.by<PickItem[]>(() => {
    const out: PickItem[] = [];
    for (const n of app.notes)
      if (!n.archived)
        out.push({ kind: "note", id: n.id, title: n.title || "Untitled note", updatedAt: n.updatedAt });
    for (const b of app.blueprints)
      if (!b.archived)
        out.push({ kind: "blueprint", id: b.id, title: b.title || "Untitled blueprint", updatedAt: b.updatedAt });
    for (const bd of app.feedbackBoards)
      if (!bd.archived)
        out.push({ kind: "board", id: bd.id, title: bd.title || "Board", updatedAt: bd.updatedAt });
    return out;
  });
  let recent = $derived(
    [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 8),
  );
  let filtered = $derived.by<PickItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items.filter((i) => i.title.toLowerCase().includes(q)).slice(0, 40);
  });

  // Load the referenced entity's data when the ref changes.
  $effect(() => {
    const r = app.splitRef;
    if (!r) return;
    loading = true;
    noteBody = "";
    bpNodes = [];
    bpEdges = [];
    void (async () => {
      try {
        if (r.kind === "note") noteBody = (await noteById(r.id)).body ?? "";
        else if (r.kind === "blueprint") {
          const s = await getBlueprint(r.id);
          bpNodes = s.nodes;
          bpEdges = s.edges;
        }
      } catch {
        /* deleted / unavailable */
      } finally {
        loading = false;
      }
    })();
  });

  // Notes + boards render through the SAME MarkdownEditor (read-only) as the main
  // pane, so they look identical. A board is just its `{{board N}}` embed.
  let mdValue = $derived(
    app.splitRef?.kind === "note"
      ? noteBody
      : app.splitRef?.kind === "board"
        ? `{{board ${app.splitRef.id}}}`
        : "",
  );
  async function noop() {}

  // A static, fit-to-width SVG OVERVIEW of a blueprint (read-only): cards at
  // their saved positions + edges. No xyflow — just an at-a-glance reference.
  function esc(s: string): string {
    return s.replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
    );
  }
  function trunc(s: string, m: number): string {
    return s.length > m ? s.slice(0, Math.max(1, m - 1)) + "…" : s;
  }
  let bpSvg = $derived.by(() => {
    if (bpNodes.length === 0) return "";
    const DW = 190;
    const DH = 82;
    const box = new Map<number, { n: BlueprintNode; w: number; h: number }>();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of bpNodes) {
      const w = n.width ?? DW;
      const h = n.height ?? DH;
      box.set(n.id, { n, w, h });
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + w);
      maxY = Math.max(maxY, n.y + h);
    }
    const pad = 40;
    const vb = `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
    const dark = theme.resolved === "dark";
    const cardBg = dark ? "#1b2333" : "#ffffff";
    const stroke = dark ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.16)";
    const ink = dark ? "#e5e5e5" : "#171717";
    const edgeC = dark ? "#94a3b8" : "#64748b";
    const edges = bpEdges
      .map((e) => {
        const a = box.get(e.sourceId);
        const b = box.get(e.targetId);
        if (!a || !b) return "";
        const x1 = a.n.x + a.w / 2;
        const y1 = a.n.y + a.h / 2;
        const x2 = b.n.x + b.w / 2;
        const y2 = b.n.y + b.h / 2;
        return `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${edgeC}" stroke-width="1.6" fill="none" marker-end="url(#bpref-a)"/>`;
      })
      .join("");
    const nodes = bpNodes
      .map((n) => {
        const b = box.get(n.id)!;
        const w = b.w;
        const h = b.h;
        if (n.kind === "frame")
          return `<g><rect x="${n.x}" y="${n.y}" width="${w}" height="${h}" rx="8" fill="none" stroke="${edgeC}" stroke-dasharray="6 5"/><text x="${n.x + 8}" y="${n.y + 16}" font-size="12" fill="${edgeC}">${esc(trunc(n.content || n.title || "", 28))}</text></g>`;
        if (n.kind === "card") {
          const accent = cardAccent(n.color) || edgeC;
          return (
            `<g><rect x="${n.x}" y="${n.y}" width="${w}" height="${h}" rx="8" fill="${cardBg}" stroke="${stroke}"/>` +
            `<rect x="${n.x}" y="${n.y}" width="4" height="${h}" rx="2" fill="${accent}"/>` +
            `<text x="${n.x + 12}" y="${n.y + 24}" font-size="13" font-weight="650" fill="${ink}">${esc(trunc(n.title || "Untitled", Math.max(6, Math.floor(w / 8))))}</text></g>`
          );
        }
        const txt = n.content || n.title || "";
        return `<text x="${n.x}" y="${n.y + 14}" font-size="${n.kind === "title" ? 16 : 12}" font-weight="${n.kind === "title" ? 700 : 400}" fill="${ink}">${esc(trunc(txt, Math.max(8, Math.floor(w / 7))))}</text>`;
      })
      .join("");
    const defs = `<defs><marker id="bpref-a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${edgeC}"/></marker></defs>`;
    return `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet" width="100%" style="max-height:100%">${defs}${edges}${nodes}</svg>`;
  });

  function pick(item: PickItem) {
    app.openSplitRef(item.kind, item.id, item.title);
    query = "";
  }
  function openInMain() {
    const r = app.splitRef;
    if (!r) return;
    if (r.kind === "note") app.selectNote(r.id);
    else if (r.kind === "blueprint") app.openBlueprint(r.id);
    else void app.openFeedbackBoard(r.id);
  }
  function ago(iso: string): string {
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return "just now";
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  }
</script>

<div class="flex h-full flex-col">
  <!-- pane header -->
  <header
    class="flex h-10 shrink-0 items-center gap-2 border-b border-neutral-200/70 px-3 dark:border-neutral-700/70"
  >
    {#if app.splitRef}
      <span class="h-2 w-2 flex-none rounded-full" style="background:{KIND_DOT[app.splitRef.kind]}"></span>
      <span class="min-w-0 flex-1 truncate text-sm font-medium">{app.splitRef.title}</span>
      <span class="text-[10px] uppercase tracking-widest text-neutral-400">{app.splitRef.kind}</span>
      <button
        type="button"
        class="rounded p-1 text-neutral-400 hover:bg-neutral-200/60 hover:text-neutral-700 dark:hover:bg-neutral-700/40"
        title="Open in main pane"
        aria-label="Open in main pane"
        onclick={openInMain}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/></svg>
      </button>
      <button
        type="button"
        class="rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/40"
        title="Choose a different reference"
        onclick={() => (app.splitRef = null)}
      >
        Change
      </button>
    {:else}
      <span class="flex-1 text-xs font-medium uppercase tracking-widest text-neutral-400">Reference</span>
    {/if}
    <button
      type="button"
      class="rounded p-1 text-neutral-400 hover:bg-neutral-200/60 hover:text-neutral-700 dark:hover:bg-neutral-700/40"
      title="Close reference pane"
      aria-label="Close reference pane"
      onclick={() => app.closeSplit()}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
    </button>
  </header>

  <div class="min-h-0 flex-1 overflow-y-auto">
    {#if !app.splitRef}
      <!-- picker: search + recents -->
      <div class="p-3">
        <input
          bind:value={query}
          placeholder="Search notes, blueprints, boards…"
          class="mb-3 w-full rounded-md border border-neutral-200/70 bg-white/70 px-3 py-1.5 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700/70 dark:bg-neutral-900/40"
        />
        {#if query.trim()}
          {#if filtered.length === 0}
            <p class="px-1 py-4 text-center text-xs text-neutral-400">No matches.</p>
          {/if}
          {#each filtered as it (it.kind + it.id)}
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
              onclick={() => pick(it)}
            >
              <span class="h-2 w-2 flex-none rounded-full" style="background:{KIND_DOT[it.kind]}"></span>
              <span class="min-w-0 flex-1 truncate">{it.title}</span>
              <span class="text-[10px] uppercase tracking-wide text-neutral-400">{it.kind}</span>
            </button>
          {/each}
        {:else}
          <p class="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-widest text-neutral-400">Recently edited</p>
          {#if recent.length === 0}
            <p class="px-1 py-4 text-center text-xs text-neutral-400">Nothing yet.</p>
          {/if}
          {#each recent as it (it.kind + it.id)}
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
              onclick={() => pick(it)}
            >
              <span class="h-2 w-2 flex-none rounded-full" style="background:{KIND_DOT[it.kind]}"></span>
              <span class="min-w-0 flex-1 truncate">{it.title}</span>
              <span class="flex-none text-[11px] text-neutral-400">{ago(it.updatedAt)}</span>
            </button>
          {/each}
        {/if}
      </div>
    {:else if loading && app.splitRef.kind === "blueprint"}
      <p class="p-6 text-sm text-neutral-400">Loading…</p>
    {:else if app.splitRef.kind === "blueprint"}
      <div class="bp-ref flex h-full items-center justify-center p-2">
        {@html bpSvg}
      </div>
    {:else}
      <div class="px-2 py-2">
        {#key app.splitRef.kind + app.splitRef.id}
          <MarkdownEditor value={mdValue} onCommit={noop} readOnly minHeight="0" />
        {/key}
      </div>
    {/if}
  </div>
</div>

<style>
  .bp-ref :global(svg) {
    max-width: 100%;
    height: auto;
  }
</style>
