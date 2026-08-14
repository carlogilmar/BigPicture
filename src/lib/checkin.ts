// Camera check-in capture (Sprint 42). Grabs ~1s of webcam frames via the
// webview's getUserMedia, encodes them into a small GIF with gifenc (bundled,
// dependency-free, offline/CSP-safe), and returns the raw bytes. All of this
// runs in the webview; the caller persists the bytes via save_image.
//
// Sprint 65: a small non-invasive live PREVIEW (bottom-right) with a short
// countdown so you can frame yourself before the frames are grabbed, and a
// lolcommits-style DATE STAMP burned into each frame.

import { GIFEncoder, quantize, applyPalette } from "gifenc";

const WIDTH = 240; // downscaled — keeps the GIF small
const HEIGHT = 180;
const FRAMES = 10;
const FRAME_MS = 100; // ~1s total, 10fps
const COUNT_FROM = 3; // preview countdown 3 → 1 before capture

export interface CheckinOptions {
  // A short caption burned into the bottom of every frame (e.g. the day + date).
  label?: string;
  // Show the small live preview + countdown before capturing (default true).
  preview?: boolean;
}

// The day + date caption stamped onto a check-in, e.g. "Thursday · Aug 14, 2026".
export function checkinStamp(d: Date): string {
  const day = d.toLocaleDateString(undefined, { weekday: "long" });
  const rest = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${day} · ${rest}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// A tiny floating self-view so you can check your angle before the shot. Returns
// a handle whose `.count` label + `.destroy()` the caller drives. Self-contained
// (inline styles, no global CSS); mirrored like a selfie.
function makePreview(video: HTMLVideoElement): {
  setCount: (n: number) => void;
  recording: () => void;
  destroy: () => void;
} | null {
  if (typeof document === "undefined") return null;
  const box = document.createElement("div");
  box.style.cssText =
    "position:fixed;right:20px;bottom:20px;width:180px;height:135px;" +
    "border-radius:14px;overflow:hidden;z-index:2147483000;" +
    "box-shadow:0 10px 30px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.12);" +
    "background:#000;transition:opacity .2s ease;";
  video.style.cssText =
    "width:100%;height:100%;object-fit:cover;transform:scaleX(-1);display:block;";
  box.appendChild(video);

  // Countdown / recording overlay.
  const badge = document.createElement("div");
  badge.style.cssText =
    "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
    "font:700 46px/1 'Helvetica Neue',Arial,sans-serif;color:#fff;" +
    "text-shadow:0 2px 10px rgba(0,0,0,.6);pointer-events:none;";
  box.appendChild(badge);

  const hint = document.createElement("div");
  hint.textContent = "Frame yourself…";
  hint.style.cssText =
    "position:absolute;left:0;right:0;bottom:0;padding:5px 8px;" +
    "font:600 11px/1.2 'Helvetica Neue',Arial,sans-serif;color:#fff;text-align:center;" +
    "background:linear-gradient(to top,rgba(0,0,0,.6),transparent);pointer-events:none;";
  box.appendChild(hint);

  document.body.appendChild(box);
  return {
    setCount(n: number) {
      badge.textContent = String(n);
    },
    recording() {
      badge.textContent = "";
      hint.textContent = "● Recording";
      hint.style.color = "#fca5a5";
    },
    destroy() {
      box.style.opacity = "0";
      setTimeout(() => box.remove(), 220);
    },
  };
}

// Burn the caption into the current (un-mirrored) canvas frame: a soft bottom
// gradient + white text, auto-shrunk to fit the narrow frame.
function stampLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
): void {
  const barH = 30;
  const g = ctx.createLinearGradient(0, HEIGHT - barH, 0, HEIGHT);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.66)");
  ctx.fillStyle = g;
  ctx.fillRect(0, HEIGHT - barH, WIDTH, barH);

  let fs = 15;
  const font = (s: number) => `600 ${s}px 'Helvetica Neue',Arial,sans-serif`;
  ctx.font = font(fs);
  while (ctx.measureText(label).width > WIDTH - 20 && fs > 9) {
    fs -= 1;
    ctx.font = font(fs);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 2;
  ctx.fillText(label, 10, HEIGHT - 10);
  ctx.shadowBlur = 0;
}

// Returns GIF bytes, or throws if the camera is unavailable / denied.
export async function captureCheckinGif(
  opts: CheckinOptions = {},
): Promise<Uint8Array> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera not available in this environment");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
    audio: false,
  });

  const video = document.createElement("video");
  video.playsInline = true;
  video.muted = true;
  video.srcObject = stream;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas not available");

  const preview = opts.preview === false ? null : makePreview(video);

  try {
    await video.play();
    // Give the sensor a beat to expose/focus before the first frame.
    await wait(350);

    // Live-preview countdown so you can frame yourself. Without a preview we
    // keep the original short warm-up so headless/denied paths are unaffected.
    if (preview) {
      for (let n = COUNT_FROM; n >= 1; n--) {
        preview.setCount(n);
        await wait(700);
      }
      preview.recording();
    }

    const gif = GIFEncoder();
    for (let i = 0; i < FRAMES; i++) {
      // Cover-fit the (usually 4:3) video into our frame, mirrored like a selfie.
      ctx.save();
      ctx.translate(WIDTH, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, WIDTH, HEIGHT);
      ctx.restore();

      // Stamp the caption AFTER restore so the text reads normally (not mirrored).
      if (opts.label) stampLabel(ctx, opts.label);

      const { data } = ctx.getImageData(0, 0, WIDTH, HEIGHT);
      const palette = quantize(data, 256);
      const index = applyPalette(data, palette);
      gif.writeFrame(index, WIDTH, HEIGHT, { palette, delay: FRAME_MS });
      if (i < FRAMES - 1) await wait(FRAME_MS);
    }
    gif.finish();
    return gif.bytes();
  } finally {
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
    preview?.destroy();
  }
}
