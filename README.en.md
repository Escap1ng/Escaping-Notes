<div align="center">

# Escaping Notes

**A Stargazing Journal · DOPPLER DESCENT**

> Ink cast into the abyss, the stars startle and never return; light hoarded in these pages, the tide recedes yet the echo remains.

[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883?style=for-the-badge&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Canvas 2D](https://img.shields.io/badge/Canvas%202D-Hand--drawn%20Star%20Trails-1a9fff?style=for-the-badge)](src/components/neo/StarTrails.vue)
[![Backend](https://img.shields.io/badge/Backend-Python%203%20Stdlib-3776ab?style=for-the-badge&logo=python&logoColor=white)](server/api.py)
[![License](https://img.shields.io/badge/License-Personal%20Use%20Only-d42b2b?style=for-the-badge)](#license--usage-terms)

**[Live Demo](https://escap1ng.github.io/Escaping-Notes/)** · **[escaping.top](https://escaping.top)** · **[中文 README](README.md)**

</div>

---

## About

Escaping Notes is a hand-built personal stargazing journal. The landing screen is a camera on a tripod mid long exposure — thousands of concentric star-trail arcs rotating rigidly around an offset celestial pole, accumulating and decaying, exactly like the lines you write through one northern night.

- **Posts as variable stars** — every article is a pulsing fixed star; hover blooms a conical diffraction cross, click to fall into the prose
- **Scroll as time** — the deeper you dive, the longer the exposure window and the faster the sky turns; header to footer is one full night shoot
- **Pointer as gravity** — star trails inside the cursor radius locally accelerate and curl, like a light-painting torch sweeping the sky
- **Easter eggs as narrative** — triple-click the signature to summon a meteor shower; every page submerges one giant ghost glyph as the author's mark

## Features

- 🎨 **Dual themes** — Deep Space (cold white / warm white / amber trails) and Paper (astronomical dry plate: ink trails + vermilion accents), one click to switch, preference remembered
- 🧮 **Zero-dependency aesthetics** — no webfonts, no third-party UI kits, no chart libraries; every visual is hand-drawn per frame with Canvas 2D
- 🛰 **Graceful degradation** — when the API is unreachable the site falls back to bundled seed data: still a complete offline plate
- ♿ **Accessibility & performance** — static fast-forwarded plate under `prefers-reduced-motion`; pixel-budget-capped DPR, single rAF loop, visibility-aware pausing
- ✍️ **Full-featured admin** — edit posts, updates, records and site info from `/admin`; three role tiers; guestbook and RSS included

## Tech Stack

| Layer | Choice |
| --- | --- |
| Frontend | Vue 3 (Composition API) + Vite + Vue Router |
| Rendering | Canvas 2D with an offscreen accumulation buffer (long-exposure plate simulation) |
| Backend | Single-file Python 3 stdlib server (`server/api.py`), zero dependencies |
| Deployment | GitHub Pages / Vercel / nginx + systemd |

## Quick Start

```bash
# Clone and install
git clone https://github.com/Escap1ng/Escaping-Notes.git
cd Escaping-Notes
npm install

# Run the frontend (development)
npm run dev

# Run the backend (another terminal, zero dependencies)
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
├── server/api.py          # Zero-dep backend: content / auth / guestbook / RSS / OG injection
├── content/posts/         # Markdown posts (frontmatter)
├── docs/                  # design-neo.md design spec · manual.md handbook
└── src/
    ├── components/neo/    # StarTrails device · HorizonHero · NeoCursor ...
    ├── config/            # narrative.js copy layer · site.js site info
    ├── lib/               # api / auth / content / posts / theme / music ...
    ├── styles/            # tokens.css token baseline · neo.css the site skin
    └── views/neo/         # All page views
```

## Documentation

- [docs/design-neo.md](docs/design-neo.md) — the single source of truth for the interface design (concept, color system, per-page notes; Chinese)
- [docs/manual.md](docs/manual.md) — handbook for editing, adapting and uploading (Chinese)

## License & Usage Terms

1. **Nature** — This project (source code, design documents, visual and interaction design, and copy included) is the author's personal work for learning and practice, intended solely for individual study, research and non-commercial exchange.
2. **No commercial use** — Without prior written permission, no part of this project may be used commercially or monetized in any way.
3. **Originality protection** — The core original designs (the "Doppler Descent" metaphor, visual language and star-trail devices) may not be copied, imitated or republished under another name without permission.
4. **Citation** — Learning-purpose references must clearly credit the project and the author, and keep this notice.
5. **Disclaimer** — The project is provided "as is", without warranty of any kind; the author is not liable for any loss arising from its use.
6. **Licensing contact** — chunqi-yu@outlook.com.

© 2026 Escap1ng · All rights reserved
