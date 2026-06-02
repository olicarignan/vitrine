// Loading placeholder shown while artworks are fetched from The Met. Mirrors the
// real <Slider> footprint — the active panel aligned to the content column's
// left edge with the next panel peeking to the right, and a two-line caption —
// so the layout doesn't shift when the data arrives and the slider mounts.
export function SliderSkeleton() {
  return (
    <>
      <p className="sr-only" role="status">
        Loading artworks from The Met…
      </p>
      <div className="grid" aria-hidden="true">
        <div className="subgrid">
          <div className="slider-skeleton">
            <div className="slider-skeleton__track">
              <div className="slider-skeleton__panel slider-skeleton__panel--main" />
              <div className="slider-skeleton__panel slider-skeleton__panel--side" />
            </div>
            <div className="slider-skeleton__meta">
              <span className="slider-skeleton__line slider-skeleton__line--title" />
              <span className="slider-skeleton__line slider-skeleton__line--sub" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
