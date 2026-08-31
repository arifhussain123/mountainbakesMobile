import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import { SignInScreen } from '../SignInScreen';
import { renderScreen } from '@/common/test-utils/render';
import {
  forgetIdentity,
  kv,
  rememberedIdentity,
  rememberIdentity,
  StorageKeys,
} from '@/common/storage/secureStorage';
import { useAuthStore } from '@/state/authStore';
import { useNetworkStore } from '@/state/networkStore';

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

  /**
   * v6 draws its masthead on every screen with no exception for forms or for
   * the two auth screens, and this was the last one still on a bare field —
   * Reset password and the Finance sign-in already carried it, so the first
   * screen of the app was the only place the brand did not appear.
   *
   * Asserted on the wave's own layers rather than on a colour: `MBWave` is two
   * mirrored shapes, and it is the crossing that reads as a wave. The layers are
   * decorative, so they are hidden from the accessibility tree and have to be
   * asked for explicitly.
   */
  it('wears the brand masthead, like every other screen', async () => {
    const screen = await renderScreen(<SignInScreen />);

    expect(screen.getByTestId('wave-back', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('wave-front', { includeHiddenElements: true })).toBeTruthy();
  });

  it('keeps the greeting as the header\u2019s one heading', async () => {
    const screen = await renderScreen(<SignInScreen />);

    // Moved into the header rather than duplicated below it — a second copy on
    // the field would give the screen two headings for one thing.
    expect(screen.getByText('Welcome back')).toBeTruthy();
    expect(screen.getAllByText('Welcome back')).toHaveLength(1);
    expect(screen.getByText('Sign in to continue')).toBeTruthy();
  });

});
