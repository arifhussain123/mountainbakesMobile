/**
 * Corner radii.
 *
 * Split out of `spacing.ts` so the one place that decides how round this app is
 * is a file you can open, not four lines buried under the 4pt scale.
 *
 * The values are deliberately generous — soft corners are most of what makes a
 * dense operations screen read as "bakery" rather than "spreadsheet". Nothing in
 * the app should use a literal radius; `pill` is what a fully-rounded chip or
 * FAB asks for, rather than someone computing `height / 2` at the call site.
 */
export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export type Radius = keyof typeof radius;
