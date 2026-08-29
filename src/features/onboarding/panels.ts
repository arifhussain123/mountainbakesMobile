/**
 * The first-run panels, and the single source the dots are counted from.
 *
 * ---------------------------------------------------------------------------
 * One list, three consumers
 * ---------------------------------------------------------------------------
 * `FirstRunScreen` maps this to pages, `OnboardingDots` takes its length, and
 * the CTA reads its index to decide between "Next" and "Get started". None of
 * the three carries a number of its own, so a fourth panel is one entry here
 * and no other edit — and three dots over four panels is not expressible.
 *
 * ---------------------------------------------------------------------------
 * The copy is a first draft, and it is meant to be replaced
 * ---------------------------------------------------------------------------
 * Screen 01 of the v6 mock shows the shape of this screen but carries no
 * wording for it, so the three below were written against what the app
 * actually does rather than transcribed. Each is a thing a new member of staff
 * has to be told and cannot infer from the UI:
 *
 *   1. the app is role-scoped, so their colleague's screen looks different;
 *   2. writes are offline-first, so a lost signal is not a lost sale;
 *   3. the business day closes at 02:00, so a late sale is not tomorrow's.
 *
 * Points 2 and 3 are the two that generate support questions, which is why
 * they beat a tour of the navigation. Changing any of it is a change to this
 * file alone.
 */
export interface OnboardingPanel {
  /** Stable across reorders — used as the React key and in tests. */
  key: string;
  title: string;
  body: string;
}

/**
 * Typed as a non-empty tuple rather than an array, so `PANELS[0]` is a panel
 * and not `Panel | undefined`. Zero panels is not a state this screen has: the
 * gate that shows it would open onto an empty pager and a row of no dots.
 */
export const PANELS: readonly [OnboardingPanel, ...OnboardingPanel[]] = [
  {
    key: 'welcome',
    title: 'Welcome to Mountain Bakes',
    body: 'The counter, the kitchen and the office in one app. You will see the part that is yours — your colleague signing in on the next phone sees theirs.',
  },
  {
    key: 'offline',
    title: 'It works without a signal',
    body: 'Sales, orders and expenses are saved on this phone the moment you enter them, then sent when the connection comes back. Carry on serving; nothing waits for the network.',
  },
  {
    key: 'business-day',
    title: 'The day ends at 2am',
    body: 'A sale rung up at 9pm belongs to that evening even if it reaches the office next morning. Business days close at 02:00, so a late shift is never split across two.',
  },
] as const;
