import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import { SignInScreen } from '../SignInScreen';
import { renderScreen } from '@/test-utils/render';
import {
  forgetIdentity,
  kv,
  rememberedIdentity,
  rememberIdentity,
  StorageKeys,
} from '@/services/storage/secureStorage';
import { useAuthStore } from '@/store/authStore';
import { useNetworkStore } from '@/store/networkStore';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

/**
 * Remember me.
 *
 * The rule being pinned is mostly what it does **not** do: the password is never
 * written, and the session persists whether the box is ticked or not. A shift
 * that rings up sales offline and force-quits must still hold the token needed
 * to drain them.
 */

beforeEach(() => {
  forgetIdentity();
  useNetworkStore.setState({ isOnline: true });
  useAuthStore.setState({ status: 'signedOut', claims: null, lastError: null });
});

describe('remembered identity', () => {
  it('starts empty and unticked', () => {
    expect(rememberedIdentity()).toEqual({ remember: false, email: '' });
  });

  it('round-trips the address, and only the address', () => {
    rememberIdentity('ahmed@mountainbakes.com');

    expect(rememberedIdentity()).toEqual({
      remember: true,
      email: 'ahmed@mountainbakes.com',
    });
    expect(kv.getString(StorageKeys.lastIdentity)).toBe('ahmed@mountainbakes.com');
    // Nothing resembling a password is written alongside it.
    expect(kv.getString('auth.password')).toBeUndefined();
  });

  it('clears both keys when forgotten', () => {
    rememberIdentity('ahmed@mountainbakes.com');
    forgetIdentity();

    expect(rememberedIdentity()).toEqual({ remember: false, email: '' });
    expect(kv.getBoolean(StorageKeys.rememberMe)).toBeUndefined();
  });
});

describe('SignInScreen', () => {
  it('prefills a remembered address and shows the box ticked', async () => {
    rememberIdentity('ahmed@mountainbakes.com');

    const screen = await renderScreen(<SignInScreen />);

    expect(screen.getByDisplayValue('ahmed@mountainbakes.com')).toBeTruthy();
    expect(screen.getByTestId('remember-me').props.accessibilityState.checked).toBe(true);
  });

  it('starts blank and unticked when nothing was remembered', async () => {
    const screen = await renderScreen(<SignInScreen />);

    expect(screen.queryByDisplayValue('ahmed@mountainbakes.com')).toBeNull();
    expect(screen.getByTestId('remember-me').props.accessibilityState.checked).toBe(false);
  });

  it('does not remember an address the server rejected', async () => {
    const signIn = jest.fn().mockRejectedValue(new Error('Invalid login credentials'));
    useAuthStore.setState({ signIn });

    const screen = await renderScreen(<SignInScreen />);
    await fireEvent.press(screen.getByTestId('remember-me'));
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    // Prefilling a typo forever is worse than not prefilling at all.
    expect(rememberedIdentity().email).toBe('');
  });

  it('blocks sign-in while offline and says why', async () => {
    useNetworkStore.setState({ isOnline: false });

    const screen = await renderScreen(<SignInScreen />);

    expect(screen.getByText("You're offline. Signing in needs a connection.")).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Sign in' }).props.accessibilityState.disabled,
    ).toBe(true);
  });
});
