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
  /** Looping muted video URL; autoplays only while the panel is active. */
  video?: string;
}

/** Props passed to the optional `Caption` component (e.g. `text-morph`'s `TextMorph`). */
export interface CaptionProps {
  as?: ElementType;
  children?: ReactNode;
}

export interface SliderProps {
  /** The panels. */
  items: SliderItem[];
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
   * `children`. Defaults to plain `<h3>` / `<p>`; pass `text-morph`'s
   * `TextMorph` (or your own) to animate the caption.
   */
  Caption?: ComponentType<CaptionProps>;
}

export declare const Slider: ComponentType<SliderProps>;

export interface LightboxProps {
  /** Same item array passed to `<Slider>`. */
  items: SliderItem[];
  /** Index to open on. */
  activeIndex: number;
  /** `sizes` hint for the images. Default `"84vw"`. */
  sizes?: string;
  /** Called with the new index as the user scrolls. */
  onActiveIndexChange?: (index: number) => void;
  /** Called to dismiss the lightbox. */
  onClose?: () => void;
}

export declare const Lightbox: ComponentType<LightboxProps>;
