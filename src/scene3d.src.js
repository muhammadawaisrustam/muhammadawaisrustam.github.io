/*
  3D background for the portfolio (Three.js).

  - A star/data field that drifts with scroll and mouse.
  - Around the profile photo: orbit rings with one node per page section.
    Clicking a node scrolls to that section. Gold "lead" particles spiral in
    toward the photo (ad spend in, leads out).
  - Wireframe shapes floating beside the content at different depths.

  All text stays in the HTML. This file only draws pictures behind it.
  Build:  npx esbuild src/scene3d.src.js --bundle --format=esm --minify --outfile=scene3d.js
*/
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, BufferGeometry, Float32BufferAttribute,
  Points, PointsMaterial, LineLoop, LineBasicMaterial, Sprite, SpriteMaterial, CanvasTexture,
  Color, AdditiveBlending, FogExp2, Mesh, MeshBasicMaterial, IcosahedronGeometry,
  OctahedronGeometry, TorusKnotGeometry, TorusGeometry, DodecahedronGeometry, Vector3, SRGBColorSpace
} from "three";

export function start(canvas) {
  const root = document.documentElement;
  const css = getComputedStyle(root);
  const COBALT = new Color((css.getPropertyValue("--cobalt") || "#4A86FF").trim());
  const SIGNAL = new Color((css.getPropertyValue("--signal") || "#F2C46D").trim());
  const NAVY = new Color((css.getPropertyValue("--navy") || "#081633").trim());
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
  scene.fog = new FogExp2(NAVY, 0.022);
  const FOV = 40, D = 14;
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 200);
  camera.position.set(0, 0, D);

  let W = 1, H = 1, k = 0.01; // k = world units per CSS pixel on the z=0 plane
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    k = (2 * D * Math.tan((FOV * Math.PI) / 360)) / H;
    layoutCluster(); layoutShapes();
  }

  /* ---------- textures drawn in code (no image downloads) ---------- */
  function dotTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.25, "rgba(255,255,255,.7)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }
  const DOT = dotTexture();

  function labelTexture(text, hot) {
    const s = 2, fs = 12 * s, padX = 12 * s, h = 30 * s;
    const c = document.createElement("canvas"), g = c.getContext("2d");
    const font = "500 " + fs + 'px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
    g.font = font;
    const w = Math.ceil(g.measureText(text.toUpperCase()).width + padX * 2 + 14 * s);
    c.width = w; c.height = h;
    g.font = font; g.textBaseline = "middle";
    const r = h / 2;
    g.beginPath(); g.moveTo(r, 1); g.lineTo(w - r, 1); g.arc(w - r, r, r - 1, -Math.PI / 2, Math.PI / 2); g.lineTo(r, h - 1); g.arc(r, r, r - 1, Math.PI / 2, Math.PI * 1.5); g.closePath();
    g.fillStyle = hot ? "rgba(242,196,109,.16)" : "rgba(8,22,51,.82)"; g.fill();
    g.lineWidth = 2; g.strokeStyle = hot ? "rgba(242,196,109,.95)" : "rgba(74,134,255,.55)"; g.stroke();
    g.fillStyle = hot ? "#F2C46D" : "#4A86FF"; g.beginPath(); g.arc(padX + 3 * s, h / 2, 3 * s, 0, Math.PI * 2); g.fill();
    g.fillStyle = hot ? "#FFE3A8" : "#E9EFFB"; g.fillText(text.toUpperCase(), padX + 12 * s, h / 2 + 1);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
    return { tex: t, w: w / s, h: h / s };
  }

  /* ---------- star / data field ---------- */
  const field = new Group(); scene.add(field);
  {
    const N = weak ? 700 : 1600, pos = [], col = [];
    const c = new Color();
    for (let i = 0; i < N; i++) {
      const r = 16 + Math.random() * 46, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos.push(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph));
      const m = Math.random();
      c.copy(m < 0.12 ? SIGNAL : m < 0.7 ? COBALT : new Color(0xdfe8ff)).multiplyScalar(0.55 + Math.random() * 0.6);
      col.push(c.r, c.g, c.b);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new Float32BufferAttribute(col, 3));
    field.add(new Points(g, new PointsMaterial({ size: 0.32, map: DOT, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.9 })));
  }

  /* ---------- floating wireframe shapes beside the content ---------- */
  const shapes = [];
  {
    const geos = [new IcosahedronGeometry(1, 1), new OctahedronGeometry(1, 0), new TorusKnotGeometry(0.7, 0.22, 90, 10), new TorusGeometry(0.85, 0.28, 10, 36), new DodecahedronGeometry(1, 0)];
    const count = weak ? 6 : 10;
    for (let i = 0; i < count; i++) {
      const mat = new MeshBasicMaterial({ color: i % 3 === 2 ? SIGNAL : COBALT, wireframe: true, transparent: true, opacity: 0.22, depthWrite: false });
      const m = new Mesh(geos[i % geos.length], mat);
      m.userData = { side: i % 2 ? 1 : -1, slot: i, z: -2 - Math.random() * 6, s: 0.7 + Math.random() * 0.9, spin: (Math.random() - 0.5) * 0.4 };
      shapes.push(m); scene.add(m);
    }
  }
  function layoutShapes() {
    const halfW = (W / 2) * k;
    shapes.forEach((m) => {
      const u = m.userData, depth = (D - u.z) / D; // farther shapes cover more world units
      u.x = u.side * halfW * depth * (small ? 0.95 : 0.82 + (u.slot % 3) * 0.05);
      u.baseY = -(u.slot + 1) * H * 0.85 * k * depth;
      u.depth = depth;
      m.scale.setScalar(u.s * (small ? 0.7 : 1));
    });
  }

  /* ---------- orbit cluster around the profile photo ---------- */
  const anchor = document.getElementById("orbit");
  const avatar = anchor && anchor.querySelector(".avatar img");
  const hero = document.querySelector(".hero");
  let segs = [];
  try { segs = JSON.parse(canvas.getAttribute("data-segments") || "[]"); } catch (e) { segs = []; }
  const cluster = new Group(), tilt = new Group(); cluster.add(tilt);
  const rings = [], nodes = [], labels = [];
  let stream = null, halo = null, r0 = 1;
  // rx keeps each ring's front arc below the photo, so nodes in front are never hidden by it
  const RING = [
    { f: 1.42, rx: -0.72, rz: 0.3, speed: 0.11 },
    { f: 1.76, rx: -0.8, rz: -0.24, speed: -0.075 },
    { f: 2.1, rx: -0.66, rz: 0.08, speed: 0.055 }
  ];
  const RS = small ? 0.86 : 1;
  if (anchor && segs.length) {
    scene.add(cluster);
    halo = new Sprite(new SpriteMaterial({ map: DOT, color: COBALT, transparent: true, opacity: 0.55, depthWrite: false, blending: AdditiveBlending }));
    tilt.add(halo);
    RING.forEach((cfg, i) => {
      const g = new Group(); g.rotation.set(cfg.rx, 0, cfg.rz); tilt.add(g);
      const pts = []; for (let j = 0; j <= 128; j++) { const t = (j / 128) * Math.PI * 2; pts.push(Math.cos(t), Math.sin(t), 0); }
      const geo = new BufferGeometry(); geo.setAttribute("position", new Float32BufferAttribute(pts, 3));
      const line = new LineLoop(geo, new LineBasicMaterial({ color: i === 1 ? SIGNAL : COBALT, transparent: true, opacity: i === 1 ? 0.28 : 0.4, depthWrite: false }));
      g.add(line);
      rings.push({ g, line, cfg, nodes: [] });
    });
    segs.forEach((s, i) => {
      const ring = rings[i % rings.length];
      const dot = new Sprite(new SpriteMaterial({ map: DOT, color: i % 3 === 1 ? SIGNAL : 0xbfd3ff, transparent: true, depthWrite: false, blending: AdditiveBlending }));
      ring.g.add(dot);
      const n = { dot, ring, seg: s, angle: 0, hot: false, world: new Vector3(), screen: { x: 0, y: 0 }, visible: true };
      ring.nodes.push(n); nodes.push(n);
      const a = labelTexture(s.label, false), b = labelTexture(s.label, true);
      const sp = new Sprite(new SpriteMaterial({ map: a.tex, transparent: true, depthWrite: false, depthTest: false }));
      sp.renderOrder = 10; sp.userData = { a, b };
      scene.add(sp); labels.push(sp); n.label = sp;
    });
    rings.forEach((r, ri) => r.nodes.forEach((n, j) => { n.angle = (j / r.nodes.length) * Math.PI * 2 + ri * 0.9 + 0.4; }));

    // lead particles spiralling into the photo
    const M = weak ? 110 : 240, pos = new Float32Array(M * 3), col = new Float32Array(M * 3), st = [];
    for (let i = 0; i < M; i++) st.push({ t: Math.random(), th: Math.random() * Math.PI * 2, sp: 0.05 + Math.random() * 0.08, z: (Math.random() - 0.5) * 0.25 });
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new Float32BufferAttribute(col, 3));
    const pts = new Points(g, new PointsMaterial({ size: 0.14, map: DOT, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending }));
    const holder = new Group(); holder.rotation.set(-1.12, 0, 0.18); holder.add(pts); tilt.add(holder);
    stream = { pts, st, M };
  }
  function layoutCluster() {
    if (!avatar) return;
    const rect = avatar.getBoundingClientRect();
    r0 = Math.max(40, rect.width / 2) * k;
    rings.forEach((r) => r.g.scale.setScalar(r0 * r.cfg.f * RS));
    nodes.forEach((n) => { n.dot.scale.setScalar(0.11 / (r0 * n.ring.cfg.f * RS)); });
    if (halo) halo.scale.setScalar(r0 * 4.2);
    labels.forEach((sp) => { const a = sp.userData.a, f = small ? 0.82 : 1; sp.scale.set(a.w * k * f, a.h * k * f, 1); });
    if (stream) stream.pts.material.size = small ? 0.11 : 0.14;
  }

  /* ---------- input ---------- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, px: -1, py: -1 };
  let hovered = null;
  window.addEventListener("pointermove", (e) => {
    mouse.tx = (e.clientX / W) * 2 - 1; mouse.ty = (e.clientY / H) * 2 - 1;
    mouse.px = e.clientX; mouse.py = e.clientY;
    if (reduced) request();
  }, { passive: true });
  function hitTest(x, y) {
    let best = null;
    labels.forEach((sp, i) => {
      const n = nodes[i]; if (!n.visible || !cluster.visible) return;
      const a = sp.userData.a, sx = n.screen.x, sy = n.screen.y - 22;
      if (Math.abs(x - sx) < a.w / 2 + 6 && Math.abs(y - sy) < a.h / 2 + 8) best = n;
    });
    return best;
  }
  window.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest("a,button,input,textarea,select,summary,label,.avatar,.readout")) return;
    const n = hitTest(e.clientX, e.clientY);
    if (!n) return;
    const href = n.seg.href;
    if (href.charAt(0) === "#") {
      const el = document.querySelector(href);
      if (el) { el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }); history.replaceState(null, "", href); }
    } else location.href = href;
  });

  /* ---------- per-frame update ---------- */
  const tmp = new Vector3();
  let last = performance.now(), time = 0;
  function update(dt) {
    time += dt;
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 3);
    mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 3);
    const sy = window.scrollY || 0;

    field.rotation.y = time * 0.012 + mouse.x * 0.06;
    field.rotation.x = sy * 0.00022 + mouse.y * 0.04;
    field.children[0].material.opacity = Math.max(0.5, 0.95 - (sy / H) * 0.4);

    shapes.forEach((m) => {
      const u = m.userData;
      m.position.set(u.x - mouse.x * 0.3 * u.depth, u.baseY + sy * k * u.depth * 0.75 + Math.sin(time * 0.4 + u.slot) * 0.25, u.z);
      m.rotation.x = time * u.spin + u.slot; m.rotation.y = time * u.spin * 1.3 + sy * 0.0006;
    });

    if (!anchor || !segs.length) return;
    const ar = avatar.getBoundingClientRect();
    const hr = hero ? hero.getBoundingClientRect() : ar;
    cluster.visible = hr.bottom > 0 && ar.width > 0;
    if (!cluster.visible) { labels.forEach((l) => (l.visible = false)); return; }
    const cx = ar.left + ar.width / 2, cy = ar.top + ar.height / 2;
    cluster.position.set((cx - W / 2) * k, -(cy - H / 2) * k, 0);
    tilt.rotation.x = mouse.y * 0.12; tilt.rotation.y = mouse.x * 0.18;
    if (halo) halo.material.opacity = 0.42 + Math.sin(time * 1.4) * 0.08;

    // hovered node (pointer over its label) slows the orbit so it is easy to click
    const h = mouse.px >= 0 ? hitTest(mouse.px, mouse.py) : null;
    if (h !== hovered) {
      if (hovered) { hovered.label.material.map = hovered.label.userData.a.tex; hovered.hot = false; }
      hovered = h;
      if (h) { h.label.material.map = h.label.userData.b.tex; h.hot = true; }
      if (hero) hero.style.cursor = h ? "pointer" : "";
    }
    const slow = hovered ? 0.15 : 1;
    const avR = ar.width / 2;
    rings.forEach((r) => r.nodes.forEach((n) => {
      n.angle += r.cfg.speed * dt * slow;
      n.dot.position.set(Math.cos(n.angle), Math.sin(n.angle), 0);
      n.dot.getWorldPosition(n.world);
      tmp.copy(n.world).project(camera);
      n.screen.x = (tmp.x + 1) / 2 * W; n.screen.y = (1 - tmp.y) / 2 * H;
      // hidden while passing behind the photo
      const dx = n.screen.x - cx, dy = n.screen.y - cy;
      n.visible = !(n.world.z < 0 && dx * dx + dy * dy < avR * avR * 1.1);
      n.label.visible = n.visible;
      const s = n.hot ? 1.12 : 1, a = n.label.userData.a, f = small ? 0.82 : 1;
      // keep labels on screen on narrow phones
      const half = (a.w * f) / 2 + 6;
      n.screen.x = Math.max(half, Math.min(W - half, n.screen.x));
      n.label.position.set((n.screen.x - W / 2) * k, n.world.y + 22 * k, 0.5);
      n.label.scale.set(a.w * k * f * s, a.h * k * f * s, 1);
      n.label.material.opacity = n.world.z < 0 ? 0.55 : 1;
    }));

    if (stream) {
      const p = stream.pts.geometry.attributes.position.array, c = stream.pts.geometry.attributes.color.array;
      stream.st.forEach((q, i) => {
        q.t += q.sp * dt; if (q.t > 1) { q.t = 0; q.th = Math.random() * Math.PI * 2; }
        const r = (2.3 - q.t * 1.45) * r0, th = q.th + q.t * 2.6;
        p[i * 3] = Math.cos(th) * r; p[i * 3 + 1] = Math.sin(th) * r; p[i * 3 + 2] = q.z * r0;
        const b = Math.sin(q.t * Math.PI) * 0.95;
        c[i * 3] = SIGNAL.r * b; c[i * 3 + 1] = SIGNAL.g * b; c[i * 3 + 2] = SIGNAL.b * b;
      });
      stream.pts.geometry.attributes.position.needsUpdate = true;
      stream.pts.geometry.attributes.color.needsUpdate = true;
    }
  }

  /* ---------- loop ---------- */
  let raf = 0, frameNo = 0, shown = false;
  function draw() {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(reduced ? 0 : dt);
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
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); cancelAnimationFrame(raf); root.classList.remove("has3d"); });

  const fontsReady = document.fonts && document.fonts.load ? Promise.race([document.fonts.load('500 12px "JetBrains Mono"'), new Promise((r) => setTimeout(r, 1200))]) : Promise.resolve();
  fontsReady.then(() => {
    // redraw labels once the font is in
    labels.forEach((sp, i) => {
      const s = segs[i].label;
      sp.userData.a.tex.dispose(); sp.userData.b.tex.dispose();
      sp.userData.a = labelTexture(s, false); sp.userData.b = labelTexture(s, true);
      sp.material.map = sp.userData.a.tex;
    });
    resize();
    if (reduced) draw(); else loop();
  });
}
