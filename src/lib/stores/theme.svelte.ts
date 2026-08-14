export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme";
const TINT_KEY = "sidebarTint";
const BRAND_KEY = "brandLabel";
const CHECKINS_KEY = "checkinsEnabled"; // Sprint 42 — camera check-ins opt-in

// Default sidebar app-brand label (Sprint 31). Editable + persisted.
export const DEFAULT_BRAND = "Alert Media Engineering Toolbox";

// Selectable sidebar tints. `hue` null = neutral grey. `dark: true` = a solid
// dark surface (the sidebar flips to light text — see ThemeStore.isSidebarDark
// + Sidebar.svelte). Tints are a LIGHT-MODE feature: in dark mode the sidebar
// is ALWAYS a plain black surface and the tint is ignored (applyTint /
// sidebarAurora). Order = swatch order in the UI.
export type Tint = {
  name: string;
  label: string;
  hue: number | null;
  dark?: boolean;
  // Animated gradient surfaces (Sprint 23): `aurora` lists the blob colors
  // the Sidebar drifts over `base` (a deep dark backdrop), plus a noise
  // grain overlay. Aurora tints are always dark surfaces (light text).
  aurora?: string[];
  base?: string;
  // Canvas particle surfaces (Sprint 65): a hand-rolled <canvas> animation
  // (SidebarFx.svelte) renders over `base` instead of the CSS aurora blobs.
  // Always dark surfaces (light text), light-mode only — like aurora.
  fx?: "glitter" | "fireworks" | "meteor";
  // Primary-action accent (buttons/CTAs follow the selected theme). For plain
  // hue tints it's derived from `hue`; animated/fx/ink tints set it explicitly.
  accent?: string;
};

// The accent color a tint contributes to primary buttons (see `--accent`).
export function tintAccent(tint: Tint | undefined): string {
  if (!tint) return "#2563eb";
  if (tint.accent) return tint.accent;
  if (tint.hue != null) return `hsl(${tint.hue} 65% 48%)`;
  return "#2563eb"; // ink / neutral default
}

export const SIDEBAR_TINTS: Tint[] = [
  // Ink is the default (solid black surface, light text).
  { name: "ink", label: "Ink (black)", hue: null, dark: true, accent: "#2563eb" },
  // Light colour washes.
  { name: "blue", label: "Blue", hue: 217 },
  { name: "rose", label: "Rose", hue: 350 },
  { name: "indigo", label: "Indigo", hue: 245 },
  // Dark surfaces (light text).
  { name: "forest", label: "Forest", hue: 155, dark: true },
  { name: "wine", label: "Wine", hue: 345, dark: true },
  { name: "plum", label: "Plum", hue: 290, dark: true },
  // Animated aurora gradients (dark, light text).
  {
    name: "aurora",
    label: "Aurora (animated)",
    hue: null,
    dark: true,
    base: "hsl(228 42% 9%)",
    aurora: ["#2dd4bf", "#4ade80", "#818cf8"],
    accent: "#14b8a6",
  },
  {
    name: "ember",
    label: "Ember (animated)",
    hue: null,
    dark: true,
    base: "hsl(340 45% 9%)",
    aurora: ["#fb923c", "#f472b6", "#a78bfa"],
    accent: "#fb7185",
  },
  {
    name: "ocean",
    label: "Ocean (animated)",
    hue: null,
    dark: true,
    base: "hsl(215 55% 10%)",
    aurora: ["#38bdf8", "#22d3ee", "#6366f1"],
    accent: "#0ea5e9",
  },
  {
    name: "sunset",
    label: "Sunset (animated)",
    hue: null,
    dark: true,
    base: "hsl(268 40% 10%)",
    aurora: ["#f97316", "#ef4444", "#fbbf24"],
    accent: "#f97316",
  },
  {
    name: "ice",
    label: "Ice (animated)",
    hue: null,
    dark: true,
    base: "hsl(210 30% 12%)",
    aurora: ["#e2e8f0", "#94a3b8", "#38bdf8"],
    accent: "#0ea5e9",
  },
  {
    name: "cosmos",
    label: "Cosmos (animated)",
    hue: null,
    dark: true,
    base: "hsl(250 48% 8%)",
    aurora: ["#6366f1", "#d946ef", "#22d3ee"],
    accent: "#8b5cf6",
  },
  // Canvas particle surfaces (dark, light text) — a <canvas> animation instead
  // of CSS blobs (see SidebarFx.svelte).
  {
    name: "glitter",
    label: "Glitter (animated)",
    hue: null,
    dark: true,
    base: "hsl(258 42% 9%)",
    fx: "glitter",
    accent: "#8b5cf6",
  },
  {
    name: "fireworks",
    label: "Fireworks (animated)",
    hue: null,
    dark: true,
    base: "hsl(228 55% 7%)",
    fx: "fireworks",
    accent: "#f43f5e",
  },
  {
    name: "meteor",
    label: "Meteor shower (animated)",
    hue: null,
    dark: true,
    base: "hsl(222 50% 8%)",
    fx: "meteor",
    accent: "#3b82f6",
  },
  // Light aurora surfaces (dark text): pastel blobs multiply-blended over a
  // near-white base — see Sidebar.svelte's .aurora-light rules.
  {
    name: "daybreak",
    label: "Daybreak (animated, light)",
    hue: null,
    base: "hsl(210 60% 97%)",
    aurora: ["#7dd3fc", "#a5b4fc", "#6ee7b7"],
    accent: "#0ea5e9",
  },
  {
    name: "blossom",
    label: "Blossom (animated, light)",
    hue: null,
    base: "hsl(330 60% 97%)",
    aurora: ["#f9a8d4", "#c4b5fd", "#fda4af"],
    accent: "#ec4899",
  },
];

function findTint(name: string): Tint | undefined {
  return SIDEBAR_TINTS.find((t) => t.name === name);
}

function readStoredTint(): string {
  if (typeof localStorage === "undefined") return "ink";
  const v = localStorage.getItem(TINT_KEY);
  return v && SIDEBAR_TINTS.some((t) => t.name === v) ? v : "ink";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStored(): Theme {
  if (typeof localStorage === "undefined") return "system";
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

function readStoredBrand(): string {
  if (typeof localStorage === "undefined") return DEFAULT_BRAND;
  const v = localStorage.getItem(BRAND_KEY);
  return v !== null ? v : DEFAULT_BRAND;
}

class ThemeStore {
  preference = $state<Theme>("system");
  // Resolved (effective) theme — what's actually applied right now.
  resolved = $state<"light" | "dark">("light");
  // Selectable sidebar background tint (see SIDEBAR_TINTS).
  sidebarTint = $state<string>("ink");
  // Editable sidebar app-brand label (Sprint 31).
  brandLabel = $state<string>(DEFAULT_BRAND);
  // Camera check-ins (Sprint 42). Opt-in, default OFF.
  checkinsEnabled = $state<boolean>(false);

  init() {
    if (typeof document === "undefined") return;
    this.preference = readStored();
    this.sidebarTint = readStoredTint();
    this.brandLabel = readStoredBrand();
    if (typeof localStorage !== "undefined") {
      this.checkinsEnabled = localStorage.getItem(CHECKINS_KEY) === "1";
    }
    this.apply();

    // Re-apply when the system preference flips, but only if we're following
    // the system. Each user-driven preference change goes through set().
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", () => {
      if (this.preference === "system") this.apply();
    });
  }

  set(next: Theme) {
    this.preference = next;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, next);
    }
    this.apply();
  }

  cycle() {
    const order: Theme[] = ["system", "light", "dark"];
    const idx = order.indexOf(this.preference);
    this.set(order[(idx + 1) % order.length]);
  }

  setSidebarTint(name: string) {
    this.sidebarTint = name;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(TINT_KEY, name);
    }
    this.applyTint();
  }

  // Pick a random sidebar tint, different from the current one. Persisted via
  // setSidebarTint.
  randomSidebarTint() {
    const names = SIDEBAR_TINTS.map((t) => t.name).filter(
      (n) => n !== this.sidebarTint,
    );
    if (names.length === 0) return;
    const pick = names[Math.floor(Math.random() * names.length)];
    this.setSidebarTint(pick);
  }

  setCheckinsEnabled(on: boolean) {
    this.checkinsEnabled = on;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CHECKINS_KEY, on ? "1" : "0");
    }
  }

  // Set the app-brand label; empty/blank resets to the default. Persisted.
  setBrandLabel(text: string) {
    const next = text.trim() || DEFAULT_BRAND;
    this.brandLabel = next;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(BRAND_KEY, next);
    }
  }

  private apply() {
    if (typeof document === "undefined") return;
    const isDark =
      this.preference === "dark" ||
      (this.preference === "system" && systemPrefersDark());
    document.documentElement.classList.toggle("dark", isDark);
    this.resolved = isDark ? "dark" : "light";
    // The tint background depends on light/dark, so recompute it here too.
    this.applyTint();
  }

  // True when the selected tint is a dark surface — the Sidebar then renders its
  // contents with light text (adds the `dark` class locally) regardless of the
  // app's light/dark mode.
  get isSidebarDark(): boolean {
    return findTint(this.sidebarTint)?.dark ?? false;
  }

  // Blob colors of the active aurora tint, or null for flat tints. The
  // Sidebar renders the animated layer from this.
  get sidebarAurora(): string[] | null {
    // Dark mode forces a plain black sidebar (tint ignored), so no aurora.
    if (this.resolved === "dark") return null;
    return findTint(this.sidebarTint)?.aurora ?? null;
  }

  // The active tint's canvas-fx animation name, or null. Light-mode only, same
  // as aurora — dark mode forces a plain black sidebar. The Sidebar renders
  // SidebarFx from this.
  get sidebarFx(): "glitter" | "fireworks" | "meteor" | null {
    if (this.resolved === "dark") return null;
    return findTint(this.sidebarTint)?.fx ?? null;
  }

  // The selected tint's canvas-fx name IGNORING light/dark — Focus mode (the
  // screensaver) is always a dark stage, so it shows the animation regardless
  // of app theme, unlike the sidebar.
  get selectedFx(): "glitter" | "fireworks" | "meteor" | null {
    return findTint(this.sidebarTint)?.fx ?? null;
  }

  // Write the sidebar tint as CSS vars on <html>; the Sidebar reads them.
  // Translucent (so macOS vibrancy still shows through). Neutral = original
  // (transparent bg, faint neutral border). Dark tints = a deep, mostly-opaque
  // surface, same in light and dark mode.
  private applyTint() {
    if (typeof document === "undefined") return;
    const root = document.documentElement.style;

    // Primary-action accent follows the selected tint in BOTH light and dark
    // mode (buttons/CTAs use var(--accent)); set it before the dark early-return.
    root.setProperty("--accent", tintAccent(findTint(this.sidebarTint)));

    // Dark mode: ALWAYS a solid black sidebar — the tint is a light-mode-only
    // choice (colour washes / dark surfaces never read consistently over the
    // dark app), so it's ignored entirely here.
    if (this.resolved === "dark") {
      root.setProperty("--sidebar-bg", "hsl(0 0% 6%)");
      root.setProperty("--sidebar-border", "rgba(255, 255, 255, 0.10)");
      return;
    }

    // Light mode: apply the selected tint.
    const tint = findTint(this.sidebarTint);
    const hue = tint?.hue ?? null;

    if (tint?.aurora || tint?.fx) {
      // Opaque base — the animated blobs/noise (aurora) or canvas particles
      // (fx) render on top of it inside the Sidebar itself. Dark surfaces get a
      // light border, light auroras a dark one.
      root.setProperty(
        "--sidebar-bg",
        tint.base ?? (tint.dark ? "hsl(228 42% 9%)" : "hsl(0 0% 98%)"),
      );
      root.setProperty(
        "--sidebar-border",
        tint.dark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.1)",
      );
    } else if (tint?.dark) {
      root.setProperty(
        "--sidebar-bg",
        hue == null ? "hsl(0 0% 9% / 0.94)" : `hsl(${hue} 30% 14% / 0.95)`,
      );
      root.setProperty(
        "--sidebar-border",
        hue == null ? "rgba(255, 255, 255, 0.12)" : `hsl(${hue} 45% 70% / 0.22)`,
      );
    } else if (hue == null) {
      root.setProperty("--sidebar-bg", "transparent");
      root.setProperty("--sidebar-border", "rgba(212, 212, 212, 0.4)");
    } else {
      root.setProperty("--sidebar-bg", `hsl(${hue} 70% 55% / 0.12)`);
      root.setProperty("--sidebar-border", `hsl(${hue} 45% 45% / 0.28)`);
    }
  }
}

export const theme = new ThemeStore();
