/**
 * financeApp.md Section 1.1 only specifies two text metrics explicitly:
 * screen titles (24–26px/700/uppercase, two lines, second line in accent —
 * that coloring is `ScreenTitle`'s job in Phase 1.2, not baked in here) and
 * the 11px muted subtitle under them. Everything else (card titles, body,
 * labels, KPI values) isn't given a size/weight anywhere in this spec —
 * rather than invent numbers, those are added here only once a Phase 1.2
 * component actually needs one, each addition documented at that point.
 *
 * No Space Grotesk font files exist in this repo (same gap already flagged
 * in `src/theme/typography.ts` for the Production rebuild) — renders in the
 * system font until real `.ttf` files are added and linked.
 */
export const typography = {
  /** Spec gives a 24–26px range; 26 picked (upper bound, same convention `src/theme/typography.ts` used for its own ranges). */
  screenTitle: { fontSize: 26, fontWeight: '700' as const, lineHeight: 30, textTransform: 'uppercase' as const },
  subtitle: { fontSize: 11, fontWeight: '500' as const, lineHeight: 15 },
} as const;
