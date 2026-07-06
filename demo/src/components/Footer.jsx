import { IconLink } from "../IconLink";
import { ArrowIcon } from "../ArrowIcon";

/** Shared page footer: image source + author credits, aligned to the column. */
export function Footer() {
  return (
    <div className="grid">
      <div className="subgrid">
        <footer className="page__footer credits">
          <div className="credit">
            <span>Images from the</span>
            <IconLink href="https://www.artic.edu/" icon={<ArrowIcon />}>
              Art Institue of Chicago
            </IconLink>
          </div>
          <div className="credit">
            <span>Made by</span>
            <IconLink href="https://oliviercarignan.com">
              Olivier Carignan
            </IconLink>
          </div>
        </footer>
      </div>
    </div>
  );
}
