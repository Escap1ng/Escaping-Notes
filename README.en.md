<div align="center">

# Escaping Notes

**STAR TRAILS · A Long Exposure of the Night Sky**

> Ink cast into the abyss, the stars startle and never return; light hoarded in these pages, the tide recedes yet the echo remains.

[**Live demo → escaping.top**](https://escaping.top)

[![Release](https://img.shields.io/github/v/release/Escap1ng/Escaping-Notes)](https://github.com/Escap1ng/Escaping-Notes/releases)
[![License](https://img.shields.io/badge/Content%20CC%20BY--NC--SA%20·%20Code%20Personal%20Use-4d4d4d)](#license--usage-terms)

[中文](README.md) · **English**

</div>

<table>
  <tr>
    <td width="50%"><img src="docs/assets/readme/plate-deep-space.png" alt="Dark theme plate: hundreds of concentric star-trail arcs accumulating around an offset celestial pole" title="Dark"></td>
    <td width="50%"><img src="docs/assets/readme/plate-paper.png" alt="The same plate on the light theme: slate/graphite trails laid over a dry plate, vermilion only on the brightest few" title="Light"></td>
  </tr>
</table>

Left dark / right light. Neither is a screenshot: both are plates recomputed from the site's own constants (`npm run art:build`), drawing the trail layer only, and recomputing the steady-state plate that `prefers-reduced-motion` users are shown. They were lifted by a ×2.8 / ×1.6 developing gain, so the site itself is darker than they look.

---

## The camera keeps the exposure

This is a personal blog and journal that treats writing as a long exposure of the night sky. One camera set up on the landing screen keeps the time, and posts, updates, music, images and projects all land on the same plate. Three devices:

- **Scroll as time:** within the landing screen, the further down you go the longer the exposure window and the faster the sky turns (1 → 3.2×); it saturates after 1.1 viewport heights
- **Pointer as time dilation:** trails within a 180px cursor radius locally accelerate and curl, fastest at the centre (up to 2.8×)
- **Meteors as narrative:** one falls every 6–9s, lives 900ms, at most 9 in frame; while the player is running the gap is squeezed to 40% of its range and relaxes back on its own

Trails are painted only inside the landing screen, but the deposition is site-wide: the plate pixels and the clock are singletons in `src/lib/sky.js`, so changing routes never re-lays the plate, and coming back to the top finds the same arcs denser. Below the fold, photographs take over.

Flow curves, mask profiles and meteor parameters are recorded in [docs/design.md](docs/design.md) §3.

## Interface

- Switching theme no longer swaps the mountain: the dark landing screen is a darkened bake of the same framing, both themes share one ridge polyline, and each theme deposits its own plate to keep colours from bleeding
- The default is light and the first frame deliberately ignores `prefers-color-scheme`: the landing screen is a bright photograph, and following the system into dark would float a bright image on black
- Trails are drawn frame by frame with an offscreen accumulation buffer (Canvas 2D) and masked off along the ridge with `destination-in`, keeping ~60% of their brightness near the crest and feathering over 26px
- Plate blur and card surface are runtime parameters: a 0–12px slider (defaulted to full) and two radios (opaque / translucent) in the settings card, remembered in `localStorage`
- Every screen is assembled from one set of tokens and primitives: four scale groups (6 spacing steps, 11 type sizes, 3 radii, 4 pointer-feedback tokens), a card token group, buttons in "2 sizes × 4 semantics". No raw font sizes or durations inside components, so changing a scale updates the whole site
- Below the fold everything rides on one photographic plate shared site-wide: five slots on a carousel, 10s each, and on the dark theme all five tokens point to the same file so nothing changes at night
- Focus traps live in the header drawer, the search card, the player card, the settings card and both lightboxes, and return focus to whatever opened them; `Esc` or a click outside the reading plate returns to the list; route changes are announced through the live region in `App.vue`
- `prefers-reduced-motion` gets a full static fallback (trails settle on the steady-state plate, the carousel stops, transitions do not blur), and touch targets are at least 44px — reusing the primitives gives you that for free
- Skeleton cards while the archive loads, distinct copy for "nothing here yet" vs "no search results", and tag/keyword filters written into the URL query, so a filtered view is shareable and survives reload
- `/gallery` pins every image the site has used to one wall of Polaroids, tilt hashed from the src and entry staggered per card; the lightbox `Teleport`s to `body` and answers both keyboard paging and swipes
- Vue and Vue Router are the only runtime dependencies. There are no third-party UI kits, chart libraries or font CDNs, and the display faces are two self-hosted subset woff2 files (a serif for body, a Didone for the masthead)
- The landscape plate lives on `App.vue`, not in each page, so routing never repaints it. The landing photo is the home page's LCP element, so the inline first-paint script in `index.html` preloads it for the active theme and it starts alongside the stylesheet. The persistent header avoids `backdrop-filter`; glass is left to the reading panel, the landing drawer, the nav drawer and the two lightboxes
- A scrim-free landscape photo cannot reach WCAG AA for naked text; the worst measured point is 1.0–1.8:1 regardless of gradient shape. So the plate stays scenery and body copy always lands on cards and reading panels. `npm run check:contrast` recomputes the theme tokens against a solid ground before every commit, which does not cover the composited photo

## Two load-bearing designs, in figures

### The plate layer hangs on `App.vue` — one `fixed` containing-block trap

<img src="docs/assets/readme/plate-layer.svg" alt="Cross-section of the site-wide backdrop layer: the photo at full strength along the top sinking into the page colour between 18% and 78%, the five carousel slots on a 50 second cycle, and measured contrast for naked text versus text on a card" width="920">

Below the fold the landscape is one `position: fixed` `.sub-plate` layer living in `App.vue`, shared by the home drawer and every secondary page. It has to be there: `fall` puts a `filter` on the page root, and a filter becomes the containing block for `position: fixed` descendants. The same layer mounted inside `HomeView` measured as a `.home` box (587×1629) scrolling with the document, so it was not a stationary backdrop at all. The other half is that each carousel slot carries its own sinking gradient: write it once on the parent and the slot that fades up covers the dimming, taking the text contrast with it. The measurements behind all three decisions are recorded in the comments of `src/App.vue` and `src/lib/plate.js`.

### The `fall` afterimage — two pages on screen for 260ms

<img src="docs/assets/readme/fall-timing.svg" alt="Timing diagram of the fall transition: the 0.44s enter and the 0.26s leave run in parallel and overlap for 260ms" width="920">

Now that the plate persists across routes, `fall` is the only transition left: enter and leave run in parallel without `out-in`, and for the 260ms they overlap both pages are on screen, both blurred; that overlap is the afterimage. During those 260ms it must be the same plate still being exposed, so `claimPlate()` in `src/lib/sky.js` locks deposition only, never redraw, and the camera handing the plate over keeps drawing it every frame. Otherwise it freezes mid-frame while fading out, which is where the stutter on switching came from.

## Quick start

Requirements: Node.js 22 or newer (`npm test` lets node expand the case list inside `tests/`, which needs 21 or newer; CI and the author's machine run 24).

```bash
git clone https://github.com/Escap1ng/Escaping-Notes.git
cd Escaping-Notes && npm install

npm run dev              # Vite dev server with HMR
npm run build            # post receipt + dist/ (rss.xml, sitemap.xml, one static shell per route)
npm run check            # the four gates in sequence (content / docs / naming / contrast) — run this before committing
npm test                 # everything under tests/, no test framework
```

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run preview` | Serve `dist/` the way production would |
| `npm run seo:build` | Regenerate SEO artefacts only (`dist/rss.xml` — last 20 items, with full text and categories; `dist/sitemap.xml`) |
| `npm run og:build` | Redraw the share card `public/og.png` (1200×630, procedural star trails drawn with Node built-ins, no text, committed) |
| `npm run art:build` | Redraw the two plates at the top of the README (constants are read out of the source by regex and it throws if they are gone, so re-run after touching star-trail parameters) |
| `npm run bg:build` | Re-bake the site backdrops in `public/plates/*.jpg` (originals live in `plates-src/`, needs local PowerShell, commit the output) |
| `npm run cover:build` | Re-bake article covers: bakes each roll's own `*-src.jpg` into `cover.jpg` beside it in `content/posts/<slug>/` (no mapping table in the script; same requirements) |
| `npm run font:build` | Re-subset the body serif (needs Noto Serif SC locally; the output is committed, so this is rarely needed) |
| `npm run font:build:didone` | Re-subset the masthead Didone (Playfair Display, uppercase and space only; the variable source TTF lives in `fonts-src/` and is not committed — fetch steps are in the script header) |
| `npm run check:content` | The posting gate and receipt: fails on a malformed date, a misspelled frontmatter key, or an image referenced from prose that is not in that roll (also runs inside `npm run build` and in CI) |
| `npm run check:docs` | Checks that every file path and section reference in the docs still resolves, and that the route table below matches `src/router` |
| `npm run check:naming` | Naming-convention scan; non-zero exit on a violation |
| `npm run check:contrast` | Recomputes WCAG contrast from the two theme blocks in `site.css`; non-zero exit if a text token fails |

What `npm test` guards is grouped by the filenames in `tests/`: the content layer (every posting rule probed with its own fake sample, a sweep proving both shores share one parser, and the single door all site data must pass through), the release layer (per-page shell heads and placement, every URL advertised in the sitemap backed by a file, legacy `#/` links accepted or rejected, one routing mode only, drafts never shipping), rendering and the URL injection surface, parameters that must never drift (the three blur defaults, the card-surface setting, the first-paint theme, the preloaded landing photo versus `site.css`), the landing copy contract, pointer feedback and token single sourcing, the gallery list against the asset manifest, the three project write-up fields, and both detail pages sharing one return mechanism.

## Adding things

There is no admin UI — everything is a file in this repo, and pushing publishes it:

- **A post is a directory.** `content/posts/<slug>/index.md`, and the directory name is the URL (`/blog/<slug>`). No path to register for the cover: if the folder contains `cover.jpg`, that is the cover — the archive card, the full-width image on top of the article, the gallery wall and the share card all use the same file. Drop the untouched photo next to it named `*-src.jpg` and run `npm run cover:build` to bake it in place. Inline illustrations live in the same folder and are referenced by bare filename; a typo or a missing file fails the build instead of shipping a broken image.
- Six frontmatter keys are about display (`title` / `date` / `tags` / `summary` / `alt` / `imagePos`), two are about publishing: `draft: true` keeps a roll visible only in `npm run dev`, and `movedFrom: [old-slug]` keeps links alive after a rename.
- **Site-owned content** (activity, projects, gear, playlist, plates, friend links) lives in `src/data/`, one file per kind, and reaches the UI only through `src/data/index.js` — that single door. Adding a kind means adding a file and one line on the door; no view gets a second path to the same array.
- **The build is the pre-flight check.** `npm run build` first validates every roll (a malformed date, a misspelled key, an image referenced from prose that is not in that roll, two rolls claiming one old slug — any of these stops the artefact from being produced), then writes `rss.xml`, `sitemap.xml` and one static shell per route.

## Route Map

All 10 routes are lazy-loaded and each carries `meta.t` for the document title and the screen-reader announcement; the header nav shows 7 of them, and the two `:slug` detail pages plus the trailing catch-all are not on the bar — anything unmatched renders 这里没有页面 ("there is no page here"); site copy is Chinese-only.

| Route | Page | What it is |
| --- | --- | --- |
| `/` | Home · long-exposure star trails | Photo landscape band + trails + typed title + drawer |
| `/blog` | Articles | Archive, tag/keyword filters live in the URL |
| `/blog/:slug` | Article | A single post on a frosted-glass plate; its cover opens the lightbox |
| `/updates` | Activity | Short-log feed |
| `/records` | Music | Self-hosted track list + the player card |
| `/gallery` | Gallery | Wall of every image the site has used |
| `/projects` | Projects | Grid of project cards |
| `/projects/:slug` | Project write-up | One project on the same frosted-glass plate as an article; `Esc` or a click outside returns to the list |
| `/about` | About | Bio · live counters · gear · friend links |
| `/:pathMatch(.*)*` | 404 | The fallback for anything unmatched; its tab title and its page heading are the same sentence |

## Project Structure

```text
├── index.html             # Shell: inline first-paint script (theme / plate blur / card surface / preloading the landing photo for that theme, so none of them flashes) + SEO/OG metadata
├── content/posts/         # Posts: one directory per post (`<slug>/index.md` plus its own cover and images) — the directory name is the URL
├── public/                # favicon, robots.txt, og.png + two derived-asset dirs that must be committed (plates/ · audio/)
├── scripts/               # Build-time and content-refresh scripts, named by verb family (build_* / check_* / sync_*)
├── tests/                 # Zero-dependency safety net: node --test
├── docs/                  # design.md spec · manual.md handbook · assets/readme/ README figures
└── src/
    ├── components/        # seven flat: the camera / landing type layer / header + drawer / footer / player card / settings card / search card
    ├── data/              # everything site-owned lives here, index.js being the single door
    ├── lib/               # sky the plate and the clock · ridge the mask · plate the layer · schema the posting rules · posts the loader · markdown · theme / storage / …
    ├── styles/site.css    # the only stylesheet: structural scales + the two theme palettes + site-wide primitives
    └── views/             # 10 views, one file each, flat
```

Originals (`plates-src/` · `music/` · `fonts-src/` · each roll's `*-src.*`) are gitignored — do not report that as a leak. The file-by-file annotated version is in **[docs/manual.md §0](docs/manual.md)** (Chinese).

## Deployment

Full steps for both targets (GitHub Pages / Vercel read-only mirror) live in **[docs/manual.md §4](docs/manual.md#4-上传方法部署上线)** (Chinese). Key points:

- GitHub Pages is bound to the apex domain `escaping.top`; DNS records, verification commands and the certificate steps are in `docs/manual.md` §4.2
- Because the domain is bound at the root, `base` is fixed at `/` and the artefacts carry no repository prefix; there is a single routing mode (history)
- Pages never falls back to `index.html` for unknown paths, so the build writes a real file per route (`dist/blog/<slug>/index.html`, …) plus a `dist/404.html` — deep links answer 200 instead of 404, and the share card is the article's own cover
- Legacy `/#/blog/<slug>` links are rewritten to the path form before the app mounts (`src/main.js`), so links already posted elsewhere do not silently land on the home page

## Documentation

- [docs/design.md](docs/design.md) — the single source of truth for the interface design (concept, colour system, component contracts, developer guide; Chinese)
- [docs/manual.md](docs/manual.md) — handbook for editing, adapting and deploying (Chinese)
- [docs/assets/readme/README.md](docs/assets/readme/README.md) — where the four README figures come from, how to re-run them, and what to do if you want real screenshots

## License & Usage Terms

Two things are licensed separately here: **blog content** is under CC BY-NC-SA 4.0, **source code and design** keep the original notice.

| Subject | Terms |
| --- | --- |
| **Blog content** — article text, original images and copy on this site | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/): you may copy, adapt and redistribute it, with attribution, for non-commercial purposes only, and derivatives must be published under the same licence |
| **Source code & design** — `src/`, `scripts/`, `docs/`, the visual and interaction design and the star-trail device | the non-commercial notice, i.e. the five items below |
| **Fonts** | the two display subsets are derived from Noto Serif SC and Playfair Display respectively (both SIL OFL 1.1); the full licence is at [src/assets/fonts/LICENSE-OFL.txt](src/assets/fonts/LICENSE-OFL.txt) |
| **Third-party material** | embedded playlists, blogroll links and off-site content keep their own terms and are not covered by this section |

The five items below govern only the "source code & design" row above:

1. **No commercial use** — Without prior written permission, no part of the source code or design may be used commercially or monetized in any way.
2. **Originality protection** — The core original designs (the "Long-Exposure Star Trails" metaphor, visual language and star-trail devices) may not be copied, imitated or republished under another name without permission.
3. **Citation** — Learning-purpose references must clearly credit the project and the author, and keep this notice.
4. **Disclaimer** — The project is provided "as is", without warranty of any kind; the author is not liable for any loss arising from its use.
5. **Licensing contact** — chunqi-yu@outlook.com.

© 2026 Escap1ng · Blog content under CC BY-NC-SA 4.0; source code and design all rights reserved
