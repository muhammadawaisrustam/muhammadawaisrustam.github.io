/* Rebuilds the pages from content.json, the same way the admin dashboard does when you press Publish.
   Run from the repo root:  node tools/build.js */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const R = require(path.join(root, "render.js"));
const c = JSON.parse(fs.readFileSync(path.join(root, "content.json"), "utf8"));
const out = { "index.html": R.renderSite(c), "designs.html": R.renderDesigns(c), "llms.txt": R.llms(c), "sitemap.xml": R.sitemap(c), "robots.txt": R.robots(c) };
for (const f in out) fs.writeFileSync(path.join(root, f), out[f]);
console.log("Built:", Object.keys(out).join(", "));
