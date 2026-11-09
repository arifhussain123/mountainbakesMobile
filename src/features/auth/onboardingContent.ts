import type { IconName } from '@/shared/ui/Icon';

export interface HeadlineLine {
  text: string;
  /** Rendered in the accent orange instead of white. */
  accent?: boolean;
}

export interface OnboardingFeature {
  icon: IconName;
  label: string;
}

export interface OnboardingPage {
  key: string;
  /** Three short lines, rendered uppercase (the token applies the transform). */
  headline: HeadlineLine[];
  /** What a screen reader says for the headline — one sentence, not three fragments. */
  headlineLabel: string;
  body: string;
  /** The three-cell feature strip. Absent on the last page, where the body sits directly above the button. */
  features?: OnboardingFeature[];
  cta: string;
  /** Logo diameter in dp. The last page's logo is a little larger and its content block sits lower. */
  logoSize: number;
  /** Copy still awaiting the real design — flagged so it is not mistaken for final. */
  placeholder?: boolean;
}

/** mountainbakesBranch.html screens 02 (page 1) and 02b (page 3); page 2's design has not been sent yet. */
export const ONBOARDING_PAGES: readonly OnboardingPage[] = [
  {
    key: 'fresh',
    headline: [
      { text: 'Fresh' },
      { text: 'from the', accent: true },
      { text: 'oven daily' },
    ],
    headlineLabel: 'Fresh from the oven daily',
    body: 'Sales, stock and orders for your branch, from the first bake to the evening close.',
    features: [
      { icon: 'trending-up', label: 'Live sales' },
      { icon: 'layers', label: 'Stock' },
      { icon: 'grid', label: 'Daily close' },
    ],
    cta: 'Next',
    logoSize: 110,
  },
  {
    // PLACEHOLDER — replace the copy and features once the page 2 design arrives.
    key: 'orders',
    headline: [
      { text: 'Orders' },
      { text: 'on', accent: true },
      { text: 'time' },
    ],
    headlineLabel: 'Orders on time',
    body: 'Raise production orders, follow what has been baked and know when it is on its way to you.',
    features: [
      { icon: 'plus', label: 'New orders' },
      { icon: 'box', label: 'Production' },
      { icon: 'calendar', label: 'Delivery' },
    ],
    cta: 'Next',
    logoSize: 110,
    placeholder: true,
  },
  {
    // The server's own rule (`BUSINESS_DAY_START_MINUTES` = 02:00 Asia/Karachi,
    // mirrored in api/businessDate.ts) — this copy describes the real rollover.
    key: 'business-day',
    headline: [
      { text: 'The day' },
      { text: 'ends at', accent: true },
      { text: '2 AM' },
    ],
    headlineLabel: 'The day ends at 2 AM.',
    body: 'A sale rung up at 9pm belongs to that evening even if it reaches the office next morning. A late shift is never split across two days.',
    cta: 'Get Started',
    logoSize: 130,
  },
];

export const ONBOARDING_PAGE_COUNT = ONBOARDING_PAGES.length;
