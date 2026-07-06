// Shared inline SVG glyphs for the control buttons (lightbox bar, slider
// arrows). Inlined so the package ships no icon assets.

export const ChevronLeftIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M9 1L3 7L9 13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ChevronRightIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M5 1L11 7L5 13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PlayIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M3.5 1.75L12 7L3.5 12.25V1.75Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const PauseIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="3" y="2" width="2.75" height="10" rx="1" />
    <rect x="8.25" y="2" width="2.75" height="10" rx="1" />
  </svg>
);

export const VolumeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M1.5 5H4L7.5 2V12L4 9H1.5V5Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinejoin="round"
    />
    <path
      d="M10 4.5C11.3 5.8 11.3 8.2 10 9.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const MuteIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M1.5 5H4L7.5 2V12L4 9H1.5V5Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinejoin="round"
    />
    <path
      d="M9.75 5.5L12.75 8.5M12.75 5.5L9.75 8.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// Picture-in-picture: outer frame with a small inset panel.
export const PipIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="1"
      y="2.5"
      width="12"
      height="9"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <rect x="6.75" y="6.25" width="5.25" height="4.25" rx="1" fill="currentColor" />
  </svg>
);

// Enter fullscreen: four corner brackets.
export const FullscreenIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M5 1H1V5M9 1H13V5M5 13H1V9M9 13H13V9"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// metamorphosis IconDefs (shared 24×24 icon space). The morph maps segment N
// of one icon to segment N of the other, so BOTH must list exactly three
// segments — pad the shorter icon with a collapsed center point `[12,12,12,12]`
// (rendered invisible) or the morph reads past the target's array and throws.
// Play is an outlined right-pointing triangle; pause is two vertical bars.
export const PLAY_ICON_DEF = {
  lines: [
    [9, 6, 18, 12],
    [18, 12, 9, 18],
    [9, 18, 9, 6],
  ],
};
export const PAUSE_ICON_DEF = {
  lines: [
    [9.5, 6, 9.5, 18],
    [14.5, 6, 14.5, 18],
    [12, 12, 12, 12],
  ],
};

export const CloseIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M1 1L13 13M13 1L1 13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);
