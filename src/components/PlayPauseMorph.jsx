"use client";

import { IconMorph } from "@ocarignan/metamorphosis/react";
import { PLAY_ICON_DEF, PAUSE_ICON_DEF } from "./icons";

/**
 * A play glyph that morphs into a pause glyph (and back) via metamorphosis's
 * IconMorph as `playing` flips. Both `name` and `icon` change together so the
 * engine always registers the switch and animates the segments between the
 * outlined triangle and the two bars.
 */
export function PlayPauseMorph({ playing, size = 26, color = "#fff", strokeWidth = 2 }) {
  return (
    <IconMorph
      name={playing ? "pause" : "play"}
      icon={playing ? PAUSE_ICON_DEF : PLAY_ICON_DEF}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      duration={220}
    />
  );
}
