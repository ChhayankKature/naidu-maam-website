// ─────────────────────────────────────────────────────────────
//  NetCore loading screen — every tweakable value lives here.
//  Edit a number, save, and the screen updates (npm run dev).
// ─────────────────────────────────────────────────────────────
const config = {
  // ── Colors (the holographic palette) ────────────────────────
  colors: {
    background: "#02060a",
    primary: "#6df2ff",   // main hologram tint (rim, arcs, text outline)
    secondary: "#9a7bff", // gradient partner (violet fringe)
    accent: "#ff7be0",    // pulses, glitch fringe
    text: "#eaffff"       // filled letters / percentage
  },

  // ── Globe ───────────────────────────────────────────────────
  globe: {
    // globe-only colors (the text keeps the colors above)
    colors: {
      primary: "#ffffff",   // dots, rim, arcs, grid
      secondary: "#bcd8ff", // cool tint at the poles and fringe
      accent: "#ffffff",    // travelling pulses
      glow: "#e8f4ff"       // soft halo behind the globe
    },
    radius: 1.3,          // size. 1.0 small … 2.0 huge (was 2.0)
    topY: 0.74,           // where the top of the globe sits, 0 = top of screen, 1 = bottom
    tilt: -0.03,          // radians, tilts the north pole toward (+) / away (-) from you
    rotationSpeed: 0.07,  // radians per second, 0 = still
    landDotPx: 2.3,       // size of the continent dots, in pixels
    landOpacity: 0.95,
    oceanDots: true,      // faint dot grid over the oceans
    graticule: true,      // latitude / longitude lines
    graticuleOpacity: 0.16,
    specks: 90            // floating particles around the globe
  },

  // ── Connection arcs and nodes ───────────────────────────────
  arcs: {
    show: true,
    opacity: 0.38,
    height: 1,            // 1 = default arc height, 2 = twice as tall
    pulseSpeed: 1,        // 1 = default, 0 = no travelling pulses
    nodePx: 5             // city node core size in pixels
  },

  // ── Hologram effect ─────────────────────────────────────────
  holo: {
    scanlines: 0.55,      // 0–1, strength of horizontal scanlines on the globe
    scanlineGap: 3,       // pixels between scanlines
    sweep: 0.22,          // 0–1, bright band that travels up the globe
    sweepSpeed: 0.14,     // sweeps per second
    flicker: 0.07,        // 0–1, subtle brightness flicker
    glitchEvery: 6,       // seconds between small glitches, 0 = never
    fringe: 0.35,         // 0–1, colored ghost copy behind the continents
    screenScanlines: 0.14 // 0–1, scanline overlay across the whole screen
  },

  // ── Text ────────────────────────────────────────────────────
  text: {
    word: "LOADING",
    fontFamily: '"Michroma", "Orbitron", "Eurostile", sans-serif',
    outline: "#f5f5f5",   // unfilled letter outline
    fill: "#ffffff",      // filled letters
    fillEnd: "#dcdcdc",   // slight fade at the leading edge of the fill
    glow: "#ffffff",      // glow behind the letters
    letterSpacing: 0.14,  // space between letters, in em (was 0.04)
    sizeVw: 7.2,          // font size as % of screen width
    maxPx: 118,
    minPx: 34,
    topY: 0.31,           // vertical position, 0 = top of screen, 1 = bottom
    showPercent: true
  },

  // ── Loading behavior (what "100%" means) ────────────────────
  loading: {
    // Progress follows real work. Tasks are tracked with loader.track(...)
    // (see README). Page load and fonts are tracked automatically.
    minDurationMs: 800,   // never finish faster than this (avoids a flash)
    settleMs: 350,        // wait this long after the last task is added before allowing 100%
    timeoutMs: 20000,     // safety net: force 100% if something hangs, 0 = never
    easing: 6,            // how quickly the number chases real progress
    minSpeed: 12,         // percent per second, so the bar never stalls
    maxSpeed: 220,        // percent per second, so it never teleports
    holdMs: 450,          // pause at 100% before onComplete fires
    redirect: "landing.html", // page to open (same tab) when loading finishes. "" = stay on this page
    fadeOut: true,        // fade the screen away after completing
    fadeMs: 700
  }
};

export default config;
