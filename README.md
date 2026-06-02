# Slider + Lightbox

A draggable horizontal project slider with a shared-element zoom into a
fullscreen lightbox. Extracted as a self-contained, prop-driven component so it
can drop into any React project — no host grid system required.

Built with React 19, [`motion`](https://motion.dev), and the native
[View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
(progressive enhancement — falls back to a plain open/close where unsupported).
The caption is plain text by default with no extra dependency; pass a component
to the optional `Caption` prop to animate it. The demo uses
[`metamorphosis`](https://github.com/olicarignan/metamorphosis) — a
dependency-free animated-text component — for letter morphing.

## Repo layout

This repo is both the published library and a live demo:

- **`src/`** — the library. `Slider`, `Lightbox`, and the stylesheets. Built to
  `dist/` with [`tsup`](https://tsup.egoist.dev) (ESM + CJS) and installed
  straight from GitHub.
- **`demo/`** — a standalone Vite app that imports the library from `../src` and
  doubles as a smoke test of the public entry. It has its own `package.json`.

## Features

- Drag (with inertia + snap), wheel/trackpad scroll, and click-to-center.
- Click the centered panel to zoom into a fullscreen, swipeable lightbox.
- Shared-element view transition between the panel and the lightbox image.
- Optional looping muted **video** per panel, autoplaying only while active.
- Progressive hi-res image swap in the lightbox (low-res placeholder → hi-res).
- Mobile-tuned: centered snap, depth scaling, and a floating prev / close / next
  control bar.
- Keyboard navigation: `←` / `→` move the slider while it's focused or hovered,
  and drive the lightbox (`←` / `→` / `Esc`) while it's open.

## Run the demo

```bash
cd demo
pnpm install   # or npm install
pnpm dev       # then open the printed localhost URL
```

The demo (`demo/src/App.jsx`, `demo/src/demo-data.js`) renders the slider with
random artworks pulled live from
[The Met Collection API](https://metmuseum.github.io/) — it searches for
image-bearing works under a random term each load, so you get a different set
every refresh.

## Install

```bash
pnpm add github:olicarignan/slider-lightbox
```

`react` and `react-dom` are peer dependencies; `motion` comes along as a
dependency. The package builds itself from source on install (a `prepare`
script runs `tsup`). pnpm (v10+) requires git deps with build scripts to be
allowlisted, so add this to your `package.json`:

```json
"pnpm": { "onlyBuiltDependencies": ["slider-lightbox"] }
```

Import the component and its stylesheet once, then render with your items:

```jsx
import { Slider } from "slider-lightbox";
import "slider-lightbox/styles.css";

<Slider items={items} />;
```

The stylesheet is self-contained — the custom zoom cursors are inlined as data
URIs, so there are no asset files to host.

### Optional: animated caption

The meta caption renders as plain `<h3>` / `<p>` by default. To animate it
(letter morphing, as in the demo), pass any component that accepts an `as` tag
and `children` to the `Caption` prop. The demo uses `metamorphosis`:

```bash
pnpm add github:olicarignan/metamorphosis
```

It's also a self-building git dependency, so allowlist it too:

```json
"pnpm": { "onlyBuiltDependencies": ["slider-lightbox", "metamorphosis"] }
```

Then pass it in:

```jsx
import { TextMorph } from "metamorphosis/react";

<Slider items={items} Caption={TextMorph} />;
```

Any component with the same `({ as, children })` contract works — bring your
own.

### Required CSS tokens

The stylesheets read a few CSS custom properties — define them on `:root` (see
`demo/src/demo.css`):

| Token             | Used for                                    |
| ----------------- | ------------------------------------------- |
| `--gap`           | gap between slider panels (desktop)         |
| `--accent-color`  | meta title color, focus ring, mobile control-bar background |
| `--text-color`    | meta subtitle color                         |
| `--color-text`    | mobile control-bar icon color (close + arrows) |

To get the rest of the page to cross-fade during the zoom, also set
`view-transition-name: root` on `:root`.

## `<Slider>` props

| Prop                | Type     | Default                            | Description                                                        |
| ------------------- | -------- | ---------------------------------- | ------------------------------------------------------------------ |
| `items`             | `Item[]` | —                                  | The panels (see shape below).                                      |
| `contentWidth`      | `number` | `628`                              | Desktop width (px) of the active panel's content column.           |
| `gap`               | `number` | `32`                               | Desktop gap (px) between panels.                                   |
| `columns`           | `number` | `4`                                | Notional grid columns — only used to align the meta text.          |
| `metaOffsetColumns` | `number` | `0`                                | Shift the meta text right by N columns on desktop (0 = flush).     |
| `sideMargin`        | `number` | `24`                               | Minimum viewport margin (px/side) the content column keeps.        |
| `maxItemHeight`     | `number` | `520`                              | Max height (px) of a panel; taller images scale down keeping ratio.|
| `sizes`             | `string` | `(min-width: 700px) 628px, 82vw`   | `sizes` hint for the panel `<img>`.                                |
| `lightboxSizes`     | `string` | `84vw`                             | `sizes` hint forwarded to the lightbox images.                     |
| `Caption`           | `Component` | plain `<h3>`/`<p>`              | Component used to render the meta title/subtitle. Receives `as` and `children`. Pass `text-morph`'s `TextMorph` (or your own) to animate. |

## `<Lightbox>` props (internal)

The `<Lightbox>` is normally rendered and driven by `<Slider>` during the
shared-element zoom — you don't usually mount it yourself. If you do, these are
its props:

| Prop                  | Type       | Default | Description                                          |
| --------------------- | ---------- | ------- | ---------------------------------------------------- |
| `items`               | `Item[]`   | —       | Same item array passed to `<Slider>`.                |
| `activeIndex`         | `number`   | —       | Index to open on.                                    |
| `sizes`               | `string`   | `84vw`  | `sizes` hint for the images.                         |
| `onActiveIndexChange` | `Function` | —       | Called with the new index as the user scrolls.       |
| `onClose`             | `Function` | —       | Called to dismiss the lightbox.                      |

On mobile (`< 700px`) the lightbox shows a fixed control bar with prev / close /
next buttons; prev and next dim and disable at the first and last slide.

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
}
```

If `highResSrc` is omitted the lightbox just shows `src` at full size — no
placeholder/swap layer is rendered.

## Notes

- Don't wrap the app in `<StrictMode>` — its dev-only double-invoke of effects
  fights the one-pass measure / view-transition logic. See `demo/src/main.jsx`.
- The view transition uses a single shared name (`slider-active`), so render one
  `<Slider>` per page if you rely on the zoom animation.
