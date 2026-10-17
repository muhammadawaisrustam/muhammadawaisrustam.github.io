/* Renders the website pages from content.json.
   Used by the dashboard (browser) and by build scripts (Node).
   renderSite(c, o)    -> index.html (digital marketing homepage)
   renderDesigns(c, o) -> designs.html (graphic design portfolio)
   o: {css, fragment, preview}                                         */
(function (root) {
  "use strict";

  function e(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function a(x) { return Array.isArray(x) ? x : []; }
  function abs(url, base) {
    if (!url) return "";
    if (/^(https?:|data:|mailto:|tel:|#)/.test(url)) return url;
    return (base || "").replace(/\/?$/, "/") + url.replace(/^\.?\//, "");
  }
  function isExt(h) { return /^https?:/.test(h || ""); }
  function ext(h) { return isExt(h) ? ' target="_blank" rel="noopener"' : ""; }
  function hexOk(v, d) { return /^#[0-9a-fA-F]{6}$/.test(v || "") ? v : d; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function homeLink(href, onDesigns) {
    if (!href) return "#";
    if (onDesigns && href.charAt(0) === "#") return "./" + href;
    if (!onDesigns && href === "./") return "#top";
    return href;
  }

  var FONTS =
    '<link rel="preconnect" href="https://fonts.googleapis.com">' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,500..900' +
    '&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap">';

  /* ---------------- structured data ---------------- */
  function person(c) {
    var p = c.profile || {}, s = c.site || {}, url = s.url || "";
    var services = a(c.skills && c.skills.items);
    return {
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
      hasOccupation: { "@type": "Occupation", name: p.jobTitle, occupationLocation: { "@type": "City", name: p.city },
        skills: services.map(function (x) { return x.title; }).join(", ") },
      knowsAbout: services.map(function (x) { return x.title; })
        .concat(a(c.skills && c.skills.toolkit).reduce(function (m, k) { return m.concat(a(k.items)); }, [])),
      makesOffer: services.map(function (x) { return { "@type": "Offer", itemOffered: { "@type": "Service", name: x.title, description: x.text } }; }),
      hasCredential: a(c.credentials && c.credentials.certifications).map(function (x) {
        return { "@type": "EducationalOccupationalCredential", name: x.title, url: x.url || undefined,
          recognizedBy: x.meta ? { "@type": "Organization", name: String(x.meta).split("·")[0].trim() } : undefined };
      }),
      sameAs: [p.linkedin, p.instagram, p.behance].filter(Boolean)
    };
  }
  function ld(obj) { return '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, "\\u003c") + "</script>"; }

  function homeSchema(c) {
    var s = c.site || {}, p = c.profile || {}, url = s.url || "";
    var graph = [
      person(c),
      { "@type": "WebSite", "@id": url + "#website", url: url, name: p.name, inLanguage: "en", publisher: { "@id": url + "#person" } },
      { "@type": "ProfilePage", "@id": url + "#profile", url: url, name: s.title, description: s.description, isPartOf: { "@id": url + "#website" },
        mainEntity: { "@id": url + "#person" }, dateModified: today() }
    ];
    var faqOn = a(c.sections).some(function (x) { return x.id === "faq" && x.visible !== false; });
    var faqs = a(c.faq && c.faq.items).filter(function (f) { return f.q && f.a; });
    if (faqOn && faqs.length) graph.push({ "@type": "FAQPage", "@id": url + "#faq", mainEntity: faqs.map(function (f) {
      return { "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } };
    }) });
    return ld({ "@context": "https://schema.org", "@graph": graph });
  }
  function designsSchema(c) {
    var s = c.site || {}, d = c.designsPage || {}, url = s.url || "", page = url + "designs.html";
    var imgs = [];
    a(d.categories).forEach(function (k) { a(k.items).forEach(function (i) {
      if (i.image && !/^data:/.test(i.image)) imgs.push({ "@type": "ImageObject", contentUrl: abs(i.image, url), name: i.title + (i.client ? " for " + i.client : ""), creator: { "@id": url + "#person" } });
    }); });
    return ld({ "@context": "https://schema.org", "@graph": [
      { "@type": "CollectionPage", "@id": page, url: page, name: d.title, description: d.description, isPartOf: { "@id": url + "#website" },
        about: { "@id": url + "#person" }, author: { "@id": url + "#person" }, hasPart: imgs },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: (c.profile || {}).name, item: url },
        { "@type": "ListItem", position: 2, name: "Designs", item: page }] }
    ] });
  }

  function head(c, o, meta) {
    var s = c.site || {}, p = c.profile || {}, url = s.url || "";
    var og = abs(s.ogImage || p.photo, url);
    return (
      "<title>" + e(meta.title) + "</title>" +
      (o.fragment ? '<meta name="claude:viewport-fit-sides" content="cover">' : "") +
      '<meta name="description" content="' + e(meta.description) + '">' +
      (s.keywords && meta.home ? '<meta name="keywords" content="' + e(s.keywords) + '">' : "") +
      '<meta name="author" content="' + e(p.name) + '">' +
      '<meta name="robots" content="' + (o.preview ? "noindex" : "index, follow, max-image-preview:large, max-snippet:-1") + '">' +
      (s.googleVerification ? '<meta name="google-site-verification" content="' + e(s.googleVerification) + '">' : "") +
      (url && !o.preview ? '<link rel="canonical" href="' + e(meta.canonical) + '">' : "") +
      '<meta name="theme-color" content="' + e(hexOk(c.theme && c.theme.bg, "#081633")) + '">' +
      '<meta property="og:type" content="' + (meta.home ? "profile" : "website") + '">' +
      '<meta property="og:site_name" content="' + e(p.name) + '">' +
      '<meta property="og:locale" content="en_US">' +
      '<meta property="og:title" content="' + e(meta.title) + '">' +
      '<meta property="og:description" content="' + e(meta.description) + '">' +
      '<meta property="og:url" content="' + e(meta.canonical) + '">' +
      '<meta property="og:image" content="' + e(og) + '">' +
      '<meta property="og:image:alt" content="' + e(p.photoAlt || p.name) + '">' +
      '<meta name="twitter:card" content="summary_large_image">' +
      '<meta name="twitter:title" content="' + e(meta.title) + '">' +
      '<meta name="twitter:description" content="' + e(meta.description) + '">' +
      '<meta name="twitter:image" content="' + e(og) + '">' +
      '<link rel="icon" href="favicon.svg" type="image/svg+xml">' +
      '<link rel="apple-touch-icon" href="' + e(s.ogImage || p.photo) + '">' +
      (meta.home && p.photo ? '<link rel="preload" as="image" href="' + e(p.photo) + '">' : "") +
      FONTS +
      (o.css ? "<style>" + o.css + "</style>" : '<link rel="stylesheet" href="site.css">') +
      "<style>:root{--navy:" + hexOk(c.theme && c.theme.bg, "#081633") + ";--navy-2:" + hexOk(c.theme && c.theme.bg2, "#0D1F45") +
      ";--cobalt:" + hexOk(c.theme && c.theme.accent, "#4A86FF") + ";--signal:" + hexOk(c.theme && c.theme.highlight, "#F2C46D") + "}</style>" +
      meta.schema
    );
  }

  /* ---------------- shared chrome ---------------- */
  function eyebrow(t) { return t ? '<span class="eyebrow">' + e(t) + "</span>" : ""; }
  function header(c, onDesigns) {
    var p = c.profile || {}, h = c.hero || {};
    var items = a(c.nav).filter(function (n) { return n.label && n.href; }).map(function (n) {
      var href = homeLink(n.href, onDesigns);
      var cur = onDesigns && /designs\.html$/.test(n.href) ? ' aria-current="page" class="on"' : "";
      return '<li><a href="' + e(href) + '"' + ext(n.href) + cur + ">" + e(n.label) + (isExt(n.href) ? '<span class="ext" aria-hidden="true">↗</span>' : "") + "</a></li>";
    }).join("");
    return '<header class="nav" id="top"><div class="wrap"><a class="brand" href="' + (onDesigns ? "./" : "#top") + '" aria-label="' + e(p.name) + ', home"><span class="mark">' +
      e(p.monogram) + "</span>" + e(p.shortName || p.name) + "</a>" +
      '<nav aria-label="Main"><ul id="menu">' + items + "</ul></nav>" +
      (h.navButton ? '<a class="btn primary nav-cta" href="' + (onDesigns ? "./#contact" : "#contact") + '">' + e(h.navButton) + "</a>" : "") +
      '<button class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="menu" type="button">MENU</button></div></header>';
  }
  function footer(c, onDesigns) {
    var p = c.profile || {}, f = c.footer || {};
    return '<footer><div class="wrap"><span>© <span id="yr">' + new Date().getFullYear() + "</span> " + e(p.name) + (f.left ? " · " + e(f.left) : "") +
      '</span><span class="foot-links"><a href="' + (onDesigns ? "./" : "#top") + '">Home</a><a href="designs.html">Designs</a>' +
      (p.linkedin ? '<a href="' + e(p.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a>' : "") + "</span><span>" + e(f.right) + "</span></div></footer>";
  }
  var LIGHTBOX = '<div class="lightbox" id="lb" hidden role="dialog" aria-modal="true" aria-label="Design preview"><button class="lb-btn lb-close" id="lbClose" type="button" aria-label="Close">✕</button>' +
    '<button class="lb-btn lb-prev" id="lbPrev" type="button" aria-label="Previous design">←</button><img id="lbImg" alt=""><p id="lbCap"></p>' +
    '<button class="lb-btn lb-next" id="lbNext" type="button" aria-label="Next design">→</button></div>';

  var SCRIPT = "(function(){" +
    "var tiles=[].slice.call(document.querySelectorAll('.tile')),cur=0,lb=document.getElementById('lb');" +
    "if(lb&&tiles.length){var li=document.getElementById('lbImg'),lc=document.getElementById('lbCap');" +
    "function show(){var t=tiles[cur],im=t.querySelector('img');li.src=im.getAttribute('src');li.alt=im.alt;lc.textContent=t.querySelector('figcaption').textContent}" +
    "tiles.forEach(function(t,i){t.querySelector('button').addEventListener('click',function(){cur=i;show();lb.hidden=false;document.getElementById('lbClose').focus()})});" +
    "function close(){lb.hidden=true}function step(n){cur=(cur+n+tiles.length)%tiles.length;show()}" +
    "document.getElementById('lbClose').onclick=close;document.getElementById('lbPrev').onclick=function(){step(-1)};document.getElementById('lbNext').onclick=function(){step(1)};" +
    "lb.addEventListener('click',function(ev){if(ev.target===lb)close()});document.addEventListener('keydown',function(ev){if(lb.hidden)return;if(ev.key==='Escape')close();if(ev.key==='ArrowRight')step(1);if(ev.key==='ArrowLeft')step(-1)})}" +
    "document.querySelectorAll('[data-copy]').forEach(function(btn){btn.addEventListener('click',function(){var el=document.getElementById(btn.dataset.copy),t=el.textContent.trim();" +
    "function sel(){var r=document.createRange();r.selectNodeContents(el);var s=getSelection();s.removeAllRanges();s.addRange(r)}" +
    "try{navigator.clipboard.writeText(t).then(function(){btn.textContent='Copied'},sel)}catch(x){sel()}setTimeout(function(){btn.textContent='Copy'},1800)})});" +
    "var nav=document.querySelector('.nav'),mb=document.getElementById('menuBtn');if(mb){mb.addEventListener('click',function(){var o=nav.classList.toggle('open');mb.setAttribute('aria-expanded',o)});" +
    "document.querySelectorAll('#menu a').forEach(function(x){x.addEventListener('click',function(){nav.classList.remove('open');mb.setAttribute('aria-expanded','false')})})}" +
    "var y=document.getElementById('yr');if(y)y.textContent=new Date().getFullYear();" +
    "if('IntersectionObserver' in window){var links={};document.querySelectorAll('#menu a').forEach(function(x){var h=x.getAttribute('href');if(h&&h.charAt(0)==='#')links[h.slice(1)]=x});" +
    "var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting&&links[en.target.id]){Object.keys(links).forEach(function(k){links[k].classList.remove('on')});links[en.target.id].classList.add('on')}})},{rootMargin:'-45% 0px -50% 0px'});" +
    "Object.keys(links).forEach(function(id){var s=document.getElementById(id);if(s)io.observe(s)})}" +
    "})();";

  /* ---------------- homepage sections ---------------- */
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
  function head2(x, id) {
    return '<div class="sec-head">' + eyebrow(x.eyebrow) + '<h2 id="' + id + '-title">' + e(x.heading) + "</h2>" + (x.intro ? "<p>" + e(x.intro) + "</p>" : "") + "</div>";
  }
  function tags(list) { return a(list).length ? '<ul class="tags">' + a(list).map(function (t) { return "<li>" + e(t) + "</li>"; }).join("") + "</ul>" : ""; }

  var S = {};
  S.about = function (c, cls) {
    var x = c.about || {};
    return '<section class="band' + cls + '" id="about" aria-labelledby="about-title"><div class="wrap about"><div class="prose">' + eyebrow(x.eyebrow) +
      '<h2 id="about-title">' + e(x.heading) + "</h2>" + a(x.paragraphs).map(function (t, i) { return "<p" + (i === 0 ? ' class="answer"' : "") + ">" + e(t) + "</p>"; }).join("") +
      '</div><ul class="facts">' + a(x.facts).map(function (f) { return "<li><span>" + e(f.label) + "</span>" + e(f.value) + "</li>"; }).join("") +
      "</ul></div></section>";
  };
  S.projects = function (c, cls) {
    var x = c.projects || {};
    return '<section class="band' + cls + '" id="projects" aria-labelledby="projects-title"><div class="wrap">' + head2(x, "projects") + '<div class="cases">' +
      a(x.items).map(function (k) {
        var pa = Math.max(0, Math.min(100, Number(k.splitPctA) || 0));
        var split = pa > 0 && pa < 100 ? '<div class="split" aria-label="Budget split"><div class="bar"><span class="meta" style="width:' + pa + '%">' + e(k.splitLabelA) +
          '</span><span class="goog" style="width:' + (100 - pa) + '%">' + e(k.splitLabelB) + "</span></div>" + (k.splitNote ? "<p>" + e(k.splitNote) + "</p>" : "") + "</div>" : "";
        return '<article class="case"><aside><span class="client">' + e(k.client) + '</span><span class="big">' + e(k.big) + '</span><span class="big-label">' + e(k.bigLabel) +
          '</span></aside><div class="body"><h3>' + e(k.title) + "</h3>" + a(k.paragraphs).map(function (t) { return "<p>" + e(t) + "</p>"; }).join("") + split +
          (a(k.metrics).length ? "<dl>" + a(k.metrics).map(function (m) { return "<div><dt>" + e(m.label) + "</dt><dd>" + e(m.value) + "</dd></div>"; }).join("") + "</dl>" : "") +
          tags(k.tags) + "</div></article>";
      }).join("") + "</div></div></section>";
  };
  S.skills = function (c, cls) {
    var x = c.skills || {};
    return '<section class="band' + cls + '" id="skills" aria-labelledby="skills-title"><div class="wrap">' + head2(x, "skills") + '<div class="svc-grid">' +
      a(x.items).map(function (s) { return '<div class="svc"><span class="k">' + e(s.tag) + "</span><h3>" + e(s.title) + "</h3><p>" + e(s.text) + "</p></div>"; }).join("") +
      "</div>" +
      (a(x.toolkit).length ? '<div class="kit">' + a(x.toolkit).map(function (k) { return "<div><h3>" + e(k.title) + "</h3>" + tags(k.items) + "</div>"; }).join("") + "</div>" : "") +
      (a(x.process).length ? '<h3 class="sub-h">How I work</h3><ol class="process">' + a(x.process).map(function (s) { return "<li><h3>" + e(s.title) + "</h3><p>" + e(s.text) + "</p></li>"; }).join("") + "</ol>" : "") +
      "</div></section>";
  };
  S.experience = function (c, cls) {
    var x = c.experience || {};
    return '<section class="band' + cls + '" id="experience" aria-labelledby="experience-title"><div class="wrap">' + head2(x, "experience") + '<ol class="timeline">' +
      a(x.items).map(function (j) {
        return '<li class="job"><time' + (j.start ? ' datetime="' + e(j.start) + '"' : "") + ">" + e(j.dates) + (j.current ? "<b>Current</b>" : "") + "</time><div><h3>" +
          e(j.title) + '</h3><span class="org">' + e(j.org) + "</span>" +
          (a(j.bullets).length ? "<ul>" + a(j.bullets).map(function (b) { return "<li>" + e(b) + "</li>"; }).join("") + "</ul>" : "") + "</div></li>";
      }).join("") + "</ol></div></section>";
  };
  S.brands = function (c, cls) {
    var x = c.brands || {};
    return '<section class="band' + cls + '" id="brands" aria-labelledby="brands-title"><div class="wrap">' + head2(x, "brands") +
      '<ul class="brands">' + a(x.items).map(function (b) { return "<li>" + e(b) + "</li>"; }).join("") + "</ul></div></section>";
  };
  S.faq = function (c, cls) {
    var x = c.faq || {};
    return '<section class="band' + cls + '" id="faq" aria-labelledby="faq-title"><div class="wrap faq-wrap">' + head2(x, "faq") + '<div class="faq">' +
      a(x.items).filter(function (f) { return f.q; }).map(function (f, i) {
        return '<details' + (i === 0 ? " open" : "") + '><summary><h3>' + e(f.q) + '</h3></summary><p>' + e(f.a) + "</p></details>";
      }).join("") + "</div></div></section>";
  };
  S.credentials = function (c, cls) {
    var x = c.credentials || {}, p = c.profile || {}, certs = a(x.certifications);
    return '<section class="band' + cls + '" id="credentials" aria-labelledby="credentials-title"><div class="wrap">' + head2(x, "credentials") +
      '<div class="creds"><div class="cred"><h3>Education</h3><ul>' +
      a(x.education).map(function (d) { return "<li><strong>" + e(d.title) + "</strong><small>" + e(d.meta) + "</small></li>"; }).join("") +
      '</ul></div><div class="cred" id="certs"><h3>Certifications</h3><ul>' +
      (certs.length ? certs.map(function (d) {
        return "<li><strong>" + (d.url ? '<a href="' + e(d.url) + '" target="_blank" rel="noopener">' + e(d.title) + "</a>" : e(d.title)) + "</strong><small>" + e(d.meta) + "</small></li>";
      }).join("") : "<li><small>" + e(x.certificationsEmpty) + "</small></li>") + "</ul>" +
      (p.linkedin && x.linkedinButton ? '<a class="chip" href="' + e(p.linkedin) + '" target="_blank" rel="noopener" style="justify-self:start">' + e(x.linkedinButton) + " ↗</a>" : "") +
      "</div></div></div></section>";
  };
  S.contact = function (c, cls) {
    var x = c.contact || {}, p = c.profile || {}, ch = [];
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

  function wrapDoc(headHtml, bodyHtml, o) {
    if (o.fragment) return headHtml + bodyHtml;
    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
      headHtml + "<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}</style>\n</head>\n<body>\n" +
      bodyHtml + "\n</body>\n</html>\n";
  }

  function renderSite(c, o) {
    o = o || {};
    var s = c.site || {}, url = s.url || "";
    var secs = a(c.sections).filter(function (x) { return x.visible !== false && S[x.id]; });
    var main = secs.map(function (x, i) { return S[x.id](c, i % 2 === 1 ? " raised" : ""); }).join("");
    var body = header(c, false) + "<main>" + hero(c) + stats(c) + main + "</main>" + footer(c, false) + "<script>" + SCRIPT + "</script>";
    return wrapDoc(head(c, o, { home: true, title: s.title, description: s.description, canonical: url, schema: homeSchema(c) }), body, o);
  }

  function renderDesigns(c, o) {
    o = o || {};
    var s = c.site || {}, d = c.designsPage || {}, p = c.profile || {}, url = s.url || "";
    var cats = a(d.categories).filter(function (k) { return k.name && (a(k.items).length || a(k.instagram).length); });
    var jump = cats.length > 1 ? '<nav class="cat-jump" aria-label="Design categories">' + cats.map(function (k) {
      return '<a href="#' + e(k.id) + '">' + e(k.name) + "<span>" + a(k.items).length + "</span></a>";
    }).join("") + "</nav>" : "";
    var blocks = cats.map(function (k, ci) {
      var ig = a(k.instagram).filter(function (x) { return x.url; }).map(function (x) {
        return '<a class="ig-btn" href="' + e(x.url) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/></svg>' +
          e(x.label || "View on Instagram") + "</a>";
      }).join("");
      return '<section class="band' + (ci % 2 ? " raised" : "") + ' cat" id="' + e(k.id) + '" aria-labelledby="' + e(k.id) + '-title"><div class="wrap">' +
        '<div class="cat-head"><div><span class="eyebrow">' + e(String(ci + 1).padStart(2, "0") + " · " + a(k.items).length + " designs") + '</span><h2 id="' + e(k.id) + '-title">' + e(k.name) + "</h2>" +
        (k.description ? "<p>" + e(k.description) + "</p>" : "") + "</div>" + (ig ? '<div class="ig-row"><span>Review on Instagram</span>' + ig + "</div>" : "") + "</div>" +
        '<div class="masonry">' + a(k.items).map(function (i) {
          var alt = i.title + (i.client ? " for " + i.client : "") + ", designed by " + (p.name || "");
          return '<figure class="tile"><button type="button" class="tile-btn" aria-label="Open ' + e(i.title) + '"><img loading="lazy" decoding="async" src="' + e(i.image) + '"' +
            (i.w && i.h ? ' width="' + e(i.w) + '" height="' + e(i.h) + '"' : "") + ' alt="' + e(alt) + '"></button><figcaption>' + e(i.title) +
            (i.client ? "<small>" + e(i.client) + "</small>" : "") + "</figcaption></figure>";
        }).join("") + "</div></div></section>";
    }).join("");
    var top = '<section class="page-hero" aria-labelledby="dp-title"><div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="./">' + e(p.name) + '</a><span aria-hidden="true">/</span><span>Designs</span></nav>' +
      eyebrow(d.eyebrow) + '<h1 id="dp-title">' + e(d.heading) + "</h1>" + (d.intro ? '<p class="lede">' + e(d.intro) + "</p>" : "") +
      (a(d.services).length ? '<ul class="dsvc" aria-label="Design services">' + a(d.services).map(function (t) { return "<li>" + e(t) + "</li>"; }).join("") + "</ul>" : "") +
      jump + "</div></section>";
    var cta = '<section class="band raised"><div class="wrap contact"><h2>' + e((c.contact || {}).heading || "Let’s work together") + ' <em>' + e((c.contact || {}).headingAccent || "") +
      '</em></h2><div class="cta-row"><a class="btn primary" href="./#contact">Contact me</a><a class="btn ghost" href="./#projects">See marketing projects</a></div></div></section>';
    var body = header(c, true) + "<main>" + top + blocks + cta + "</main>" + footer(c, true) + LIGHTBOX + "<script>" + SCRIPT + "</script>";
    return wrapDoc(head(c, o, { home: false, title: d.title, description: d.description, canonical: url + "designs.html", schema: designsSchema(c) }), body, o);
  }

  function sitemap(c) {
    var url = (c.site && c.site.url) || "", d = c.designsPage || {};
    function img(x) { return x && !/^data:/.test(x) ? "    <image:image><image:loc>" + e(abs(x, url)) + "</image:loc></image:image>\n" : ""; }
    var dImgs = [];
    a(d.categories).forEach(function (k) { a(k.items).forEach(function (i) { dImgs.push(i.image); }); });
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
      "  <url>\n    <loc>" + e(url) + "</loc>\n    <lastmod>" + today() + "</lastmod>\n    <priority>1.0</priority>\n" + img((c.profile || {}).photo) + "  </url>\n" +
      "  <url>\n    <loc>" + e(url + "designs.html") + "</loc>\n    <lastmod>" + today() + "</lastmod>\n    <priority>0.8</priority>\n" + dImgs.map(img).join("") + "  </url>\n</urlset>\n";
  }
  function robots(c) {
    var url = (c.site && c.site.url) || "";
    return "User-agent: *\nAllow: /\nDisallow: /admin.html\n\nSitemap: " + url.replace(/\/?$/, "/") + "sitemap.xml\n";
  }
  /* llms.txt: a plain summary for AI answer engines */
  function llms(c) {
    var p = c.profile || {}, s = c.site || {}, url = s.url || "";
    var L = ["# " + p.name, "", "> " + s.description, "",
      "## Profile", "- Role: " + p.jobTitle, "- Location: " + p.location, "- Employer: " + p.employer + (p.employerUrl ? " (" + p.employerUrl + ")" : ""),
      "- Email: " + p.email, "- WhatsApp/phone: " + p.phone, "- LinkedIn: " + p.linkedin, "",
      "## Key results"];
    a(c.stats).forEach(function (x) { L.push("- " + x.value + " " + x.label); });
    L.push("", "## Services");
    a(c.skills && c.skills.items).forEach(function (x) { L.push("- " + x.title + ": " + x.text); });
    L.push("", "## Projects");
    a(c.projects && c.projects.items).forEach(function (x) { L.push("- " + x.title + " (" + x.client + "): " + x.big + " " + x.bigLabel); });
    L.push("", "## Experience");
    a(c.experience && c.experience.items).forEach(function (x) { L.push("- " + x.dates + ": " + x.title + ", " + x.org); });
    L.push("", "## FAQ");
    a(c.faq && c.faq.items).forEach(function (x) { L.push("### " + x.q, x.a, ""); });
    L.push("## Pages", "- [Home](" + url + "): digital marketing profile, projects, skills, contact", "- [Designs](" + url + "designs.html): graphic design portfolio by industry", "");
    return L.join("\n");
  }

  var api = { renderSite: renderSite, renderDesigns: renderDesigns, sitemap: sitemap, robots: robots, llms: llms, escape: e };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SiteRenderer = api;
})(this);
