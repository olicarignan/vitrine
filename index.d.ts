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
   * the lightbox still plays it.
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
   * track (poster only — the lightbox still plays it). Default `"row"`.
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
   * Default `true`.
   */
  lightbox?: boolean;
  /**
   * Show prev / close / next buttons in the lightbox (on all breakpoints).
   * Default `false`.
   */
  lightboxControls?: boolean;
  /** Called with `(item, index)` when the active panel is clicked and `lightbox` is `false`. */
  onItemClick?: (item: SliderItem, index: number) => void;
  /** Show prev/next buttons beside the caption. Default `false`. */
  arrows?: boolean;
  /**
   * Show one dot per panel beside the caption; the active dot tracks
   * scrolling and clicking a dot navigates. Default `false`.
   */
  pagination?: boolean;
  /**
   * Show play/pause + mute + scrubber over the active video panel (slider and
   * lightbox). Videos still autoplay muted. Default `false`.
   */
  videoControls?: boolean;
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
  /** Show play/pause + mute + scrubber over the active video item. Default `false`. */
  videoControls?: boolean;
  /**
   * Shared-element view-transition name; `<Slider>` passes its per-instance
   * name. Default `"slider-active"`.
   */
  transitionName?: string;
  /** Called with the new index as the user scrolls. */
  onActiveIndexChange?: (index: number) => void;
  /** Called to dismiss the lightbox. */
  onClose?: () => void;
}

export declare const Lightbox: ComponentType<LightboxProps>;
