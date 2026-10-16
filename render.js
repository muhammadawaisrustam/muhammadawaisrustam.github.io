/* Renders the complete website from content.json.
   Used by the dashboard (in the browser) and by the build script (Node).
   renderSite(content, {css, fragment, preview}) -> HTML string */
(function (root) {
  "use strict";

  function e(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function a(arr) { return Array.isArray(arr) ? arr : []; }
  function abs(url, base) {
    if (!url) return "";
    if (/^(https?:|data:|mailto:|tel:|#)/.test(url)) return url;
    return (base || "").replace(/\/?$/, "/") + url.replace(/^\.?\//, "");
  }
  function ext(href) { return /^https?:/.test(href || "") ? ' target="_blank" rel="noopener"' : ""; }
  function hexOk(v, d) { return /^#[0-9a-fA-F]{6}$/.test(v || "") ? v : d; }

  var FONTS =
    '<link rel="preconnect" href="https://fonts.googleapis.com">' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,500..900' +
    '&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap">';

  function schema(c) {
    var p = c.profile || {}, s = c.site || {}, url = s.url || "";
    var sameAs = [p.linkedin, p.instagram, p.behance].filter(Boolean);
    var person = {
      "@type": "Person",
      "@id": url + "#person",
      name: p.name,
      alternateName: (p.alternateNames || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean),
      jobTitle: p.jobTitle,
      description: s.description,
      url: url,
      image: abs(p.photo, url),
      email: p.email ? "mailto:" + p.email : undefined,
      telephone: p.phone ? p.phone.replace(/\s/g, "") : undefined,
      address: { "@type": "PostalAddress", addressLocality: p.city, addressCountry: p.countryCode },
      nationality: p.nationality ? { "@type": "Country", name: p.nationality } : undefined,
      worksFor: p.employer ? { "@type": "Organization", name: p.employer, url: p.employerUrl || undefined } : undefined,
      alumniOf: p.university ? { "@type": "CollegeOrUniversity", name: p.university } : undefined,
      knowsAbout: a(c.services && c.services.items).map(function (x) { return x.title; })
        .concat(a(c.design && c.design.services)),
      hasCredential: a(c.credentials && c.credentials.certifications).map(function (x) {
        return { "@type": "EducationalOccupationalCredential", name: x.title, recognizedBy: x.meta ? { "@type": "Organization", name: String(x.meta).split("·")[0].trim() } : undefined, url: x.url || undefined };
      }),
      sameAs: sameAs
    };
    var graph = {
      "@context": "https://schema.org",
      "@graph": [
        person,
        { "@type": "WebSite", "@id": url + "#website", url: url, name: p.name, inLanguage: "en", publisher: { "@id": url + "#person" } },
        { "@type": "ProfilePage", "@id": url + "#profile", url: url, name: s.title, isPartOf: { "@id": url + "#website" }, mainEntity: { "@id": url + "#person" }, dateModified: new Date().toISOString().slice(0, 10) }
      ]
    };
    return JSON.stringify(graph).replace(/</g, "\\u003c");
  }

  function head(c, o) {
    var s = c.site || {}, p = c.profile || {}, url = s.url || "";
    var og = abs(s.ogImage || p.photo, url);
    return (
      "<title>" + e(s.title) + "</title>" +
      (o.fragment ? '<meta name="claude:viewport-fit-sides" content="cover">' : "") +
      '<meta name="description" content="' + e(s.description) + '">' +
      (s.keywords ? '<meta name="keywords" content="' + e(s.keywords) + '">' : "") +
      '<meta name="author" content="' + e(p.name) + '">' +
      '<meta name="robots" content="' + (o.preview ? "noindex" : "index, follow, max-image-preview:large") + '">' +
      (s.googleVerification ? '<meta name="google-site-verification" content="' + e(s.googleVerification) + '">' : "") +
      (url && !o.preview ? '<link rel="canonical" href="' + e(url) + '">' : "") +
      '<meta name="theme-color" content="' + e(hexOk(c.theme && c.theme.bg, "#081633")) + '">' +
      '<meta property="og:type" content="profile">' +
      '<meta property="og:site_name" content="' + e(p.name) + '">' +
      '<meta property="og:title" content="' + e(p.name + " | " + (c.hero ? (c.hero.roleLine1 + " " + c.hero.roleLine2) : "")) + '">' +
      '<meta property="og:description" content="' + e(s.description) + '">' +
      '<meta property="og:url" content="' + e(url) + '">' +
      '<meta property="og:image" content="' + e(og) + '">' +
      '<meta property="og:image:alt" content="' + e(p.photoAlt || p.name) + '">' +
      '<meta name="twitter:card" content="summary_large_image">' +
      '<meta name="twitter:title" content="' + e(s.title) + '">' +
      '<meta name="twitter:description" content="' + e(s.description) + '">' +
      '<meta name="twitter:image" content="' + e(og) + '">' +
      '<link rel="icon" href="favicon.svg" type="image/svg+xml">' +
      '<link rel="apple-touch-icon" href="' + e(s.ogImage || p.photo) + '">' +
      (p.photo ? '<link rel="preload" as="image" href="' + e(p.photo) + '">' : "") +
      FONTS +
      (o.css ? "<style>" + o.css + "</style>" : '<link rel="stylesheet" href="site.css">') +
      "<style>:root{--navy:" + hexOk(c.theme && c.theme.bg, "#081633") + ";--navy-2:" + hexOk(c.theme && c.theme.bg2, "#0D1F45") +
      ";--cobalt:" + hexOk(c.theme && c.theme.accent, "#4A86FF") + ";--signal:" + hexOk(c.theme && c.theme.highlight, "#F2C46D") + "}</style>" +
      '<script type="application/ld+json">' + schema(c) + "</script>"
    );
  }

  /* ---------------- sections ---------------- */
  function eyebrow(t) { return t ? '<span class="eyebrow">' + e(t) + "</span>" : ""; }

  function hero(c) {
    var h = c.hero || {}, p = c.profile || {};
    var rows = a(h.readout).map(function (r) {
      return "<tr><td><span class=\"dot" + (r.live ? "" : " off") + "\"></span>" + e(r.account) + "<small>" + e(r.detail) +
        "</small></td><td class=\"hide-sm\">" + e(r.channel) + "</td><td class=\"n\">" + e(r.result) + "</td></tr>";
    }).join("");
    return '<section class="hero" aria-labelledby="hero-title"><div class="wrap hero-grid"><div class="hero-copy">' +
      (h.status ? '<span class="status reveal"><i></i>' + e(h.status) + "</span>" : "") +
      '<h1 id="hero-title" class="reveal d2"><span class="name">' + e(p.name) + '</span><span class="role">' + e(h.roleLine1) + " <em>" + e(h.roleLine2) + "</em></span></h1>" +
      '<p class="lede reveal d3">' + e(h.lede) + "</p>" +
      '<div class="cta-row reveal d3">' +
      (h.cta1Label ? '<a class="btn primary" href="' + e(h.cta1Link) + '"' + ext(h.cta1Link) + ">" + e(h.cta1Label) + "</a>" : "") +
      (h.cta2Label ? '<a class="btn ghost" href="' + e(h.cta2Link) + '"' + ext(h.cta2Link) + ">" + e(h.cta2Label) + "</a>" : "") +
      "</div>" +
      (rows ? '<div class="readout reveal d4" role="group" aria-label="Campaign highlights"><header><span>' + e(h.readoutTitle) +
        '</span><span class="mono">' + e(h.readoutPeriod) + '</span></header><table><thead><tr><th>Account</th><th class="hide-sm">Channel</th><th class="n">Result</th></tr></thead><tbody>' +
        rows + "</tbody></table></div>" : "") +
      "</div>" +
      (p.photo ? '<figure class="portrait reveal d2"><img src="' + e(p.photo) + '" width="1086" height="1448" alt="' + e(p.photoAlt || p.name) +
        '" fetchpriority="high"><figcaption><span>' + e(h.photoCaptionLeft) + "</span><span>" + e(h.photoCaptionRight) + "</span></figcaption></figure>" : "") +
      "</div></section>";
  }

  function stats(c) {
    var s = a(c.stats);
    if (!s.length) return "";
    return '<div class="wrap"><div class="stats" aria-label="Key numbers">' + s.map(function (x) {
      return '<div class="stat"><b>' + e(x.value) + "</b><span>" + e(x.label) + "</span></div>";
    }).join("") + "</div></div>";
  }

  var S = {};
  S.about = function (c, cls) {
    var x = c.about || {};
    return '<section class="band' + cls + '" id="about" aria-labelledby="about-title"><div class="wrap about"><div class="prose">' + eyebrow(x.eyebrow) +
      '<h2 id="about-title">' + e(x.heading) + "</h2>" + a(x.paragraphs).map(function (t) { return "<p>" + e(t) + "</p>"; }).join("") +
      '</div><ul class="facts">' + a(x.facts).map(function (f) { return "<li><span>" + e(f.label) + "</span>" + e(f.value) + "</li>"; }).join("") +
      "</ul></div></section>";
  };
  S.results = function (c, cls) {
    var x = c.results || {};
    return '<section class="band' + cls + '" id="results" aria-labelledby="results-title"><div class="wrap"><div class="sec-head">' + eyebrow(x.eyebrow) +
      '<h2 id="results-title">' + e(x.heading) + "</h2>" + (x.intro ? "<p>" + e(x.intro) + "</p>" : "") + '</div><div class="cases">' +
      a(x.items).map(function (k) {
        var pa = Math.max(0, Math.min(100, Number(k.splitPctA) || 0));
        var split = pa > 0 && pa < 100 ? '<div class="split" aria-label="Budget split"><div class="bar"><span class="meta" style="width:' + pa + '%">' + e(k.splitLabelA) +
          '</span><span class="goog" style="width:' + (100 - pa) + '%">' + e(k.splitLabelB) + "</span></div>" + (k.splitNote ? "<p>" + e(k.splitNote) + "</p>" : "") + "</div>" : "";
        return '<article class="case"><aside><span class="client">' + e(k.client) + '</span><span class="big">' + e(k.big) + '</span><span class="big-label">' + e(k.bigLabel) +
          '</span></aside><div class="body"><h3>' + e(k.title) + "</h3>" + a(k.paragraphs).map(function (t) { return "<p>" + e(t) + "</p>"; }).join("") + split +
          (a(k.metrics).length ? "<dl>" + a(k.metrics).map(function (m) { return "<div><dt>" + e(m.label) + "</dt><dd>" + e(m.value) + "</dd></div>"; }).join("") + "</dl>" : "") +
          (a(k.tags).length ? '<ul class="tags">' + a(k.tags).map(function (t) { return "<li>" + e(t) + "</li>"; }).join("") + "</ul>" : "") +
          "</div></article>";
      }).join("") + "</div></div></section>";
  };
  S.experience = function (c, cls) {
    var x = c.experience || {};
    return '<section class="band' + cls + '" id="experience" aria-labelledby="exp-title"><div class="wrap"><div class="sec-head">' + eyebrow(x.eyebrow) +
      '<h2 id="exp-title">' + e(x.heading) + '</h2></div><ol class="timeline">' + a(x.items).map(function (j) {
        return '<li class="job"><time' + (j.start ? ' datetime="' + e(j.start) + '"' : "") + ">" + e(j.dates) + (j.current ? "<b>Current</b>" : "") + "</time><div><h3>" +
          e(j.title) + '</h3><span class="org">' + e(j.org) + "</span>" +
          (a(j.bullets).length ? "<ul>" + a(j.bullets).map(function (b) { return "<li>" + e(b) + "</li>"; }).join("") + "</ul>" : "") + "</div></li>";
      }).join("") + "</ol></div></section>";
  };
  S.services = function (c, cls) {
    var x = c.services || {};
    return '<section class="band' + cls + '" id="services" aria-labelledby="svc-title"><div class="wrap"><div class="sec-head">' + eyebrow(x.eyebrow) +
      '<h2 id="svc-title">' + e(x.heading) + "</h2>" + (x.intro ? "<p>" + e(x.intro) + "</p>" : "") + '</div><div class="svc-grid">' +
      a(x.items).map(function (s) { return '<div class="svc"><span class="k">' + e(s.tag) + "</span><h3>" + e(s.title) + "</h3><p>" + e(s.text) + "</p></div>"; }).join("") +
      "</div>" + (a(x.process).length ? '<ol class="process">' + a(x.process).map(function (s) { return "<li><h3>" + e(s.title) + "</h3><p>" + e(s.text) + "</p></li>"; }).join("") + "</ol>" : "") +
      "</div></section>";
  };
  S.design = function (c, cls) {
    var x = c.design || {}, p = c.profile || {}, items = a(x.items), cats = a(x.categories);
    var used = cats.filter(function (k) { return items.some(function (i) { return i.category === k.id; }); });
    var filters = used.length > 1 ? '<div class="filters" role="group" aria-label="Filter designs"><button type="button" id="flt-all" data-f="all" aria-pressed="true">All work<span>' + items.length + "</span></button>" +
      used.map(function (k) {
        return '<button type="button" id="flt-' + e(k.id) + '" data-f="' + e(k.id) + '" aria-pressed="false">' + e(k.label) + "<span>" +
          items.filter(function (i) { return i.category === k.id; }).length + "</span></button>";
      }).join("") + "</div>" : "";
    return '<section class="band' + cls + '" id="design" aria-labelledby="design-title"><div class="wrap"><div class="design-head"><div class="sec-head">' + eyebrow(x.eyebrow) +
      '<h2 id="design-title">' + e(x.heading) + "</h2>" + (x.intro ? "<p>" + e(x.intro) + "</p>" : "") + "</div>" +
      (a(x.services).length ? '<ul class="dsvc" aria-label="Design services">' + a(x.services).map(function (t) { return "<li>" + e(t) + "</li>"; }).join("") + "</ul>" : "") +
      "</div>" + filters + '<div class="gallery" id="gallery">' + items.map(function (d, i) {
        var alt = d.title + (d.client ? " for " + d.client : "") + ", designed by " + (p.name || "");
        return '<figure class="tile" data-cat="' + e(d.category) + '" data-i="' + i + '"><button type="button" class="tile-btn" aria-label="Open ' + e(d.title) + '">' +
          '<img loading="lazy" decoding="async" src="' + e(d.image) + '" width="800" height="1000" alt="' + e(alt) + '"></button><figcaption>' + e(d.title) +
          (d.client ? "<small>" + e(d.client) + "</small>" : "") + "</figcaption></figure>";
      }).join("") + "</div>" +
      (x.noteText ? '<p class="ig-note">' + e(x.noteText) + (x.noteLink ? ' <a href="' + e(x.noteLink) + '"' + ext(x.noteLink) + ">" + e(x.noteLinkLabel || x.noteLink) + "</a>" : "") + "</p>" : "") +
      "</div></section>";
  };
  S.brands = function (c, cls) {
    var x = c.brands || {};
    return '<section class="band' + cls + '" id="brands" aria-labelledby="brands-title"><div class="wrap"><div class="sec-head">' + eyebrow(x.eyebrow) +
      '<h2 id="brands-title">' + e(x.heading) + '</h2></div><ul class="brands">' + a(x.items).map(function (b) { return "<li>" + e(b) + "</li>"; }).join("") + "</ul>" +
      (a(x.toolkit).length ? '<div class="kit">' + a(x.toolkit).map(function (k) {
        return "<div><h3>" + e(k.title) + '</h3><ul class="tags">' + a(k.items).map(function (t) { return "<li>" + e(t) + "</li>"; }).join("") + "</ul></div>";
      }).join("") + "</div>" : "") + "</div></section>";
  };
  S.credentials = function (c, cls) {
    var x = c.credentials || {}, p = c.profile || {};
    var certs = a(x.certifications);
    return '<section class="band' + cls + '" id="credentials" aria-labelledby="cred-title"><div class="wrap"><div class="sec-head">' + eyebrow(x.eyebrow) +
      '<h2 id="cred-title">' + e(x.heading) + '</h2></div><div class="creds"><div class="cred"><h3>Education</h3><ul>' +
      a(x.education).map(function (d) { return "<li><strong>" + e(d.title) + "</strong><small>" + e(d.meta) + "</small></li>"; }).join("") +
      '</ul></div><div class="cred" id="certs"><h3>Certifications</h3><ul>' +
      (certs.length ? certs.map(function (d) {
        return "<li><strong>" + (d.url ? '<a href="' + e(d.url) + '" target="_blank" rel="noopener">' + e(d.title) + "</a>" : e(d.title)) + "</strong><small>" + e(d.meta) + "</small></li>";
      }).join("") : "<li><small>" + e(x.certificationsEmpty) + "</small></li>") + "</ul>" +
      (p.linkedin && x.linkedinButton ? '<a class="chip" href="' + e(p.linkedin) + '" target="_blank" rel="noopener" style="justify-self:start">' + e(x.linkedinButton) + " ↗</a>" : "") +
      "</div></div></div></section>";
  };
  S.contact = function (c, cls) {
    var x = c.contact || {}, p = c.profile || {};
    var ch = [];
    if (p.email) ch.push('<div class="channel"><span>Email</span><div class="val" id="email">' + e(p.email) + '</div><div class="row"><a class="chip" href="mailto:' + e(p.email) +
      '">Write an email</a><button class="chip" data-copy="email" type="button">Copy</button></div></div>');
    if (p.phone) ch.push('<div class="channel"><span>WhatsApp · Phone</span><div class="val" id="phone">' + e(p.phone) + '</div><div class="row">' +
      (p.whatsapp ? '<a class="chip" href="https://wa.me/' + e(String(p.whatsapp).replace(/\D/g, "")) + '" target="_blank" rel="noopener">Chat on WhatsApp</a>' : "") +
      '<button class="chip" data-copy="phone" type="button">Copy</button></div></div>');
    if (p.linkedin) ch.push('<div class="channel"><span>LinkedIn</span><div class="val">' + e(p.name) + '</div><div class="row"><a class="chip" href="' + e(p.linkedin) +
      '" target="_blank" rel="noopener">Connect on LinkedIn ↗</a></div></div>');
    if (p.instagram) ch.push('<div class="channel"><span>Instagram</span><div class="val">' + e(p.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, "")) +
      '</div><div class="row"><a class="chip" href="' + e(p.instagram) + '" target="_blank" rel="noopener">Follow ↗</a></div></div>');
    if (p.behance) ch.push('<div class="channel"><span>Behance</span><div class="val">Design portfolio</div><div class="row"><a class="chip" href="' + e(p.behance) +
      '" target="_blank" rel="noopener">View on Behance ↗</a></div></div>');
    return '<section class="band' + cls + '" id="contact" aria-labelledby="contact-title"><div class="wrap contact">' + eyebrow(x.eyebrow) +
      '<h2 id="contact-title">' + e(x.heading) + (x.headingAccent ? " <em>" + e(x.headingAccent) + "</em>" : "") + '</h2><div class="channels">' + ch.join("") + "</div></div></section>";
  };

  var SCRIPT = "(function(){" +
    "var tiles=[].slice.call(document.querySelectorAll('.tile')),f=document.querySelector('.filters'),shown=tiles,cur=0;" +
    "if(f)f.addEventListener('click',function(ev){var b=ev.target.closest('button');if(!b)return;[].forEach.call(f.children,function(x){x.setAttribute('aria-pressed','false')});b.setAttribute('aria-pressed','true');var k=b.dataset.f;tiles.forEach(function(t){t.hidden=!(k==='all'||t.dataset.cat===k)});shown=tiles.filter(function(t){return!t.hidden})});" +
    "var lb=document.getElementById('lb'),li=document.getElementById('lbImg'),lc=document.getElementById('lbCap');" +
    "function show(){var t=shown[cur],im=t.querySelector('img');li.src=im.getAttribute('src');li.alt=im.alt;lc.textContent=t.querySelector('figcaption').textContent}" +
    "tiles.forEach(function(t){t.querySelector('button').addEventListener('click',function(){cur=shown.indexOf(t);show();lb.hidden=false;document.getElementById('lbClose').focus()})});" +
    "function close(){lb.hidden=true}function step(n){cur=(cur+n+shown.length)%shown.length;show()}" +
    "if(lb){document.getElementById('lbClose').onclick=close;document.getElementById('lbPrev').onclick=function(){step(-1)};document.getElementById('lbNext').onclick=function(){step(1)};" +
    "lb.addEventListener('click',function(ev){if(ev.target===lb)close()});document.addEventListener('keydown',function(ev){if(lb.hidden)return;if(ev.key==='Escape')close();if(ev.key==='ArrowRight')step(1);if(ev.key==='ArrowLeft')step(-1)})}" +
    "document.querySelectorAll('[data-copy]').forEach(function(btn){btn.addEventListener('click',function(){var el=document.getElementById(btn.dataset.copy),t=el.textContent.trim();" +
    "function sel(){var r=document.createRange();r.selectNodeContents(el);var s=getSelection();s.removeAllRanges();s.addRange(r)}" +
    "try{navigator.clipboard.writeText(t).then(function(){btn.textContent='Copied'},sel)}catch(x){sel()}setTimeout(function(){btn.textContent='Copy'},1800)})});" +
    "var nav=document.querySelector('.nav'),mb=document.getElementById('menuBtn');if(mb){mb.addEventListener('click',function(){var o=nav.classList.toggle('open');mb.setAttribute('aria-expanded',o)});" +
    "document.querySelectorAll('#menu a').forEach(function(x){x.addEventListener('click',function(){nav.classList.remove('open');mb.setAttribute('aria-expanded','false')})})}" +
    "var y=document.getElementById('yr');if(y)y.textContent=new Date().getFullYear();" +
    "if('IntersectionObserver' in window){var links={};document.querySelectorAll('#menu a').forEach(function(x){links[x.getAttribute('href').slice(1)]=x});" +
    "var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting&&links[en.target.id]){Object.keys(links).forEach(function(k){links[k].classList.remove('on')});links[en.target.id].classList.add('on')}})},{rootMargin:'-45% 0px -50% 0px'});" +
    "Object.keys(links).forEach(function(id){var s=document.getElementById(id);if(s)io.observe(s)})}" +
    "})();";

  function body(c) {
    var p = c.profile || {}, h = c.hero || {};
    var secs = a(c.sections).filter(function (s) { return s.visible !== false && S[s.id]; });
    var nav = secs.filter(function (s) { return s.nav; }).map(function (s) { return '<li><a href="#' + e(s.id) + '">' + e(s.nav) + "</a></li>"; }).join("");
    var hasContact = secs.some(function (s) { return s.id === "contact"; });
    var main = secs.map(function (s, i) { return S[s.id](c, i % 2 === 1 ? " raised" : ""); }).join("");
    return '<header class="nav" id="top"><div class="wrap"><a class="brand" href="#top" aria-label="' + e(p.name) + ', home"><span class="mark">' + e(p.monogram) + "</span>" + e(p.shortName || p.name) + "</a>" +
      '<nav aria-label="Main"><ul id="menu">' + nav + "</ul></nav>" +
      (hasContact && h.navButton ? '<a class="btn primary" href="#contact">' + e(h.navButton) + "</a>" : "") +
      '<button class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="menu" type="button">MENU</button></div></header>' +
      "<main>" + hero(c) + stats(c) + main + "</main>" +
      '<footer><div class="wrap"><span>© <span id="yr">' + new Date().getFullYear() + "</span> " + e(p.name) + (c.footer && c.footer.left ? " · " + e(c.footer.left) : "") + "</span><span>" +
      e(c.footer && c.footer.right) + "</span></div></footer>" +
      '<div class="lightbox" id="lb" hidden role="dialog" aria-modal="true" aria-label="Design preview"><button class="lb-btn lb-close" id="lbClose" type="button" aria-label="Close">✕</button>' +
      '<button class="lb-btn lb-prev" id="lbPrev" type="button" aria-label="Previous design">←</button><img id="lbImg" alt=""><p id="lbCap"></p>' +
      '<button class="lb-btn lb-next" id="lbNext" type="button" aria-label="Next design">→</button></div>' +
      "<script>" + SCRIPT + "</script>";
  }

  function renderSite(c, o) {
    o = o || {};
    if (o.fragment) return head(c, o) + body(c);
    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
      (o.base ? '<base href="' + e(o.base) + '">' : "") + head(c, o) +
      "<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}</style>\n</head>\n<body>\n" +
      body(c) + "\n</body>\n</html>\n";
  }

  function sitemap(c) {
    var url = (c.site && c.site.url) || "";
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n  <url>\n    <loc>' +
      e(url) + "</loc>\n    <lastmod>" + new Date().toISOString().slice(0, 10) + "</lastmod>\n" +
      [c.profile && c.profile.photo].concat(a(c.design && c.design.items).map(function (d) { return d.image; })).filter(function (x) { return x && !/^data:/.test(x); })
        .map(function (img) { return "    <image:image><image:loc>" + e(abs(img, url)) + "</image:loc></image:image>\n"; }).join("") +
      "  </url>\n</urlset>\n";
  }
  function robots(c) {
    var url = (c.site && c.site.url) || "";
    return "User-agent: *\nAllow: /\nDisallow: /admin.html\n\nSitemap: " + url.replace(/\/?$/, "/") + "sitemap.xml\n";
  }

  var api = { renderSite: renderSite, sitemap: sitemap, robots: robots, escape: e };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SiteRenderer = api;
})(this);
