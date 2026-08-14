<script lang="ts">
  // Canvas particle backdrops for the animated sidebar tints (Sprint 65). One
  // <canvas> at the same z-index:-1 backdrop slot the aurora blobs use; a
  // hand-rolled requestAnimationFrame loop draws one of three effects. No chart
  // library (matches the Mirror / aurora approach), offline/CSP-clean.
  //
  //   glitter   — drifting, twinkling dots + a slow shimmer sweep
  //   fireworks — periodic starbursts (core flash + radiating, trailing sparks)
  //   meteor    — a slow starfield crossed by occasional shooting-star streaks
  //
  // Reduced-motion → one calm static frame, no animation. Re-inits when `fx`
  // changes; tears down its rAF + ResizeObserver on destroy.

  let { fx }: { fx: "glitter" | "fireworks" | "meteor" } = $props();

  let canvas: HTMLCanvasElement;

  const reduce =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  $effect(() => {
    const mode = fx; // dependency — re-run when the effect changes
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width;
      H = r.height;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);

    let raf = 0;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = <T,>(arr: T[]): T => arr[(Math.random() * arr.length) | 0];

    // ------------------------------------------------------------------ //
    if (mode === "glitter") {
      const HUES = [46, 46, 46, 190, 320, 50]; // gold + iridescent flecks
      type P = {
        x: number; y: number; r: number; ph: number; sp: number;
        hue: number; big: boolean; vx: number; vy: number;
      };
      const drift = () => {
        const a = Math.random() * 6.2832;
        const s = rand(0.05, 0.27);
        return { vx: Math.cos(a) * s, vy: Math.sin(a) * s };
      };
      const ps: P[] = [];
      const N = Math.round((W * H) / 900);
      for (let i = 0; i < N; i++) {
        const dv = drift();
        ps.push({
          x: Math.random() * W, y: Math.random() * H, r: rand(0.6, 2.4),
          ph: Math.random() * 6.28, sp: rand(0.6, 2.2), hue: pick(HUES),
          big: Math.random() < 0.12, vx: dv.vx, vy: dv.vy,
        });
      }
      const dot = (x: number, y: number, r: number, a: number, hue: number) => {
        ctx.globalAlpha = a;
        ctx.fillStyle = `hsl(${hue} 90% 72%)`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 6.2832);
        ctx.fill();
      };
      const frame = (t: number) => {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#1b1436");
        g.addColorStop(1, "#0c0a1c");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "lighter";
        for (const p of ps) {
          if (!reduce) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < -4) p.x = W + 4;
            else if (p.x > W + 4) p.x = -4;
            if (p.y < -4) p.y = H + 4;
            else if (p.y > H + 4) p.y = -4;
          }
          const tw = (Math.sin(t * 0.001 * p.sp + p.ph) + 1) / 2;
          const a = 0.15 + tw * 0.85;
          dot(p.x, p.y, p.r * (p.big ? 1.7 : 1) * (0.6 + tw * 0.6), a * (p.big ? 1 : 0.8), p.hue);
        }
        // Soft diagonal shimmer sweep.
        const sw = ((t * 0.00006) % 1.4) - 0.2;
        const cx = sw * W;
        const grad = ctx.createLinearGradient(cx - 90, 0, cx + 90, H);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.5, "rgba(255,245,220,0.10)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        if (!reduce) raf = requestAnimationFrame(frame);
      };
      if (reduce) frame(1200);
      else raf = requestAnimationFrame(frame);
    }

    // ------------------------------------------------------------------ //
    else if (mode === "fireworks") {
      const HUES = [45, 20, 330, 265, 190, 140];
      type Spark = {
        x: number; y: number; px: number; py: number;
        vx: number; vy: number; life: number; decay: number; hue: number;
      };
      type Flash = { x: number; y: number; r: number; life: number; hue: number };
      const parts: Spark[] = [];
      const flashes: Flash[] = [];
      let last = 0;
      let next = 600;
      const burst = (x: number, y: number) => {
        const hue = pick(HUES);
        const n = 26 + ((Math.random() * 18) | 0);
        const spd = rand(1.6, 3.0);
        flashes.push({ x, y, r: 2, life: 1, hue });
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.2832 + Math.random() * 0.2;
          const v = spd * rand(0.5, 1.3);
          parts.push({
            x, y, px: x, py: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
            life: 1, decay: rand(0.008, 0.018), hue: hue + rand(-15, 15),
          });
        }
        if (parts.length > 1400) parts.splice(0, parts.length - 1400);
      };
      const frame = (t: number) => {
        if (!last) last = t;
        // Fade the previous frame instead of clearing → motion streaks.
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(8,10,26,0.28)";
        ctx.fillRect(0, 0, W, H);
        if (t - last > next) {
          last = t;
          next = rand(500, 1400);
          burst(rand(0.15, 0.85) * W, rand(0.12, 0.62) * H);
        }
        ctx.globalCompositeOperation = "lighter";
        for (let i = flashes.length - 1; i >= 0; i--) {
          const f = flashes[i];
          f.life -= 0.06;
          f.r += 2.4;
          if (f.life <= 0) { flashes.splice(i, 1); continue; }
          const rg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 3);
          rg.addColorStop(0, `hsla(${f.hue} 100% 85% / ${f.life})`);
          rg.addColorStop(1, `hsla(${f.hue} 100% 60% / 0)`);
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r * 3, 0, 6.2832);
          ctx.fill();
        }
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.px = p.x; p.py = p.y;
          p.vy += 0.015;
          p.vx *= 0.985; p.vy *= 0.985;
          p.x += p.vx; p.y += p.vy;
          p.life -= p.decay;
          if (p.life <= 0) { parts.splice(i, 1); continue; }
          ctx.strokeStyle = `hsla(${p.hue} 95% 68% / ${p.life})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(p.px, p.py);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        if (!reduce) raf = requestAnimationFrame(frame);
      };
      ctx.fillStyle = "#080a1a";
      ctx.fillRect(0, 0, W, H);
      if (reduce) {
        // A single static bloom — advance one burst a few steps, then draw.
        burst(W * 0.5, H * 0.4);
        ctx.globalCompositeOperation = "lighter";
        for (const p of parts) {
          ctx.strokeStyle = `hsla(${p.hue} 95% 68% / .85)`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 9, p.y + p.vy * 9);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
      } else {
        raf = requestAnimationFrame(frame);
      }
    }

    // ------------------------------------------------------------------ //
    else {
      // meteor — a slow starfield + occasional shooting-star streaks.
      type Star = { x: number; y: number; r: number; ph: number; sp: number; tw: boolean };
      type Shot = { x: number; y: number; vx: number; vy: number; len: number; hue: number };
      const stars: Star[] = [];
      const N = Math.round((W * H) / 1400);
      for (let i = 0; i < N; i++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H, r: rand(0.3, 1.5),
          ph: Math.random() * 6.28, sp: rand(0.6, 1.8), tw: Math.random() < 0.6,
        });
      }
      const shots: Shot[] = [];
      let last = 0;
      let next = 900;
      const spawnShot = () => {
        const spd = rand(6, 10);
        const vx = -rand(0.6, 2.2); // drift left
        const vy = spd; // fall down
        shots.push({
          x: rand(0.15, 1.1) * W, y: rand(-40, -10),
          vx, vy, len: rand(55, 105), hue: rand(200, 245),
        });
      };
      const drawShot = (sh: Shot) => {
        const m = Math.hypot(sh.vx, sh.vy) || 1;
        const tx = sh.x - (sh.vx / m) * sh.len;
        const ty = sh.y - (sh.vy / m) * sh.len;
        const grad = ctx.createLinearGradient(sh.x, sh.y, tx, ty);
        grad.addColorStop(0, `hsla(${sh.hue} 90% 86% / 0.95)`);
        grad.addColorStop(1, `hsla(${sh.hue} 90% 86% / 0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = `hsl(${sh.hue} 90% 92%)`;
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 1.7, 0, 6.2832);
        ctx.fill();
      };
      const frame = (t: number) => {
        ctx.globalCompositeOperation = "source-over";
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#0a1226");
        g.addColorStop(1, "#070a16");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "lighter";
        for (const s of stars) {
          if (!reduce) {
            s.x -= 0.05;
            s.y += 0.06;
            if (s.y > H + 2) s.y = -2;
            if (s.x < -2) s.x = W + 2;
          }
          const tw = s.tw ? 0.35 + 0.65 * ((Math.sin(t * 0.002 * s.sp + s.ph) + 1) / 2) : 0.8;
          ctx.globalAlpha = tw * 0.9;
          ctx.fillStyle = "hsl(210 45% 92%)";
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, 6.2832);
          ctx.fill();
        }
        if (!last) last = t;
        if (!reduce && t - last > next) {
          last = t;
          next = rand(700, 2300);
          spawnShot();
        }
        for (let i = shots.length - 1; i >= 0; i--) {
          const sh = shots[i];
          if (!reduce) {
            sh.x += sh.vx;
            sh.y += sh.vy;
          }
          if (sh.y - sh.len > H) { shots.splice(i, 1); continue; }
          drawShot(sh);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        if (!reduce) raf = requestAnimationFrame(frame);
      };
      if (reduce) {
        // Pre-place one streak mid-rail so the static frame still reads "meteor".
        spawnShot();
        shots[0].x = W * 0.62;
        shots[0].y = H * 0.36;
        frame(0);
      } else {
        raf = requestAnimationFrame(frame);
      }
    }

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  });
</script>

<canvas bind:this={canvas} class="sidebar-fx" aria-hidden="true"></canvas>

<style>
  .sidebar-fx {
    position: absolute;
    inset: 0;
    z-index: -1;
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
</style>
