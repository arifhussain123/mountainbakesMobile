import type { IconName } from '@/shared/ui';

export interface OnboardingHeadlineLine {
  text: string;
  /** Render this line in the accent color instead of the default text color. */
  accent?: boolean;
}

export interface OnboardingFeature {
  icon: IconName;
  label: string;
}

export interface OnboardingSlideContent {
  headline: OnboardingHeadlineLine[];
  body: string;
  /** Omitted on slides with no feature strip (e.g. the final, text-only slide). */
  features?: OnboardingFeature[];
  cta: string;
  /** false only on the final slide — matches the design file's own 2-slide flow, where Skip only shows on slide 1. */
  showSkip: boolean;
}

/**
 * mountainbakesBranch.html gives slide 1 ("02 Onboarding 1") and the final
 * slide ("02b Onboarding 3", the 2 AM business-day rule) verbatim. Slide 2 is
 * PLACEHOLDER copy — there is no "02a" screen in the design file yet — flagged
 * here and in the implementation summary so it can be swapped in later
 * without touching OnboardingScreen/OnboardingSlide.
 */
export const ONBOARDING_SLIDES: OnboardingSlideContent[] = [
  {
    headline: [{ text: 'Fresh' }, { text: 'from the', accent: true }, { text: 'oven daily' }],
    body: 'Sales, stock and orders for your branch, from the first bake to the evening close.',
    features: [
      { icon: 'trending-up', label: 'Live sales' },
      { icon: 'layers', label: 'Stock' },
      { icon: 'grid', label: 'Daily close' },
    ],
    cta: 'Next',
    showSkip: true,
  },
  {
    // PLACEHOLDER — no "02a" screen exists in mountainbakesBranch.html yet;
    // replace with real orders/production copy once that design lands.
    headline: [{ text: 'Orders' }, { text: 'on time', accent: true }, { text: 'every time' }],
    body: 'Track every order from request to delivery, with production kept in sync at every branch.',
    features: [
      { icon: 'orders', label: 'New orders' },
      { icon: 'stock', label: 'Production' },
      { icon: 'transfer', label: 'Delivery' },
    ],
    cta: 'Next',
    showSkip: true,
  },
  {
    // mountainbakesBranch.html "02b Onboarding 3" — the 2 AM Asia/Karachi
    // business-day rollover documented in src/api/businessDate.ts. Real,
    // load-bearing copy, not a placeholder — kept as the 3rd slide rather
    // than dropped, since it explains a rule the rest of the app depends on.
    headline: [{ text: 'The day' }, { text: 'ends at', accent: true }, { text: '2 AM' }],
    body: 'A sale rung up at 9pm belongs to that evening even if it reaches the office next morning. A late shift is never split across two days.',
    cta: 'Get Started',
    showSkip: false,
  },
];
