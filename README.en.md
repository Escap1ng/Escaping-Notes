<div align="center">

# Escaping Notes

**A long exposure of the night sky**

The home screen is a camera left open: scroll down and the exposure deepens and the sky turns faster; posts run by date, collections group by theme. Fully static, fixed at build time, publish on push.

[**Live demo → escaping.top**](https://escaping.top) · [中文](README.md)

[![Pages](https://img.shields.io/github/actions/workflow/status/Escap1ng/Escaping-Notes/deploy.yml?label=Pages&style=flat-square)](https://github.com/Escap1ng/Escaping-Notes/actions/workflows/deploy.yml)
[![Release](https://img.shields.io/github/v/release/Escap1ng/Escaping-Notes?style=flat-square)](https://github.com/Escap1ng/Escaping-Notes/releases)
[![Vue 3](https://img.shields.io/badge/Vue%203-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite 5](https://img.shields.io/badge/Vite%205-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Node 22+](https://img.shields.io/badge/Node%2022%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/Content%20CC%20BY--NC--SA%20·%20Code%20Apache--2.0-4d4d4d?style=flat-square)](#license)

</div>

<img src="docs/assets/readme/hero-deep-space.png#gh-dark-mode-only" alt="Dark hero: concentric star-trail arcs accumulating around a centred pole, cold blue and warm white with a few amber cores, outer rings running out of frame" width="100%">
<img src="docs/assets/readme/hero-paper.png#gh-light-mode-only" alt="Light hero: slate and graphite-blue trails laid over a dry plate, vermilion on the brightest few, outer rings running out of frame" width="100%">

<sub>Not a screenshot: the steady-state plate recomputed offline from the site's own constants (`npm run art:build`, add `ART_HERO=1` for the banner crop) — the very plate a `prefers-reduced-motion` visitor sees. Art and page share one pair of developing gains (×2.0 / ×1.42), so the thumbnail density matches the page.</sub>

---

## The camera keeps the exposure

Trails are painted only inside the home screen's cell. The plate pixels and the site clock are singletons in `src/lib/sky.js`: changing routes never re-lays the plate, and returning home the arcs continue the previous exposure; below the fold, photographs take over. Three knobs drive the interaction:

- **Scroll as time**: within the landing screen, the further down you go the longer the exposure window and the faster the sky turns (1 → 3.2×), saturating past 1.1 viewport heights
- **Pointer as time dilation**: trails within a 180px cursor radius locally accelerate and curl, fastest at the centre (up to 2.8×); entering and leaving the cone rides a roughly one-second inertia envelope rather than a hard edge
- **Meteors as narrative**: one falls every 6–9s, lives 900ms, at most nine in frame; while the player runs the gap is squeezed to 40% of its range and relaxes back on its own

Flow curves, mask profiles and meteor parameters are recorded in [docs/design.md](docs/design.md) §3.

## How the ring is drawn

This section records the rework behind several rounds of "that looks wrong", backed by three measurements.

<img src="docs/assets/readme/ring-rework-light.svg#gh-light-mode-only" alt="The ring rework, schematic: before, bright stars clustered in one 45-degree sector and radius tracked angle into a spiral; after, bright stars spread round the circle as concentric rings" width="920">
<img src="docs/assets/readme/ring-rework.svg#gh-dark-mode-only" alt="The ring rework, schematic: before, bright stars clustered in one 45-degree sector and radius tracked angle into a spiral; after, bright stars spread round the circle as concentric rings" width="920">

**Magnitude and angle drew from the same sequence.** The tier used to be `(i·0.381966…) mod 1`, and `0.381966… = 1 − 0.618034…` is exactly the complement of the angle sequence — the two sum to 1, so magnitude was fully determined by angle. At 220 stars the 12 bright ones had a circular concentration of R=0.996, all inside a single 45° sector: one side of the sky full of thick bright arcs, the other left with thin faint ones. Tiers now come from a per-count quota (bright 24% / mid 60% / dim 16%), and bright and mid start angles are spread evenly around the circle.

**Radius growing with angle.** Even spacing was not enough: the slot index also drove the radius, giving a measured correlation of 0.998 — bright stars ran from `(r=0.075, θ=10°)` to `(r=0.955, θ=345°)`, an Archimedean spiral. Angle slots now pass through a step permutation coprime with the tier count; correlation drops to 0.205 while the slot set is unchanged, so angular evenness is not lost.

**Arcs of differing length.** In a real long exposure every star sweeps the same angle over the same interval; short arcs of differing length get connected into spiral arms by the eye. All stars now share one exposure window (`EXPOSURE_DEG = 64`) with only ±5% shutter unevenness; hierarchy is carried by magnitude instead: line width, brightness, star cores.

Two more structural floors: no stroke thinner than `LW_MIN = 1.25` CSS px — sub-pixel strokes sample into broken grey dots on a 1× screen, the source of the faint clutter, so the dim tier recedes by colour instead; and star cores are painted on the current-frame layer, never accumulated (accumulating turns them back into arcs), so each trail carries a point-like star at its head.

Current counts: 96 light / 62 dark (50 / 33 on narrow screens). The plate is allocated per viewport, capped at `MAXPX = 6e6` with a `MIN_DPR = 1.25` floor — every frame costs one full-screen `destination-out` plus one `drawImage`, so pixel count is the fixed overhead.

## Interface

**Visual**

- The landing screen carries only the English masthead: one line at 8.8vw on desktop (about 81% of the viewport), two lines at 15vw on phones; below the fold, cards by section
- The dark landing plate is a dimmed version of the same shot; both themes share a single ridge polyline and each deposits its own plate so colours never bleed. Switching themes snapshots the old plate and cross-develops the new one in slices instead of clearing the screen
- Light by default; the first frame deliberately ignores `prefers-color-scheme` — the landing photo is bright, and following the system into dark would lay a bright image on a black ground
- Trails are drawn frame by frame from an offscreen accumulation buffer (Canvas 2D), occluded along the ridge with `destination-in`: about 60% brightness kept near the ridge line, 26px feather
- The whole interface is built from one token set: 6 spacing steps, 11 type sizes, 4 line heights, 3 weights, 3 radii; components never hard-code a size or a duration — change the scale and the site follows
- Two self-hosted families: the body serif (Noto Serif SC) is split by `unicode-range` and fetched on demand; the masthead Didone is cut from Playfair Display, one file holding only capitals and spaces
- Chinese prose enables CJK/Latin autospacing and hanging punctuation; headings wrap with `text-wrap: balance`, paragraphs with `pretty`; older browsers ignore these and keep the previous behaviour

**Interaction**

- Plate blur and card surface are runtime parameters: a 0–12px slider and a two-way radio (opaque / translucent) in the settings card, both remembered in `localStorage`
- Focus traps in the header drawer, search card, player card, settings card and the article lightbox; focus returns to the trigger on close. `Esc`, or clicking outside the reading panel, returns to the list; a bare `/` or `Ctrl/⌘+K` opens search from any page
- Keyboard focus shares the pointer's feedback: the card lens bar, diffraction spike and button sheen each have a `:focus-visible` rule beside their hover twin, reusing the same transition
- The player is a console: a platter of arcs around the pole that turns only while playing, a ring progress you can drag, click or drive from the keyboard (arrows ±5s, Shift ±15s), a wave fingerprint derived from the file name, and a real mute toggle that remembers; Space toggles playback without stealing it from native controls, system media keys are wired, and an unreachable audio file says so instead of spinning forever
- The narrow-screen menu is a full-screen drawer: three lines morph into a cross, every destination carries a one-line description, the current page gets a left rule and a dot on top of the cold highlight, and a labelled quick-action row sits below; it closes on any route change (including back/forward), and quick actions stagger the two overlays' scroll locks
- Lists have skeletons; "nothing here yet" and "no match for this filter" are separate strings; tag and keyword filters live in the URL query, so they are shareable and survive a reload

**Degradation and readability**

- `prefers-reduced-motion` has a full static path: trails settle on the steady-state plate, transitions do not blur, the vignette is off; touch targets grow to 44px and the smallest type is 11.5px
- Naked text on a scrim-free landscape photograph cannot reach WCAG AA (worst measured point 1.0–1.8:1, regardless of gradient shape), so the plate stays scenery and body copy always lands on cards or reading panels; `npm run check:contrast` recomputes the theme tokens against a solid ground before every commit
- The resident header never uses `backdrop-filter`; glass is reserved for the reading panel (translucent mode) and the navigation drawer

## Three load-bearing designs

### The plate layer hangs on `App.vue`

<img src="docs/assets/readme/plate-layer-light.svg#gh-light-mode-only" alt="Cross-section of the site-wide landscape plate: the photo is fully bright only at the top edge and sinks back into the page colour from 52% to 100%, with measured contrast for naked text and text on cards" width="920">
<img src="docs/assets/readme/plate-layer.svg#gh-dark-mode-only" alt="Cross-section of the site-wide landscape plate: the photo is fully bright only at the top edge and sinks back into the page colour from 52% to 100%, with measured contrast for naked text and text on cards" width="920">

The landscape below the fold is a `position: fixed` `.sub-plate` layer in `App.vue`, shared by the home sections and every secondary page. It has to live there: the `fall` transition puts a `filter` on the page root, and `filter` becomes the containing block for `position: fixed` descendants — mounted inside `HomeView` the same layer measured as the `.home` box (587×1629, scrolling along) instead of a still backdrop. The measurements behind these choices live in the comments of `src/App.vue` and `src/lib/plate.js`.

### The `fall` cross-fade

<img src="docs/assets/readme/fall-timing-light.svg#gh-light-mode-only" alt="Timing of the fall transition: 0.56s entering and 0.38s leaving run in parallel, overlapping for 380ms" width="920">
<img src="docs/assets/readme/fall-timing.svg#gh-dark-mode-only" alt="Timing of the fall transition: 0.56s entering and 0.38s leaving run in parallel, overlapping for 380ms" width="920">

With the plate resident across routes, `fall` is the only content transition left: entering and leaving run in parallel rather than `out-in`, and during the 380ms overlap both pages are on stage, both blurred — that blur is the double image. Throughout it the plate must be the same still-exposing pixels: there is only one camera now, on the home screen, and it keeps drawing every frame after you leave, so the plate never freezes mid-frame. The home screen has its own case: a pure-opacity cross-fade (0.5s / 0.45s, 450ms overlap) with no scale or blur — it is the tallest page on the site, and the per-frame re-rasterisation of a full-page blur is the most expensive paint here.

One more fix, invisible until you notice it: the router's `scrollBehavior` snaps to the top instantly, while the leaving page still fades for nearly half a second, so navigating from below the fold made the hero photo and masthead flash back once. `before-leave` now records the current scroll offset and shifts the leaving page up by the same amount — through `translate`, not `transform`, because the `fall-out` keyframes animate `transform: scale()` themselves and would override it entirely.

### First-paint order

<img src="docs/assets/readme/hero-load-order-light.svg#gh-light-mode-only" alt="First-paint order: the photo is preloaded by the inline script and opens the gate on load; trail mount, section data and the CJK font slice queue behind it, and the phone drawer plate waits for the first scroll" width="920">
<img src="docs/assets/readme/hero-load-order.svg#gh-dark-mode-only" alt="First-paint order: the photo is preloaded by the inline script and opens the gate on load; trail mount, section data and the CJK font slice queue behind it, and the phone drawer plate waits for the first scroll" width="920">

The landscape photo is the home screen's LCP. The inline first-frame script in `index.html` preloads it for the current theme so it races the stylesheet; at ≤720px it takes the 1800px resample (light 1.45MB → 0.09MB, dark 0.62MB → 0.05MB). The photo starts transparent over a 36px-wide, ~0.5KB blurred stand-in; once the gate opens the real image fades in over 240ms. The gate is `whenHeroReady()` in `src/lib/hero.js`: it reads the same URL from the `--hero-img` token and waits for `load` again, and a stuck or failed image still releases the gate rather than holding the page hostage. Everything else queues behind the photo: the trail chunk is prefetched while the photo downloads but mounting still waits for the gate; below-the-fold section data runs after the gate; the phone display serif's CJK slice also waits; the phone drawer plate comes last, waiting for the first scroll. The measurements are in [docs/design.md](docs/design.md) §3 and the comments of `src/App.vue`.

## Two themes, two plates

<table>
  <tr>
    <td width="50%"><img src="docs/assets/readme/plate-deep-space.png" alt="Dark plate: concentric star-trail arcs accumulating around the pole, cold blue and warm white with a few amber cores, most of the sky left empty" title="Dark"></td>
    <td width="50%"><img src="docs/assets/readme/plate-paper.png" alt="Light plate: slate and graphite-blue trails laid over a dry plate, vermilion on the brightest few" title="Light"></td>
  </tr>
</table>

<sub>Left dark, right light: two steady-state plates from the same camera. Dark composites additively (`lighter`), light presses ink onto a dry plate (`source-over`); the dark one then gets a hue-locking highlight compression — all three channels scaled by a single ratio into range, so the cold blue and vermilion are not clipped channel-by-channel into cream. The hero above is their banner crop.</sub>

## Run it

Requires Node.js 22 or newer (`npm test` lets node expand the test directory itself, a capability added in 21; CI and the author's machine run 24).

```bash
git clone https://github.com/Escap1ng/Escaping-Notes.git
cd Escaping-Notes && npm install

npm run dev      # dev server, hot reload on save
npm run build    # publishing gate + dist/ (rss.xml, sitemap.xml, a static shell per route)
npm run check    # four gates in a row: content / docs / naming / contrast
npm test         # every .mjs case under tests/, no test framework
```

The build is the publishing self-check: a wrong date, a misspelled frontmatter key, an image the roll does not contain, or two rolls claiming the same old name turns it red and no output is emitted. Once green it also emits RSS, a sitemap and a static shell per real route. Most rules carry a negative control: the same checker pointed at a deliberately broken sample must turn red — a checker that can only report success is not evidence.

| Command | What it does |
| --- | --- |
| `npm run preview` | Preview `dist/` locally as production would serve it |
| `npm run art:build` | Recompute the two plates; add `ART_HERO=1` for the hero (constants read from source; re-run after changing trail parameters) |
| `npm run bg:build` | Re-bake the site plates (needs local PowerShell; commit the output) |
| `npm run cover:build` | Bake each roll's `*-src.jpg` into `cover.jpg` |
| `npm run og:build` | Redraw the share card `public/og.png` |
| `npm run seo:build` | Re-run RSS and sitemap only |
| `npm run font:build` · `font:build:didone` | Re-cut the font subsets (output committed, rarely needed) |

## Adding things

No admin panel. Everything is a file in the repository; push to publish.

- **A post is a directory**: `content/posts/<slug>/index.md`, the directory name is the URL. A `cover.jpg` in that directory is the cover, shared by the list cell, the article top and the share card; inline images are referenced by file name only and a typo is caught at build time
- **Frontmatter**: `collection` is required; `draft: true` shows the roll only under `npm run dev`; `movedFrom: [old-slug]` keeps old links working after a rename; an unrecognised key is reported by the gate rather than silently ignored
- **Collections**: the list lives in `src/data/collections.js`; `parent` pointing at another collection adds a level; posts hang only on the leaf level and a parent page aggregates every descendant
- **Timeline**: every published roll enters `/updates` and the home timeline by `date`; `src/data/updates.js` records only things other than posts — do not hand-write "post X is live"
- **Projects**: `src/data/projects.js` holds the card fields and the three intro parts in one place; array order is page order (GitHub stars descending, last push as the tiebreak, forks excluded); the URL is derived from the name
- **Copy and appearance**: all interface copy in `src/data/narrative.js`, no literals in components; appearance tokens in `src/styles/site.css`

Details in [docs/manual.md](docs/manual.md).

## Route Map

All 10 routes are lazy-loaded; the header carries 6, detail pages and the catch-all are not in the bar.

| Route | Page |
| --- | --- |
| `/` | Home · long-exposure trails |
| `/blog` | Archive · site-wide counters and tag filters with counts |
| `/blog/:slug` | Article · auto-inserted cover and lightbox |
| `/collections` | Collections overview |
| `/collections/:slug` | Collection index · a parent aggregates descendants |
| `/updates` | Timeline · hand-written plus automatic post entries |
| `/projects` | Project cards |
| `/projects/:slug` | Project intro |
| `/about` | About |

Any unmatched address lands on 404; the tab title and the on-page headline are the same sentence.

## Deployment

GitHub Pages is bound to the apex domain `escaping.top`; CI runs `npm ci → test → check → build` on push and only publishes when green. Because the domain is bound at the root, `base` stays `/`, the output carries no repository prefix, and there is only one routing mode (history).

- Pages does not fall back for unknown paths, so the build writes a static shell for every real route (`dist/blog/<slug>/index.html` and friends) plus a `dist/404.html`: deep links to real routes return 200 with that article's own share card, while mistyped or deleted addresses still hit 404
- Vercel is a read-only mirror of the same output; `vercel.json` rewrites unknown paths to `index.html`, so refreshing any subpage never 404s
- Legacy `/#/blog/<slug>` links are redirected into path form by `src/main.js` before mounting, so links posted elsewhere never land silently on the home page

Full steps (DNS, verification, certificate) in [docs/manual.md §4](docs/manual.md#4-上传方法部署上线).

## Documentation

[docs/design.md](docs/design.md) is the single source of interface truth: concept, tokens, component contracts, and the rejected options with their measurements.
[docs/manual.md](docs/manual.md) is the handbook: editing, adaptation, deployment, FAQ.
[docs/assets/readme/README.md](docs/assets/readme/README.md) explains where the figures come from, how to re-run them, and how to swap in real screenshots.

## License

**Blog content** (posts, original images and copy) under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/): attribution, non-commercial, share-alike.

**Source code and design** (`src/`, `scripts/`, `docs/`, the visual and interaction design) under [Apache-2.0](LICENSE): free to use, modify, distribute and use commercially, with copyright and licence notices retained and modified files marked as changed. No trademark grant; the "Escaping Notes" name may not be used to imply the author's endorsement.

Fonts come from Noto Serif SC and Playfair Display, both SIL OFL 1.1; terms in [LICENSE-OFL.txt](src/assets/fonts/LICENSE-OFL.txt).

Provided "as is", without warranty of any kind. Licensing contact: chunqi-yu@outlook.com.

<div align="center">
<sub>© 2026 Escap1ng</sub>
</div>
