# Muhammad Awais Rustam Malik: portfolio website

Live site: https://muhammadawaisrustam.github.io/

A static site hosted on GitHub Pages. Every page is generated from one content file, so text, projects and images can be changed without touching code.

| File | What it is |
| --- | --- |
| `content.json` | All the words, projects, experience, certifications, contact details and settings |
| `render.js` | Turns `content.json` into the HTML pages (used by the admin dashboard and the build script) |
| `site.css` | The design: colours, typography, layout and motion |
| `admin.html` | The editing dashboard (`/admin.html` on the live site) |
| `motion.js` | Smooth scrolling (Lenis). It is skipped when a visitor prefers reduced motion |
| `tools/build.js` | Rebuilds every page from `content.json` |

Generated files (don't edit by hand; they are rebuilt): `index.html`, `case-studies.html`, `case-*.html`, `designs.html`, `results.html`, `sitemap.xml`, `robots.txt`, `llms.txt`.

## Edit the site

**The easy way:** open `/admin.html` on the live site. Connect it to GitHub once (the dashboard explains how), edit, watch the preview, then press **Publish changes**.

**By hand:** edit `content.json`, then run `node tools/build.js` and commit.

Common changes:

- **Add a project or case study:** Admin → Case studies → Add case study. Each one gets its own page and appears in the homepage Projects section (`order` sets the position). Leave “Mark as editable draft” on until it's finished.
- **Results:** in each case study, add results with kind `verified` only for real, documented figures. Use `budget` for budgets you managed (shown as scope, not results).
- **Replace a screenshot:** Admin → Case studies → Creative assets (drop images in), or Cover image.
- **Update an employment date:** Admin → Experience.
- **Add a certification:** Admin → Certifications → Add certification (with image and credential link).
- **Contact links:** Admin → Profile & contact.

## Contact form

The form validates every field and never shows a fake success message.

- **Without a form service (default):** pressing the button opens the visitor's email app with the message filled in, addressed to the email in Profile & contact, and says clearly that it hasn't been sent yet.
- **To receive messages directly:** create a free form at [formspree.io](https://formspree.io), copy its link (it looks like `https://formspree.io/f/abcdwxyz`) and paste it into Admin → Contact & footer → *Form service link*. The button then sends the message for real, shows “Sending…”, and only says it was sent once Formspree confirms. If sending fails, it shows an error with the email address as a fallback.

## Run it locally

```bash
node tools/build.js          # rebuild the pages
python3 -m http.server 8000  # then open http://localhost:8000
```

No install step is needed. Node is only used for the build script.

## Deploy

Push to `main`. GitHub Pages publishes the repository root automatically (Settings → Pages → Deploy from a branch → `main` / root). Publishing from the admin dashboard commits to `main` for you.

## Search and AI visibility

Each page has a title, a description, Open Graph tags and a canonical URL, plus structured data: Person, ProfilePage, ProfessionalService and FAQ on the homepage, and Article on each case study. `sitemap.xml`, `robots.txt` (AI search crawlers allowed) and `llms.txt` (a plain summary for AI assistants) are generated with the pages. After a change of domain, update *Website address* in Admin → SEO & Google.

## Still to supply

- Campaign screenshots and verified results for the Google Ads case study (currently marked as a draft).
- Any verified figures (leads, conversions) you want shown, with the account and period.
- Your exact start date at Target Trading and Contracting, and the date of your promotion to Marketing Specialist.
- A Formspree link if you want form messages delivered straight to your inbox.
- Optional: Instagram or Behance links (Admin → Profile & contact).
