# Slider + Lightbox

A draggable horizontal project slider with a shared-element zoom into a
fullscreen lightbox. Extracted as a self-contained, prop-driven component so it
can drop into any React project — no host grid system required.

Built with React 19, [`motion`](https://motion.dev), and the native
[View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
(progressive enhancement — falls back to a plain open/close where unsupported).

## Features

- Drag (with inertia + snap), wheel/trackpad scroll, and click-to-center.
- Click the centered panel to zoom into a fullscreen, swipeable lightbox.
- Shared-element view transition between the panel and the lightbox image.
- Optional looping muted **video** per panel, autoplaying only while active.
- Progressive hi-res image swap in the lightbox (low-res placeholder → hi-res).
- Mobile-tuned: centered snap, depth scaling, and a floating close button.
- Keyboard support in the lightbox (`←` / `→` / `Esc`).

## Run the demo

```bash
pnpm install   # or npm install
pnpm dev       # then open the printed localhost URL
```

The demo (`src/App.jsx`, `src/demo-data.js`) renders the slider with random
artworks pulled live from [The Met Collection API](https://metmuseum.github.io/)
— it searches for image-bearing works under a random term each load, so you get
a different set every refresh.

## Use it in your project

Copy these into your app:

- `src/components/Slider.jsx`
- `src/components/Lightbox.jsx`
- `src/styles/slider.css`
- `src/styles/lightbox.css`
- `public/images/svg/cursor_plus.svg`, `public/images/svg/cursor_x.svg`
  (the custom zoom cursors — or edit the `cursor:` rules in the CSS to drop them)

Install peer dependencies: `react`, `react-dom`, `motion`, `torph`.

Import the styles once, then render:

```jsx
import { Slider } from "./components/Slider";
import "./styles/slider.css";
import "./styles/lightbox.css";

<Slider items={items} />;
```

### Required CSS tokens

The stylesheets read a few CSS custom properties — define them on `:root` (see
`src/demo.css`):

| Token             | Used for                                    |
| ----------------- | ------------------------------------------- |
| `--gap`           | gap between slider panels (desktop)         |
| `--accent-color`  | meta title color, focus ring, mobile button |
| `--text-color`    | meta subtitle color                         |
| `--color-text`    | mobile close-button icon color              |

To get the rest of the page to cross-fade during the zoom, also set
`view-transition-name: root` on `:root`.

## `<Slider>` props

| Prop                | Type     | Default                            | Description                                                        |
| ------------------- | -------- | ---------------------------------- | ------------------------------------------------------------------ |
| `items`             | `Item[]` | —                                  | The panels (see shape below).                                      |
| `contentWidth`      | `number` | `628`                              | Desktop width (px) of the active panel's content column.           |
| `gap`               | `number` | `32`                               | Desktop gap (px) between panels.                                   |
| `columns`           | `number` | `4`                                | Notional grid columns — only used to align the meta text.          |
| `metaOffsetColumns` | `number` | `2`                                | Shift the meta text right by N columns on desktop.                 |
| `sideMargin`        | `number` | `24`                               | Minimum viewport margin (px/side) the content column keeps.        |
| `sizes`             | `string` | `(min-width: 700px) 628px, 82vw`   | `sizes` hint for the panel `<img>`.                                |
| `lightboxSizes`     | `string` | `84vw`                             | `sizes` hint forwarded to the lightbox images.                     |

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
  fights the one-pass measure / view-transition logic. See `src/main.jsx`.
- The view transition uses a single shared name (`slider-active`), so render one
  `<Slider>` per page if you rely on the zoom animation.
