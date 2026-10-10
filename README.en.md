<div align="center">

# Escaping Notes

**STAR TRAILS · A Long-Exposure Notebook**

> Ink cast into the abyss, the stars startle and never return; light hoarded in these pages, the tide recedes yet the echo remains.

[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vue Router](https://img.shields.io/badge/Vue%20Router-4-42b883?logo=vuedotjs&logoColor=white)](https://router.vuejs.org/)
[![Canvas 2D](https://img.shields.io/badge/Canvas%202D-Star%20Trails-1a9fff)](src/components/neo/StarTrails.vue)
[![Backend](https://img.shields.io/badge/Backend-Python%203-3776ab?logo=python&logoColor=white)](server/api.py)
[![License](https://img.shields.io/badge/License-Personal%20Use%20Only-d42b2b)](#license--usage-terms)
[![Release](https://img.shields.io/github/v/release/Escap1ng/Escaping-Notes)](https://github.com/Escap1ng/Escaping-Notes/releases)

**[Live Demo](https://escaping.top)**

[中文](README.md) · **English**

</div>

---

## About

Escaping Notes is a personal blog and journal that treats writing as a long exposure of the night sky — the camera set up on the landing screen keeps the exposure for me: posts, updates, music, images and projects all land on the same plate. Three devices run that one camera —

- **Scroll as time** — within the landing screen, the further you go the longer the exposure window and the faster the sky turns (time flow 1 → 2.2×); it saturates after 1.1 viewport heights
- **Pointer as time dilation** — star trails within a 180px cursor radius locally accelerate and curl, fastest at the centre (up to 2.8×)
- **Meteors as narrative** — one falls every 6–9s, lives 900ms, at most 8 in frame; while the player is running the interval is squeezed toward its minimum and relaxes back on its own

Trails are only painted inside the landing screen. But **the deposition is site-wide**: the plate pixels and the clock are singletons in `src/lib/sky.js`, so changing routes never re-lays the plate — come back to the top and the same arcs are denser. Below the fold, photographs take over.

<table>
  <tr>
    <td width="50%"><img src="docs/assets/readme/plate-deep-space.png" alt="Dark theme plate: hundreds of concentric star-trail arcs accumulating around an offset celestial pole" title="Dark"></td>
    <td width="50%"><img src="docs/assets/readme/plate-paper.png" alt="The same plate on the light theme: slate/graphite trails laid over a dry plate, vermilion only on the brightest few" title="Light"></td>
  </tr>
</table>

> Left dark / right light: both are **star-trail plates recomputed from the site's own constants** (`npm run art:build`), not screenshots — **they draw the trail layer only**; the live landing screen also carries a band of photo landscape along the bottom, star trails occluded along the ridge, and a title typed out character by character. They recompute exactly the steady-state plate that `prefers-reduced-motion` users are shown. They were lifted by a ×2.8 / ×1.6 developing gain, so **the site itself is darker**.

## Features

- **Dual themes** — dark (cold white / warm white / amber trails) and light (astronomical dry plate: slate/graphite trails + vermilion accents); trail colour temperature follows magnitude (dim stars cool, a few bright stars warm). **Switching theme no longer swaps the mountain** — the dark landing screen is a darkened bake of the same framing (`plate-hero-deep.jpg`) and both themes share one ridge polyline. Each theme deposits its own plate (to keep colours from bleeding); the default is light and the first frame deliberately ignores `prefers-color-scheme`, because the landing screen is a bright photograph
- **Landing typography** — the photo occupies only the lower 54% of the band (`.hero-plate` starts at 46%), leaving the upper half for type; trails are masked off along the ridge with `destination-in`, keeping ~60% of their brightness near the crest and feathering over 26px; the site name is typed out character by character (first keystroke after 260ms, 82ms per character, caret fades 1500ms after the last one) and only then does the sixteen-character manifesto release (0.9s reveal, second line 0.18s behind); the whole text block sinks at 0.25× scroll speed and fades out
- **Below the fold** — a drawer holding one local-time readout, three featured cards and the last five updates (the whole card links to `/updates`), pulled up from below the first time it enters the viewport; it rides on **one shared photographic plate for the whole site** — five slots on a carousel, 10s each (50s cycle), and on the dark theme all five tokens point to the same file so nothing changes at night. How blurred the plate is, is a runtime parameter: a 0–12px slider in the settings card, defaulted to full, remembered in `localStorage`
- **Unified design system** — every screen is assembled from one set of tokens and primitives: four scales (5 spacing / 11 type-size / 4 line-height / 3 weight steps), card tokens, buttons in "2 sizes × 4 semantics", inputs as "underline for single-line, hairline box for multi-line", three-state notices, single-character icons; no raw font sizes or spacings inside components (fluid display sizes use `clamp()`), so changing a scale updates the whole site
- **Canvas 2D rendering** — trails are drawn frame by frame with an offscreen accumulation buffer (280 stars, 140 on viewports ≤720px, and multiplied by 0.65 on the dark theme); no third-party UI kits, chart libraries or font CDNs — Vue and Vue Router are the only runtime dependencies, and the display face is one self-hosted subset woff2
- **Graceful degradation** — if the API is unreachable or times out (10s reads, 60s uploads) the site falls back to the bundled seeds in `src/config/`: still a complete offline plate, readable end to end with no backend at all
- **Accessibility** — focus traps in the drawer and in both lightboxes (focus returns to the element that opened them), route changes announced to screen readers (`role="status"`), a focusable skip link and `#main`, ≥44px touch targets for buttons / links / chips under `pointer: coarse`, and a full static fallback under `prefers-reduced-motion` (title appears complete, trails are pre-computed as one 380-step plate, the carousel stops on its first slot)
- **Performance** — the landscape plate lives on `App.vue`, not in each page, so routing never repaints it; the `--shift` scroll depth caches its extreme instead of reading `scrollHeight` per frame (which is a reflow per frame); resize is debounced 150ms; the drawer's `IntersectionObserver` disconnects after one pull; card glows move by transform; the persistent header surface avoids `backdrop-filter` — glass is reserved for the three surfaces that genuinely need isolating from the plate
- **Reading legibility (stated plainly)** — a scrim-free landscape photo **cannot** reach WCAG AA for naked text: the worst measured point sits at 1.0–1.8:1 regardless of gradient shape (three shapes were tried — single vertical, double scrim top and bottom, fade-in from the top). So the work is divided: the plate is scenery, and body copy always lands on `.sheet` / `.neo-glass` / `.neo-card`, where the foreground starts at 5.5:1. `npm run check:contrast` recomputes the theme tokens against a flat ground before every commit (dark `--text-0` 18.38:1, light 16.90:1 against a 7:1 bar) — but that checks tokens against a solid colour, **not** the composited photo
- **Feedback loop** — skeleton cards while the archive loads (3 of them), distinct copy for "nothing here yet" vs "no search results", and tag/keyword filters written into the URL query (shareable, survives reload)
- **Gallery** — `/gallery` pins every image the site has used to one wall of Polaroids: 9 site-owned plates (two hero bands, five light plates, the dark scrim plate, `og.png`) plus every article cover, deduplicated by src; tilt is ±2.4° hashed from the src, entry staggers 60ms per card (capped at 12), columns run 3/2/1; the lightbox `Teleport`s to `body` with ←/→ paging, Esc to close and >50px swipes on touch
- **Full-featured admin** — `/admin` splits into a "users" tab (admin) and "posts + settings" (owner), where settings edits updates, projects, gear and the playlist; auth is an `Authorization: Bearer` token (7-day life, kept in `localStorage`), rate-limited at 30 requests / 60s per IP counting POSTs only; **there is no self-registration endpoint** — accounts are created by the owner alone; the "sync playlist" button on the Music page is owner-only and calls `POST /api/sync/records`, which re-fetches the public QQ Music playlist server-side

## Two load-bearing designs, in figures

### The plate layer hangs on `App.vue` — one `fixed` containing-block trap

<img src="docs/assets/readme/plate-layer.svg" alt="Cross-section of the site-wide backdrop layer: the photo at full strength along the top sinking into the page colour between 18% and 78%, the five carousel slots on a 50 second cycle, and measured contrast for naked text versus text on a card" width="920">

Below the fold the landscape is one `position: fixed` `.sub-plate` layer living in `App.vue`, shared by the home drawer and every secondary page. It has to be there: `fall` puts a `filter` on the page root, and **a filter becomes the containing block for `position: fixed` descendants** — the same layer mounted inside `HomeView` measured as a `.home` box (587×1629, scrolling with the document), which is not a stationary backdrop at all. The other load-bearing half is that **each carousel slot carries its own sinking gradient** (`transparent 18% → var(--ink-0) 78%`): write it once on the parent and the slot that fades up covers the dimming, taking the text contrast with it. Blur is not baked into the source photo but is the runtime `--plate-blur`, which is why the layer extends 3× that in every direction — otherwise the blurred edge fades to transparent and shows a white ring around the viewport. The measurements behind all three decisions are recorded in the comments of `src/App.vue` and `src/lib/plate.js`.

### The `fall` afterimage — two pages on screen for 260ms

<img src="docs/assets/readme/fall-timing.svg" alt="Timing diagram of the fall transition: the 0.44s enter and the 0.26s leave run in parallel and overlap for 260ms" width="920">

Now that the plate persists across routes, `fall` is the only transition left: the enter runs 0.44s (blur 15px→0, scale 0.88→1) and the leave 0.26s (0→12px, scale→0.9) in parallel — no `out-in` — and for the **260ms** they overlap both pages are on screen, both blurred; that overlap is the afterimage. During those 260ms it must be the same plate still being exposed, so `claimPlate()` in `src/lib/sky.js` **locks deposition only, never redraw**: the camera handing the plate over keeps drawing it every frame, otherwise it freezes mid-frame while fading out — exactly where the "stutter on switch" came from. With trails now mounted by a single camera there is never a moment when two coexist, so that mutex no longer contends; it stays as a guard rail.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Frontend | Vue 3 (Composition API) + Vite 5 + Vue Router 4 |
| Rendering | Canvas 2D with an offscreen accumulation buffer (long-exposure plate simulation) |
| Styling | Plain CSS + custom-property tokens (`tokens.css` baseline / `neo.css` skin) |
| Backend | Single-file Python 3 stdlib server (`server/api.py`), no extra dependencies |
| Testing | Node's built-in `node --test` + `python -m unittest`, no test framework |
| Deployment | GitHub Pages / Vercel / nginx + systemd |

## Quick Start

Requirements: Node.js **18+**; Python 3.9+ optional (read-only browsing needs no backend).

```bash
# Clone and install
git clone https://github.com/Escap1ng/Escaping-Notes.git
cd Escaping-Notes
npm install

# Run the frontend (dev; /api is proxied to 127.0.0.1:8787 by Vite)
npm run dev

# Run the backend (another terminal; without it the site runs read-only + local mode)
python server/api.py

# Production builds
npm run build          # own domain (history router) + emits dist/rss.xml, dist/sitemap.xml
npm run build:pages    # GitHub Pages mirror (hash router)
npm run preview        # preview dist/ locally
```

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` / `build:pages` | Production builds; both use `base: '/'` — the only difference is `VITE_DEPLOY=pages` (`.env.pages`) switching the router to hash mode |
| `npm run preview` | Serve `dist/` the way production would |
| `npm run test` | 7 test files (6 `.mjs` + 1 `.py`): frontmatter/markdown parsing, CRLF, the URL injection surface, the three blur defaults never drifting apart, the first-paint theme, and the gallery list matching the asset manifest |
| `npm run seo:build` | Regenerate SEO artefacts only (`dist/rss.xml` — last 20 items, `dist/sitemap.xml`) |
| `npm run og:build` | Redraw the share card `public/og.png` (1200×630, procedural star trails drawn with Node built-ins, no text, committed) |
| `npm run art:build` | Redraw the two plates at the top of this page (constants are read out of the source by regex and it throws if they are gone, so re-run after touching star-trail parameters) |
| `npm run bg:build` | Re-bake the site backdrops in `public/plates/*.jpg` (hero band light + dark, the five-slot drawer carousel, the dark drawer scrim; originals live in `plates-src/`, needs local PowerShell; commit the output) |
| `npm run cover:build` | Re-bake the article covers in `public/posts/*.jpg` (originals live in `plates-src/`, which is not committed; re-run after changing them, and commit the output) |
| `npm run font:build` | Re-subset the display font (needs Noto Serif SC locally; the output is committed, so this is rarely needed) |
| `npm run check` | Runs the four gates below in sequence (api / docs / naming / contrast) — the one command to run before committing |
| `npm run check:api` | Diffs the endpoint table in `docs/api.md` against the routes in `server/api.py`, both ways (26 endpoints today); non-zero exit on drift |
| `npm run check:docs` | Checks that every file path and section reference in the docs still resolves, and that the README route table matches `src/router` |
| `npm run check:naming` | Naming-convention scan; non-zero exit on a violation |
| `npm run check:contrast` | Recomputes WCAG contrast from the two theme blocks in `neo.css`; non-zero exit if a text token fails |

## Route Map

All 11 routes are lazy-loaded and each carries `meta.t` for the document title and the screen-reader announcement; the header nav shows the first 7 only (`/login` and `/admin` stay out of the nav).

| Route | Page | What it is |
| --- | --- | --- |
| `/` | Home · long-exposure star trails | Photo landscape band + trails + typed title + drawer |
| `/blog` | Articles | Archive, tag/keyword filters live in the URL |
| `/blog/:slug` | Article | A single post on a frosted-glass plate; its cover opens the lightbox |
| `/updates` | Activity | Short-log feed |
| `/records` | Music | Self-hosted track list + the player card |
| `/gallery` | Gallery | Wall of every image the site has used |
| `/projects` | Projects | Projects and their state |
| `/about` | About | Bio · live counters · gear · friend links |
| `/login` | Log in | utility page |
| `/admin` | Console | Editing back end |

> The eleventh route is the catch-all: anything unmatched renders the 404 page, titled 这里没有页面 ("there is no page here") — site copy is Chinese-only.

## Project Structure

```text
├── index.html             # Shell: inline first-paint script (theme + plate blur, so neither flashes), SEO/OG metadata
├── server/api.py          # Backend: content / auth / RSS / OG injection / playlist sync, listens on 127.0.0.1:8787
├── content/posts/         # Markdown posts (frontmatter)
├── public/                # Static assets: favicon, robots.txt, og.png, plus three derived-asset dirs that **must be committed**
│                          #   plates/ (backdrops) · posts/ (covers) · audio/ (self-hosted tracks) — see "Scripts" for the bake commands
│                          #   their source dirs (plates-src/ · music/ · /1/) are gitignored — do not report that as a leak
├── scripts/               # Build-time and content-refresh scripts (verb families)
│   ├── build_font.mjs     #   display-font subsetting (Node; needs the `subset-font` devDep)
│   ├── build_seo.mjs      #   rss.xml / sitemap.xml / og.png (Node built-ins only)
│   ├── build_readme_art.mjs # the two plates above: recomputed from StarTrails' constants
│   ├── build_plate_bg.ps1 / build_post_covers.ps1 # backdrop & cover baking (PowerShell + System.Drawing; cannot run on CI)
│   ├── check_api_doc.py   #   docs/api.md ⇄ server/api.py route diff (with a --self negative control)
│   ├── check_doc_refs.py  #   drift scan over doc references / § numbers / the README route table
│   ├── check_naming.py    #   naming-convention scan
│   ├── check_contrast.mjs #   theme-token WCAG contrast audit
│   ├── sync_records.py    #   fetch public QQ playlist → src/config/records.js (Python 3 stdlib; read-only mirrors)
│   ├── data/              #   script input data (the GB2312 level-1 character table used by build_font)
│   └── lib/               #   modules shared between scripts (PNG encoder, used by build_seo and build_readme_art)
├── docs/                  # design.md design spec · manual.md handbook · api.md backend API contract
│   └── assets/readme/     # README figures (how they are made, and how to swap in real screenshots)
├── tests/                 # Zero-dependency safety net: node --test + unittest, run by `npm run test`
└── src/
    ├── assets/fonts/      # Self-hosted subset font (one woff2, weight 700) + OFL licence
    ├── components/        # four under neo/: StarTrails the camera · HorizonHero the landing type layer · NeoSiteHeader bar + drawer · NeoSiteFooter
    │                      #   one level up: MusicCard.vue (the player card the header opens) and SettingsCard.vue (the plate-blur slider)
    ├── config/            # narrative.js copy layer · site.js site info · 8 content-seed files (records.js is generated — don't hand-edit)
    ├── lib/               # api / auth / content / posts / frontmatter / markdown / theme / storage / music / records / gallery / plate / ridge / lens / shift / sky / debounce / focus
    ├── styles/            # tokens.css token baseline · neo.css the site skin
    └── views/             # 11 views, one file each, flat: 9 content pages + AdminView / LoginView
```

## Deployment

Full steps for all three targets (Vercel mirror / GitHub Pages mirror / self-hosted nginx + systemd), including the nginx config and ICP filing notes, live in **[docs/manual.md §4](docs/manual.md#4-上传方法部署上线)** (Chinese). Key points:

- The GitHub Pages mirror is bound to the apex domain `escaping.top` (`www` is reserved for the self-hosted server); DNS records, verification commands and the certificate steps are in `docs/manual.md` §4.2
- Because the domain is bound at the root, **both** builds use `base: '/'` — `build:pages` no longer carries the repository name, it only changes the routing mode
- Login, publishing and cross-device view counts need the backend — only a self-hosted server runs the full version; both free platforms are read-only mirrors
- Always enable HTTPS once login is involved
- Self-hosting requires the `SITE_DIST` and `SITE_DATA` environment variables (to match the /opt + /var/www layout in the handbook); without them server-side meta injection and `/rss.xml` return 404
- Backup = copy the server's `data/` directory

## Documentation

- [docs/design.md](docs/design.md) — the single source of truth for the interface design (concept, colour system, component contracts, developer guide; Chinese)
- [docs/manual.md](docs/manual.md) — handbook for editing, adapting and deploying (Chinese)
- [docs/api.md](docs/api.md) — backend API contract: endpoint table, auth and rate limits, status codes, storage / fail-closed boundary, known issues; ships with `npm run check:api`, which diffs the doc against `server/api.py` both ways (Chinese)
- [docs/assets/readme/README.md](docs/assets/readme/README.md) — where these four figures come from, how to re-run them, and what to do if you want real screenshots

## License & Usage Terms

1. **Nature** — This project (source code, design documents, visual and interaction design, and copy included) is the author's personal work for learning and practice, intended solely for individual study, research and non-commercial exchange.
2. **No commercial use** — Without prior written permission, no part of this project may be used commercially or monetized in any way.
3. **Originality protection** — The core original designs (the "Long-Exposure Star Trails" metaphor, visual language and star-trail devices) may not be copied, imitated or republished under another name without permission.
4. **Citation** — Learning-purpose references must clearly credit the project and the author, and keep this notice.
5. **Disclaimer** — The project is provided "as is", without warranty of any kind; the author is not liable for any loss arising from its use.
6. **Licensing contact** — chunqi-yu@outlook.com.

Fonts: the display subset is derived from Noto Serif SC (SIL OFL 1.1); the full licence is at [src/assets/fonts/LICENSE-OFL.txt](src/assets/fonts/LICENSE-OFL.txt).

© 2026 Escap1ng · All rights reserved
