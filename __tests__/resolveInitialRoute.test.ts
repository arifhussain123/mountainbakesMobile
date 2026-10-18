/**
 * @format
 */
import { resolveInitialRoute } from '@/navigation/AuthNavigator/resolveInitialRoute';
import { Routes } from '@/navigation/routes';

describe('resolveInitialRoute', () => {
  it('sends a user who has completed onboarding straight to Login', () => {
    expect(resolveInitialRoute('true')).toBe(Routes.LOGIN);
  });

  it('sends a fresh install (no stored flag) to Onboarding', () => {
    expect(resolveInitialRoute(null)).toBe(Routes.ONBOARDING);
  });

  it('sends any other stored value to Onboarding, not just an explicit false', () => {
    expect(resolveInitialRoute('false')).toBe(Routes.ONBOARDING);
  });
});
