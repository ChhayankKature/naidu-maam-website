import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
// npm i motion   (older setups: import from "framer-motion")
import landPoints from "../landPoints.json"; // same world data the loading page uses (src/landPoints.json)
import { CATEGORIES, PAGES } from "../config.js"; // the REAL categories, same list the upload form uses
import { fetchProjects, projectUrl } from "../data/projects.js";
import LoadingScreen from "../App.jsx"; // the holographic loading screen, reused here while Firestore loads
import loader from "../loader.js";
import netcoreConfig from "../netcore.config.js";

/* ---------- categories: the real ones (config.js), not dummy data ---------- */
const NCAT = CATEGORIES.length;
const MAX_NODES = 120; // newest projects shown on the globe; keeps it smooth if the gallery grows a lot

const ICONS = {
  All: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M14 14h7v7h-7z", "M3 14h7v7H3z"],
  presentation: ["M2 3h20", "M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3", "m7 21 5-5 5 5"],
  game: ["M6 11h4", "M8 9v4", "M15 12h.01", "M18 10h.01", "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"],
  "tools-study": ["M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z", "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"],
  ipr: ["M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5", "M9 18h6", "M10 22h4"],
  certification: ["M6 8a6 6 0 1 0 12 0A6 6 0 1 0 6 8z", "M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"],
  story: ["M12 20h9", "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"],
  projects: ["M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"],
};
const iconFor = (id) => ICONS[id] || ICONS.projects;

const fmtDate = (t) => (t ? new Date(t).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "");

/* ---------- globe maths ---------- */
const TILT = 0.22; // default lean of the globe (north pole leans toward you)
const ZOOM = 2.1; // zoom when a type is selected
const SWEEP_MS = 4200;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// each category owns one region of the globe: NCAT points spread evenly over the sphere (Fibonacci lattice)
const ANCHORS = CATEGORIES.map((_, i) => {
  const y = 1 - (2 * (i + 0.5)) / NCAT, r = Math.sqrt(1 - y * y), th = i * 2.399963;
  return [r * Math.cos(th), y, r * Math.sin(th)];
});

// put each category's projects in a small cluster around its anchor
function clusterPositions(items) {
  const groups = CATEGORIES.map(() => []);
  items.forEach((it, i) => groups[Math.max(0, it.catIndex)].push(i));
  const out = [];
  groups.forEach((ids, ci) => {
    const a = ANCHORS[ci];
    const h = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let u = [a[1] * h[2] - a[2] * h[1], a[2] * h[0] - a[0] * h[2], a[0] * h[1] - a[1] * h[0]];
    const ul = Math.hypot(...u); u = u.map((c) => c / ul);
    const v = [a[1] * u[2] - a[2] * u[1], a[2] * u[0] - a[0] * u[2], a[0] * u[1] - a[1] * u[0]];
    const m = ids.length, capR = Math.min(0.52, 0.18 + 0.07 * m);
    ids.forEach((id, k) => {
      const rho = m === 1 ? 0 : capR * Math.sqrt((k + 0.5) / m), th = k * 2.4 + ci;
      const c = Math.cos(rho), s = Math.sin(rho), ct = Math.cos(th), st = Math.sin(th);
      out[id] = [0, 1, 2].map((j) => a[j] * c + (u[j] * ct + v[j] * st) * s);
    });
  });
  return out;
}

/* ---------- the earth: same data and look as the loading page ---------- */
// lat/lon -> unit vector, identical to the loading page's toVec (x = cos lat cos lon, z = -cos lat sin lon)
const toXYZ = (lat, lon, r = 1) => {
  const la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180;
  return [r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo)];
};
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// continent dots (x, y, z, tint bucket 0..3: cool blue in the south, white in the north)
const LAND_N = landPoints.length;
const LAND = new Float32Array(LAND_N * 3);
const LAND_TINT = new Uint8Array(LAND_N);
landPoints.forEach(([lon, lat], i) => {
  const p = toXYZ(lat, lon, 1.002);
  LAND.set(p, i * 3);
  LAND_TINT[i] = Math.min(3, Math.floor(smooth(-0.8, 0.9, p[1]) * 4));
});

// faint dot grid over the oceans
const OCEAN = (() => {
  const a = [];
  for (let lat = -80; lat <= 80; lat += 5) for (let lon = -180; lon < 180; lon += 5) a.push(toXYZ(lat, lon, 1.001));
  return a;
})();

// latitude / longitude lines
const GRATICULE = (() => {
  const lines = [];
  for (let lat = -75; lat <= 75; lat += 15) {
    const l = [];
    for (let lon = 0; lon <= 360; lon += 4) l.push(toXYZ(lat, lon, 1.001));
    lines.push(l);
  }
  for (let lon = 0; lon < 360; lon += 15) {
    const l = [];
    for (let lat = -88; lat <= 88; lat += 4) l.push(toXYZ(lat, lon, 1.001));
    lines.push(l);
  }
  return lines;
})();

// floating specks around the globe (fixed seed so they never jump)
const SPECKS = (() => {
  let s = 12345;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  return Array.from({ length: 90 }, () => {
    const x = rnd() - 0.5, y = rnd() - 0.1, z = rnd() - 0.5, l = Math.hypot(x, y, z) || 1, r = 1.05 + rnd() * 0.45;
    return [(x / l) * r, (y / l) * r, (z / l) * r];
  });
})();

// small soft dot, tinted from cool blue (south) to white (north)
function makeSprite(rgb) {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, `rgba(${rgb},1)`);
  gr.addColorStop(0.56, `rgba(${rgb},1)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  return c;
}
const TINTS = ["188,216,255", "209,229,255", "232,242,255", "255,255,255"];

// long arcs between regions, so the globe reads like a global network:
// the first project of each category that has projects, linked in a ring (plus skip-one links when there are many)
function longLinks(items) {
  const firsts = [];
  for (let c = 0; c < NCAT; c++) {
    const i = items.findIndex((it) => Math.max(0, it.catIndex) === c);
    if (i >= 0) firsts.push(i);
  }
  const m = firsts.length, seen = new Set(), out = [];
  const add = (a, b) => {
    const k = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a !== b && !seen.has(k)) { seen.add(k); out.push([a, b]); }
  };
  if (m >= 2) for (let k = 0; k < m; k++) add(firsts[k], firsts[(k + 1) % m]);
  if (m >= 5) for (let k = 0; k < m; k++) add(firsts[k], firsts[(k + 2) % m]);
  return out;
}

// rotate around Y (yaw), then lean around X (pitch); z > 0 faces the viewer
function spin(p, cr, sr, ct, st) {
  const x1 = p[0] * cr + p[2] * sr;
  const z1 = -p[0] * sr + p[2] * cr;
  return [x1, p[1] * ct - z1 * st, p[1] * st + z1 * ct];
}

function nearestLinks(points) {
  const seen = new Set(), out = [];
  points.forEach((p, i) => {
    points
      .map((q, j) => [j, Math.hypot(p[0] - q[0], p[1] - q[1], (p[2] || 0) - (q[2] || 0))])
      .filter(([j]) => j !== i)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 2)
      .forEach(([j]) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) { seen.add(key); out.push([i, j]); }
      });
  });
  return out;
}

/* ---------- component ---------- */
function Globe({ items }) {
  const reduce = useReducedMotion();
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ w: 1440, h: 800 });
  const count = items.length;
  const [filter, setFilter] = useState("All"); // "All" or a category id (presentation, game, ...)
  const [focusKey, setFocusKey] = useState(0); // re-clicking a filter re-centres it
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    const measure = () => setSize({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = size.w, H = size.h;
  const small = W < 760;
  const nodeSize = small ? 15 : 20;
  const pad = { x: small ? 34 : 90, top: small ? 240 : 40, bottom: small ? 50 : 0 };

  const pos = useMemo(() => clusterPositions(items), [items]);
  const edges = useMemo(() => [...nearestLinks(pos), ...longLinks(items)], [pos, items]);

  const active = hover ?? selected;
  const proj = selected != null && selected < count ? items[selected] : null;
  const counts = useMemo(() => {
    const c = {};
    items.forEach((p) => { c[p.category] = (c[p.category] || 0) + 1; });
    return c;
  }, [items]);
  const matchedCount = filter === "All" ? count : counts[filter] || 0;

  useEffect(() => {
    if (selected != null && (selected >= count || (filter !== "All" && items[selected]?.category !== filter))) setSelected(null);
    setHover(null);
  }, [filter, count]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- view state: yaw / pitch / zoom, driven by drag, momentum and filter focus ---------- */
  const view = useRef({ yaw: 0.6, pitch: TILT, vy: 0, vp: 0, spin: 0, zoom: 1, drag: false, focus: false });
  useEffect(() => { view.current.focus = true; }, [filter, focusKey]);

  const drag = useRef({ down: false, moved: false, id: null, x: 0, y: 0, t: 0 });
  const onDown = (e) => {
    drag.current = { down: true, moved: false, id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const onMove = (e) => {
    const d = drag.current, V = view.current;
    if (!d.down || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 6) return; // below this it's a tap, not a drag
      d.moved = true; V.drag = true; V.focus = false; setHover(null);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const now = performance.now(), dt = Math.max(8, now - d.t), k = 0.0055 / V.zoom;
    V.yaw += dx * k;
    V.pitch = clamp(V.pitch + dy * k, -1.35, 1.35);
    V.vy = 0.6 * V.vy + 0.4 * (dx * k) / dt;
    V.vp = 0.6 * V.vp + 0.4 * (dy * k) / dt;
    d.x = e.clientX; d.y = e.clientY; d.t = now;
  };
  const onUp = () => { drag.current.down = false; view.current.drag = false; };

  /* ---------- animation loop (all through refs) ---------- */
  const live = useRef({});
  live.current = { W, H, pad, count, filter, active, reduce, pos, edges, items };
  const nodeEls = useRef([]);
  const sLines = useRef([]), sHi = useRef([]);
  const cur = useRef([]); // per-node animation state, created as nodes appear
  const hoverStart = useRef(0);
  const rot3 = useRef([]);
  useEffect(() => { hoverStart.current = performance.now(); }, [active]);

  useEffect(() => {
    let raf, last = performance.now();
    const ease = (dt, tau) => 1 - Math.exp(-dt / tau);
    const sprites = TINTS.map(makeSprite);

    const loop = (now) => {
      const dt = Math.min(64, now - last);
      last = now;
      const L = live.current, V = view.current;
      const { W, H, pad, count, filter, active, reduce } = L;
      const availH = H - pad.top - pad.bottom;
      const cx = W / 2, cy = pad.top + availH / 2;
      const R = W < 760
        ? Math.max(100, Math.min((W - 2 * pad.x) / 2, availH / 2) * 1.1)
        : Math.max(100, Math.min((W - 2 * pad.x) / 2, (availH / 2) * 0.94)); // big, whole globe on screen
      const catIdx = CATEGORIES.findIndex((c) => c.id === filter);
      const anchor = catIdx >= 0 ? ANCHORS[catIdx] : null;

      /* view: drag > focus on a type > momentum + idle drift */
      if (!V.drag) {
        if (V.focus) {
          let tp = TILT, tyaw = V.yaw;
          if (anchor) {
            const h = Math.hypot(anchor[0], anchor[2]);
            tp = Math.atan2(anchor[1], h);
            if (h > 1e-3) tyaw = Math.atan2(-anchor[0], anchor[2]);
          }
          let dy = tyaw - V.yaw; dy -= Math.round(dy / (Math.PI * 2)) * Math.PI * 2;
          const e = ease(dt, reduce ? 1 : 240);
          V.yaw += dy * e; V.pitch += (tp - V.pitch) * e; V.vy = V.vp = 0;
          if (!anchor && Math.abs(tp - V.pitch) < 0.01) V.focus = false;
        } else {
          V.yaw += V.vy * dt;
          V.pitch = clamp(V.pitch + V.vp * dt, -1.35, 1.35);
          const f = Math.exp(-dt / 350); V.vy *= f; V.vp *= f;
          const drift = reduce || filter !== "All" ? 0 : active != null ? 0.00002 : 0.00013;
          V.spin += (drift - V.spin) * ease(dt, 300);
          V.yaw += V.spin * dt;
        }
      }
      V.zoom += ((filter === "All" ? 1 : ZOOM) - V.zoom) * ease(dt, reduce ? 1 : 260);
      const Z = V.zoom, Rz = R * Z;
      const cr = Math.cos(V.yaw), sr = Math.sin(V.yaw), ct = Math.cos(V.pitch), st = Math.sin(V.pitch);

      const sweep = reduce ? -9 : ((now % SWEEP_MS) / SWEEP_MS) * 2.8 - 1.4;
      const wave = (x) => Math.exp(-Math.pow((x - cx) / Rz - sweep, 2) / 0.035);

      /* nodes */
      const k = ease(dt, 45);
      for (let i = 0; i < count; i++) {
        const c = cur.current[i] || (cur.current[i] = { x: 0, y: 0, s: 0, o: 0, d: 1, init: false });
        const match = filter === "All" || L.items[i].catIndex === catIdx;
        const [ux, uy, uz] = spin(L.pos[i], cr, sr, ct, st);
        rot3.current[i] = [ux, uy, uz];
        const persp = 1 / (1 - uz * 0.22);
        const tx = cx + Rz * ux * persp, ty = cy - Rz * uy * persp;
        const d = (uz + 1) / 2;
        const ts = (0.55 + 0.6 * d) * (1 + 0.3 * (Z - 1));
        const to = (0.14 + 0.86 * Math.pow(d, 1.4)) * (match ? 1 : 0.1);
        if (!c.init) { c.x = cx; c.y = cy; c.s = 0; c.o = 0; c.init = true; }
        c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.s += (ts - c.s) * k; c.o += (to - c.o) * k; c.d = d;
        const el = nodeEls.current[i];
        if (el) {
          const w = reduce ? 0 : wave(c.x);
          el.setAttribute("transform", `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) scale(${Math.max(0.001, c.s * (1 + 0.22 * w)).toFixed(3)})`);
          el.style.opacity = c.o.toFixed(3);
          el.style.pointerEvents = match && c.o > 0.5 && d > 0.45 ? "auto" : "none";
        }
      }

      /* links: great-circle arcs that lift off the surface */
      const SEG = 14, rv = rot3.current;
      for (let n = 0; n < L.edges.length; n++) {
        const b = sLines.current[n], h = sHi.current[n];
        if (!b || !h) continue;
        const [ia, ib] = L.edges[n];
        const A = rv[ia], B = rv[ib], ca = cur.current[ia], cb = cur.current[ib];
        const th = A && B ? Math.acos(clamp(A[0] * B[0] + A[1] * B[1] + A[2] * B[2], -1, 1)) : 0;
        const sn = Math.sin(th);
        if (sn < 1e-3) { b.style.opacity = 0; h.style.opacity = 0; continue; }
        let dstr = "", zm = 0;
        for (let q = 0; q <= SEG; q++) {
          const t = q / SEG, w1 = Math.sin((1 - t) * th) / sn, w2 = Math.sin(t * th) / sn;
          const lift = 1 + 0.16 * th * Math.sin(Math.PI * t);
          const x = (A[0] * w1 + B[0] * w2) * lift, y = (A[1] * w1 + B[1] * w2) * lift, z = (A[2] * w1 + B[2] * w2) * lift;
          const pp = 1 / (1 - z * 0.22);
          dstr += (q ? "L" : "M") + (cx + Rz * x * pp).toFixed(1) + " " + (cy - Rz * y * pp).toFixed(1);
          if (q === SEG / 2) zm = z;
        }
        const op = Math.min(ca.o, cb.o);
        const dep = 0.12 + 0.88 * Math.pow(clamp((zm + 0.3) / 1.3, 0, 1), 1.2);
        const w = reduce ? 0 : wave((ca.x + cb.x) / 2);
        b.setAttribute("d", dstr);
        b.style.opacity = Math.min(1, (0.3 + 0.6 * w) * op * dep).toFixed(3);
        if (active != null && (ia === active || ib === active) && op > 0.02) {
          const p = Math.min(1, (now - hoverStart.current) / 650);
          const e = 1 - Math.pow(1 - p, 3);
          h.setAttribute("d", dstr);
          h.setAttribute("stroke-dashoffset", ia === active ? 1 - e : -(1 - e));
          h.style.opacity = Math.min(1, op * 1.4).toFixed(3);
        } else h.style.opacity = 0;
      }

      /* the holographic earth (same ingredients as the loading page) */
      const cv = canvasRef.current;
      if (cv) {
        const dpr = window.devicePixelRatio || 1;
        if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
        const ctx = cv.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        const tsec = now / 1000;

        // atmosphere halo behind the globe
        const halo = ctx.createRadialGradient(cx, cy, Rz * 0.96, cx, cy, Rz * 1.34);
        halo.addColorStop(0, "rgba(232,244,255,0.22)");
        halo.addColorStop(0.35, "rgba(232,244,255,0.08)");
        halo.addColorStop(1, "rgba(232,244,255,0)");
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(cx, cy, Rz * 1.34, 0, Math.PI * 2); ctx.fill();

        // glass body with a bright fresnel rim
        const body = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rz);
        body.addColorStop(0, "rgba(188,216,255,0.025)");
        body.addColorStop(0.62, "rgba(188,216,255,0.05)");
        body.addColorStop(0.86, "rgba(220,235,255,0.11)");
        body.addColorStop(0.96, "rgba(255,255,255,0.26)");
        body.addColorStop(1, "rgba(255,255,255,0.5)");
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.arc(cx, cy, Rz, 0, Math.PI * 2); ctx.fill();

        // everything that sits on the surface is clipped to the sphere's silhouette
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, Rz, 0, Math.PI * 2); ctx.clip();

        const proj = (x, y, z) => {
          const x1 = x * cr + z * sr, z1 = -x * sr + z * cr;
          const yy = y * ct - z1 * st, zz = y * st + z1 * ct;
          const pp = 1 / (1 - zz * 0.22);
          return [cx + Rz * x1 * pp, cy - Rz * yy * pp, zz];
        };

        // latitude / longitude lines, three depth shades
        const gp = [new Path2D(), new Path2D(), new Path2D()];
        for (const line of GRATICULE) {
          let prev = null;
          for (const p of line) {
            const q = proj(p[0], p[1], p[2]);
            if (q[2] > 0 && prev && prev[2] > 0) {
              const b = (q[2] + prev[2]) / 2 > 0.65 ? 2 : (q[2] + prev[2]) / 2 > 0.3 ? 1 : 0;
              gp[b].moveTo(prev[0], prev[1]); gp[b].lineTo(q[0], q[1]);
            }
            prev = q;
          }
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#fff";
        [0.05, 0.11, 0.17].forEach((a, b) => { ctx.globalAlpha = a; ctx.stroke(gp[b]); });

        // ocean dots
        ctx.fillStyle = "#fff";
        for (const p of OCEAN) {
          const q = proj(p[0], p[1], p[2]);
          if (q[2] < 0.02 || q[0] < -4 || q[0] > W + 4 || q[1] < -4 || q[1] > H + 4) continue;
          ctx.globalAlpha = 0.22 * (0.35 + 0.65 * q[2]);
          const s = 1.4 * Math.pow(Z, 0.4);
          ctx.fillRect(q[0] - s / 2, q[1] - s / 2, s, s);
        }

        // continents: tinted dots, brighter toward the limb, lit up by the sweep
        const ds = 2.3 * Math.pow(Z, 0.5) * 1.3;
        for (let i = 0; i < LAND_N; i++) {
          const o = i * 3;
          const x1 = LAND[o] * cr + LAND[o + 2] * sr, z1 = -LAND[o] * sr + LAND[o + 2] * cr;
          const z = LAND[o + 1] * st + z1 * ct;
          if (z < 0.02) continue;
          const pp = 1 / (1 - z * 0.22);
          const sx = cx + Rz * x1 * pp, sy = cy - Rz * (LAND[o + 1] * ct - z1 * st) * pp;
          if (sx < -6 || sx > W + 6 || sy < -6 || sy > H + 6) continue;
          let a = 0.95 * (0.55 + 0.9 * (1 - z));
          if (!reduce) a *= 1 + 0.9 * wave(sx);
          ctx.globalAlpha = a > 1 ? 1 : a;
          const s = ds * (0.72 + 0.28 * z);
          ctx.drawImage(sprites[LAND_TINT[i]], sx - s / 2, sy - s / 2, s, s);
        }

        // scanlines running through the glass
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0,0,0,0.42)";
        const gap = 3, off = reduce ? 0 : ((tsec * 2.2 * gap) / (Math.PI * 2)) % gap;
        for (let y = Math.max(0, cy - Rz) - gap + off; y < Math.min(H, cy + Rz); y += gap) ctx.fillRect(cx - Rz - 2, y, Rz * 2 + 4, gap * 0.5);
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();

        // crisp outline
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, Rz, 0, Math.PI * 2); ctx.stroke();

        // floating specks (the ones behind the globe stay hidden)
        ctx.fillStyle = "#fff";
        ctx.globalAlpha = 0.55;
        for (const p of SPECKS) {
          const x1 = p[0] * cr + p[2] * sr, z1 = -p[0] * sr + p[2] * cr;
          const y = p[1] * ct - z1 * st, z = p[1] * st + z1 * ct;
          if (z < 0 && x1 * x1 + y * y < 1) continue;
          const pp = 1 / (1 - z * 0.22);
          ctx.fillRect(cx + Rz * x1 * pp - 0.9, cy - Rz * y * pp - 0.9, 1.8, 1.8);
        }
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const nodes = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="np-root" ref={rootRef}>
      <style>{css}</style>

      <header className="np-head">
        <div className="np-left">
          <a className="np-back" href={PAGES.home}>&larr; Home</a>
          <h1>Network projects</h1>
          <nav className="np-filters" aria-label="Filter by project type">
            {[{ id: "All", label: "All" }, ...CATEGORIES].map((c) => {
              const n = c.id === "All" ? count : counts[c.id] || 0;
              return (
                <button key={c.id} className={filter === c.id ? "on" : ""} aria-label={`${c.label} (${n})`} title={`${c.label} (${n})`}
                  aria-pressed={filter === c.id} disabled={n === 0}
                  onClick={() => { setFilter(c.id); setFocusKey((k) => k + 1); }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {iconFor(c.id).map((d) => <path key={d} d={d} />)}
                  </svg>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="np-right">
          <span className="np-count" aria-label={`${count} projects`}><b>{count}</b>{count === 1 ? "project" : "projects"}</span>
          <a className="np-upload" href={PAGES.upload}>Upload</a>
        </div>
      </header>

      <main className="np-stage" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <canvas ref={canvasRef} className="np-globe" style={{ width: W, height: H }} />
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Globe of approved projects">
          <defs>
            <radialGradient id="glow">
              <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {edges.map(([a, b], n) => (
            <g key={`s${a}-${b}`}>
              <path ref={(el) => (sLines.current[n] = el)} fill="none" stroke="#fff" strokeWidth="1" style={{ opacity: 0 }} />
              <path ref={(el) => (sHi.current[n] = el)} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" pathLength="1" strokeDasharray="1 1" style={{ opacity: 0 }} />
            </g>
          ))}

          {nodes.map((i) => {
            const p = items[i];
            const isSel = selected === i;
            const isAct = active === i;
            const r = nodeSize;
            return (
              <g
                key={i} ref={(el) => (nodeEls.current[i] = el)} tabIndex={0} role="button"
                aria-label={`${p.name}, ${p.categoryLabel}`}
                style={{ cursor: "pointer", outline: "none", opacity: 0 }}
                onMouseEnter={() => !drag.current.down && setHover(i)} onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                onClick={() => !drag.current.moved && setSelected(isSel ? null : i)}
                onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && setSelected(isSel ? null : i)}
              >
                <circle r={r * 2} fill="url(#glow)" opacity="0.35" pointerEvents="none" />
                {isAct && <circle r={r * 2.8} fill="url(#glow)" />}
                <circle r={r + 8} fill="transparent" />
                <motion.circle
                  stroke="#fff" strokeWidth="1.6"
                  animate={{ r: isAct ? r + 3 : r, fill: isAct ? "#fff" : "#000" }}
                  initial={false}
                  transition={{ type: "spring", stiffness: 360, damping: 18 }}
                />
                {p.coverUrl ? (
                  <g pointerEvents="none">
                    <clipPath id={`clip${i}`}><circle r={r - 2} /></clipPath>
                    <image href={p.coverUrl} x={-r} y={-r} width={r * 2} height={r * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#clip${i})`} />
                  </g>
                ) : (
                  <g pointerEvents="none" transform={`translate(${-r * 0.58} ${-r * 0.58}) scale(${(r * 1.16) / 24})`}>
                    <motion.g
                      fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      initial={false} animate={{ stroke: isAct ? "#000" : "#fff" }}
                    >
                      {iconFor(p.category).map((d) => <path key={d} d={d} />)}
                    </motion.g>
                  </g>
                )}
                {isSel && (
                  <motion.circle
                    fill="none" stroke="#fff" strokeWidth="1"
                    initial={{ r, opacity: 0.9 }} animate={{ r: r + 20, opacity: 0 }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
              </g>
            );
          })}
        </svg>

        <div className="np-cap">
          {count === 0 ? "No approved projects yet."
            : filter === "All" ? "Drag to rotate. Pick a type to zoom in."
            : `${CATEGORIES.find((c) => c.id === filter)?.label}: ${matchedCount}`}
        </div>

        <AnimatePresence>
          {proj && (
            <motion.aside
              key={proj.id} className="np-panel" onPointerDown={(e) => e.stopPropagation()}
              initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            >
              <button className="close" onClick={() => setSelected(null)} aria-label="Close project">×</button>
              {proj.coverUrl && <img className="cover" src={proj.coverUrl} alt="" />}
              <h2>{proj.name}</h2>
              <p className="meta">{proj.categoryLabel}{proj.publishedAt ? `, ${fmtDate(proj.publishedAt)}` : ""}</p>
              <dl>
                <div><dt>Team</dt><dd>{proj.teamNames.length ? proj.teamNames.join(", ") : "-"}</dd></div>
                <div><dt>Format</dt><dd>{proj.projectKind === "link" ? "Website link" : `${(proj.fileExt || "file").toUpperCase()} file`}</dd></div>
              </dl>
              <button className="open" disabled={!projectUrl(proj)}
                onClick={() => window.open(projectUrl(proj), "_blank", "noopener,noreferrer")}>
                {proj.projectKind === "link" ? "Open project" : "Open file"}
              </button>
            </motion.aside>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ---------- the page: real data + the loading screen ---------- */
// The loading screen is shown on top while the projects (and their first covers) load. The globe appears
// once it has faded, so the nodes fly out from the centre as the page opens. See src/startLoad.js.
const bootConfig = {
  ...netcoreConfig,
  loading: { ...netcoreConfig.loading, redirect: "", minDurationMs: 500, holdMs: 250, fadeMs: 500 }
};

export default function NeuralProjects() {
  const [data, setData] = useState({ status: "loading", list: [], error: null });
  const [booted, setBooted] = useState(false);

  const load = useCallback((force = false) => {
    setData((d) => ({ ...d, status: "loading", error: null }));
    fetchProjects({ force })
      .then((list) => setData({ status: "ready", list, error: null }))
      .catch((error) => { console.error(error); setData({ status: "error", list: [], error }); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const items = useMemo(() => data.list.slice(0, MAX_NODES), [data.list]);
  const hidden = data.list.length - items.length;

  return (
    <>
      {booted && <Globe items={items} />}
      {booted && data.status === "ready" && data.list.length === 0 && (
        <div className="np-msg" role="status">
          <style>{css}</style>
          <h2>No projects yet</h2>
          <p>Approved projects appear here. Sign in with a college email to upload the first one.</p>
          <a className="open" href={PAGES.upload}>Upload a project</a>
        </div>
      )}
      {booted && data.status === "error" && (
        <div className="np-msg" role="alert">
          <style>{css}</style>
          <h2>Couldn't load the projects</h2>
          <p>Check your connection and try again.</p>
          <button className="open" onClick={() => load(true)}>Try again</button>
        </div>
      )}
      {booted && hidden > 0 && <div className="np-more">Showing the newest {MAX_NODES} of {data.list.length} projects</div>}
      {!booted && (
        <div className="np-boot">
          <style>{css}</style>
          <LoadingScreen config={bootConfig} loader={loader} onComplete={() => setBooted(true)} />
        </div>
      )}
    </>
  );
}

/* ---------- styles (pure black and white) ---------- */
const css = `
.np-root{--bg:#02060a;--fg:#f1f6f8;--muted:#8d9ba3;--line:rgba(255,255,255,.16);
  --font-display:"Michroma","Orbitron","Eurostile",sans-serif;--font-body:"IBM Plex Sans",system-ui,sans-serif;--font-mono:"IBM Plex Mono",ui-monospace,monospace;
  position:fixed;inset:0;margin:0;padding:0;max-width:none;text-align:left;overflow:hidden;background:var(--bg);color:#fff;
  font-family:var(--font-body);box-sizing:border-box;
  background-image:radial-gradient(ellipse at 50% 55%,#ffffff17,transparent 65%)}
.np-head{position:absolute;z-index:2;top:0;left:0;right:0;display:flex;flex-wrap:wrap;gap:16px 24px;justify-content:space-between;
  align-items:flex-start;padding:28px clamp(16px,4vw,56px);pointer-events:none}
.np-head>*{pointer-events:auto}
.np-back{display:inline-block;margin:0 0 14px;font-family:var(--font-mono);font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);text-decoration:none}
.np-back:hover{color:#fff}
.np-head h1{margin:0 0 16px;font-family:var(--font-display);font-size:clamp(20px,2.6vw,32px);font-weight:400;letter-spacing:.06em;line-height:1.2}
.np-filters{display:flex;flex-wrap:wrap;gap:10px}
.np-filters button{background:var(--bg);color:#fff;border:1px solid #ffffff59;width:46px;height:46px;border-radius:999px;display:grid;
  place-items:center;padding:0;cursor:pointer;transition:background .2s,color .2s,border-color .2s}
.np-filters button:hover{border-color:#fff}
.np-filters button.on{background:#fff;color:#000;border-color:#fff}
.np-filters button:focus-visible,.np-panel button:focus-visible,.np-back:focus-visible{outline:2px solid #fff;outline-offset:3px}
.np-right{display:flex;align-items:center;gap:10px}
.np-count{display:flex;align-items:center;gap:10px;height:46px;padding:0 18px;border:1px solid #ffffff59;border-radius:999px;background:var(--bg);
  font-family:var(--font-mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.np-count b{font-weight:400;font-size:16px;color:#fff;letter-spacing:0}
.np-upload{display:inline-flex;align-items:center;height:46px;padding:0 22px;border-radius:999px;background:#f1f6f8;color:#02060a;text-decoration:none;
  font-family:var(--font-mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;transition:opacity .2s}
.np-upload:hover{opacity:.82}
.np-upload:focus-visible{outline:2px solid #fff;outline-offset:3px}
.np-filters button:disabled{opacity:.3;cursor:default;border-color:#ffffff29}
.np-boot{position:fixed;inset:0;z-index:50;background:#02060a}
.np-stage{position:absolute;inset:0;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}
.np-stage:active{cursor:grabbing}
.np-globe{position:absolute;left:0;top:0;pointer-events:none}
.np-stage svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.np-cap{position:absolute;left:clamp(16px,4vw,56px);bottom:20px;font-family:var(--font-mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#ffffff8c;pointer-events:none}
.np-panel{position:absolute;z-index:3;right:clamp(16px,4vw,56px);top:50%;margin-top:-230px;max-height:calc(100% - 140px);overflow-y:auto;width:min(340px,calc(100% - 32px));background:var(--bg);border:1px solid #fff;
  padding:24px;box-sizing:border-box;box-shadow:0 0 0 6px var(--bg);cursor:default}
.np-panel h2{margin:0 36px 6px 0;font-family:var(--font-display);font-size:16px;font-weight:400;letter-spacing:.06em;line-height:1.3}
.np-panel .meta{margin:0 0 14px;color:#ffffff8c;font-family:var(--font-mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase}
.np-panel p{line-height:1.55;font-size:15px}
.np-panel .close{position:absolute;top:10px;right:12px;background:none;border:0;color:#fff;font-size:26px;cursor:pointer}
.np-panel .cover{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;margin:0 0 16px;border:1px solid #ffffff29;background:#0a1015}
.np-panel dl{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:0 0 20px}
.np-panel dt{color:#ffffff8c;font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase}
.np-panel dd{margin:2px 0 0;font-size:16px}
.np-panel .open{width:100%;background:#f1f6f8;color:#02060a;border:0;padding:12px;font-family:var(--font-mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:opacity .2s}
.np-panel .open:hover{opacity:.82}
.np-panel .open:disabled{opacity:.4;cursor:default}
.np-msg{position:fixed;z-index:4;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,calc(100% - 32px));text-align:center;background:#02060a;border:1px solid #fff;
  padding:28px;box-sizing:border-box;box-shadow:0 0 0 6px #02060a;color:#fff;font-family:"IBM Plex Sans",system-ui,sans-serif}
.np-msg h2{margin:0 0 10px;font-family:"Michroma","Orbitron","Eurostile",sans-serif;font-size:16px;font-weight:400;letter-spacing:.06em}
.np-msg p{margin:0 0 20px;line-height:1.55;font-size:15px;color:#ffffffb3}
.np-msg .open{display:inline-block;background:#f1f6f8;color:#02060a;border:0;padding:12px 22px;font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;text-decoration:none}
.np-more{position:fixed;z-index:3;right:clamp(16px,4vw,56px);bottom:20px;font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#ffffff8c;pointer-events:none}
@media(max-width:700px){.np-panel{right:16px;left:16px;top:auto;bottom:16px;margin-top:0;width:auto;max-height:62%}.np-panel .cover{aspect-ratio:21/9}.np-cap{display:none}.np-more{display:none}}
`;
