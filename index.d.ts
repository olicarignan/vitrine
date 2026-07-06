import type { ComponentType, ElementType, ReactNode } from "react";

/** A single panel in the slider / lightbox. All image fields are plain URLs. */
export interface SliderItem {
  /** Unique key (falls back to the array index). */
  id?: string | number;
  /** Shown in the meta line. */
  title?: string;
  /** Secondary meta line, e.g. "Brand · 2024". */
  meta?: string;
  /** Required: featured image URL. */
  src: string;
  /** Responsive srcset for the panel image. */
  srcSet?: string;
  /** webp `<source>` srcset for the panel image. */
  webpSrcSet?: string;
  /** Low-quality placeholder (data URI). */
  blurDataURL?: string;
  /** Alt text (defaults to `title`). */
  alt?: string;
  /** Hi-res image for the lightbox (falls back to `src`). */
  highResSrc?: string;
  highResSrcSet?: string;
  highResWebpSrcSet?: string;
  /**
   * Looping muted video URL; autoplays only while the panel is active.
   * Ignored by the `stack` and `coverflow` track variants (poster only) —
   * the coverflow lightbox still plays it.
   */
  video?: string;
}

/** Track layout of the slider. */
export type SliderVariant = "row" | "stack" | "coverflow";

/** Props passed to the `Caption` component (matching metamorphosis's `TextMorph`). */
export interface CaptionProps {
  as?: ElementType;
  children?: ReactNode;
}

export interface SliderProps {
  /** The panels. */
  items: SliderItem[];
  /**
   * Track layout: the scroll-snap carousel (default), a deck-cycling card
   * stack, or a 3D coverflow. Stack and coverflow ignore `item.video` in the
   * track (poster only). The stack has no lightbox (`lightbox` is ignored;
   * clicking the top card fires `onItemClick` if given). The coverflow
   * lightbox mirrors the track's styling: cover-cropped boxes and 3D-rotated
   * neighbors. Default `"row"`.
   */
  variant?: SliderVariant;
  /** Desktop width (px) of the active panel's content column. Default `628`. */
  contentWidth?: number;
  /** Desktop gap (px) between panels. Default `32`. */
  gap?: number;
  /** Notional grid columns — only used to align the meta text. Default `4`. */
  columns?: number;
  /** Shift the meta text right by N columns on desktop (0 = flush). Default `0`. */
  metaOffsetColumns?: number;
  /** Minimum viewport margin (px/side) the content column keeps. Default `24`. */
  sideMargin?: number;
  /** Max height (px) of a panel; taller images scale down keeping ratio. Default `520`. */
  maxItemHeight?: number;
  /**
   * Force every panel into a fixed width/height box (cover-cropped): a number
   * (`1.5`) or ratio string (`"16/9"`, `"3:2"`). Off by default — `row` and
   * `stack` keep each image's own aspect ratio. `coverflow` always uses a
   * fixed box (default ≈ 3:4) and this overrides it. Bounded by `maxItemHeight`.
   */
  aspectRatio?: number | string;
  /** `sizes` hint for the panel `<img>`. */
  sizes?: string;
  /** `sizes` hint forwarded to the lightbox images. Default `"84vw"`. */
  lightboxSizes?: string;
  /**
   * Component used to render the meta title/subtitle. Receives `as` and
   * `children`. Defaults to metamorphosis's morphing `TextMorph`; pass
   * `PlainCaption` (or your own) to opt out of the animation.
   */
  Caption?: ComponentType<CaptionProps>;
  /**
   * Set `false` to disable the lightbox entirely: clicking a panel no longer
   * zooms; the active panel's click instead fires `onItemClick` (if given).
   * Ignored by `variant="stack"`, which never has a lightbox.
   * Default `true`.
   */
  lightbox?: boolean;
  /**
   * Show prev / close / next buttons in the lightbox (on all breakpoints).
   * Default `false`.
   */
  lightboxControls?: boolean;
  /** Called with `(item, index)` when the active panel is clicked and the lightbox is disabled (or the variant is `"stack"`). */
  onItemClick?: (item: SliderItem, index: number) => void;
  /**
   * Endless scroll: the item array loops seamlessly. Arrow keys and the
   * `arrows` buttons wrap when looping. Defaults on for `"stack"` and
   * `"coverflow"`, off for `"row"`.
   */
  loop?: boolean;
  /** Show prev/next buttons beside the caption. Default `false`. */
  arrows?: boolean;
  /**
   * Show one dot per panel beside the caption; the active dot tracks
   * scrolling and clicking a dot navigates. Default `false`.
   */
  pagination?: boolean;
  /**
   * Video playback UI. On the slider panel: hovering the active panel reveals a
   * morphing play/pause toggle (and softly blurs the clip). In the lightbox: a
   * centered play/pause toggle plus a progress bar that glides with playback
   * and previews the seek target on hover — and, unless set to `"minimal"`,
   * expands on hover into a timestamp plus mute, picture-in-picture, and
   * fullscreen controls. `"minimal"` keeps only the play/pause + progress bar.
   * Videos still autoplay muted. Default `false`.
   */
  videoControls?: boolean | "minimal";
  /**
   * Override the auto-generated per-instance shared-element
   * view-transition name.
   */
  transitionName?: string;
  /**
   * Replace the static SVG cursors with a morphing icon cursor that follows the
   * pointer (metamorphosis `IconMorph`): `+` over a slider panel, `×` over the
   * active lightbox item or overlay, and `←`/`→` over the previous/next items.
   * Precise-pointer only; touch and no-JS keep the static cursors. Default
   * `false`.
   */
  morphCursor?: boolean;
}

export declare const Slider: ComponentType<SliderProps>;

/** Bare caption renderer (no animation). Pass as `Caption` to opt out of morphing. */
export declare const PlainCaption: ComponentType<CaptionProps>;

export interface LightboxProps {
  /** Same item array passed to `<Slider>`. */
  items: SliderItem[];
  /** Index to open on. */
  activeIndex: number;
  /** `sizes` hint for the images. Default `"84vw"`. */
  sizes?: string;
  /** Caption renderer (takes `as` + `children`); defaults to metamorphosis's morphing `TextMorph`. */
  Caption?: ComponentType<CaptionProps>;
  /** Render the prev / close / next buttons (on all breakpoints). Default `false`. */
  controls?: boolean;
  /** Play/pause toggle + progress bar over the active video item; unless `"minimal"`, the bar expands on hover into timestamp + mute / PiP / fullscreen. Default `false`. */
  videoControls?: boolean | "minimal";
  /**
   * Shared-element view-transition name; `<Slider>` passes its per-instance
   * name. Default `"slider-active"`.
   */
  transitionName?: string;
  /**
   * Mirror the coverflow track: items become uniform cover-cropped boxes and
   * neighbors carry the 3D rotation. Default `false`.
   */
  coverflow?: boolean;
  /** Box ratio (w/h) for coverflow items; `<Slider>` captures it from the active card at open time. */
  itemAspect?: number;
  /**
   * Endless scroll, mirroring the slider's loop state: the item array loops
   * and arrow keys / controls wrap. Default `false`.
   */
  loop?: boolean;
  /** Called with the new index as the user scrolls. */
  onActiveIndexChange?: (index: number) => void;
  /** Called to dismiss the lightbox. */
  onClose?: () => void;
}

export declare const Lightbox: ComponentType<LightboxProps>;
