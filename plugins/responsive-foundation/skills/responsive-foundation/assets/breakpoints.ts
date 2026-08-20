/**
 * Breakpoint tokens — the TypeScript mirror of breakpoints.css.
 *
 * scripts/audit-breakpoints.mjs verifies these values match the @custom-media
 * declarations in breakpoints.css. Do not edit one file without the other; a
 * mirror that silently drifts is worse than no mirror at all.
 *
 * Only import this where JS genuinely needs the number (a chart's tick density,
 * a virtualizer's column count, the matchMedia hooks). Layout belongs in CSS.
 */

export const BREAKPOINTS = {
  sm: '40rem',
  md: '48rem',
  lg: '64rem',
  xl: '80rem',
  '2xl': '96rem',
} as const satisfies Record<string, `${number}rem`>;

export type Breakpoint = keyof typeof BREAKPOINTS;

/** `(width >= 48rem)` — matches --md in breakpoints.css. */
export const up = (bp: Breakpoint): string => `(width >= ${BREAKPOINTS[bp]})`;

/** `(width < 48rem)` — exclusive, so up(bp) and down(bp) never both match. */
export const down = (bp: Breakpoint): string => `(width < ${BREAKPOINTS[bp]})`;

/** `(48rem <= width < 64rem)` — half-open, for the same reason. */
export const between = (min: Breakpoint, max: Breakpoint): string =>
  `(${BREAKPOINTS[min]} <= width < ${BREAKPOINTS[max]})`;
