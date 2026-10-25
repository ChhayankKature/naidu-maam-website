import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
// npm i motion   (older setups: import from "framer-motion")

/* ---------- dummy data: 50 projects, all live ---------- */
const CATEGORIES = ["Routing", "Security", "Cloud", "Edge", "Monitoring", "Wireless"];
const NAMES = [
  "Core Fabric Upgrade", "Zero Trust Gateway", "Multi-Region Backbone", "Edge Cache Mesh", "Packet Insight",
  "Campus Wi-Fi 7 Rollout", "BGP Route Optimizer", "Firewall Policy Engine", "Hybrid Cloud Link", "5G Edge Nodes",
  "Latency Radar", "Mesh Access Points", "SD-WAN Controller", "DDoS Shield", "Cloud Interconnect",
  "IoT Edge Gateway", "Flow Analytics", "Rural Wireless Bridge", "MPLS Migration", "Intrusion Detection Grid",
  "Kubernetes Network Layer", "CDN Origin Shield", "Uptime Sentinel", "Spectrum Planner", "IPv6 Transition",
  "VPN Concentrator", "Service Mesh Rollout", "Micro-POP Network", "Traffic Heatmap", "Outdoor Wi-Fi Towers",
  "Segmentation Project", "Certificate Automator", "Transit Gateway Hub", "Satellite Uplink", "Syslog Pipeline",
  "Private 5G Campus", "Anycast DNS", "Network Access Control", "Direct Connect Pairing", "Branch Office Edge",
  "Anomaly Detector", "Long-Range Mesh", "Data Center Spine-Leaf", "Threat Intel Feed", "Serverless Network Proxy",
  "Fiber Ring Expansion", "Config Drift Monitor", "Guest Network Portal", "Bandwidth Broker", "Quantum-Safe Tunnels",
];
const LEADS = ["A. Rao", "M. Chen", "S. Patel", "L. Novak", "D. Okafor", "R. Sato", "J. Meyer", "P. Iyer"];

const PROJECTS = NAMES.map((name, i) => ({
  id: i,
  name,
  category: CATEGORIES[(i * 7 + 3) % CATEGORIES.length],
  status: "Live",
  lead: LEADS[(i * 3) % LEADS.length],
  launched: 2023 + (i % 4),
  uptime: (99.9 + ((i * 13) % 10) / 100).toFixed(2),
  devices: 12 + ((i * 29) % 480),
  summary: `${name} is running in production, keeping traffic fast and visible across the network.`,
}));

/* ---------- organic neural network layout ---------- */
const LAYERS = [5, 7, 8, 8, 8, 7, 7]; // 50 project neurons
const W = 1200, H = 700;
const SWEEP = 3.4; // seconds for a wave to cross the network
const segDur = (a, b) => Math.min(1.8, Math.max(0.5, Math.abs(b - a) * SWEEP * 1.4));
const PATTERNS = ["ltr", "rtl", "ttb", "btt", "radial", "center", "edges", "scatter"];

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function buildGraph() {
  const r = rng(7);
  const nodes = [];
  let id = 0;
  LAYERS.forEach((count, l) => {
    const baseX = 100 + l * ((W - 200) / (LAYERS.length - 1));
    const gap = (H - 130) / 7;
    const top = (H - gap * (count - 1)) / 2;
    for (let k = 0; k < count; k++) {
      nodes.push({
        id: id++, layer: l, k,
        x: baseX + (r() - 0.5) * 70,
        y: top + k * gap + (r() - 0.5) * 44,
        size: 5 + r() * 2.5,
        phase: r() * 4,
      });
    }
  });

  // connections: each neuron reaches its nearest neighbours in the next layer, with occasional skip links
  const byLayer = LAYERS.map((_, l) => nodes.filter((n) => n.layer === l));
  const seen = new Set();
  const edges = [];
  const add = (a, b) => {
    const key = a.id + "-" + b.id;
    if (seen.has(key)) return;
    seen.add(key);
    const bend = (r() - 0.5) * 70;
    const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.0 + 0, my = (a.y + b.y) / 2 + bend;
    edges.push({ id: edges.length, from: a, to: b, mx, my, d: `M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}` });
  };
  for (let l = 0; l < LAYERS.length - 1; l++) {
    const next = byLayer[l + 1];
    byLayer[l].forEach((a) => {
      const sorted = [...next].sort((p, q) => dist(a, p) - dist(a, q));
      const n = 2 + Math.floor(r() * 2);
      sorted.slice(0, n).forEach((b) => add(a, b));
      if (l < LAYERS.length - 2 && r() < 0.22) {
        const far = [...byLayer[l + 2]].sort((p, q) => dist(a, p) - dist(a, q))[0];
        add(a, far);
      }
    });
    next.forEach((b) => {
      if (!edges.some((e) => e.to === b)) add([...byLayer[l]].sort((p, q) => dist(b, p) - dist(b, q))[0], b);
    });
  }
  const out = {};
  edges.forEach((e) => (out[e.from.id] ||= []).push(e));

  // background micro-neurons: dendrite-like fibres that add depth
  const micro = Array.from({ length: 80 }, (_, i) => ({
    id: "m" + i, x: 30 + r() * (W - 60), y: 30 + r() * (H - 60), size: 1 + r() * 1.6, o: 0.15 + r() * 0.3,
  }));
  const fibres = [];
  micro.forEach((m) => {
    [...nodes].sort((p, q) => dist(m, p) - dist(m, q)).slice(0, 2).forEach((n) => {
      if (dist(m, n) < 190) fibres.push({ m, n, d: `M${m.x} ${m.y} Q${(m.x + n.x) / 2 + (r() - 0.5) * 40} ${(m.y + n.y) / 2 + (r() - 0.5) * 40} ${n.x} ${n.y}` });
    });
  });
  return { nodes, edges, out, micro, fibres };
}

/* ---------- component ---------- */
export default function NeuralProjects() {
  const reduce = useReducedMotion();
  const { nodes, edges, out, micro, fibres } = useMemo(buildGraph, []);
  const [filter, setFilter] = useState("All");
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const [wave, setWave] = useState({ n: 0, type: "ltr", px: 0, py: 0 });
  const lead = wave.n === 0 ? 2 : 0; // only the first wave waits for the draw-in

  // arrival time (0..1) of the wave at each neuron, normalised so the pattern starts at 0 and ends at 1
  const { vals, end } = useMemo(() => {
    const raw = nodes.map((n) => {
      switch (wave.type) {
        case "ltr": return n.x / W;
        case "rtl": return 1 - n.x / W;
        case "ttb": return n.y / H;
        case "btt": return 1 - n.y / H;
        case "radial": return Math.hypot(n.x - wave.px, n.y - wave.py);
        case "center": return Math.hypot(n.x - W / 2, n.y - H / 2);
        case "edges": return -Math.hypot(n.x - W / 2, n.y - H / 2);
        default: return ((n.id * 9301 + wave.n * 49297) % 233280) / 233280; // scatter
      }
    });
    const lo = Math.min(...raw), hi = Math.max(...raw);
    const vals = raw.map((v) => (v - lo) / (hi - lo || 1));
    let end = 0;
    edges.forEach((e) => {
      const a = vals[e.from.id], b = vals[e.to.id];
      end = Math.max(end, Math.min(a, b) * SWEEP + segDur(a, b));
    });
    nodes.forEach((n) => { end = Math.max(end, vals[n.id] * SWEEP + 1.2); });
    return { vals, end };
  }, [wave, nodes, edges]);
  const val = (n) => vals[n.id];

  // chain waves: the next one starts the moment the current one has finished
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => {
      setWave((w) => {
        let type;
        do type = PATTERNS[Math.floor(Math.random() * PATTERNS.length)]; while (type === w.type);
        return { n: w.n + 1, type, px: 80 + Math.random() * (W - 160), py: 80 + Math.random() * (H - 160) };
      });
    }, (lead + end) * 1000);
    return () => clearTimeout(t);
  }, [wave, end, lead, reduce]);

  const active = hover ?? selected;
  const proj = selected != null ? PROJECTS[selected] : null;
  const matches = (id) => filter === "All" || PROJECTS[id].category === filter;

  return (
    <div className="np-root">
      <style>{css}</style>

      <header className="np-head">
        <div>
          <h1>Network projects</h1>
          <p>{PROJECTS.length} projects, all live. Each neuron is a project. Hover a project to follow its connections, select it to open.</p>
        </div>
        <nav className="np-filters" aria-label="Filter by category">
          {["All", ...CATEGORIES].map((c) => (
            <button key={c} className={filter === c ? "on" : ""} onClick={() => setFilter(c)}>{c}</button>
          ))}
        </nav>
      </header>

      <main className="np-stage">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Neural network of live projects">
          <defs>
            <radialGradient id="glow">
              <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
          </defs>

          {/* depth layer: micro neurons and fibres */}
          {fibres.map((f, i) => <path key={i} d={f.d} fill="none" stroke="#fff" strokeOpacity="0.08" strokeWidth="0.6" />)}
          {micro.map((m) => <circle key={m.id} cx={m.x} cy={m.y} r={m.size} fill="#fff" opacity={m.o} />)}

          {/* axons (resting) */}
          {edges.map((e) => (
            <motion.path
              key={e.id} d={e.d} fill="none" stroke="#fff" strokeWidth="0.8"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: active != null ? 0.1 : 0.2 }}
              transition={{
                pathLength: { duration: 1.6, delay: e.from.layer * 0.2, ease: "easeOut" },
                opacity: { duration: 0.4 },
              }}
            />
          ))}

          {/* flow: lines grow out of the active neuron into each connection */}
          <AnimatePresence>
            {active != null &&
              edges
                .filter((e) => e.from.id === active || e.to.id === active)
                .map((e) => {
                  const outgoing = e.from.id === active;
                  const d = outgoing ? e.d : `M${e.to.x} ${e.to.y} Q${e.mx} ${e.my} ${e.from.x} ${e.from.y}`;
                  return (
                    <motion.path
                      key={`${active}-${e.id}`} d={d} fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 1 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.3 } }}
                      transition={{ pathLength: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } }}
                    />
                  );
                })}
          </AnimatePresence>

          {/* the wave: bright segments racing along the connections in a random pattern */}
          {!reduce && (
            <g style={{ opacity: active != null ? 0.2 : 1, transition: "opacity .35s" }} pointerEvents="none">
              {edges.map((e) => {
                const va = val(e.from), vb = val(e.to);
                const fwd = va <= vb;
                const d = fwd ? e.d : `M${e.to.x} ${e.to.y} Q${e.mx} ${e.my} ${e.from.x} ${e.from.y}`;
                const dur = segDur(va, vb);
                return (
                  <motion.path
                    key={`w${wave.n}-${e.id}`} d={d} fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round"
                    initial={{ pathLength: 0.4, pathOffset: -0.4, opacity: 0 }}
                    animate={{ pathOffset: 1, opacity: [0, 1, 1, 0] }}
                    transition={{ duration: dur, delay: lead + Math.min(va, vb) * SWEEP, ease: "easeInOut" }}
                  />
                );
              })}
            </g>
          )}

          {/* project neurons (all live) */}
          {nodes.map((n) => {
            const p = PROJECTS[n.id];
            const dim = !matches(n.id);
            const isSel = selected === n.id;
            const isAct = active === n.id;
            return (
              <g
                key={n.id} tabIndex={0} role="button"
                aria-label={`${p.name}, ${p.category}, live`}
                style={{ cursor: "pointer", outline: "none" }}
                onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(n.id)} onBlur={() => setHover(null)}
                onClick={() => setSelected(isSel ? null : n.id)}
                onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && setSelected(isSel ? null : n.id)}
              >
                {!reduce && !dim && (
                  <motion.circle
                    key={`r${wave.n}`} cx={n.x} cy={n.y} fill="none" stroke="#fff"
                    initial={{ r: n.size, opacity: 0 }}
                    animate={{ r: [n.size, n.size + 26], opacity: [0.9, 0], strokeWidth: [2, 0.5] }}
                    transition={{ duration: 1.2, delay: lead + val(n) * SWEEP, ease: "easeOut" }}
                  />
                )}
                {isAct && <circle cx={n.x} cy={n.y} r="34" fill="url(#glow)" />}
                <circle cx={n.x} cy={n.y} r="16" fill="transparent" />
                <motion.circle
                  cx={n.x} cy={n.y} fill="#fff" stroke="#000" strokeWidth="1.5"
                  initial={{ r: 0 }}
                  animate={{ r: isAct ? n.size + 3.5 : n.size, opacity: dim ? 0.15 : 1 }}
                  transition={{ type: "spring", stiffness: 360, damping: 16, delay: isAct ? 0 : n.layer * 0.12 }}
                />
                {isSel && (
                  <motion.circle
                    cx={n.x} cy={n.y} fill="none" stroke="#fff" strokeWidth="1"
                    initial={{ r: 10, opacity: 0.9 }} animate={{ r: 28, opacity: 0 }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                {isAct && (
                  <text x={n.x} y={n.y - 22} textAnchor="middle" fill="#fff" fontSize="14"
                    style={{ paintOrder: "stroke", stroke: "#000", strokeWidth: 4 }}>
                    {p.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <AnimatePresence>
          {proj && (
            <motion.aside
              key={proj.id} className="np-panel"
              initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            >
              <button className="close" onClick={() => setSelected(null)} aria-label="Close project">×</button>
              <h2>{proj.name}</h2>
              <p className="meta">{proj.category} network, live since {proj.launched}</p>
              <p>{proj.summary}</p>
              <div className="bar" aria-label={`${proj.uptime}% uptime`}>
                <motion.span key={proj.id} initial={{ width: 0 }} animate={{ width: `${proj.uptime}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
              </div>
              <dl>
                <div><dt>Status</dt><dd>Live</dd></div>
                <div><dt>Uptime</dt><dd>{proj.uptime}%</dd></div>
                <div><dt>Lead</dt><dd>{proj.lead}</dd></div>
                <div><dt>Devices</dt><dd>{proj.devices}</dd></div>
              </dl>
              <button className="open">Open project</button>
            </motion.aside>
          )}
        </AnimatePresence>
      </main>

      <footer className="np-legend">
        <span><i className="d" /> Live project</span>
        <span><i className="ln" /> Connection</span>
      </footer>
    </div>
  );
}

/* ---------- styles (pure black and white) ---------- */
const css = `
.np-root{min-height:100vh;background:#000;color:#fff;font-family:"Inter","Helvetica Neue",Arial,sans-serif;
  padding:32px clamp(16px,4vw,56px);box-sizing:border-box;
  background-image:radial-gradient(ellipse at 50% 45%,#ffffff14,transparent 65%)}
.np-head{display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between;align-items:flex-end}
.np-head h1{margin:0;font-size:clamp(32px,5vw,56px);font-weight:300;letter-spacing:-.03em}
.np-head p{margin:8px 0 0;color:#ffffffa6;max-width:46ch}
.np-filters{display:flex;flex-wrap:wrap;gap:8px}
.np-filters button{background:#000;color:#fff;border:1px solid #ffffff59;padding:8px 14px;border-radius:999px;
  font:inherit;font-size:14px;cursor:pointer;transition:background .2s,color .2s,border-color .2s}
.np-filters button:hover{border-color:#fff}
.np-filters button.on{background:#fff;color:#000;border-color:#fff}
.np-filters button:focus-visible,.np-panel button:focus-visible{outline:2px solid #fff;outline-offset:3px}
.np-stage{position:relative;margin-top:16px}
.np-stage svg{width:100%;height:auto;max-height:76vh;display:block}
.np-panel{position:absolute;right:0;top:8px;width:min(340px,92%);background:#000;border:1px solid #fff;
  padding:24px;box-sizing:border-box;box-shadow:0 0 0 6px #000}
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
.np-legend{display:flex;flex-wrap:wrap;gap:24px;margin-top:8px;color:#ffffffa6;font-size:14px}
.np-legend span{display:flex;align-items:center;gap:8px}
.d{width:12px;height:12px;border-radius:50%;background:#fff;display:inline-block}
.ln{width:22px;height:1px;background:#ffffff80;display:inline-block}
@media(max-width:700px){.np-panel{position:static;margin-top:16px;width:100%}}
`;