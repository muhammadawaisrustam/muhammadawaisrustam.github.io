/*
  Smooth, weighted scrolling (Lenis) for mouse and trackpad.
  Touch scrolling stays native. Skipped when the visitor prefers reduced motion.
  Build:  npx esbuild src/motion.src.js --bundle --format=esm --minify --outfile=motion.js
*/
import Lenis from "lenis";

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
  function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  // in-page links glide to their section
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"], a[href^="./#"]');
    if (!a) return;
    const id = a.getAttribute("href").replace(/^\.\//, "");
    const el = id.length > 1 && document.querySelector(id);
    if (!el && id !== "#top") return;
    e.preventDefault();
    lenis.scrollTo(id === "#top" ? 0 : el, { offset: -72, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    history.replaceState(null, "", id);
  });
  window.__lenis = lenis;
}
