import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import { renderScreen } from '@/common/test-utils/render';

import { FirstRunScreen, pageScroll } from '../FirstRunScreen';
import { shouldShowOnboarding } from '../../gate';
import { PANELS } from '../../panels';
import { useOnboardingStore } from '../../store/onboardingStore';

/**
 * What these hold is the part of the screen that fails silently.
 *
 * The panels render or they do not, and that is obvious. What is not obvious is
 * the CTA naming the wrong action, Skip surviving onto the last panel, or the
 * flag never being written — the last of which shows the tour again on every
 * launch, forever, and reads as a rendering bug rather than a storage one.
 */
beforeEach(() => {
  useOnboardingStore.setState({ seen: false });
});

describe('FirstRunScreen', () => {
  it('opens on the first panel', async () => {
    const screen = await renderScreen(<FirstRunScreen />);
    expect(screen.getByText(PANELS[0].title)).toBeTruthy();
  });

  /**
   * The CTA says what it does. "Next" on a screen with nothing after it, or
   * "Get started" with two panels still to come, is the kind of wrong nobody
   * reports and everybody notices.
   */
  it('names the action: Next until the last panel, then Get started', async () => {
    const screen = await renderScreen(<FirstRunScreen />);
    const cta = () => screen.getByTestId('onboarding-cta');

    for (let i = 0; i < PANELS.length - 1; i += 1) {
      expect(cta()).toHaveTextContent('Next');
      await fireEvent.press(cta());
    }
    expect(cta()).toHaveTextContent('Get started');
  });

  /**
   * Skip and Get started are the same action, so the last panel offers one of
   * them. Two controls doing one thing side by side is a decision the user has
   * to stop and read.
   */
  it('offers Skip on every panel but the last', async () => {
    const screen = await renderScreen(<FirstRunScreen />);
    for (let i = 0; i < PANELS.length - 1; i += 1) {
      expect(screen.getByTestId('onboarding-skip')).toBeTruthy();
      await fireEvent.press(screen.getByTestId('onboarding-cta'));
    }
    expect(screen.queryByTestId('onboarding-skip')).toBeNull();
  });

  /**
   * Both exits write the flag. Skipping is not "I will see it next time" — a
   * tour somebody has already declined, offered again every launch, is worse
   * than one they never saw.
   */
  it('records that the panels have run — on finish', async () => {
    const screen = await renderScreen(<FirstRunScreen />);
    for (let i = 0; i < PANELS.length; i += 1) {
      await fireEvent.press(screen.getByTestId('onboarding-cta'));
    }
    expect(useOnboardingStore.getState().seen).toBe(true);
  });

  it('records that the panels have run — on skip', async () => {
    const screen = await renderScreen(<FirstRunScreen />);
    await fireEvent.press(screen.getByTestId('onboarding-skip'));
    expect(useOnboardingStore.getState().seen).toBe(true);
  });
});

/**
 * The page turn keeps its change under Reduce Motion and loses its travel. The
 * decision is asserted on the pure function because a ref's `scrollTo` is a
 * no-op on a host component under Jest — the rendered tree cannot show it.
 */
describe('pageScroll', () => {
  it('slides to the page normally', () => {
    expect(pageScroll(2, 390, false)).toEqual({ x: 780, y: 0, animated: true });
  });

  it('arrives at the same page without travelling, under Reduce Motion', () => {
    expect(pageScroll(2, 390, true)).toEqual({ x: 780, y: 0, animated: false });
  });
});

/**
 * The gate, which cannot be observed by rendering `RootNavigator` without
 * pulling in every navigator in the app.
 */
describe('shouldShowOnboarding', () => {
  it('shows the panels on a first run with no session', () => {
    expect(shouldShowOnboarding(false, 'signedOut')).toBe(true);
    expect(shouldShowOnboarding(false, 'bootstrapping')).toBe(true);
  });

  it('never shows them again once they have run', () => {
    expect(shouldShowOnboarding(true, 'signedOut')).toBe(false);
  });

  /**
   * The upgrade path, and the reason `status` is in the signature at all. This
   * flag reads absent on every phone that installed the app before it existed;
   * without this, the whole shop gets a tour mid-shift.
   */
  it('does not interrupt a device that already has a session', () => {
    expect(shouldShowOnboarding(false, 'signedIn')).toBe(false);
  });
});
