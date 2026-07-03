# Vitrine

A draggable horizontal slider with a shared-element zoom into a
fullscreen lightbox. Extracted as a self-contained, prop-driven component so it
can drop into any React project — no host grid system required.

Built with React 19, [`motion`](https://motion.dev), and the native
[View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
(progressive enhancement — falls back to a plain open/close where unsupported).
The caption morphs between projects by default, powered by
[`metamorphosis`](https://github.com/olicarignan/metamorphosis) — a
dependency-free animated-text component that comes along as a dependency. Pass
the bundled `PlainCaption` (or your own component) to the `Caption` prop to opt
out of the animation.

## Repo layout

This repo is both the published library and a live demo:

- **`src/`** — the library. `Slider`, `Lightbox`, and the stylesheets. Built to
  `dist/` with [`tsup`](https://tsup.egoist.dev) (ESM + CJS) and installed
  straight from GitHub.
- **`demo/`** — a standalone Vite app that imports the library from `../src` and
  doubles as a smoke test of the public entry. It has its own `package.json`.

## Features

- Drag (with inertia + snap), wheel/trackpad scroll, and click-to-center.
- Click to zoom into a fullscreen, swipeable lightbox.
- Shared-element view transition between the panel and the lightbox image —
  each slider generates its own transition name, so several sliders can share
  a page.
- Three track variants (`variant`): the scroll-snap **row** (default), a
  deck-cycling **card stack**, and a 3D **coverflow**.
- Optional looping muted **video** per panel, autoplaying only while active,
  with opt-in playback controls (`videoControls`): play/pause, mute, scrubber.
- Optional prev/next **arrows** and **pagination** dots beside the caption.
- The lightbox can be disabled entirely (`lightbox={false}`), with an
  `onItemClick` callback taking over the active panel's click.
- Progressive hi-res image swap in the lightbox (low-res placeholder → hi-res).
- Mobile-tuned: centered snap, depth scaling, and drag-down-to-dismiss the
  lightbox.
- Optional prev / close / next control bar in the lightbox (`lightboxControls`),
  off by default.
- Optional morphing icon cursor (`morphCursor`) that follows the pointer and
  animates between `+` (slider panel), `×` (active lightbox item / overlay) and
  `←` / `→` (previous / next items), off by default.
- Keyboard navigation: `←` / `→` move the slider while it's focused or hovered,
  and drive the lightbox (`←` / `→` / `Esc`) while it's open.

## Run the demo

```bash
cd demo
pnpm install   # or npm install
pnpm dev       # then open the printed localhost URL
```

The demo is a small routed site: the landing page (`demo/src/pages/Home.jsx`,
`demo/src/demo-data.js`) renders the slider with random artworks pulled live
from the [Art Institute of Chicago API](https://api.artic.edu/docs/) — it
searches for public-domain, image-bearing works under a random term each load,
so you get a different set every refresh. A **docs section** at `/docs` has one
live demo page per feature: the base carousel and its layout props, captions,
video (+ playback controls), lightbox options, the morphing cursor, the card
stack and coverflow variants, arrows & pagination, and multiple sliders on one
page. The video page (`demo/src/video-data.js`) drives looping `<video>` panels
from the [Pexels Video API](https://www.pexels.com/api/) — free, no-attribution
MP4 stock clips. It needs a free Pexels key in `VITE_PEXELS_KEY` (copy
`demo/.env.example` to `demo/.env.local`); without it, that demo is simply
skipped.

## Install

```bash
pnpm add github:olicarignan/vitrine
```

`react` and `react-dom` (`>=18`) are peer dependencies; `motion` and
[`metamorphosis`](https://github.com/olicarignan/metamorphosis) (the morphing
caption) come along as dependencies. Both vitrine and metamorphosis build
themselves from source on install (a `prepare` script runs `tsup`). pnpm (v10+)
requires git deps with build scripts to be allowlisted, so add this to your
`package.json`:

```json
"pnpm": { "onlyBuiltDependencies": ["vitrine", "metamorphosis"] }
```

Import the component and its stylesheet once, then render with your items:

```jsx
import { Slider } from "vitrine";
import "vitrine/styles.css";

<Slider items={items} />;
```

The stylesheet is self-contained — the custom zoom cursors are inlined as data
URIs, so there are no asset files to host. Opt into a morphing icon cursor with
the `morphCursor` prop (see below).

### Variants

The `variant` prop swaps the track layout while keeping everything else —
captions, lightbox, keyboard nav, arrows/pagination:

```jsx
<Slider items={items} />                      // scroll-snap row (default)
<Slider items={items} variant="stack" />      // deck-cycling card stack
<Slider items={items} variant="coverflow" />  // 3D coverflow
```

- **`stack`** — uniform cover-cropped cards pile up with a peek and scale
  falloff. Dragging the top card past a threshold sends it to the back (left =
  forward, right = backward), cycling infinitely; clicking it zooms into the
  lightbox. Because cards are cover-cropped, the zoom morphs from the crop to
  the image's native ratio.
- **`coverflow`** — the row engine with every item centered and projected in
  3D: the centered panel lies flat, neighbors rotate toward the vanishing
  point, recede and shrink.

Both variants ignore `item.video` in the track (poster image only); opening
the lightbox on a video item still plays it there.

### Video playback controls

Items with a `video` URL autoplay muted and looping while active. Pass
`videoControls` to overlay a play/pause + mute + scrubber bar on the active
panel and in the lightbox:

```jsx
<Slider items={items} videoControls />;
```

The slider panel and the lightbox are separate `<video>` elements, so the mute
state and playback position don't carry across the zoom.

### Arrows & pagination

```jsx
<Slider items={items} arrows pagination />;
```

`arrows` renders prev/next buttons beside the caption (disabled at the ends;
wrapping on the `stack` variant). `pagination` renders one dot per panel — the
active dot tracks scrolling, and clicking a dot navigates.

### Disabling the lightbox

```jsx
<Slider
  items={items}
  lightbox={false}
  onItemClick={(item, index) => openMyDetailPage(item)}
/>;
```

With `lightbox={false}` no lightbox is mounted and clicking the active panel
fires `onItemClick` instead (clicking a non-active panel still centers it).
Without an `onItemClick`, panels are display-only.

### Plain (non-animated) caption

The meta caption morphs between projects by default (letter morphing via
`metamorphosis`). To render it as plain `<h3>` / `<p>` instead, pass the bundled
`PlainCaption` to the `Caption` prop:

```jsx
import { Slider, PlainCaption } from "vitrine";

<Slider items={items} Caption={PlainCaption} />;
```

Any component with the `({ as, children })` contract works as a `Caption` —
bring your own.

### Morphing icon cursor

By default the slider uses static inline-SVG cursors (`+` to zoom in, `×` to
close). Pass `morphCursor` to replace them with a single cursor that follows the
pointer and **morphs** between icons depending on what's under it — powered by
`metamorphosis`'s `IconMorph`:

```jsx
<Slider items={items} morphCursor />;
```

| Context   | Hovered target                     | Icon         |
| --------- | ---------------------------------- | ------------ |
| Slider    | a panel                            | `+`          |
| Lightbox  | the active (centered) item         | `×`          |
| Lightbox  | the overlay (backdrop / empty gaps)| `×`          |
| Lightbox  | the previous item                  | `←`          |
| Lightbox  | the next item                      | `→`          |

The cursor is white with a dark outline for contrast on any background. It only
activates on precise pointers (`pointer: fine`); touch devices, no-JS, and
`prefers-reduced-motion` fall back to the static cursors (the latter swaps icons
instantly instead of morphing). No extra setup — `IconMorph` ships with
`metamorphosis`, which is already a dependency.

### Required CSS tokens

The stylesheets read a few CSS custom properties — define them on `:root` (see
`demo/src/demo.css`):

| Token             | Used for                                    |
| ----------------- | ------------------------------------------- |
| `--gap`           | gap between slider panels (desktop)         |
| `--accent-color`  | meta title color, focus ring, control-bar background (when enabled) |
| `--text-color`    | meta subtitle color                         |
| `--color-text`    | control-bar icon color — close + arrows (when enabled) |

To get the rest of the page to cross-fade during the zoom, also set
`view-transition-name: root` on `:root`.

## `<Slider>` props

| Prop                | Type     | Default                            | Description                                                        |
| ------------------- | -------- | ---------------------------------- | ------------------------------------------------------------------ |
| `items`             | `Item[]` | —                                  | The panels (see shape below).                                      |
| `variant`           | `"row" \| "stack" \| "coverflow"` | `"row"`           | Track layout: scroll-snap carousel, deck-cycling card stack, or 3D coverflow. Stack and coverflow ignore `item.video` in the track. |
| `contentWidth`      | `number` | `628`                              | Desktop width (px) of the active panel's content column.           |
| `gap`               | `number` | `32`                               | Desktop gap (px) between panels.                                   |
| `columns`           | `number` | `4`                                | Notional grid columns — only used to align the meta text.          |
| `metaOffsetColumns` | `number` | `0`                                | Shift the meta text right by N columns on desktop (0 = flush).     |
| `sideMargin`        | `number` | `24`                               | Minimum viewport margin (px/side) the content column keeps.        |
| `maxItemHeight`     | `number` | `520`                              | Max height (px) of a panel; taller images scale down keeping ratio.|
| `sizes`             | `string` | `(min-width: 700px) 628px, 82vw`   | `sizes` hint for the panel `<img>`.                                |
| `lightboxSizes`     | `string` | `84vw`                             | `sizes` hint forwarded to the lightbox images.                     |
| `Caption`           | `Component` | `TextMorph`                    | Component used to render the meta title/subtitle. Receives `as` and `children`. Defaults to metamorphosis's morphing `TextMorph`; pass `PlainCaption` (or your own) to opt out. |
| `lightbox`          | `boolean` | `true`                           | Set `false` to disable the lightbox: no zoom, no lightbox mounted; the active panel's click fires `onItemClick` instead. |
| `lightboxControls`  | `boolean` | `false`                          | Show prev / close / next buttons in the lightbox (on all breakpoints). Off by default — the caption carries the context, and swipe / arrow keys navigate. |
| `onItemClick`       | `Function` | —                               | Called with `(item, index)` when the active panel is clicked and `lightbox` is `false`. |
| `arrows`            | `boolean` | `false`                          | Prev/next buttons beside the caption (disabled at the ends; wrapping on `stack`). |
| `pagination`        | `boolean` | `false`                          | One dot per panel beside the caption; the active dot tracks scrolling, clicking a dot navigates. |
| `videoControls`     | `boolean` | `false`                          | Play/pause + mute + scrubber over the active video panel (slider and lightbox). Videos still autoplay muted. |
| `transitionName`    | `string` | auto                               | Override the auto-generated per-instance shared-element view-transition name. |
| `morphCursor`       | `boolean` | `false`                          | Replace the static SVG cursors with a morphing icon cursor: `+` over a panel, `×` over the active lightbox item / overlay, `←` / `→` over the previous / next items. Precise-pointer only; touch and no-JS keep the static cursors. |

## `<Lightbox>` props (internal)

The `<Lightbox>` is normally rendered and driven by `<Slider>` during the
shared-element zoom — you don't usually mount it yourself. If you do, these are
its props:

| Prop                  | Type       | Default | Description                                          |
| --------------------- | ---------- | ------- | ---------------------------------------------------- |
| `items`               | `Item[]`   | —       | Same item array passed to `<Slider>`.                |
| `activeIndex`         | `number`   | —       | Index to open on.                                    |
| `sizes`               | `string`   | `84vw`  | `sizes` hint for the images.                         |
| `Caption`             | `Component` | `TextMorph` | Caption renderer (takes `as` + `children`).     |
| `controls`            | `boolean`  | `false` | Render the prev / close / next buttons (on all breakpoints). |
| `videoControls`       | `boolean`  | `false` | Play/pause + mute + scrubber over the active video item. |
| `transitionName`      | `string`   | `"slider-active"` | Shared-element view-transition name; `<Slider>` passes its per-instance name. |
| `onActiveIndexChange` | `Function` | —       | Called with the new index as the user scrolls.       |
| `onClose`             | `Function` | —       | Called to dismiss the lightbox.                      |

Controls are off by default — the caption carries the context, and swipe / drag /
arrow keys navigate. Enable them with `lightboxControls` on `<Slider>` (or
`controls` on `<Lightbox>`): a fixed bar with prev / close / next buttons appears
below the caption on all breakpoints, with prev / next dimmed and disabled at the
first and last slide.

On mobile the lightbox can be dismissed by dragging the image down: the focused
image follows your finger while the neighbours and backdrop fade out, and past a
short threshold (or a quick flick) it closes — animating from where you released
straight back to its slider panel. Below the threshold it springs back.
Horizontal swipes still navigate.

## Item shape

All image fields are plain strings — bring your own CMS / image transform.

```ts
{
  id,                 // unique key (falls back to array index)
  title,              // shown in the meta line
  meta,               // secondary meta line, e.g. "Brand · 2024"
  src,                // required: featured image URL
  srcSet?,            // responsive srcset
  webpSrcSet?,        // webp <source> srcset
  blurDataURL?,       // low-quality placeholder (data URI)
  alt?,               // defaults to title
  highResSrc?,        // hi-res image for the lightbox (falls back to src)
  highResSrcSet?,
  highResWebpSrcSet?,
  video?,             // looping muted video URL; autoplays only while active
                      // (row variant + lightbox — stack/coverflow show the poster)
}
```

If `highResSrc` is omitted the lightbox just shows `src` at full size — no
placeholder/swap layer is rendered.

## Notes

- Don't wrap the app in `<StrictMode>` — its dev-only double-invoke of effects
  fights the one-pass measure / view-transition logic. See `demo/src/main.jsx`.
- Each `<Slider>` generates its own per-instance view-transition name, so any
  number can share a page (override it with the `transitionName` prop if you
  need a stable name). Only mount one `morphCursor` slider per page — each
  renders its own pointer-following cursor.
