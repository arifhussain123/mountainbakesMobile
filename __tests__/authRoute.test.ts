/**
 * @format
 */
import { selectAuthRoute } from '@/navigation/authRoute';

describe('selectAuthRoute (bootstrap routing)', () => {
  it('shows the splash while the session is being restored, whatever the onboarding flag', () => {
    expect(selectAuthRoute('bootstrapping', false)).toBe('splash');
    expect(selectAuthRoute('bootstrapping', true)).toBe('splash');
  });

  it('sends a fresh install (no session, onboarding never completed) to onboarding', () => {
    expect(selectAuthRoute('signedOut', false)).toBe('onboarding');
  });

  it('sends a second launch without a session straight to login', () => {
    expect(selectAuthRoute('signedOut', true)).toBe('login');
  });

  it('sends a restored or freshly signed-in session to Main, even if onboarding was never completed', () => {
    expect(selectAuthRoute('signedIn', true)).toBe('main');
    expect(selectAuthRoute('signedIn', false)).toBe('main');
  });
});
