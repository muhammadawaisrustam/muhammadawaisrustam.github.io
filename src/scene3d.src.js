/*
  "Digital runway": the 3D scene behind the portfolio (Three.js).

  The camera flies down a lit runway as the visitor scrolls. Every page
  section (any element with data-gate) has a gate on the runway, and the
  camera passes through it as that section reaches the middle of the screen.
  Sequenced centre lights run toward the horizon, like an approach path.

  All text stays in the HTML; this file only draws pictures behind it.
  Build:  npx esbuild src/scene3d.src.js --bundle --format=esm --minify --outfile=scene3d.js
*/
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, BufferGeometry, Float32BufferAttribute,
  Points, PointsMaterial, LineSegments, LineBasicMaterial, Sprite, SpriteMaterial, CanvasTexture,
  Color, AdditiveBlending, FogExp2, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Vector3
} from "three";

export function start(canvas) {
  const root = document.documentElement;
  const css = getComputedStyle(root);
  const BLUE = new Color((css.getPropertyValue("--cobalt") || "#4A86FF").trim());
  const GOLD = new Color((css.getPropertyValue("--signal") || "#F2C46D").trim());
  const NAVY = new Color((css.getPropertyValue("--navy") || "#060D22").trim());
  const IVORY = new Color("#F4EFE6");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = matchMedia("(max-width: 760px)").matches;
  const weak = small || (navigator.hardwareConcurrency || 8) <= 4;

  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: !weak, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, weak ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  scene.fog = new FogExp2(NAVY, 0.021);
  const camera = new PerspectiveCamera(small ? 62 : 50, 1, 0.1, 400);

  /* ---------- textures drawn in code ---------- */
  function glowTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.2, "rgba(255,255,255,.75)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }
  const GLOW = glowTexture();
  function gateLabel(num, text) {
    const s = 2, c = document.createElement("canvas"), g = c.getContext("2d");
    const serif = "italic " + 64 * s + 'px "Instrument Serif", Georgia, "Times New Roman", serif';
    const mono = "500 " + 15 * s + 'px "JetBrains Mono", ui-monospace, Menlo, monospace';
    g.font = serif; const tw = g.measureText(text).width;
    c.width = Math.ceil(tw + 40 * s); c.height = 120 * s;
    g.textAlign = "center";
    g.font = mono; g.fillStyle = "rgba(242,196,109,.95)"; g.fillText("GATE " + num, c.width / 2, 24 * s);
    g.font = serif; g.fillStyle = "#F4EFE6"; g.fillText(text, c.width / 2, 92 * s);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
    return { tex: t, aspect: c.width / c.height };
  }

  /* ---------- runway layout ---------- */
  const gateEls = [].slice.call(document.querySelectorAll("[data-gate]"));
  const SPACING = 16, START = 8, HALF = 3.2;
  const gateZ = gateEls.map((_, i) => -(i + 1) * SPACING);
  const END = (gateZ.length ? gateZ[gateZ.length - 1] : 0) - 90;

  // ground grid: long lines along the runway and cross lines, fading into fog
  {
    const v = [];
    for (let x = -60; x <= 60; x += 4) { if (Math.abs(x) < HALF + 1) continue; v.push(x, 0, START + 20, x, 0, END); }
    for (let z = START + 20; z > END; z -= 4) v.push(-60, 0, z, 60, 0, z);
    const g = new BufferGeometry(); g.setAttribute("position", new Float32BufferAttribute(v, 3));
    scene.add(new LineSegments(g, new LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.16, depthWrite: false })));
  }
  // runway surface and edge stripes
  {
    const len = START + 20 - END;
    const surf = new Mesh(new PlaneGeometry(HALF * 2, len), new MeshBasicMaterial({ color: 0x0a1430, transparent: true, opacity: 0.55, depthWrite: false }));
    surf.rotation.x = -Math.PI / 2; surf.position.set(0, -0.01, (START + 20 + END) / 2); scene.add(surf);
    [-HALF, HALF].forEach((x) => {
      const st = new Mesh(new PlaneGeometry(0.05, len), new MeshBasicMaterial({ color: IVORY, transparent: true, opacity: 0.35, depthWrite: false }));
      st.rotation.x = -Math.PI / 2; st.position.set(x, 0, (START + 20 + END) / 2); scene.add(st);
    });
  }
  // edge lights (steady) and centre lights (sequenced pulse running toward the horizon)
  const edge = [], centre = [];
  for (let z = START + 20; z > END; z -= 2) { edge.push(-HALF - 0.25, 0.06, z, HALF + 0.25, 0.06, z); }
  for (let z = START + 20; z > END; z -= 3) centre.push(0, 0.03, z);
  function lights(arr, color, size) {
    const g = new BufferGeometry(); g.setAttribute("position", new Float32BufferAttribute(arr, 3));
    const col = new Float32Array(arr.length); for (let i = 0; i < arr.length; i += 3) { col[i] = color.r; col[i + 1] = color.g; col[i + 2] = color.b; }
    g.setAttribute("color", new Float32BufferAttribute(col, 3));
    const p = new Points(g, new PointsMaterial({ size, map: GLOW, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending }));
    scene.add(p); return p;
  }
  const edgePts = lights(edge, GOLD, 0.42);
  const centrePts = lights(centre, IVORY, 0.32);

  // gates: two posts and a beam per section, with a serif label above
  const gates = gateEls.map((el, i) => {
    const grp = new Group(); grp.position.z = gateZ[i];
    const mat = new MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending });
    const W = HALF * 2 + 2.2, H = 5.2, T = 0.06;
    const left = new Mesh(new PlaneGeometry(T, H), mat); left.position.set(-W / 2, H / 2, 0);
    const right = left.clone(); right.position.x = W / 2;
    const beam = new Mesh(new PlaneGeometry(W + T, T), mat); beam.position.set(0, H, 0);
    const inner = new Mesh(new PlaneGeometry(W - 1.2, T * 0.6), mat); inner.position.set(0, H - 0.5, 0);
    grp.add(left, right, beam, inner);
    [-W / 2, W / 2].forEach((x) => {
      const cap = new Sprite(new SpriteMaterial({ map: GLOW, color: GOLD, transparent: true, depthWrite: false, blending: AdditiveBlending }));
      cap.position.set(x, H, 0); cap.scale.setScalar(0.9); grp.add(cap);
    });
    const lab = gateLabel(String(i + 1).padStart(2, "0"), el.getAttribute("data-gate") || "");
    const sp = new Sprite(new SpriteMaterial({ map: lab.tex, transparent: true, depthWrite: false }));
    const lh = 1.5; sp.scale.set(lh * lab.aspect, lh, 1); sp.position.set(0, H + 1.25, 0);
    grp.add(sp);
    scene.add(grp);
    return { grp, mat, sp, label: el.getAttribute("data-gate") || "", num: i + 1, lab };
  });

  // horizon glow and a sky of stars
  const sun = new Sprite(new SpriteMaterial({ map: GLOW, color: GOLD, transparent: true, opacity: 0.55, depthWrite: false, blending: AdditiveBlending, fog: false }));
  sun.scale.set(140, 46, 1); scene.add(sun);
  const sun2 = new Sprite(new SpriteMaterial({ map: GLOW, color: BLUE, transparent: true, opacity: 0.45, depthWrite: false, blending: AdditiveBlending, fog: false }));
  sun2.scale.set(260, 90, 1); scene.add(sun2);
  {
    const N = weak ? 500 : 1100, v = [];
    for (let i = 0; i < N; i++) v.push((Math.random() - 0.5) * 400, 6 + Math.random() * 90, END - 20 + (Math.random() - 0.3) * 260);
    const g = new BufferGeometry(); g.setAttribute("position", new Float32BufferAttribute(v, 3));
    scene.add(new Points(g, new PointsMaterial({ size: 0.9, map: GLOW, color: 0xcfdcff, transparent: true, opacity: 0.7, depthWrite: false, blending: AdditiveBlending, fog: false })));
  }
  // drifting dust near the camera for depth
  const dustN = weak ? 140 : 320, dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dustPos[i * 3] = (Math.random() - 0.5) * 30; dustPos[i * 3 + 1] = Math.random() * 9; dustPos[i * 3 + 2] = -Math.random() * 60; }
  const dustG = new BufferGeometry(); dustG.setAttribute("position", new Float32BufferAttribute(dustPos, 3));
  const dust = new Points(dustG, new PointsMaterial({ size: 0.07, map: GLOW, color: GOLD, transparent: true, opacity: 0.55, depthWrite: false, blending: AdditiveBlending }));
  scene.add(dust);

  /* ---------- scroll → camera position ---------- */
  let W = 1, H = 1, knotsY = [0], knotsZ = [START];
  function measure() {
    knotsY = [0]; knotsZ = [START];
    gateEls.forEach((el, i) => {
      const y = el.getBoundingClientRect().top + window.scrollY - H * 0.55;
      if (y > knotsY[knotsY.length - 1] + 1) { knotsY.push(y); knotsZ.push(gateZ[i] - 0.6); }
    });
    const maxY = Math.max(1, root.scrollHeight - H);
    if (maxY > knotsY[knotsY.length - 1]) { knotsY.push(maxY); knotsZ.push(knotsZ[knotsZ.length - 1] - SPACING * 0.75); }
  }
  function zFor(y) {
    if (y <= 0) return knotsZ[0];
    for (let i = 1; i < knotsY.length; i++) {
      if (y <= knotsY[i]) { const t = (y - knotsY[i - 1]) / (knotsY[i] - knotsY[i - 1]); const e = t * t * (3 - 2 * t); return knotsZ[i - 1] + (knotsZ[i] - knotsZ[i - 1]) * e; }
    }
    return knotsZ[knotsZ.length - 1];
  }
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.fov = W / H < 0.8 ? 64 : 50; camera.updateProjectionMatrix();
    measure();
  }

  /* ---------- input ---------- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", (e) => { mouse.tx = (e.clientX / W) * 2 - 1; mouse.ty = (e.clientY / H) * 2 - 1; }, { passive: true });

  /* ---------- per-frame ---------- */
  let camZ = zFor(window.scrollY || 0), time = 0;
  const look = new Vector3();
  const cc = centrePts.geometry.attributes.color.array;
  function update(dt) {
    time += dt;
    const target = zFor(window.scrollY || 0);
    camZ += (target - camZ) * (reduced ? 1 : Math.min(1, dt * 2.6)); // cinematic easing
    const speed = target - camZ;
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 2);
    mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 2);

    const sway = Math.sin(camZ * 0.045) * 0.9;
    camera.position.set(sway + mouse.x * 0.5, 1.7 - mouse.y * 0.25 + Math.sin(time * 0.6) * 0.03, camZ);
    look.set(sway * 0.4 + mouse.x * 1.2, 2.0 - mouse.y * 0.6, camZ - 20);
    camera.lookAt(look);
    camera.rotation.z += Math.max(-0.05, Math.min(0.05, speed * 0.004)) + Math.cos(camZ * 0.045) * 0.015;

    sun.position.set(0, 4, camZ - 150); sun2.position.set(0, 10, camZ - 170);

    // sequenced centre lights: a bright pulse runs away from the camera
    for (let i = 0, n = cc.length / 3; i < n; i++) {
      const z = centre[i * 3 + 2];
      const ph = ((camZ - z) * 0.08 - time * 1.6) % 1;
      const b = 0.25 + Math.pow(1 - Math.abs(((ph + 1) % 1) - 0.5) * 2, 10) * 1.6;
      cc[i * 3] = IVORY.r * b; cc[i * 3 + 1] = IVORY.g * b; cc[i * 3 + 2] = IVORY.b * b;
    }
    centrePts.geometry.attributes.color.needsUpdate = true;

    // gates light up gold as you approach, then fade once passed
    gates.forEach((g) => {
      const d = g.grp.position.z - camZ; // negative = ahead
      const near = Math.max(0, 1 - Math.abs(d + 6) / 22);
      g.mat.color.copy(BLUE).lerp(GOLD, near);
      g.mat.opacity = d > 1 ? Math.max(0, 0.6 - d * 0.2) : 0.35 + near * 0.6;
      g.sp.material.opacity = d > -2 ? Math.max(0, 1 - (d + 2) * 0.5) : Math.min(1, near * 1.25);
    });

    // dust drifts toward the camera and loops
    for (let i = 0; i < dustN; i++) {
      let z = dustPos[i * 3 + 2] + dt * (0.6 + Math.abs(speed) * 0.3);
      if (z > camZ + 2) z -= 60; if (z < camZ - 60) z += 60;
      dustPos[i * 3 + 2] = z;
    }
    dustG.attributes.position.needsUpdate = true;
  }

  /* ---------- loop ---------- */
  let raf = 0, frameNo = 0, shown = false, last = performance.now();
  function draw() {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(reduced ? 0.016 : dt);
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

  const fonts = document.fonts && document.fonts.load
    ? Promise.race([Promise.all([document.fonts.load('italic 64px "Instrument Serif"'), document.fonts.load('500 15px "JetBrains Mono"')]), new Promise((r) => setTimeout(r, 1500))])
    : Promise.resolve();
  fonts.then(() => {
    gates.forEach((g) => {
      g.lab.tex.dispose();
      g.lab = gateLabel(String(g.num).padStart(2, "0"), g.label);
      g.sp.material.map = g.lab.tex; g.sp.scale.set(1.5 * g.lab.aspect, 1.5, 1);
    });
    resize();
    camZ = zFor(window.scrollY || 0);
    if (reduced) draw(); else loop();
  });
}
