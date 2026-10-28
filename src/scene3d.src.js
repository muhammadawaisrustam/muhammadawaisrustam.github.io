/*
  "Data sculpture": the 3D scene behind the portfolio (Three.js).

  Thousands of glowing particles. At the top of the page they form a flowing
  data wave across the bottom of the screen. As the visitor scrolls, they
  travel and re-form into a shape for each section:

    about → brand DNA helix      projects → lead funnel
    skills → growth bar chart    experience → career timeline spiral
    brands → client network      guide → knowledge knot
    faq → globe of answers       credentials → crystal lattice
    contact → a bright signal core

  Every element with data-gate is a chapter. All text stays in the HTML;
  this file only draws pictures behind it.
  Build:  npx esbuild src/scene3d.src.js --bundle --format=esm --minify --outfile=scene3d.js
*/
import {
  WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute,
  Points, ShaderMaterial, AdditiveBlending, Color
} from "three";

export function start(canvas) {
  const root = document.documentElement;
  const css = getComputedStyle(root);
  const BLUE = new Color((css.getPropertyValue("--cobalt") || "#5B8CFF").trim());
  const GOLD = new Color((css.getPropertyValue("--signal") || "#E8C27A").trim());
  const IVORY = new Color("#F4EFE6");
  const CYAN = new Color("#7FD8FF");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = matchMedia("(max-width: 760px)").matches;
  const weak = small || (navigator.hardwareConcurrency || 8) <= 4;

  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return; }
  const PR = Math.min(window.devicePixelRatio || 1, weak ? 1.5 : 2);
  renderer.setPixelRatio(PR);
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const D = 14;
  const camera = new PerspectiveCamera(40, 1, 0.1, 200);
  camera.position.set(0, 0, D);

  const N = weak ? 2600 : 6500;
  const rnd = mulberry(7);

  /* ---------- shape library (unit-ish space, about 3 units tall) ---------- */
  const TAU = Math.PI * 2;
  function arr() { return new Float32Array(N * 3); }
  function helix() {
    const p = arr();
    for (let i = 0; i < N; i++) {
      const t = rnd(), k = rnd();
      const y = (t - 0.5) * 6.4, a = t * TAU * 2.2;
      if (k < 0.82) { // two strands
        const s = k < 0.41 ? 0 : Math.PI, r = 1.25 + (rnd() - 0.5) * 0.12;
        p.set([Math.cos(a + s) * r, y, Math.sin(a + s) * r], i * 3);
      } else { // rungs between the strands
        const ry = Math.round(t * 22) / 22, ra = ry * TAU * 2.2, u = rnd() * 2 - 1;
        p.set([Math.cos(ra) * 1.25 * u, (ry - 0.5) * 6.4, Math.sin(ra) * 1.25 * u], i * 3);
      }
    }
    return p;
  }
  function funnel() {
    const p = arr();
    for (let i = 0; i < N; i++) {
      const t = Math.pow(rnd(), 0.8), y = 3.1 - t * 6.2;
      const r = 0.22 + Math.pow(1 - t, 1.6) * 2.5, a = rnd() * TAU;
      const shell = rnd() < 0.85 ? 1 : rnd();
      p.set([Math.cos(a) * r * shell, y, Math.sin(a) * r * shell], i * 3);
    }
    return p;
  }
  function bars() {
    const p = arr(), G = 5, gap = 1.05, hs = [];
    for (let x = 0; x < G; x++) for (let z = 0; z < G; z++) hs.push(0.6 + ((x + z) / (2 * G - 2)) * 4.2 + rnd() * 0.5);
    for (let i = 0; i < N; i++) {
      const b = Math.floor(rnd() * G * G), bx = Math.floor(b / G), bz = b % G, h = hs[b];
      const cx = (bx - (G - 1) / 2) * gap, cz = (bz - (G - 1) / 2) * gap, w = 0.36;
      // particles on the bar's faces and edges
      const f = rnd(); let x, y, z;
      if (f < 0.2) { x = (rnd() - 0.5) * 2 * w; z = (rnd() - 0.5) * 2 * w; y = h; }
      else { const e = Math.floor(rnd() * 4), s = (rnd() - 0.5) * 2 * w; y = rnd() * h; x = e < 2 ? (e ? w : -w) : s; z = e < 2 ? s : (e === 2 ? w : -w); }
      p.set([cx + x, y - 2.6, cz + z], i * 3);
    }
    return p;
  }
  function spiral() {
    const p = arr();
    for (let i = 0; i < N; i++) {
      const t = rnd(), a = t * TAU * 3.2, r = 0.5 + t * 2.4;
      const ribbon = (rnd() - 0.5) * 0.5;
      p.set([Math.cos(a) * r, (t - 0.5) * 2.2 + ribbon, Math.sin(a) * r], i * 3);
    }
    return p;
  }
  function network() {
    const p = arr(), nodes = [];
    for (let i = 0; i < 34; i++) { const v = sphere(2.6 * (0.55 + rnd() * 0.45)); nodes.push(v); }
    const edges = [];
    nodes.forEach((a, i) => nodes.forEach((b, j) => { if (j > i && dist(a, b) < 2.1) edges.push([a, b]); }));
    for (let i = 0; i < N; i++) {
      if (rnd() < 0.3 || !edges.length) { const n = nodes[Math.floor(rnd() * nodes.length)], j = jitter(0.12); p.set([n[0] + j[0], n[1] + j[1], n[2] + j[2]], i * 3); }
      else { const [a, b] = edges[Math.floor(rnd() * edges.length)], t = rnd(); p.set([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], i * 3); }
    }
    return p;
  }
  function knot() {
    const p = arr(), P = 2, Q = 3;
    for (let i = 0; i < N; i++) {
      const t = rnd() * TAU, r = 1.6 + 0.7 * Math.cos(Q * t);
      const c = [r * Math.cos(P * t), 0.7 * Math.sin(Q * t) * 1.6, r * Math.sin(P * t)], j = jitter(0.22);
      p.set([c[0] + j[0], c[1] + j[1], c[2] + j[2]], i * 3);
    }
    return p;
  }
  function globe() {
    const p = arr();
    for (let i = 0; i < N; i++) {
      // fibonacci sphere, with a band of particles for "latitude lines"
      const k = i + 0.5, ph = Math.acos(1 - (2 * k) / N), th = Math.PI * (1 + Math.sqrt(5)) * k;
      const r = 2.7 + (rnd() < 0.08 ? rnd() * 0.6 : 0);
      p.set([Math.cos(th) * Math.sin(ph) * r, Math.cos(ph) * r, Math.sin(th) * Math.sin(ph) * r], i * 3);
    }
    return p;
  }
  function lattice() {
    const p = arr(), V = [];
    const g = (1 + Math.sqrt(5)) / 2;
    [[-1, g, 0], [1, g, 0], [-1, -g, 0], [1, -g, 0], [0, -1, g], [0, 1, g], [0, -1, -g], [0, 1, -g], [g, 0, -1], [g, 0, 1], [-g, 0, -1], [-g, 0, 1]]
      .forEach((v) => V.push(v.map((x) => x * 1.45)));
    const E = []; V.forEach((a, i) => V.forEach((b, j) => { if (j > i && dist(a, b) < 3.0) E.push([a, b]); }));
    for (let i = 0; i < N; i++) {
      const [a, b] = E[Math.floor(rnd() * E.length)], t = rnd(), j = jitter(0.05);
      p.set([a[0] + (b[0] - a[0]) * t + j[0], a[1] + (b[1] - a[1]) * t + j[1], a[2] + (b[2] - a[2]) * t + j[2]], i * 3);
    }
    return p;
  }
  function core() {
    const p = arr();
    for (let i = 0; i < N; i++) {
      const r = Math.pow(rnd(), 2.6) * 3.4, v = sphere(1);
      p.set([v[0] * r, v[1] * r, v[2] * r], i * 3);
    }
    return p;
  }
  // the hero wave: a flat grid that is animated every frame
  const waveBase = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) { waveBase[i * 2] = rnd() * 2 - 1; waveBase[i * 2 + 1] = rnd(); }

  const LIB = { about: helix, projects: funnel, skills: bars, experience: spiral, brands: network, guide: knot, faq: globe, credentials: lattice, contact: core };
  const CYCLE = [helix, funnel, bars, network, knot, globe, lattice, spiral];
  const PAL = { about: [BLUE, CYAN], projects: [GOLD, IVORY], skills: [BLUE, GOLD], experience: [CYAN, IVORY], brands: [GOLD, BLUE],
    guide: [IVORY, BLUE], faq: [BLUE, CYAN], credentials: [GOLD, IVORY], contact: [GOLD, IVORY] };

  const gateEls = [].slice.call(document.querySelectorAll("[data-gate]"));
  const shapes = [{ wave: true, pos: arr(), col: colors(BLUE, CYAN, 0.25), spin: 0 }];
  gateEls.forEach((el, i) => {
    const id = el.id, f = LIB[id] || CYCLE[i % CYCLE.length], pal = PAL[id] || [i % 2 ? GOLD : BLUE, IVORY];
    shapes.push({ pos: f(), col: colors(pal[0], pal[1], 0.35), spin: f === bars ? 0.5 : 1 });
  });
  function colors(a, b, mixB) {
    const c = arr(), t = new Color();
    for (let i = 0; i < N; i++) { t.copy(a).lerp(b, rnd() < mixB ? 0.6 + rnd() * 0.4 : rnd() * 0.25).multiplyScalar(0.7 + rnd() * 0.5); c.set([t.r, t.g, t.b], i * 3); }
    return c;
  }

  /* ---------- particles ---------- */
  const cur = arr(), curCol = arr(), size = new Float32Array(N), ease = new Float32Array(N), phase = new Float32Array(N);
  for (let i = 0; i < N; i++) { size[i] = 0.6 + Math.pow(rnd(), 3) * 2.4; ease[i] = 0.55 + rnd() * 0.9; phase[i] = rnd() * TAU; }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(cur, 3));
  geo.setAttribute("color", new BufferAttribute(curCol, 3));
  geo.setAttribute("aSize", new BufferAttribute(size, 1));
  geo.setAttribute("aPhase", new BufferAttribute(phase, 1));
  const mat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uPR: { value: PR }, uTime: { value: 0 }, uOpacity: { value: 1 }, uScale: { value: small ? 0.85 : 1 } },
    vertexShader: `
      attribute float aSize; attribute float aPhase; attribute vec3 color;
      uniform float uPR; uniform float uTime; uniform float uScale;
      varying vec3 vColor; varying float vTw;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vTw = 0.65 + 0.35 * sin(uTime * 1.7 + aPhase);
        gl_PointSize = aSize * uPR * uScale * (64.0 / -mv.z);
        vColor = color;
      }`,
    fragmentShader: `
      uniform float uOpacity; varying vec3 vColor; varying float vTw;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        a = a * a * 1.35;
        gl_FragColor = vec4(vColor * vTw, a * uOpacity);
      }`
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  // faint far dust for depth
  {
    const M = weak ? 300 : 700, p = new Float32Array(M * 3), c = new Float32Array(M * 3), s = new Float32Array(M), ph = new Float32Array(M);
    for (let i = 0; i < M; i++) { p.set([(rnd() - 0.5) * 70, (rnd() - 0.5) * 44, -10 - rnd() * 40], i * 3); c.set([0.5, 0.6, 0.9], i * 3); s[i] = 0.8 + rnd() * 1.4; ph[i] = rnd() * TAU; }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(p, 3)); g.setAttribute("color", new BufferAttribute(c, 3));
    g.setAttribute("aSize", new BufferAttribute(s, 1)); g.setAttribute("aPhase", new BufferAttribute(ph, 1));
    const m = mat.clone(); m.uniforms = { uPR: { value: PR }, uTime: mat.uniforms.uTime, uOpacity: { value: 0.5 }, uScale: { value: 1 } };
    scene.add(new Points(g, m));
  }

  /* ---------- layout: where each shape sits on screen ---------- */
  let W = 1, H = 1, k = 0.01, visW = 1, visH = 1, unit = 1;
  const offs = []; // [x, y] per shape in world units
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    visH = 2 * D * Math.tan((40 * Math.PI) / 360); visW = visH * camera.aspect; k = visH / H;
    const wide = W > 920;
    unit = (wide ? visH * 0.66 : Math.min(visH * 0.5, visW * 0.85)) / 6.4; // shapes fill ~2/3 of the height on desktop
    offs.length = 0;
    shapes.forEach((s, i) => offs.push(i === 0 ? [0, 0] : wide ? [visW * (i % 2 ? 0.22 : 0.24), 0] : [0, visH * 0.04]));
    mat.uniforms.uOpacity.value = wide ? 1 : 0.6;
    measure();
  }

  /* ---------- scroll → which shapes to blend ---------- */
  let knots = [0];
  function measure() {
    knots = [0];
    gateEls.forEach((el) => knots.push(Math.max(knots[knots.length - 1] + 1, el.getBoundingClientRect().top + window.scrollY - H * 0.6)));
  }
  function stateFor(y) {
    if (y <= knots[0]) return [0, 1, 0];
    for (let i = 1; i < knots.length; i++) {
      if (y < knots[i]) {
        const t = (y - knots[i - 1]) / (knots[i] - knots[i - 1]);
        // hold each shape for most of its section, then morph in the last stretch
        const m = Math.max(0, Math.min(1, (t - 0.55) / 0.45));
        return [i - 1, i, m * m * (3 - 2 * m)];
      }
    }
    return [knots.length - 1, knots.length - 1, 0];
  }

  /* ---------- input ---------- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", (e) => { mouse.tx = (e.clientX / W) * 2 - 1; mouse.ty = (e.clientY / H) * 2 - 1; }, { passive: true });

  /* ---------- per-frame ---------- */
  let time = 0, spinA = 0, first = true;
  const tA = [0, 0, 0], tB = [0, 0, 0];
  function shapePoint(s, i, out) {
    if (s.wave) {
      // a wide, low wave of data across the bottom of the hero
      const u = waveBase[i * 2], v = waveBase[i * 2 + 1];
      const x = u * (visW * 0.62) / unit, z = -v * 9;
      const y = Math.sin(x * 0.55 + time * 0.8) * 0.55 + Math.cos(z * 0.7 + x * 0.25 + time * 0.6) * 0.4;
      out[0] = x; out[1] = y - (visH * 0.3) / unit; out[2] = z + 3.5;
      return;
    }
    out[0] = s.pos[i * 3]; out[1] = s.pos[i * 3 + 1]; out[2] = s.pos[i * 3 + 2];
  }
  function update(dt) {
    time += dt;
    mat.uniforms.uTime.value = time;
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 2);
    mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 2);
    const sy = window.scrollY || 0;
    const [a, b, m] = stateFor(sy);
    const A = shapes[a], B = shapes[b];
    spinA += dt * 0.12;
    const spin = (A.spin + (B.spin - A.spin) * m), ang = spinA * spin + sy * 0.0004 + mouse.x * 0.35;
    const ca = Math.cos(ang), sa = Math.sin(ang), tilt = -0.18 + mouse.y * 0.12, ct = Math.cos(tilt), st = Math.sin(tilt);
    const ox = (offs[a][0] + (offs[b][0] - offs[a][0]) * m), oy = (offs[a][1] + (offs[b][1] - offs[a][1]) * m);
    // the wave does not spin; blend rotation in as the first shape forms
    const rotOn = a === 0 ? m : 1;
    const f = first ? 1 : Math.min(1, dt * 1.6);
    for (let i = 0; i < N; i++) {
      shapePoint(A, i, tA); shapePoint(B, i, tB);
      let x = tA[0] + (tB[0] - tA[0]) * m, y = tA[1] + (tB[1] - tA[1]) * m, z = tA[2] + (tB[2] - tA[2]) * m;
      // rotate around Y then tilt around X
      const rx = x * ca + z * sa, rz = -x * sa + z * ca;
      const fx = x + (rx - x) * rotOn, fz0 = z + (rz - z) * rotOn;
      const fy = y * ct - fz0 * st * rotOn, fz = y * st * rotOn + fz0 * (ct * rotOn + (1 - rotOn));
      // gentle breathing so the shapes feel alive
      const br = 1 + Math.sin(time * 0.9 + phase[i]) * 0.012;
      const X = fx * unit * br + ox, Y = fy * unit * br + oy, Z = fz * unit;
      const e = Math.min(1, f * ease[i]);
      cur[i * 3] += (X - cur[i * 3]) * e; cur[i * 3 + 1] += (Y - cur[i * 3 + 1]) * e; cur[i * 3 + 2] += (Z - cur[i * 3 + 2]) * e;
      for (let c = 0; c < 3; c++) { const tc = A.col[i * 3 + c] + (B.col[i * 3 + c] - A.col[i * 3 + c]) * m; curCol[i * 3 + c] += (tc - curCol[i * 3 + c]) * Math.min(1, f * 1.5); }
    }
    first = false;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    camera.position.x = mouse.x * 0.6; camera.position.y = -mouse.y * 0.4;
    camera.lookAt(0, 0, 0);
  }

  /* ---------- loop ---------- */
  let raf = 0, frameNo = 0, shown = false, last = performance.now();
  function draw() {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(reduced ? 1 : dt);
    renderer.render(scene, camera);
    if (!shown) { shown = true; root.classList.add("has3d"); }
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    if (weak && (frameNo++ & 1)) return; // 30 fps on phones and low-power devices
    draw();
  }
  let pending = false;
  function request() { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; draw(); }); }

  window.addEventListener("resize", () => { resize(); if (reduced) request(); });
  if (reduced) window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("load", measure);
  if ("ResizeObserver" in window) new ResizeObserver(() => measure()).observe(document.body);
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); cancelAnimationFrame(raf); root.classList.remove("has3d"); });

  resize();
  if (reduced) draw(); else loop();

  /* ---------- helpers ---------- */
  function sphere(r) { const u = rnd() * 2 - 1, a = rnd() * TAU, s = Math.sqrt(1 - u * u); return [Math.cos(a) * s * r, u * r, Math.sin(a) * s * r]; }
  function jitter(r) { const v = sphere(1), l = rnd() * r; return [v[0] * l, v[1] * l, v[2] * l]; }
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
  function mulberry(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
}
