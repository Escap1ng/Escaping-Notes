<div align="center">

# Escaping Notes

**A blog built as a long exposure of the night sky**

The home screen is a camera left open. Scrolling speeds the night up; posts run by date, collections group by theme.

[**escaping.top**](https://escaping.top) · [中文](README.md)

[![Pages](https://img.shields.io/github/actions/workflow/status/Escap1ng/Escaping-Notes/deploy.yml?label=Pages&style=flat-square)](https://github.com/Escap1ng/Escaping-Notes/actions/workflows/deploy.yml)
[![Release](https://img.shields.io/github/v/release/Escap1ng/Escaping-Notes?style=flat-square)](https://github.com/Escap1ng/Escaping-Notes/releases)
[![Vue 3](https://img.shields.io/badge/Vue%203-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Node 22+](https://img.shields.io/badge/Node%2022%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/Content%20CC%20BY--NC--SA%20·%20Code%20Apache--2.0-4d4d4d?style=flat-square)](#license)

</div>

<img src="docs/assets/readme/hero-deep-space.png#gh-dark-mode-only" alt="Dark hero: concentric star-trail arcs accumulating around a centred pole, cold blue and warm white with a few amber cores, outer rings running out of frame" width="100%">
<img src="docs/assets/readme/hero-paper.png#gh-light-mode-only" alt="Light hero: slate and graphite-blue trails laid over a dry plate, vermilion on the brightest few, outer rings running out of frame" width="100%">

<sub>Not a screenshot: the steady-state plate recomputed offline from the site's own constants (`npm run art:build`, `ART_HERO=1` for the banner crop) — the very plate a `prefers-reduced-motion` visitor sees. Art and page share one pair of developing gains, so the density here is the density on the page.</sub>

---

## Three devices

| | |
| --- | --- |
| **Scroll as time** | Further down, the longer the exposure window and the faster the sky turns (1 → 3.2×) |
| **Pointer as time dilation** | Trails within a 180px cursor radius locally accelerate and curl, with a one-second inertia envelope rather than a hard edge |
| **Meteors as narrative** | One falls every 6–9s; denser while the player runs, relaxing back on its own |

The plate and the site clock are singletons: changing routes never re-lays the plate, and returning home the arcs continue the previous exposure.

## The ring

"That looks like a spiral, not a ring" turned out to be three measurable defects, not a matter of taste:

- **Sequence resonance** — the magnitude term `0.381966…` is exactly the complement of the angle sequence; the two sum to 1. Bright-star circular concentration R=0.996, all inside one 45° sector. Fixed with per-count tier quotas and evenly spread start angles.
- **Radius growing with angle** — correlation 0.998, an Archimedean spiral. A step permutation coprime with the tier count drops it to 0.205 without losing angular evenness.
- **Arcs of differing length** — in a real long exposure every star sweeps the same angle over the same interval. All stars now share one exposure window; hierarchy is carried by magnitude: line width, brightness, star cores.

Two more: no stroke thinner than 1.25px (sub-pixel strokes are the physical source of faint clutter), and star cores painted on the current-frame layer, never accumulated — accumulating turns them back into arcs.

<details>
<summary>Cross-sections: the plate layer and transition timing</summary>

<img src="docs/assets/readme/plate-layer-light.svg#gh-light-mode-only" alt="Cross-section of the site-wide plate: the photo is fully bright only at the top edge and sinks back into the page colour from 52% to 100%, with measured contrast for naked text and text on cards" width="920">
<img src="docs/assets/readme/plate-layer.svg#gh-dark-mode-only" alt="Cross-section of the site-wide plate: the photo is fully bright only at the top edge and sinks back into the page colour from 52% to 100%, with measured contrast for naked text and text on cards" width="920">
<img src="docs/assets/readme/fall-timing-light.svg#gh-light-mode-only" alt="Timing of the fall transition: 0.56s entering and 0.38s leaving run in parallel, overlapping for 380ms" width="920">
<img src="docs/assets/readme/fall-timing.svg#gh-dark-mode-only" alt="Timing of the fall transition: 0.56s entering and 0.38s leaving run in parallel, overlapping for 380ms" width="920">

The plate layer has to hang on `App.vue`: the transition puts a `filter` on the page root, and `filter` becomes the containing block for `fixed` descendants — mounted inside `HomeView` it measured as the scrolling `.home` box instead of a still backdrop. `fall` runs entering and leaving in parallel; during the 380ms overlap both pages are on stage and both blurred, and that blur is the double image. The measurements live in [docs/design.md](docs/design.md).

</details>

## What's here

- **One mountain, two themes** — the bright and dimmed versions of the same shot share a single ridge polyline; switching themes cross-develops the new plate in slices instead of clearing the night
- **A player console** — a platter of arcs around the pole that turns only while playing, a ring progress you can drag or drive from the keyboard, a wave fingerprint derived from the file name, a mute toggle that remembers
- **A narrow-screen menu** — three lines morph into a cross, every destination carries a one-line description, the current page gets a rule and a dot on top of the highlight
- **Keyboard equals pointer** — lens bar, diffraction spike and button sheen each have a `:focus-visible` rule beside their hover twin; focus traps, `Esc` to exit, `/` or `⌘K` for search
- **A full static path** — under `prefers-reduced-motion` trails settle on the steady-state plate, transitions do not blur, touch targets grow to 44px
- **CJK typography** — CJK/Latin autospacing, hanging punctuation, balanced heading wraps; no synthetic italics in quotes

One token set builds the whole interface; components never hard-code a size or a duration. Two self-hosted families, no CDN, no third-party UI kit, no backend.

## Two themes

<table>
  <tr>
    <td width="50%"><img src="docs/assets/readme/plate-deep-space.png" alt="Dark plate: concentric star-trail arcs accumulating around the pole, cold blue and warm white with a few amber cores, most of the sky left empty" title="Dark"></td>
    <td width="50%"><img src="docs/assets/readme/plate-paper.png" alt="Light plate: slate and graphite-blue trails laid over a dry plate, vermilion on the brightest few" title="Light"></td>
  </tr>
</table>

<sub>Left dark, right light: two steady-state plates from the same camera. Dark composites additively, light presses ink onto a dry plate; the hero above is their banner crop.</sub>

## Run it

Requires Node.js 22+.

```bash
npm install
npm run dev      # dev server
npm run build    # publishing gate + dist/
npm run check    # four gates: content / docs / naming / contrast
npm test         # 154 cases, no test framework
```

The build is the publishing self-check: a wrong date, a misspelled key or an image the roll does not contain turns it red and no output is emitted. Once green it also emits RSS, a sitemap and a static shell per route. Most tests carry a negative control — the same ruler pointed at a deliberately broken sample must turn red.

<details>
<summary>Other scripts</summary>

| Command | What it does |
| --- | --- |
| `npm run preview` | Preview `dist/` locally as production would serve it |
| `npm run art:build` | Recompute the two plates; `ART_HERO=1` for the hero (constants read from source; re-run after changing trail parameters) |
| `npm run bg:build` | Re-bake the site plates (needs local PowerShell; commit the output) |
| `npm run cover:build` | Bake each roll's `*-src.jpg` into `cover.jpg` |
| `npm run og:build` | Redraw the share card `public/og.png` |
| `npm run seo:build` | Re-run RSS and sitemap only |
| `npm run font:build` · `font:build:didone` | Re-cut the font subsets (output committed, rarely needed) |

</details>

## Adding things

No admin panel. Everything is a file; push to publish.

- **A post is a directory** — `content/posts/<slug>/index.md`, the directory name is the URL. A `cover.jpg` in that directory is the cover, shared by the list, the article top and the share card; inline images are referenced by file name only and a typo is caught at build time
- **Frontmatter** — `collection` is required; `draft: true` shows the roll only locally; `movedFrom: [old-slug]` keeps old links working after a rename
- **Projects** — one place in `src/data/projects.js`, ordered by GitHub stars descending, URL derived from the name
- **Copy** — all in `src/data/narrative.js`, no literals in components
- **Appearance** — tokens in `src/styles/site.css`

Details in [docs/manual.md](docs/manual.md).

## Route Map

All 10 routes are lazy-loaded; the header carries 6, detail pages and the catch-all are not in the bar.

| Route | Page |
| --- | --- |
| `/` | Home · long-exposure trails |
| `/blog` | Archive · counters and tag filters |
| `/blog/:slug` | Article · auto-inserted cover and lightbox |
| `/collections` | Collections overview |
| `/collections/:slug` | Collection index · a parent aggregates descendants |
| `/updates` | Timeline · hand-written plus automatic post entries |
| `/projects` | Project cards |
| `/projects/:slug` | Project intro |
| `/about` | About |

Any unmatched address lands on 404; the tab title and the on-page headline are the same sentence.

## Deployment

GitHub Pages is bound to the apex domain `escaping.top`; CI runs `test → check → build` on push and only publishes when green. Pages does not fall back for unknown paths, so the build writes a static shell per real route — deep links return 200 and the share card is that article's own cover. Vercel hosts a read-only mirror of the same output.

Full steps in [docs/manual.md §4](docs/manual.md#4-上传方法部署上线).

## Documentation

[docs/design.md](docs/design.md) is the single source of interface truth: concept, tokens, component contracts, and the rejected options with their measurements.
[docs/manual.md](docs/manual.md) is the handbook.
[docs/assets/readme/README.md](docs/assets/readme/README.md) explains where the figures come from and how to re-run them.

## License

**Blog content** (posts, original images and copy) under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/): attribution, non-commercial, share-alike.

**Source code and design** (`src/`, `scripts/`, `docs/`, the visual and interaction design) under [Apache-2.0](LICENSE): free to use, modify, distribute and use commercially, with notices retained. No trademark grant.

Fonts come from Noto Serif SC and Playfair Display, both SIL OFL 1.1; terms in [LICENSE-OFL.txt](src/assets/fonts/LICENSE-OFL.txt).

Provided "as is", without warranty of any kind. Licensing contact: chunqi-yu@outlook.com.

<div align="center">
<sub>© 2026 Escap1ng</sub>
</div>
