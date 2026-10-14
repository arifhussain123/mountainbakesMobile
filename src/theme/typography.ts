/**
 * productionApp.md Step 1: "Space Grotesk (400, 500, 600, 700). Bundle the
 * font files." No font binaries exist anywhere in this repo (confirmed —
 * `find . -iname '*spacegrotesk*' -o -iname '*.ttf' -o -iname '*.otf'` finds
 * nothing under `mobile/`) and this agent has no way to source/license font
 * files on its own. Every style below is structured exactly as the spec asks
 * (same sizes/weights/letter-spacing) but renders in the OS system font until
 * real `.ttf` files are added to `assets/fonts/` and linked — swapping in
 * `fontFamily: 'SpaceGrotesk-Bold'` etc. at that point touches only this file.
 */
export const typography = {
  /** Screen titles — two lines, second line colored with the active accent by `ScreenTitle` (Step 2), not baked in here. */
  display: { fontSize: 26, fontWeight: '700' as const, lineHeight: 26, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  sheetTitle: { fontSize: 22, fontWeight: '700' as const, lineHeight: 26, textTransform: 'uppercase' as const },
  /** Dashboard's total-demand hero number. */
  heroNumber: { fontSize: 40, fontWeight: '700' as const, lineHeight: 44 },
  /** Sales screen's grand-total hero number — spec calls out 36 instead of 40 for this one card. */
  heroNumberCompact: { fontSize: 36, fontWeight: '700' as const, lineHeight: 40 },
  /** Card titles — spec gives a 14–16 range; 15 picked as the single value every card title reads. */
  title: { fontSize: 15, fontWeight: '700' as const, lineHeight: 20 },
  /** Spec gives a 12–13 range; 13 picked (upper bound, more legible on small screens). */
  body: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '500' as const, lineHeight: 15 },
  /** KPI labels, table column headers — spec gives 9–10/bold/letterSpacing 1–1.2; 10/1.1 picked. */
  overline: { fontSize: 10, fontWeight: '700' as const, lineHeight: 13, letterSpacing: 1.1, textTransform: 'uppercase' as const },
} as const;
