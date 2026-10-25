import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
// npm i motion   (older setups: import from "framer-motion")

/* ---------- dummy data ---------- */
const TYPE_DATA = {
  Presentation: ["Q3 Network Review Deck", "Zero Trust Pitch Deck", "Datacenter Migration Slides", "Board Security Briefing", "Fiber Rollout Roadshow"],
  Games: ["Packet Defender", "Router Rush", "Subnet Puzzle", "Firewall Frenzy", "Latency Racer"],
  Websites: ["Status Portal", "Customer Network Portal", "Docs Hub", "Partner Coverage Map", "Careers Site"],
  Apps: ["Field Engineer App", "Wi-Fi Setup App", "Outage Alerts App", "Device Scanner", "VPN Companion"],
  Dashboards: ["Traffic Dashboard", "Uptime Wall", "Threat Map", "Capacity Planner", "SLA Tracker"],
  Tools: ["Subnet Calculator", "Config Diff Tool", "Speed Tester", "Port Scanner Lite", "DNS Lookup Kit"],
};
const CATEGORIES = Object.keys(TYPE_DATA);
const NCAT = CATEGORIES.length;
const LEADS = ["A. Rao", "M. Chen", "S. Patel", "L. Novak", "D. Okafor", "R. Sato", "J. Meyer", "P. Iyer"];
const MAX_PROJECTS = 30;
const MIN_PROJECTS = 6;

const ICONS = {
  All: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M14 14h7v7h-7z", "M3 14h7v7H3z"],
  Presentation: ["M2 3h20", "M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3", "m7 21 5-5 5 5"],
  Games: ["M6 11h4", "M8 9v4", "M15 12h.01", "M18 10h.01", "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"],
  Websites: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", "M2 12h20"],
  Apps: ["M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", "M12 18h.01"],
  Dashboards: ["M3 3v16a2 2 0 0 0 2 2h16", "M18 17V9", "M13 17V5", "M8 17v-3"],
  Tools: ["M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"],
};

// project i belongs to category i % NCAT
const PROJECTS = Array.from({ length: MAX_PROJECTS }, (_, i) => {
  const category = CATEGORIES[i % NCAT];
  const name = TYPE_DATA[category][Math.floor(i / NCAT)];
  return {
    id: i, name, category, status: "Live", image: null,
    lead: LEADS[(i * 3) % LEADS.length],
    launched: 2023 + (i % 4),
    uptime: (99.9 + ((i * 13) % 10) / 100).toFixed(2),
    users: 120 + ((i * 377) % 9000),
    summary: `${name} is live and in daily use.`,
  };
});

/* ---------- globe maths ---------- */
const TILT = 0.42; // default lean of the globe
const ZOOM = 2.1; // zoom when a type is selected
const SWEEP_MS = 4200;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// each project type owns one region of the globe (6 directions, 90° apart)
const ANCHORS = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];

function fibonacci(n) {
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const t = i * 2.399963;
    return [Math.cos(t) * r, y, Math.sin(t) * r];
  });
}

// put each category's projects in a small cluster around its anchor
function clusterPositions(count) {
  const groups = CATEGORIES.map(() => []);
  for (let i = 0; i < count; i++) groups[i % NCAT].push(i);
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

// rough continent outlines as [lon, lat] polygons, used to cut a dotted world out of a sphere
const LAND = [
  [[-168,66],[-156,71],[-125,70],[-95,72],[-80,68],[-62,58],[-56,50],[-66,44],[-76,35],[-81,25],[-90,29],[-97,26],[-97,18],[-88,16],[-83,10],[-77,8],[-80,7],[-86,10],[-92,14],[-105,20],[-110,24],[-115,30],[-123,38],[-125,48],[-135,58],[-150,60],[-165,60]],
  [[-77,8],[-72,12],[-62,10],[-52,5],[-50,0],[-35,-6],[-39,-15],[-48,-26],[-58,-38],[-65,-42],[-68,-52],[-72,-52],[-74,-42],[-71,-30],[-70,-18],[-76,-14],[-81,-5],[-80,0],[-78,5]],
  [[-9,37],[-9,43],[-2,48],[4,52],[8,57],[10,59],[5,62],[15,69],[28,71],[45,68],[60,70],[80,73],[105,77],[140,72],[170,70],[180,66],[165,60],[160,54],[155,59],[142,52],[135,44],[128,40],[122,38],[122,31],[120,23],[108,21],[106,10],[100,13],[104,1],[98,8],[98,16],[92,22],[80,15],[77,8],[73,18],[67,25],[57,26],[52,29],[48,30],[56,24],[59,22],[52,16],[43,13],[35,28],[34,31],[36,36],[27,37],[26,40],[22,37],[19,41],[16,38],[12,44],[7,43],[3,43],[-2,37],[-6,36]],
  [[-17,21],[-10,30],[-6,36],[10,37],[11,33],[20,31],[32,31],[35,24],[38,18],[43,12],[51,12],[45,2],[40,-5],[40,-15],[35,-24],[32,-29],[26,-34],[19,-35],[15,-27],[12,-17],[13,-8],[9,-1],[9,4],[-5,5],[-13,8],[-17,14]],
  [[114,-22],[122,-18],[131,-12],[137,-12],[142,-11],[146,-19],[153,-26],[150,-37],[141,-38],[135,-34],[130,-32],[115,-34]],
  [[-55,60],[-45,60],[-20,70],[-18,80],[-40,83],[-65,80],[-70,76],[-55,68]],
  [[-5,50],[2,51],[0,56],[-4,59],[-7,55]],
  [[130,31],[140,36],[142,42],[140,45],[137,37]],
  [[109,2],[117,7],[119,0],[116,-4],[110,-3]],
];
function onLand(lon, lat) {
  if (lat < -72) return true;
  return LAND.some((poly) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  });
}
const DOTS = fibonacci(12000)
  .map(([x, y, z]) => ({ x, y, z, lon: (Math.atan2(-z, x) * 180) / Math.PI, lat: (Math.asin(y) * 180) / Math.PI }))
  .filter((d) => onLand(d.lon, d.lat));

// long arcs between regions, so the globe reads like a global network
const LONG_PAIRS = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 0], [4, 2], [5, 1], [5, 3]];

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
export default function NeuralProjects() {
  const reduce = useReducedMotion();
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ w: 1440, h: 800 });
  const [count, setCount] = useState(MAX_PROJECTS);
  const [filter, setFilter] = useState("All");
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
  const pad = { x: small ? 34 : 90, top: small ? 240 : 170, bottom: 50 };

  const pos = useMemo(() => clusterPositions(count), [count]);
  const edges = useMemo(() => [...nearestLinks(pos), ...LONG_PAIRS.filter(([a, b]) => a < count && b < count)], [pos, count]);

  const active = hover ?? selected;
  const proj = selected != null && selected < count ? PROJECTS[selected] : null;
  const matchedCount = PROJECTS.slice(0, count).filter((p) => filter === "All" || p.category === filter).length;

  useEffect(() => {
    if (selected != null && (selected >= count || (filter !== "All" && PROJECTS[selected].category !== filter))) setSelected(null);
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
    V.pitch = clamp(V.pitch - dy * k, -1.35, 1.35);
    V.vy = 0.6 * V.vy + 0.4 * (dx * k) / dt;
    V.vp = 0.6 * V.vp + 0.4 * (-dy * k) / dt;
    d.x = e.clientX; d.y = e.clientY; d.t = now;
  };
  const onUp = () => { drag.current.down = false; view.current.drag = false; };

  /* ---------- animation loop (all through refs) ---------- */
  const live = useRef({});
  live.current = { W, H, pad, count, filter, active, reduce, pos, edges };
  const nodeEls = useRef([]);
  const sLines = useRef([]), sHi = useRef([]);
  const cur = useRef(Array.from({ length: MAX_PROJECTS }, () => ({ x: 0, y: 0, s: 0, o: 0, d: 1, init: false })));
  const hoverStart = useRef(0);
  const rot3 = useRef([]);
  useEffect(() => { hoverStart.current = performance.now(); }, [active]);

  useEffect(() => {
    let raf, last = performance.now();
    const ease = (dt, tau) => 1 - Math.exp(-dt / tau);

    const loop = (now) => {
      const dt = Math.min(64, now - last);
      last = now;
      const L = live.current, V = view.current;
      const { W, H, pad, count, filter, active, reduce } = L;
      const availH = H - pad.top - pad.bottom;
      const cx = W / 2, cy = pad.top + availH / 2;
      const R = Math.max(100, Math.min((W - 2 * pad.x) / 2, availH / 2) * 1.1);
      const catIdx = CATEGORIES.indexOf(filter);
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
        const c = cur.current[i];
        const match = filter === "All" || i % NCAT === catIdx;
        const [ux, uy, uz] = spin(L.pos[i], cr, sr, ct, st);
        rot3.current[i] = [ux, uy, uz];
        const persp = 1 / (1 - uz * 0.22);
        const tx = cx + Rz * ux * persp, ty = cy + Rz * uy * persp;
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
          dstr += (q ? "L" : "M") + (cx + Rz * x * pp).toFixed(1) + " " + (cy + Rz * y * pp).toFixed(1);
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

      /* the dotted earth */
      const cv = canvasRef.current;
      if (cv) {
        const dpr = window.devicePixelRatio || 1;
        if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
        const ctx = cv.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        const glow = ctx.createRadialGradient(cx, cy, Rz * 0.7, cx, cy, Rz * 1.14);
        glow.addColorStop(0, "rgba(255,255,255,0)");
        glow.addColorStop(0.68, "rgba(255,255,255,0.2)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.beginPath(); ctx.arc(cx, cy, Rz, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx, cy, Rz * 1.14, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, Rz, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#fff";
        const ds = 1.5 * Math.pow(Z, 0.5);
        for (const p of DOTS) {
          const z1 = -p.x * sr + p.z * cr;
          const z = p.y * st + z1 * ct;
          if (z < 0.02) continue; // far side stays empty
          const x = p.x * cr + p.z * sr, y = p.y * ct - z1 * st;
          const pp = 1 / (1 - z * 0.22), sz = ds * (0.45 + 0.55 * z);
          ctx.globalAlpha = 0.25 + 0.65 * z;
          ctx.fillRect(cx + Rz * x * pp - sz / 2, cy + Rz * y * pp - sz / 2, sz, sz);
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
          <h1>Network projects</h1>
          <nav className="np-filters" aria-label="Filter by project type">
            {["All", ...CATEGORIES].map((c) => (
              <button key={c} className={filter === c ? "on" : ""} aria-label={c} aria-pressed={filter === c}
                onClick={() => { setFilter(c); setFocusKey((n) => n + 1); }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {ICONS[c].map((d) => <path key={d} d={d} />)}
                </svg>
              </button>
            ))}
          </nav>
        </div>
        <label className="np-count">
          <input type="range" min={MIN_PROJECTS} max={MAX_PROJECTS} value={count} aria-label="Number of projects"
            onChange={(e) => setCount(+e.target.value)} />
          <b>{count}</b>
        </label>
      </header>

      <main className="np-stage" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <canvas ref={canvasRef} className="np-globe" style={{ width: W, height: H }} />
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Globe of live projects">
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
            const p = PROJECTS[i];
            const isSel = selected === i;
            const isAct = active === i;
            const r = nodeSize;
            return (
              <g
                key={i} ref={(el) => (nodeEls.current[i] = el)} tabIndex={0} role="button"
                aria-label={`${p.name}, ${p.category}, live`}
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
                {p.image ? (
                  <g pointerEvents="none">
                    <clipPath id={`clip${i}`}><circle r={r - 2} /></clipPath>
                    <image href={p.image} x={-r} y={-r} width={r * 2} height={r * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#clip${i})`} />
                  </g>
                ) : (
                  <g pointerEvents="none" transform={`translate(${-r * 0.58} ${-r * 0.58}) scale(${(r * 1.16) / 24})`}>
                    <motion.g
                      fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      initial={false} animate={{ stroke: isAct ? "#000" : "#fff" }}
                    >
                      {ICONS[p.category].map((d) => <path key={d} d={d} />)}
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
          {filter === "All" ? "Drag to rotate. Pick a type to zoom in." : `${filter}: ${matchedCount} live`}
        </div>

        <AnimatePresence>
          {proj && (
            <motion.aside
              key={proj.id} className="np-panel" onPointerDown={(e) => e.stopPropagation()}
              initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            >
              <button className="close" onClick={() => setSelected(null)} aria-label="Close project">×</button>
              <h2>{proj.name}</h2>
              <p className="meta">{proj.category}, live since {proj.launched}</p>
              <p>{proj.summary}</p>
              <div className="bar" aria-label={`${proj.uptime}% uptime`}>
                <motion.span key={proj.id} initial={{ width: 0 }} animate={{ width: `${proj.uptime}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
              </div>
              <dl>
                <div><dt>Status</dt><dd>Live</dd></div>
                <div><dt>Uptime</dt><dd>{proj.uptime}%</dd></div>
                <div><dt>Lead</dt><dd>{proj.lead}</dd></div>
                <div><dt>Users</dt><dd>{proj.users}</dd></div>
              </dl>
              <button className="open">Open project</button>
            </motion.aside>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ---------- styles (pure black and white) ---------- */
const css = `
.np-root{position:fixed;inset:0;margin:0;padding:0;max-width:none;text-align:left;overflow:hidden;background:#000;color:#fff;
  font-family:"Inter","Helvetica Neue",Arial,sans-serif;box-sizing:border-box;
  background-image:radial-gradient(ellipse at 50% 55%,#ffffff17,transparent 65%)}
.np-head{position:absolute;z-index:2;top:0;left:0;right:0;display:flex;flex-wrap:wrap;gap:16px 24px;justify-content:space-between;
  align-items:flex-start;padding:28px clamp(16px,4vw,56px);pointer-events:none}
.np-head>*{pointer-events:auto}
.np-head h1{margin:0 0 16px;font-size:clamp(26px,3.4vw,40px);font-weight:300;letter-spacing:-.03em;line-height:1.1}
.np-filters{display:flex;flex-wrap:wrap;gap:10px}
.np-filters button{background:#000;color:#fff;border:1px solid #ffffff59;width:46px;height:46px;border-radius:999px;display:grid;
  place-items:center;padding:0;cursor:pointer;transition:background .2s,color .2s,border-color .2s}
.np-filters button:hover{border-color:#fff}
.np-filters button.on{background:#fff;color:#000;border-color:#fff}
.np-filters button:focus-visible,.np-panel button:focus-visible{outline:2px solid #fff;outline-offset:3px}
.np-count{display:flex;align-items:center;gap:14px;height:46px;padding:0 18px;border:1px solid #ffffff59;border-radius:999px;background:#000}
.np-count input{width:min(180px,34vw);accent-color:#fff;cursor:pointer}
.np-count b{font-weight:400;font-size:18px;min-width:2ch;text-align:right}
.np-stage{position:absolute;inset:0;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}
.np-stage:active{cursor:grabbing}
.np-globe{position:absolute;left:0;top:0;pointer-events:none}
.np-stage svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.np-cap{position:absolute;left:clamp(16px,4vw,56px);bottom:20px;font-size:14px;color:#ffffff8c;pointer-events:none}
.np-panel{position:absolute;z-index:3;right:clamp(16px,4vw,56px);top:50%;margin-top:-190px;width:min(340px,calc(100% - 32px));background:#000;border:1px solid #fff;
  padding:24px;box-sizing:border-box;box-shadow:0 0 0 6px #000;cursor:default}
.np-panel h2{margin:0 36px 4px 0;font-size:22px;font-weight:400;letter-spacing:-.01em}
.np-panel .meta{margin:0 0 14px;color:#ffffff8c;font-size:14px}
.np-panel p{line-height:1.55;font-size:15px}
.np-panel .close{position:absolute;top:10px;right:12px;background:none;border:0;color:#fff;font-size:26px;cursor:pointer}
.np-panel .bar{height:2px;background:#ffffff33;margin:18px 0}
.np-panel .bar span{display:block;height:100%;background:#fff}
.np-panel dl{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:0 0 20px}
.np-panel dt{color:#ffffff8c;font-size:13px}
.np-panel dd{margin:2px 0 0;font-size:16px}
.np-panel .open{width:100%;background:#fff;color:#000;border:0;padding:12px;font:inherit;cursor:pointer;transition:opacity .2s}
.np-panel .open:hover{opacity:.82}
@media(max-width:700px){.np-panel{right:16px;left:16px;top:auto;bottom:16px;margin-top:0;width:auto}.np-cap{display:none}}
`;