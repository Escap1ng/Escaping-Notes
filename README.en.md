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

- **Dual themes** — Deep Space (cold white / warm white / amber trails) and Paper (astronomical dry plate: ink trails + vermilion accents), one click to switch, preference remembered
- **Canvas 2D rendering** — star trails are drawn frame by frame with an offscreen accumulation buffer; no third-party UI kits or chart libraries
- **Graceful degradation** — when the API is unreachable the site falls back to bundled seed data: still a complete offline plate
- **Accessibility & performance** — static fast-forwarded plate under `prefers-reduced-motion`; pixel-budget-capped DPR, single rAF loop, visibility-aware pausing
- **Full-featured admin** — edit posts, updates, records and site info from `/admin`; the record can be synced with a public QQ Music playlist in one click; three role tiers; guestbook and RSS included

## Tech Stack

| Layer | Choice |
| --- | --- |
| Frontend | Vue 3 (Composition API) + Vite + Vue Router |
| Rendering | Canvas 2D with an offscreen accumulation buffer (long-exposure plate simulation) |
| Backend | Single-file Python 3 stdlib server (`server/api.py`), no extra dependencies |
| Deployment | GitHub Pages / Vercel / nginx + systemd |

## Quick Start

```bash
# Clone and install
git clone https://github.com/Escap1ng/Escaping-Notes.git
cd Escaping-Notes
npm install

# Run the frontend (development)
npm run dev

# Run the backend (another terminal)
python server/api.py

# Production builds
npm run build          # own domain (history router)
npm run build:pages    # GitHub Pages mirror (hash router)
```

## Route Map

| Route | Page | Metaphor |
| --- | --- | --- |
| `/` | Home · long-exposure star trails | A camera shooting the night |
| `/blog` | Archive | Cabinet of plates |
| `/blog/:slug` | Article | Falling into a variable star |
| `/updates` | Activity | Pulse log |
| `/records` | Records | String table of tracks |
| `/projects` | Projects | Payload bay |
| `/wall` | Guestbook | Echo wall |
| `/about` | About | Writing "me" beyond the horizon |
| `/admin` | Console | Backyard of the observatory |

## Project Structure

```text
├── server/api.py          # Backend: content / auth / guestbook / RSS / OG injection / record sync
├── content/posts/         # Markdown posts (frontmatter)
├── docs/                  # design-neo.md design spec · manual.md handbook
└── src/
    ├── components/neo/    # StarTrails device · HorizonHero · NeoCursor ...
    ├── config/            # narrative.js copy layer · site.js site info
    ├── lib/               # api / auth / content / posts / theme / music / records ...
    ├── styles/            # tokens.css token baseline · neo.css the site skin
    └── views/neo/         # All page views
```

## Documentation

- [docs/design-neo.md](docs/design-neo.md) — the single source of truth for the interface design (concept, color system, per-page notes; Chinese)
- [docs/manual.md](docs/manual.md) — handbook for editing, adapting and uploading (Chinese)

## License & Usage Terms

1. **Nature** — This project (source code, design documents, visual and interaction design, and copy included) is the author's personal work for learning and practice, intended solely for individual study, research and non-commercial exchange.
2. **No commercial use** — Without prior written permission, no part of this project may be used commercially or monetized in any way.
3. **Originality protection** — The core original designs (the "Long-Exposure Star Trails" metaphor, visual language and star-trail devices) may not be copied, imitated or republished under another name without permission.
4. **Citation** — Learning-purpose references must clearly credit the project and the author, and keep this notice.
5. **Disclaimer** — The project is provided "as is", without warranty of any kind; the author is not liable for any loss arising from its use.
6. **Licensing contact** — chunqi-yu@outlook.com.

© 2026 Escap1ng · All rights reserved
