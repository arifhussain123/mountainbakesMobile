/**
 * @format
 */
import {
  FORGOT_PASSWORD_MESSAGES,
  LOGIN_MESSAGES,
  mapForgotPasswordError,
  mapLoginError,
} from '@/features/auth/loginErrors';

// The shapes `api/client.ts`'s toApiError produces for each server answer.
const unauthorized = {
  status: 401,
  message: 'Invalid email or password',
  code: 'invalid_credentials',
};
const deactivated = {
  status: 403,
  message:
    'This account has been deactivated. Please contact your administrator.',
  code: 'account_inactive',
};
const noConnection = {
  status: null,
  message: 'No internet connection. Please check your network and try again.',
  code: 'network',
};
const timedOut = {
  status: null,
  message: 'The server took too long to respond. Please try again.',
  code: 'timeout',
};
const rateLimited = {
  status: 429,
  message:
    'Too many sign-in attempts. Please wait a few minutes and try again.',
};
const serverError = { status: 500, message: 'Internal server error' };

describe('mapLoginError', () => {
  it('maps a 401 to the fixed "incorrect" sentence, never echoing the server text', () => {
    expect(mapLoginError(unauthorized)).toBe(LOGIN_MESSAGES.invalidCredentials);
  });

  it("shows the server's own friendly message for a deactivated account (403)", () => {
    expect(mapLoginError(deactivated)).toBe(deactivated.message);
  });

  it('maps a request that never reached the server to the offline sentence', () => {
    expect(mapLoginError(noConnection)).toBe(LOGIN_MESSAGES.offline);
  });

  it('maps a timeout to the retry sentence unless the device reports it is offline', () => {
    expect(mapLoginError(timedOut)).toBe(LOGIN_MESSAGES.retry);
    expect(mapLoginError(timedOut, { isOffline: true })).toBe(
      LOGIN_MESSAGES.offline,
    );
  });

  it('maps 429 and server errors to the generic retry sentence', () => {
    expect(mapLoginError(rateLimited)).toBe(LOGIN_MESSAGES.retry);
    expect(mapLoginError(serverError)).toBe(LOGIN_MESSAGES.retry);
  });

  it('never returns an empty message for an unknown error', () => {
    expect(mapLoginError(new Error('boom'))).toBe(LOGIN_MESSAGES.retry);
    expect(mapLoginError(undefined, { isOffline: true })).toBe(
      LOGIN_MESSAGES.offline,
    );
  });
});

describe('mapForgotPasswordError', () => {
  it("shows the server's recovery-policy message verbatim", () => {
    const notAdmin = {
      status: 403,
      message:
        'Password recovery is only available for Administrator accounts. Please contact your system administrator.',
      code: 'not-admin',
    };
    expect(mapForgotPasswordError(notAdmin)).toBe(notAdmin.message);
  });

  it('maps no connection to its own offline sentence and everything else to retry', () => {
    expect(mapForgotPasswordError(noConnection)).toBe(
      FORGOT_PASSWORD_MESSAGES.offline,
    );
    expect(mapForgotPasswordError(serverError)).toBe(
      FORGOT_PASSWORD_MESSAGES.retry,
    );
  });
});
