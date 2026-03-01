import { useEffect, useRef } from 'react';

// ── Mountain path generator ───────────────────────────────────────────────────
// Uses overlapping sine waves to create natural-looking ridgelines.
// Points run left→right along the horizon; y values go ABOVE horizonY (smaller y).
function buildMountainPts(
  W: number,
  H: number,
  horizonY: number,
  seed: number,
  hFactor: number,
  segments: number,
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * W;
    const raw =
      Math.sin(i * 2.3 + seed) * 0.12 +
      Math.sin(i * 4.7 + seed * 1.3) * 0.06 +
      Math.sin(i * 1.1 + seed * 0.5) * 0.08 +
      Math.sin(i * 7.3 + seed * 2.7) * 0.03;
    const h = Math.max(0, raw);
    pts.push([x, horizonY - h * H * hFactor]);
  }
  return pts;
}

// ── State held across frames ──────────────────────────────────────────────────
interface SceneState {
  W: number;
  H: number;
  horizonY: number;
  cx: number;
  stars: { x: number; y: number; r: number; phase: number; speed: number }[];
  farPts: [number, number][];
  nearPts: [number, number][];
}

function buildScene(W: number, H: number): SceneState {
  const horizonY = H * 0.50;
  const cx = W / 2;
  return {
    W, H, horizonY, cx,
    stars: Array.from({ length: 170 }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * horizonY * 0.88,
      r:     Math.random() * 1.4 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.018 + 0.006,
    })),
    farPts:  buildMountainPts(W, H, horizonY, 0.5,  0.50, 30),
    nearPts: buildMountainPts(W, H, horizonY, 2.0,  0.62, 24),
  };
}

// ── Canvas component ──────────────────────────────────────────────────────────
export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const sceneRef  = useRef<SceneState | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const init = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      sceneRef.current = buildScene(canvas.width, canvas.height);
    };
    init();
    window.addEventListener('resize', init);

    // ── Mountain fill helper ─────────────────────────────────────────────────
    const fillMountain = (
      pts: [number, number][],
      baseY: number,
      fillColor: string,
      rimColor: string,
      rimAlpha: number,
    ) => {
      const first = pts[0];
      const last  = pts[pts.length - 1];

      // solid silhouette
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      ctx.lineTo(first[0], first[1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.lineTo(last[0], baseY);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      // neon rim (top edge glow)
      if (rimAlpha > 0) {
        ctx.save();
        ctx.shadowColor = rimColor;
        ctx.shadowBlur  = 10;
        ctx.globalAlpha = rimAlpha;
        ctx.strokeStyle = rimColor;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(first[0], first[1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
        ctx.restore();
      }
    };

    // ── Main draw loop ───────────────────────────────────────────────────────
    const draw = (ts: number) => {
      const sc = sceneRef.current;
      if (!sc) { animRef.current = requestAnimationFrame(draw); return; }

      const { W, H, horizonY, cx, stars, farPts, nearPts } = sc;
      const t = ts * 0.001; // seconds

      ctx.clearRect(0, 0, W, H);

      // ── Sky gradient ──────────────────────────────────────────────────────
      const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
      sky.addColorStop(0,    '#03000b');
      sky.addColorStop(0.28, '#0f0028');
      sky.addColorStop(0.60, '#4a005e');
      sky.addColorStop(0.85, '#920055');
      sky.addColorStop(1,    '#d4006a');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, horizonY);

      // ── Stars ─────────────────────────────────────────────────────────────
      for (const s of stars) {
        s.phase += s.speed;
        const alpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(s.phase));

        // soft glow
        const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
        glow.addColorStop(0, `rgba(210,190,255,${(alpha * 0.45).toFixed(3)})`);
        glow.addColorStop(1, 'rgba(140,80,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fill();

        // bright core
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ── Sun ───────────────────────────────────────────────────────────────
      const sunR = Math.min(W, H) * 0.115;
      const sunX = cx;
      const sunY = horizonY - sunR * 0.28;

      // outer halo
      const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.6, sunX, sunY, sunR * 3.4);
      halo.addColorStop(0,   'rgba(255, 80, 200, 0.32)');
      halo.addColorStop(0.25,'rgba(220, 30, 150, 0.14)');
      halo.addColorStop(0.6, 'rgba(160,  0,  90, 0.05)');
      halo.addColorStop(1,   'rgba(100,  0,  60, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 3.4, 0, Math.PI * 2);
      ctx.fill();

      // sun disk — clip, fill gradient, draw scanlines
      ctx.save();
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.clip();

      const sunG = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
      sunG.addColorStop(0,    '#ffe844');
      sunG.addColorStop(0.25, '#ff8800');
      sunG.addColorStop(0.55, '#ff1a88');
      sunG.addColorStop(1,    '#9900cc');
      ctx.fillStyle = sunG;
      ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);

      // scanlines — evenly spaced across the bottom 58% of the sun
      const scanN    = 13;
      const scanTop  = sunY + sunR * 0.08;   // just below center
      const scanSpan = sunR * 0.92;           // to bottom edge
      const lineH    = (scanSpan / scanN) * 0.42;
      for (let i = 0; i < scanN; i++) {
        const ly = scanTop + (i / scanN) * scanSpan;
        ctx.fillStyle = 'rgba(4,0,9,0.84)';
        ctx.fillRect(sunX - sunR - 1, ly, sunR * 2 + 2, lineH);
      }
      ctx.restore();

      // ── Horizon glow strip ────────────────────────────────────────────────
      const hg = ctx.createLinearGradient(0, horizonY - 8, 0, horizonY + 10);
      hg.addColorStop(0,   'rgba(255,110,220, 0)');
      hg.addColorStop(0.45,'rgba(255,140,230, 0.72)');
      hg.addColorStop(0.65,'rgba(255,100,210, 0.38)');
      hg.addColorStop(1,   'rgba(200, 40,170, 0)');
      ctx.fillStyle = hg;
      ctx.fillRect(0, horizonY - 8, W, 18);

      // ── Ground ────────────────────────────────────────────────────────────
      const gnd = ctx.createLinearGradient(0, horizonY, 0, H);
      gnd.addColorStop(0, '#080012');
      gnd.addColorStop(1, '#020005');
      ctx.fillStyle = gnd;
      ctx.fillRect(0, horizonY, W, H - horizonY);

      // ── Perspective grid ──────────────────────────────────────────────────
      ctx.save();
      ctx.strokeStyle = '#ff00aa';
      ctx.shadowColor  = '#ff00aa';
      ctx.shadowBlur   = 5;

      const gridH    = H - horizonY;
      const numV     = 30;
      const numH     = 22;
      const speed    = 0.34; // grid rows per second

      // vertical lines — fan from vanishing point to bottom edge
      for (let i = 0; i <= numV; i++) {
        const frac    = i / numV;                         // 0..1
        const endX    = W * (-0.14 + frac * 1.28);       // extends ~14% beyond each edge
        const edgeFade = 1 - Math.abs(frac - 0.5) * 1.75; // bright center, fade edges
        if (edgeFade <= 0) continue;
        ctx.globalAlpha = edgeFade * 0.42;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(cx, horizonY);
        ctx.lineTo(endX, H + 20);
        ctx.stroke();
      }

      // horizontal lines — animated, perspective-spaced
      const offset = (t * speed) % 1;
      for (let i = 0; i < numH + 2; i++) {
        const rawT    = ((i / numH) + offset) % 1;
        const perspT  = rawT * rawT;                     // quadratic → perspective spacing
        const lineY   = horizonY + perspT * (gridH + 20);
        if (lineY > H + 20 || lineY < horizonY) continue;

        const bright        = perspT;
        ctx.globalAlpha     = Math.min(bright * 1.7, 0.65);
        ctx.shadowBlur      = bright > 0.45 ? 8 : 3;
        ctx.lineWidth       = bright > 0.55 ? 1.6 : 1;
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(W, lineY);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;
      ctx.restore();

      // ── Far mountains ─────────────────────────────────────────────────────
      fillMountain(farPts,  horizonY + 2,       '#1e003a', '#cc00ff', 0.28);

      // ── Near mountains ────────────────────────────────────────────────────
      fillMountain(nearPts, horizonY + H * 0.025, '#0a000e', '#ff00aa', 0.38);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
