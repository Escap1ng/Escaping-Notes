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

Escaping Notes is a personal blog and journal that treats writing as a long exposure of the night sky — the camera set up on the landing screen keeps the exposure for me: posts, updates, music, images and projects all land on the same plate. All three devices below grow out of that one camera —

- **Scroll as time** — the further down you go, the longer the exposure and the faster the sky turns; header to footer is one full night shoot
- **Pointer as time dilation** — star trails inside the cursor radius locally accelerate and curl
- **Easter eggs as narrative** — meteors occasionally cross the plate, their bright heads flaring conical diffraction crosses

<table>
  <tr>
    <td width="50%"><img src="docs/assets/readme/plate-deep-space.png" alt="Dark theme plate: hundreds of concentric star-trail arcs accumulating around an offset celestial pole" title="Dark"></td>
    <td width="50%"><img src="docs/assets/readme/plate-paper.png" alt="The same plate on the light theme: slate/graphite trails laid over a dry plate, vermilion only on the brightest few" title="Light"></td>
  </tr>
</table>

> Left dark / right light: both are **plates recomputed from the site's own constants** (`npm run art:build`), not screenshots; they were lifted by a ×2.8 / ×1.6 developing gain, so **the site itself is darker**.

## Features

- **Dual themes** — dark (cold white / warm white / amber trails) and light (astronomical dry plate: slate/graphite trails + vermilion accents); trail colour temperature follows magnitude (dim stars cool, a few bright stars warm). One click to switch, preference remembered; the default is light and the first frame deliberately ignores `prefers-color-scheme`, because the landing screen is a bright photograph
- **Unified design system** — every screen is assembled from one set of tokens and primitives: four scales (spacing / type-size / line-height / font-weight), card tokens, buttons in "2 sizes × 4 semantics", inputs as "underline for single-line, hairline box for multi-line", three-state notices, single-character icons; no raw font sizes or spacings inside components (fluid display sizes use `clamp()`), so changing a scale updates the whole site
- **Canvas 2D rendering** — star trails are drawn frame by frame with an offscreen accumulation buffer; no third-party UI kits, chart libraries or font CDNs (the only runtime dependencies are Vue and Vue Router)
- **Graceful degradation** — when the API is unreachable (or times out) the site falls back to bundled seed data: still a complete offline plate
- **Accessibility** — focus traps in the drawer and lightbox, route changes announced to screen readers, a focusable skip link and `#main`, touch targets ≥44px, and a full static fallback under `prefers-reduced-motion`
- **Performance** — the secondary-page backdrop is frame-capped at 30fps, resize listeners are debounced by 150ms, `--shift` is cached instead of reading `scrollHeight` per frame, persistent surfaces avoid `backdrop-filter`, and the lens glow moves by transform
- **Reading readability** — the sky under body text is dimmed by one site-wide adaptive "dark band" (strength set per theme) instead of every card wearing its own scrim; the article page adds a frosted-glass plate for long reads, and foreground contrast meets WCAG AA
- **Feedback loop** — skeleton cards while the archive loads, distinct copy for "nothing here yet" vs "no search results", and search/tag filters stored in the URL (shareable, survives reload)
- **Full-featured admin** — edit posts, updates, playlist and site info from `/admin`; the Music page can be refreshed from a public QQ Music playlist in one click; two role tiers (owner / admin); RSS included

## Two load-bearing designs, in figures

### The dark band — readability is owned in exactly one place

<img src="docs/assets/readme/dark-band.svg" alt="Cross-section of the dark band: the middle 1120px of the viewport is dimmed to --sky-k, feathered back to full strength on both sides, with measured contrast before and after" width="920">

The sky under body text on secondary pages is dimmed by **one** `mask-image` gradient on `StarTrails.vue`: the central `--sky-band` (aligned to the 1120px content column) drops to `--sky-k`, and each side feathers back to full strength over `--sky-feather`. Before this, only the article page had a legibility plate across 11 secondary pages, and the same text colour measured anywhere from 15.7:1 to 1.7:1 on its actual composited ground — that is the numeric shape of "hard to read, and it feels fragmented". The coefficient is solved against the **peak**, not the median, because the trails move and a given text pixel's ground brightens and dims over time. Derivation and trade-offs: [docs/design.md §3.3](docs/design.md#33-暗带契约天空与文字的位置协议) (Chinese).

### The `fall` afterimage — two pages on screen for 260ms

<img src="docs/assets/readme/fall-timing.svg" alt="Timing diagram of the fall transition: the 0.44s enter and the 0.26s leave run in parallel and overlap for 260ms" width="920">

Now that the plate persists across routes, `fall` is the only transition left: the enter runs 0.44s and the leave 0.26s in parallel, and for the **260ms** they overlap both pages are on screen, both blurred — that overlap is the afterimage. During those 260ms both cameras are looking at **the same plate, still being exposed**: `src/lib/sky.js` locks deposition only (`claimPlate`), never redraw, otherwise the camera handing over the plate freezes mid-frame, which is exactly where the "stutter on switch" came from.

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
| `npm run art:build` | Redraw the two plates at the top of this page (constants are read from the source, so re-run after touching star-trail parameters) |
| `npm run bg:build` | Re-bake the site backdrops in `public/plates/*.jpg` (hero ridge + five-slot drawer carousel + dark scrim; originals live in `plates-src/`, needs local PowerShell; commit the output) |
| `npm run cover:build` | Re-bake the article covers in `public/posts/*.jpg` (originals live in `plates-src/`, which is not committed; re-run after changing them, and commit the output) |
| `npm run font:build` | Re-subset the display font (needs Noto Serif SC locally; the output is committed, so this is rarely needed) |
| `npm run check` | Runs the four gates below in sequence (api / docs / naming / contrast) — the one command to run before committing |
| `npm run check:api` | Diffs the endpoint table in `docs/api.md` against the routes in `server/api.py`, both ways; non-zero exit on drift |
| `npm run check:docs` | Checks that every file path and section reference in the docs still resolves, and that the README route table matches `src/router` |
| `npm run check:naming` | Naming-convention scan; non-zero exit on a violation |
| `npm run check:contrast` | Recomputes WCAG contrast from the two theme blocks in `neo.css`; non-zero exit if a text token fails |

## Route Map

| Route | Page | Metaphor |
| --- | --- | --- |
| `/` | Home · long-exposure star trails | A camera shooting the night |
| `/blog` | Articles | Cabinet of plates |
| `/blog/:slug` | Article | Examining one plate |
| `/updates` | Activity | Pulse log |
| `/records` | Music | String table of tracks |
| `/gallery` | Gallery | Every plate the site has used, pinned to one wall |
| `/projects` | Projects | Things still turning |
| `/about` | About | Writing "me" beyond the horizon |
| `/login` | Log in | utility page, no metaphor |
| `/admin` | Console | Backyard of the observatory |

> Any unmatched route renders the 404 page, titled 这里没有页面 ("there is no page here") — site copy is Chinese-only.

## Project Structure

```text
├── index.html             # Shell: theme bootstrap script, SEO/OG metadata
├── server/api.py          # Backend: content / auth / RSS / OG injection / record sync
├── content/posts/         # Markdown posts (frontmatter)
├── public/                # Static assets: favicon, robots.txt, og.png, plus three derived-asset dirs that **must be committed**
│                          #   plates/ (backdrops) · posts/ (covers) · audio/ (self-hosted tracks) — see "Scripts" for the bake commands
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
└── src/
    ├── assets/fonts/      # Self-hosted subset font + OFL licence
    ├── components/        # under neo/: StarTrails device · HorizonHero · NeoSiteHeader …; one level up are MusicCard.vue (the player card the header opens) and SettingsCard.vue (theme settings)
    ├── config/            # narrative.js copy layer · site.js site info · content seeds (records.js is generated — don't hand-edit)
    ├── lib/               # api / auth / content / posts / frontmatter / markdown / theme / storage / music / records / gallery / plate / ridge / lens / shift / sky / debounce / focus
    ├── styles/            # tokens.css token baseline · neo.css the site skin
    └── views/             # 11 views, one file each, flat: 9 content pages + AdminView / LoginView
```

## Deployment

Full steps for all three targets (Vercel mirror / GitHub Pages mirror / self-hosted nginx + systemd), including the nginx config and ICP filing notes, live in **[docs/manual.md §4](docs/manual.md#4-上传方法部署上线)** (Chinese). Key points:

- The GitHub Pages mirror is bound to the apex domain `escaping.top` (`www` is reserved for the self-hosted server); DNS records, verification commands and the certificate steps are in the handbook §4.2
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
