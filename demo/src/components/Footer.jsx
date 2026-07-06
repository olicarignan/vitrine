import { IconLink } from "../IconLink";
import { ArrowIcon } from "../ArrowIcon";
import { version } from "../../../package.json";

/** Shared page footer: image source + author credits, aligned to the column. */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <div className="grid">
      <div className="subgrid">
        <footer className="page__footer credits">
          <div className="credit">
            <span>Images from the</span>
            <IconLink href="https://www.artic.edu/" icon={<ArrowIcon />}>
              Art Institute of Chicago
            </IconLink>
          </div>
          <div className="credit">
            <span>Made by</span>
            <IconLink href="https://oliviercarignan.com">
              Olivier Carignan
            </IconLink>
          </div>
          <hr className="footer__separator" />
          <div className="footer__meta">
            <div className="credit">
              <IconLink
                href="https://github.com/olicarignan/slider-lightbox"
                icon={<ArrowIcon />}
              >
                GitHub
              </IconLink>
            </div>
            <div className="credit">
              <span>&copy; {year}</span>
              <span aria-hidden="true">·</span>
              <span>v{version}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
