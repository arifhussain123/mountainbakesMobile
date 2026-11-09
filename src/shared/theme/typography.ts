import { font } from './fonts';

/**
 * Two tiers of text tokens:
 *
 * 1. The original tokens (`screenTitle` … `kpi`) render in the OS system font.
 *    Every built screen reads them, so switching them to Space Grotesk is a
 *    one-line change here (`...font('bold')` etc.) once that pass is wanted —
 *    it was deliberately NOT done blind across 60+ screens in the same change
 *    that introduced the font.
 * 2. The `brand*` tokens below are Space Grotesk, matching the design files'
 *    splash/onboarding/login screens — uppercase bold headings with a tight
 *    line height, medium-weight body.
 */
export const typography = {
  screenTitle: { fontSize: 24, fontWeight: '700' as const, lineHeight: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  cardTitle: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 21 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  kpi: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },

  /** The three-line onboarding headline / "WELCOME BACK" — ~32sp, line height ~1.1, uppercase. */
  brandHeadline: {
    ...font('bold'),
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  /** The splash wordmark — one line, never wraps. */
  brandWordmark: {
    ...font('bold'),
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  /** Onboarding body copy, the login subtitle. */
  brandBody: { ...font('medium'), fontSize: 13, lineHeight: 20 },
  /** Field labels ("Email *"), feature-strip labels, "Remember me". */
  brandLabel: { ...font('bold'), fontSize: 12, lineHeight: 16 },
  /** What the user types into an input. */
  brandInput: { ...font('medium'), fontSize: 14, lineHeight: 18 },
  /** Helper and error text under a field; the "Loading…" caption. */
  brandCaption: { ...font('medium'), fontSize: 11, lineHeight: 16 },
  /** Pill button labels. */
  brandButton: { ...font('bold'), fontSize: 15, lineHeight: 18 },
  /** Inline text links ("Skip", "Forgot password?", "Show"). */
  brandLink: { ...font('bold'), fontSize: 13, lineHeight: 18 },
} as const;
