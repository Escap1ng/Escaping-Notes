<div align="center">

# Escaping Notes

**DOPPLER DESCENT · A Long-Exposure Notebook under Star Trails**

> Ink cast into the abyss, the stars startle and never return; light hoarded in these pages, the tide recedes yet the echo remains.

[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vue Router](https://img.shields.io/badge/Vue%20Router-4-42b883?logo=vuedotjs&logoColor=white)](https://router.vuejs.org/)
[![Canvas 2D](https://img.shields.io/badge/Canvas%202D-Star%20Trails-1a9fff)](src/components/neo/StarTrails.vue)
[![Backend](https://img.shields.io/badge/Backend-Python%203-3776ab?logo=python&logoColor=white)](server/api.py)
[![License](https://img.shields.io/badge/License-Personal%20Use%20Only-d42b2b)](#license--usage-terms)
[![Release](https://img.shields.io/github/v/release/Escap1ng/Escaping-Notes)](https://github.com/Escap1ng/Escaping-Notes/releases)

**[Live Demo](https://escap1ng.github.io/Escaping-Notes/)** · **[escaping.top](https://escaping.top)**

[中文](README.md) · **English**

</div>

---

## About

Escaping Notes is a personal writing and journal site that frames "writing" as a long exposure of the night sky.

The landing screen is a camera mid long exposure: thousands of concentric star-trail arcs rotate rigidly around an offset celestial pole, accumulating and decaying. The whole site turns "reading" and "scrolling" into a descent with a clear beginning and end — the deeper you read, the longer the exposure and the faster the sky turns, until the page completes one full night shoot. Each article is treated as a pulsing fixed variable star: hover it to unfold a conical diffraction cross, click to fall into the prose.

In this setting the pointer becomes a pocket of time dilation: star trails within the cursor radius accelerate, brighten and curl, like a light-painting torch sweeping the sky. Meteors occasionally cross the exposed plate, and a giant ghost glyph rests on every page as the author's mark.

- **Posts as variable stars** — every article is a pulsing fixed star; hover unfolds a conical diffraction cross, click to fall into the prose
- **Scroll as time** — the deeper you dive, the longer the exposure and the faster the sky turns; header to footer is one full night shoot
- **Pointer as time dilation** — star trails inside the cursor radius locally accelerate and curl
- **Easter eggs as narrative** — meteors occasionally cross the plate; click a variable star to fall into an article; a giant ghost glyph rests on every page

## Features

- **Dual themes** — Deep Space (cold white / warm white / amber trails) and Paper (astronomical dry plate: ink trails + vermilion accents), one click to switch, preference remembered; first visits follow `prefers-color-scheme`
- **Unified design system** — every screen is assembled from one set of tokens and primitives: spacing / type-size / line-height / font-weight scales, card tokens, buttons in "2 sizes × 4 semantics", inputs as "underline for single-line, hairline box for multi-line", three-state notices, and single-character icons; no raw font sizes or spacings inside components, so changing a scale updates the whole site
- **Canvas 2D rendering** — star trails are drawn frame by frame with an offscreen accumulation buffer; no third-party UI kits, chart libraries or font CDNs
- **Graceful degradation** — when the API is unreachable (or times out) the site falls back to bundled seed data: still a complete offline plate
- **Immersive cursor (off by default)** — enabled from the third header button and remembered; it only takes over the home page, so other pages keep the native pointer (image `zoom-in` etc. survive); after ~1.4s of stillness it eases off and parks its render loop
- **Accessibility** — focus traps in the drawer and lightbox, route changes announced to screen readers, a focusable skip link and `#main`, touch targets ≥44px, and a full static fallback under `prefers-reduced-motion`
- **Performance** — the secondary-page backdrop is frame-capped at 30fps, every resize listener is debounced by 150ms, `--shift` is cached instead of reading `scrollHeight` per frame, persistent surfaces avoid `backdrop-filter`, and the lens glow moves by transform (the `fall` transition deliberately keeps its full-page blur for the collapse feel)
- **Reading readability** — the article page uses a frosted-glass plate (semi-transparent page colour + backdrop blur) to isolate the star-trail background, feathered on all four edges with no hard seam, and foreground contrast meets WCAG AA
- **Feedback loop** — skeleton cards while the archive loads, distinct copy for "nothing here yet" vs "no search results", and search/tag filters stored in the URL (shareable, survives reload)
- **Full-featured admin** — edit posts, updates, records and site info from `/admin`; the record can be synced with a public QQ Music playlist in one click; three role tiers; guestbook and RSS included

## Tech Stack

| Layer | Choice |
| --- | --- |
| Frontend | Vue 3 (Composition API) + Vite 5 + Vue Router 4 |
| Rendering | Canvas 2D with an offscreen accumulation buffer (long-exposure plate simulation) |
| Styling | Plain CSS + custom-property tokens (`tokens.css` baseline / `neo.css` skin) |
| Backend | Single-file Python 3 stdlib server (`server/api.py`), no extra dependencies |
| Deployment | GitHub Pages / Vercel / nginx + systemd |

## Quick Start

Requirements: Node.js **18+**; Python 3.9+ optional (read-only browsing needs no backend).

```bash
# Clone and install
git clone https://github.com/Escap1ng/Escaping-Notes.git
cd Escaping-Notes
npm install

# Run the frontend (development)
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
| `npm run build` / `build:pages` | Production build; the latter switches on the `/Escaping-Notes/` base and hash router |
| `npm run preview` | Serve `dist/` the way production would |
| `npm run seo:build` | Regenerate SEO artefacts only (`dist/rss.xml`, `dist/sitemap.xml`) |
| `npm run og:build` | Redraw the share card `public/og.png` (1200×630, generated with Node only, committed) |
| `npm run font:build` | Re-subset the display font (needs Noto Serif SC locally; the output is committed, so this is rarely needed) |

## Route Map

| Route | Page | Metaphor |
| --- | --- | --- |
| `/` | Home · long-exposure star trails | A camera shooting the night |
| `/blog` | Articles | Cabinet of plates |
| `/blog/:slug` | Article | Falling into a variable star |
| `/updates` | Activity | Pulse log |
| `/records` | Records | String table of tracks |
| `/projects` | Projects | Payload bay |
| `/wall` | Guestbook | Echo wall |
| `/about` | About | Writing "me" beyond the horizon |
| `/admin` | Console | Backyard of the observatory |

## Project Structure

```text
├── index.html             # Shell: theme bootstrap script, SEO/OG metadata
├── server/api.py          # Backend: content / auth / guestbook / RSS / OG injection / record sync
├── content/posts/         # Markdown posts (frontmatter)
├── public/                # Static assets: favicon, robots.txt, og.png
├── scripts/               # Build-time scripts (Node, zero dependencies)
│   ├── build_font.mjs     #   display-font subsetting
│   └── build_seo.mjs      #   rss.xml / sitemap.xml / og.png
├── docs/                  # design-neo.md design spec · manual.md handbook
└── src/
    ├── assets/fonts/      # Self-hosted subset font + OFL licence
    ├── components/neo/    # StarTrails device · HorizonHero · NeoSiteHeader · NeoCursor …
    ├── config/            # narrative.js copy layer · site.js site info · content seeds
    ├── lib/               # api / auth / content / posts / theme / music / records / lens / debounce / focus
    ├── styles/            # tokens.css token baseline · neo.css the site skin
    └── views/neo/         # All page views
```

## Deployment

Full steps for all three targets (Vercel mirror / GitHub Pages mirror / self-hosted nginx + systemd), including the nginx config and ICP filing notes, live in **[docs/manual.md §4](docs/manual.md#4-上传方法部署上线)** (Chinese). Key points:

- Login, publishing, the guestbook and cross-device view counts need the backend — only a self-hosted server runs the full version; both free platforms are read-only mirrors
- Always enable HTTPS once login is involved
- Backup = copy the server's `data/` directory

## Documentation

- [docs/design-neo.md](docs/design-neo.md) — the single source of truth for the interface design (concept, colour system, component contracts, developer guide; Chinese)
- [docs/manual.md](docs/manual.md) — handbook for editing, adapting and deploying (Chinese)

## License & Usage Terms

1. **Nature** — This project (source code, design documents, visual and interaction design, and copy included) is the author's personal work for learning and practice, intended solely for individual study, research and non-commercial exchange.
2. **No commercial use** — Without prior written permission, no part of this project may be used commercially or monetized in any way.
3. **Originality protection** — The core original designs (the "Long-Exposure Star Trails" metaphor, visual language and star-trail devices) may not be copied, imitated or republished under another name without permission.
4. **Citation** — Learning-purpose references must clearly credit the project and the author, and keep this notice.
5. **Disclaimer** — The project is provided "as is", without warranty of any kind; the author is not liable for any loss arising from its use.
6. **Licensing contact** — chunqi-yu@outlook.com.

Fonts: the display subset is derived from Noto Serif SC (SIL OFL 1.1); the full licence is at [src/assets/fonts/LICENSE-OFL.txt](src/assets/fonts/LICENSE-OFL.txt).

© 2026 Escap1ng · All rights reserved
