<div align="center">

# Escaping Notes

**STAR TRAILS · A Long Exposure of the Night Sky**

[**Live demo → escaping.top**](https://escaping.top)

[![Release](https://img.shields.io/github/v/release/Escap1ng/Escaping-Notes)](https://github.com/Escap1ng/Escaping-Notes/releases)
[![Pages](https://img.shields.io/github/actions/workflow/status/Escap1ng/Escaping-Notes/deploy.yml?label=Pages)](https://github.com/Escap1ng/Escaping-Notes/actions/workflows/deploy.yml)
[![Live](https://img.shields.io/badge/live-escaping.top-2f81f7)](https://escaping.top)
[![Vue 3](https://img.shields.io/badge/Vue%203-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite 5](https://img.shields.io/badge/Vite%205-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/Content%20CC%20BY--NC--SA%20·%20Code%20Apache--2.0-4d4d4d)](#license--usage-terms)

[中文](README.md) · **English**

</div>

<table>
  <tr>
    <td width="50%"><img src="docs/assets/readme/plate-deep-space.png" alt="Dark theme plate: concentric star-trail arcs accumulating around the celestial pole, cold blue and warm white with a few amber cores, most of the sky left empty" title="Dark"></td>
    <td width="50%"><img src="docs/assets/readme/plate-paper.png" alt="The same plate on the light theme: slate and graphite-blue trails laid over a dry plate, vermilion on the brightest few" title="Light"></td>
  </tr>
</table>

Left dark / right light. Neither is a screenshot: both are plates recomputed offline from the site's own constants (`npm run art:build`), drawing the trail layer only — recomputing the very steady-state plate a `prefers-reduced-motion` visitor sees. The art script and the live site share one pair of developing gains (×2.0 / ×1.42, `DEV_DEEP` / `DEV_PAPER` in `StarTrails.vue`), so the density here is the density on the page. The dark plate then gets a hue-locking highlight compression: all three channels are scaled by a single ratio into range, so the cold blue and vermilion are not clipped channel-by-channel into cream.

A personal blog built as a long exposure of the night sky: the home screen is a camera left open, posts run by date, collections group by theme. Fully static, fixed at build time, publish on push.

**Stack**: Vue 3 · Vue Router 4 · Vite 5 · Canvas 2D. No backend, no third-party UI kit, no font CDN.

**Contents**

- [The camera keeps the exposure](#the-camera-keeps-the-exposure)
- [How the ring is drawn](#how-the-ring-is-drawn)
- [Interface](#interface)
- [Three load-bearing designs](#three-load-bearing-designs)
- [Quick start](#quick-start)
- [Adding things](#adding-things)
- [Route Map](#route-map)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [License & Usage Terms](#license--usage-terms)

---

## The camera keeps the exposure

Writing as a long exposure of the night sky: one camera set up on the home screen keeps the time for me. Three devices:

- **Scroll as time:** within the landing screen, the further down you go the longer the exposure window and the faster the sky turns (1 → 3.2×), saturating past 1.1 viewport heights
- **Pointer as time dilation:** trails within a 180px cursor radius locally accelerate and curl, fastest at the centre (up to 2.8×); entering and leaving the cone rides a roughly one-second inertia envelope rather than a hard edge
- **Meteors as narrative:** one falls every 6–9s, lives 900ms, at most 9 in frame; while the player is running the gap is squeezed to 40% of its range and relaxes back on its own

Trails are painted only inside the home screen's cell; the plate pixels and the site clock are singletons in `src/lib/sky.js` — changing routes never re-lays the plate, and returning home the arcs continue the previous exposure. Below the fold, photographs take over.

Flow curves, mask profiles and meteor parameters are recorded in [docs/design.md](docs/design.md) §3.

## How the ring is drawn

This section records the rework behind several rounds of "that looks wrong". None of the three problems was a matter of taste; all three were measurable.

**1. Magnitude and angle drew from the same sequence.** The tier used to be `(i·0.381966…) mod 1`, and `0.381966… = 1 − 0.618034…` is exactly the complement of the angle sequence — the two sum to 1, so magnitude was fully determined by angle. At 220 stars the 12 bright ones had a circular concentration of **R=0.996**, all inside a single 45° sector: one side of the sky full of thick bright arcs, the other left with thin faint ones. Tiers now come from a per-count quota (bright 24% / mid 60% / dim 16%), and bright and mid start angles are spread evenly around the circle.

**2. Radius growing with angle is a spiral.** Even spacing was not enough: the slot index also drove the radius, giving a measured correlation of **0.998** — bright stars ran from `(r=0.075, θ=10°)` to `(r=0.955, θ=345°)`, an Archimedean spiral rather than concentric rings. Angle slots now pass through a step permutation coprime with the tier count; correlation drops to **0.205** while the slot set is unchanged, so angular evenness is not lost.

**3. Arcs of differing length are not physical.** In a real long exposure every star sweeps the same angle over the same interval. All stars now share one exposure window (`EXPOSURE_DEG = 64`) with only ±5% shutter unevenness; hierarchy is carried by magnitude instead — line width, brightness, star cores, which is what actually distinguishes stars in a photograph.

Two more: **sub-pixel strokes are the physical source of the faint clutter**, so no stroke is thinner than `LW_MIN = 1.25` CSS px and the dim tier recedes by colour rather than by being drawn unclearly; and **star cores are painted on the current-frame layer** (never accumulated — accumulating turns them back into arcs), so each trail carries a point-like star at its head, breathing in step with its own arc.

Current counts: 96 light / 62 dark (50 / 33 on narrow screens). The plate is allocated per viewport, capped at `MAXPX = 6e6` with a `MIN_DPR = 1.25` floor — every frame costs one full-screen `destination-out` plus one `drawImage`, so pixel count is the fixed overhead.

## Interface

**Visual**

- The landing screen carries only the English masthead: one line at 8.8vw on desktop (about 81% of the viewport), two lines at 15vw on phones; below the fold, cards by section
- One mountain across both themes: the dark landing plate is a dimmed version of the same shot, sharing a single ridge polyline; each theme deposits its own plate so colours never bleed. Switching themes now snapshots the old plate and cross-develops the new one in slices instead of clearing the night sky on the spot
- Light by default; the first frame deliberately ignores `prefers-color-scheme` — the landing photo is bright, and following the system into dark would lay a bright image on a black ground
- Trails are drawn frame by frame from an offscreen accumulation buffer (Canvas 2D), occluded along the ridge with `destination-in`: about 60% brightness kept near the ridge line, 26px feather
- Below the fold sits one photograph shared site-wide, a single resident plate; dark uses its own dimmed version, so the scenery never jumps at night
- The whole interface is built from one token set: 6 spacing steps, 11 type sizes, 4 line heights, 3 weights, 3 radii, 4 pointer-feedback tokens; one card token group, buttons in 2 sizes × 4 semantics. Components never hard-code a size or a duration — change the scale and the site follows
- Two self-hosted families: the body serif (Noto Serif SC) is split by `unicode-range` and fetched on demand; the masthead Didone is cut from Playfair Display, one file holding only capitals and spaces. No font CDN
- Chinese prose enables CJK/Latin autospacing (`text-autospace`) and hanging punctuation; headings wrap with `text-wrap: balance`, paragraphs with `pretty`. Older browsers ignore these and keep the previous behaviour

**Interaction**

- Plate blur and card surface are runtime parameters: a 0–12px slider (maxed by default) and a two-way radio (opaque / translucent) in the settings card, both remembered in `localStorage`
- Focus traps in the header drawer, search card, player card, settings card and the article lightbox; focus returns to the trigger on close. `Esc`, or clicking outside the reading panel, returns to the list. A bare `/` or `Ctrl/⌘+K` opens search from any page; route changes are announced through the `aria-live` region in `App.vue`
- **Keyboard focus shares the pointer's feedback**: the card lens bar, diffraction spike and button sheen each have a `:focus-visible` rule beside their hover twin, reusing the same transition
- **The player** is a console: a platter of arcs around the pole that turns only while playing, a ring progress you can drag, click or drive from the keyboard (arrows ±5s, Shift ±15s), a wave fingerprint derived from the file name, and a real mute toggle that remembers the previous volume. Space toggles playback without stealing it from native controls; track and position are remembered, system media keys are wired, and an unreachable audio file says so instead of spinning forever
- **The narrow-screen menu** is a full-screen drawer: three lines morph into a cross, every destination carries a one-line description, the current page gets a left rule and a dot on top of the cold highlight, and a labelled quick-action row sits below. It closes on any route change (including back/forward), and quick actions stagger the two overlays so they never both hold the scroll lock
- Lists have skeletons; "nothing here yet" and "no match for this filter" are separate strings. Tag and keyword filters live in the URL query, so they are shareable and survive a reload; the archive carries a row of site-wide counters and each tag chip shows its count

**Degradation and readability**

- `prefers-reduced-motion` has a full static path: trails settle on the steady-state plate, transitions do not blur, the vignette is off; touch targets grow to 44px and the smallest type is 11.5px
- Naked text on a scrim-free landscape photograph cannot reach WCAG AA — the worst measured point is 1.0–1.8:1 regardless of gradient shape. So the plate stays scenery and body copy always lands on cards or reading panels. `npm run check:contrast` recomputes the theme tokens against a solid ground before every commit; it does not cover the composited photo
- The resident header never uses `backdrop-filter`; glass is reserved for the reading panel (translucent mode) and the navigation drawer. The lightbox is solid and the home section cards are resident surfaces — neither builds that blur layer; the softness comes from the plate's own `--plate-blur`

## Three load-bearing designs

### The plate layer hangs on `App.vue` — a `fixed` containing-block trap

<img src="docs/assets/readme/plate-layer-light.svg#gh-light-mode-only" alt="Cross-section of the site-wide landscape plate: the photo is fully bright only at the top edge and sinks back into the page colour from 52% to 100%, with measured contrast for naked text and text on cards" width="920">
<img src="docs/assets/readme/plate-layer.svg#gh-dark-mode-only" alt="Cross-section of the site-wide landscape plate: the photo is fully bright only at the top edge and sinks back into the page colour from 52% to 100%, with measured contrast for naked text and text on cards" width="920">

The landscape below the fold is a `position: fixed` `.sub-plate` layer in `App.vue`, shared by the home sections and every secondary page. It has to live there: the `fall` transition puts a `filter` on the page root, and `filter` becomes the containing block for `position: fixed` descendants — mounted inside `HomeView` the same layer measured as the `.home` box (587×1629, scrolling along) instead of a still backdrop. The drawer plate is a single resident image (source list and convergence rules in `site.css` §3). The measurements behind these choices live in the comments of `src/App.vue` and `src/lib/plate.js`.

### The `fall` cross-fade — two pages on stage at once

<img src="docs/assets/readme/fall-timing-light.svg#gh-light-mode-only" alt="Timing diagram of the fall transition: 0.56s entering and 0.38s leaving run in parallel, overlapping for 380ms" width="920">
<img src="docs/assets/readme/fall-timing.svg#gh-dark-mode-only" alt="Timing diagram of the fall transition: 0.56s entering and 0.38s leaving run in parallel, overlapping for 380ms" width="920">

With the plate resident across routes, `fall` is the only content transition left: entering and leaving run in parallel rather than `out-in`, and during the 380ms overlap both pages are on stage, both blurred — that blur is the double image. Throughout it the plate must be the same still-exposing pixels: there is only one camera now, on the home screen, and it keeps drawing every frame after you leave, so the plate never freezes mid-frame. The `claimPlate()` handover mutex in `sky.js` (locking deposition only, never repaint) stays as a guard rail; with a single camera it never fires.

The home screen has its own case: a pure-opacity cross-fade (0.5s / 0.45s, 450ms overlap) with no scale, blur or hue shift. It is the tallest page on the site — dropping the collapse also drops the per-frame re-rasterisation of a full-page blur, the most expensive paint here. Every other page keeps the `fall` above.

One more fix, invisible until you notice it: the router's `scrollBehavior` snaps to the top **instantly**, while the leaving page still fades for nearly half a second. Navigating from below the fold therefore made the hero photo and masthead flash back once during the fade. `before-leave` now records the current scroll offset and shifts the leaving page up by the same amount — through `translate`, not `transform`, because the `fall-out` keyframes animate `transform: scale()` themselves and would override it entirely.

### First-paint order — the photo first, everything else queues

The landscape photo is the home screen's LCP. The inline first-frame script in `index.html` preloads it for the current theme so it races the stylesheet; at ≤720px it takes the 1800px resample (light 1.45MB → 0.09MB, dark 0.62MB → 0.05MB). The photo starts transparent over a 36px-wide, ~0.5KB blurred stand-in (`--hero-lqip`, arriving with the stylesheet); once the gate opens the real image fades in over 240ms and the masthead settles out of a slight defocus at the same time.

The gate is `whenHeroReady()` in `src/lib/hero.js`: it reads the same URL from the `--hero-img` token and waits for `load` again, so the file name is never copied a second time; a stuck or failed image still releases the gate rather than holding the page hostage. Everything else queues behind the photo:

- **Trails**: the chunk is prefetched while the photo downloads (the downlink is mostly idle then, and a small chunk cannot steal its bandwidth), but mounting still waits for the gate — by then the loader hits the module cache and saves a round trip
- **Section data**: `loadPosts()` below the fold runs after the gate; collections and projects are synchronous and render as usual
- **Fonts**: on phones the display serif's CJK slice (~147KB) also waits for the photo; until then titles fall back to the system serif
- **Drawer plate** (phone home, 1280px resample) comes last: it only appears below the fold, so that beat of bandwidth goes to fonts and section data, and the plate waits for the first scroll — no scroll, no download. A reload already past the hero, or leaving home for a secondary page, releases it immediately (there the plate is the reading background)

So the order is **photo → trail mount / section data / fonts, with the phone drawer plate waiting for a scroll**. The measurements are in [docs/design.md](docs/design.md) §3 and the comments of `src/App.vue`.

## Quick start

Requires Node.js 22 or newer (`npm test` lets node expand the test directory itself, a capability added in 21; CI and the author's machine run 24).

```bash
git clone https://github.com/Escap1ng/Escaping-Notes.git
cd Escaping-Notes && npm install

npm run dev              # dev server, hot reload on save
npm run build            # publishing receipt + dist/ (rss.xml, sitemap.xml, a static shell per route)
npm run check            # four gates in a row (content / docs / naming / contrast); run before committing
npm test                 # every .mjs case under tests/, no test framework
```

CI in `.github/workflows/deploy.yml` runs `npm ci` → `npm test` → `npm run check` → `npm run build`, and only publishes to Pages when everything is green.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server, hot reload on save |
| `npm run build` | Publishing gate and receipt first, then `dist/` (with `rss.xml`, `sitemap.xml`, a static shell per route) |
| `npm run preview` | Preview `dist/` locally as production would serve it |
| `npm test` | All 154 cases across 23 `.mjs` files under `tests/`, no test framework |
| `npm run check` | Four gates in a row: content / docs / naming / contrast |
| `npm run seo:build` | Re-run SEO output only (`dist/rss.xml` with the latest 20 full-text entries and tags, `dist/sitemap.xml`) |
| `npm run og:build` | Redraw the share card `public/og.png` (1200×630, procedural star trails in pure Node, no text; commit the result) |
| `npm run art:build` | Redraw the two plates at the top of this README (constants are read from source by regex and throw if missing; re-run after changing trail parameters) |
| `npm run bg:build` | Re-bake the site plates `public/plates/*.jpg` (originals in `plates-src/`, needs local PowerShell; commit the output) |
| `npm run cover:build` | Re-bake post covers: for each roll, bake the `*-src.jpg` in `content/posts/<slug>/` into `cover.jpg` in place (no mapping table, same as above) |
| `npm run font:build` | Re-cut the body serif subset and split it by `unicode-range` (needs Noto Serif SC installed locally; output is committed, rarely needed — run it when a new title uses a character outside the slices) |
| `npm run font:build:didone` | Re-cut the masthead Didone subset (Playfair Display, capitals and spaces only; the source variable font lives in `fonts-src/`, is not committed, and the retrieval steps are in the script header) |
| `npm run check:content` | Publishing gate and receipt: a wrong date, a misspelled key or an image the roll does not contain turns this red (`npm run build` and CI both include it) |
| `npm run check:docs` | Scan file references and § numbers in the docs, and check the route table below against `src/router` |
| `npm run check:naming` | Naming-convention scan; any violation exits non-zero |
| `npm run check:contrast` | Recompute WCAG contrast from the two theme token blocks in `site.css`; a failing text token exits non-zero |

`npm test` groups by file name under `tests/`: the content layer (each publishing rule verified against a fake sample, proving both shores share one parser, that reads only go through the `src/data/index.js` door, and the draft/alias rules), the publishing layer (per-page shell heads and landing points, every sitemap URL backed by a file, legacy `#/` links allowed or blocked, one routing mode only), rendering and URL-injection surface, parameters that must not drift (three copies of the plate-blur default, card surface mode, first-frame theme, hero preload matching `site.css` across two themes × two widths), first-paint order (photo → trail mount / section data, trail chunk prefetch, phone drawer plate waiting for scroll), the home transition exception (opacity only, explicitly covered under reduced motion), copy contracts, single-sourcing of pointer feedback and tokens, project intros filled in, and both detail pages sharing one exit mechanism.

Most rules carry a **negative control**: the same ruler is pointed at a deliberately broken sample and must turn red — a checker that can only report success is not evidence.

## Adding things

There is no admin panel. Everything is a file in the repository; push to publish:

- **A post is a directory.** `content/posts/<slug>/index.md`, where the directory name is the URL (`/blog/<slug>`). Covers need no registered path: if `cover.jpg` sits in that directory it is the cover — the list cell, the full-width image atop the article and the share card all use that one file. No cover is a valid state too; the list keeps an equal-height hatched placeholder. Drop the original in the same directory ending in `-src.jpg` and `npm run cover:build` bakes it in place; inline images live in the same roll and are referenced by file name only — a typo or a missing file is caught at build time.
- **Frontmatter**: six keys drive display (`title` / `date` / `tags` / `summary` / `alt` / `imagePos`); `collection` is required and names which collection this belongs to, `order` is optional and sets its position there; two more drive publishing: `draft: true` shows the roll only under `npm run dev`, and `movedFrom: [old-slug]` keeps old links working after a rename. An unrecognised key is reported by the gate rather than silently ignored.
- **Collections**: the list lives in `src/data/collections.js`; `parent` pointing at another collection adds a level. Posts hang only on the leaf level, and a parent page aggregates every descendant. `/collections` is the overview; each article header shows its collection and position, and previous/next stay inside that collection.
- **Publishing feeds the timeline**: every published roll enters `/updates` and the home timeline by `date`, linking to the article. `src/data/updates.js` records only things other than posts — do not hand-write "post X is live". The merge lives in `src/lib/feed.js`; on the same day, posts come before hand-written entries.
- **Projects**: `src/data/projects.js` holds the four card fields and the three intro parts (`detail` paragraphs / `points` / `stack`) in one place. Array order is page order: GitHub stars descending, last push as the tiebreak, forks excluded. The URL is derived from `name`; there is no separate slug field.
- **Site-owned content**: collections / updates / projects / friends each have a data file, and gear lives in the `gear` field of `src/data/site.js`. They reach the interface only through the `src/data/index.js` door. Adding a kind of content = one file plus one line on the door; no new route through the views.
- **Site info and copy**: name, author, socials, motto and gear in `src/data/site.js`; all interface copy (player and menu included) in `src/data/narrative.js`, with no literals in components; appearance tokens in `src/styles/site.css`.
- **The build is the publishing self-check.** `npm run build` validates every roll before emitting output: a wrong date, a misspelled key, an image the roll does not contain, two rolls claiming the same old name — any one of them stops the release. Once green it also emits `rss.xml`, `sitemap.xml` and a static shell per route.

## Route Map

All 10 routes are lazy-loaded, each with `meta.t` for the title and screen-reader announcement. The header carries 6; the three `:slug` detail pages and the final catch-all are not in the bar — any unmatched route lands on "there is no page here".

| Route | Page | Notes |
| --- | --- | --- |
| `/` | Home · long-exposure trails | Landscape photo + trails + English masthead + drawer |
| `/blog` | Posts | Archive: four site-wide counters, tag filters with counts; the query lives in the URL, no second input on the page |
| `/blog/:slug` | Article | One post plus its auto-inserted cover; inline images open in a lightbox |
| `/collections` | Collections | Top-level collections and their children, grouped by theme |
| `/collections/:slug` | Collection index | Sub-collections and posts; a parent aggregates all descendants |
| `/updates` | Timeline | Hand-written entries plus automatic post entries, the latter linking to the article |
| `/projects` | Projects | Card grid, currently 8 |
| `/projects/:slug` | Project intro | Shares the reading panel with articles; `Esc` or clicking outside returns to the list |
| `/about` | About | Bio + counters · socials / friends · stack |
| `/:pathMatch(.*)*` | 404 | Catch-all; the tab title and the on-page headline are the same sentence |

## Project Structure

```text
├── .github/workflows/     # CI: npm ci → test → check → build → GitHub Pages
├── LICENSE                # full source and design licence (Apache-2.0)
├── package.json           # scripts + two runtime dependencies (vue / vue-router)
├── vite.config.js         # Vite; hands each roll's asset manifest to the client at build time (virtual:rolls)
├── index.html             # shell: first-frame inline script (theme / plate blur / card surface / theme-aware hero preload, none of them flashing) + SEO/OG metadata
├── content/posts/         # posts: one directory each (`<slug>/index.md` plus its cover and images); the directory name is the URL
├── public/                # favicon, robots.txt, og.png + two derived asset directories that must be committed (plates/ · audio/)
├── scripts/               # build-time and content-refresh scripts, grouped by verb (build_* / check_*)
├── tests/                 # zero-dependency safety net: node --test, 23 files / 154 cases
├── docs/                  # design.md rationale · manual.md handbook · assets/readme/ README figures
└── src/
    ├── assets/fonts/      # self-hosted woff2 subsets + OFL licence
    ├── components/        # seven flat files: trail camera / hero layout / header+drawer / footer / player card / settings card / search card
    ├── data/              # all site-owned content lives here; index.js is the only read door
    ├── lib/               # sky plate and clock · ridge mask · plate layer · schema publishing rules · posts loader · feed merge · markdown · theme / storage / …
    ├── styles/site.css    # the only stylesheet: structural scale + two theme palettes + site-wide primitives
    └── views/             # ten flat views, one file per page
```

Originals (`plates-src/` · `music/` · `fonts-src/` · each roll's `*-src.*`) are in `.gitignore` — not a leak. An annotated file-by-file version is in **[docs/manual.md §0](docs/manual.md)**.

## Deployment

Full steps for both targets (GitHub Pages / a read-only Vercel mirror) are in **[docs/manual.md §4](docs/manual.md#4-上传方法部署上线)**. The essentials:

- GitHub Pages is bound to the apex domain `escaping.top`; DNS records, verification commands and certificate steps are in `docs/manual.md` §4.2
- Because the domain is bound at the root, `base` stays `/` and the output carries no repository prefix; there is only one routing mode (history)
- Pages does not fall back to `index.html` for unknown paths, so the build writes a static shell for every real route (`dist/blog/<slug>/index.html` and friends) plus a `dist/404.html` — deep links to real routes therefore return 200 rather than 404, and the share card is that article's own cover; mistyped or deleted addresses still hit 404
- Vercel is a read-only mirror of the same output; `vercel.json` rewrites unknown paths to `index.html`, so refreshing any subpage never 404s
- Legacy `/#/blog/<slug>` links are redirected into path form by `src/main.js` before mounting, so links posted elsewhere never land silently on the home page

## Documentation

- [docs/design.md](docs/design.md) — the single source of interface truth (concept, colour and tokens, component contracts, development guide)
- [docs/manual.md](docs/manual.md) — handbook (editing / adaptation / deployment / FAQ)
- [docs/assets/readme/README.md](docs/assets/readme/README.md) — where the four README figures come from, how to re-run them, and how to swap in real screenshots
- [README.md](README.md) — 中文版

## License & Usage Terms

Two separate grants: **blog content** under CC BY-NC-SA 4.0, **source code and design** under Apache-2.0.

| Subject | Licence |
| --- | --- |
| **Blog content** — post bodies, original images and copy | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/): copy, adapt and redistribute with attribution, non-commercial only, derivatives under the same licence |
| **Source code and design** — `src/`, `scripts/`, `docs/`, the visual and interaction design, the star-trail device | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0): free to use, modify, distribute and use commercially, with copyright and licence notices retained; full text in [LICENSE](LICENSE) |
| **Fonts** | The display subset (body serif split by unicode-range) and the masthead Didone come from Noto Serif SC and Playfair Display respectively (both SIL OFL 1.1); full text in [src/assets/fonts/LICENSE-OFL.txt](src/assets/fonts/LICENSE-OFL.txt) |
| **Third-party material** | Embedded friend links and off-site content follow their own licences and are outside this section |

The notes below apply only to the second row, "source code and design"; the Apache-2.0 text itself governs:

1. **Retain notices**: redistribution must keep the copyright and licence information in `LICENSE` and `package.json`, and modified files must be marked as changed.
2. **No trademark grant**: Apache-2.0 grants no trademark rights; the "Escaping Notes" name and marks may not be used to imply the author's endorsement.
3. **Disclaimer**: provided "as is", without warranty of any kind; the author is not liable for any loss or dispute arising from its use (Apache-2.0 sections 7 and 8).
4. **Licensing contact**: chunqi-yu@outlook.com.

© 2026 Escap1ng · Blog content under CC BY-NC-SA 4.0, source code and design under Apache-2.0
