/**
 * @format
 */
import { mapLoginError } from '@/features/auth/mapLoginError';

describe('mapLoginError', () => {
  it('maps a null status (no network) to the first-time-sign-in offline message', () => {
    expect(mapLoginError({ status: null, message: 'No internet connection.' })).toBe(
      "You're offline. Connect to sign in for the first time.",
    );
  });

  it('maps 401 to a fixed "wrong credentials" message, ignoring the server string', () => {
    expect(mapLoginError({ status: 401, message: 'jwt malformed' })).toBe('Email or password is incorrect.');
  });

  it('maps 429 to a generic retry message', () => {
    expect(mapLoginError({ status: 429, message: 'Too many requests' })).toBe('Something went wrong. Please try again in a moment.');
  });

  it('maps a 5xx to a generic retry message', () => {
    expect(mapLoginError({ status: 500, message: 'Internal Server Error' })).toBe('Something went wrong. Please try again in a moment.');
  });

  it('passes through a friendly server message for other statuses (e.g. account disabled)', () => {
    expect(mapLoginError({ status: 403, message: 'Your account is pending admin approval.' })).toBe(
      'Your account is pending admin approval.',
    );
  });

  it('falls back to a generic message for a non-API error', () => {
    expect(mapLoginError(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});
