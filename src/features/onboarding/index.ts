/**
 * Public API of the `onboarding` feature.
 *
 * Cross-feature imports go through this barrel only — never reach into
 * `features/onboarding/screens/…` from another slice. `RootNavigator` needs
 * both halves: the screen to show, and the flag to decide whether to.
 */

export * from './screens';
export { useOnboardingStore } from './store/onboardingStore';
export { shouldShowOnboarding } from './gate';
export { PANELS } from './panels';
export type { OnboardingPanel } from './panels';
