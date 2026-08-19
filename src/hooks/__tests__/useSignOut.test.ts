import { Alert } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';

jest.mock('@/database/repositories/syncQueueRepository', () => ({
  getUnsyncedSummary: jest.fn(),
}));

jest.mock('@/services/supabase/client', () => ({
  supabase: { auth: { signOut: jest.fn(async () => ({ error: null })) } },
  getAccessToken: jest.fn(async () => 'token'),
}));

import { getUnsyncedSummary } from '@/database/repositories/syncQueueRepository';
import { useAuthStore } from '@/store/authStore';
import { useSignOut } from '../useSignOut';

const mockSummary = getUnsyncedSummary as jest.Mock;

/** Drive the Alert by invoking one of its buttons by label. */
function answerAlert(label: string) {
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
    const button = buttons?.find(b => b.text === label);
    button?.onPress?.();
  });
}

describe('useSignOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ status: 'signedIn', claims: null });
  });

  it('signs out immediately when nothing is unsynced', async () => {
    mockSummary.mockResolvedValue({ total: 0, pending: 0, needsAttention: 0 });
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { result } = await renderHook(() => useSignOut());
    await act(async () => {
      await result.current.signOut();
    });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('warns and stays signed in when the user cancels', async () => {
    mockSummary.mockResolvedValue({ total: 3, pending: 3, needsAttention: 0 });
    answerAlert('Stay signed in');

    const { result } = await renderHook(() => useSignOut());
    await act(async () => {
      await result.current.signOut();
    });

    expect(Alert.alert).toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('signedIn');
  });

  it('signs out when the user confirms despite unsynced work', async () => {
    mockSummary.mockResolvedValue({ total: 2, pending: 1, needsAttention: 1 });
    answerAlert('Sign out');

    const { result } = await renderHook(() => useSignOut());
    await act(async () => {
      await result.current.signOut();
    });

    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('states the count in the warning', async () => {
    mockSummary.mockResolvedValue({ total: 5, pending: 5, needsAttention: 0 });
    answerAlert('Stay signed in');

    const { result } = await renderHook(() => useSignOut());
    await act(async () => {
      await result.current.signOut();
    });

    const message = (Alert.alert as jest.Mock).mock.calls[0][1] as string;
    expect(message).toContain('5 transactions');
    // The copy must reassure, not imply the work is about to be lost.
    expect(message).toMatch(/stays saved on this device/i);
  });

  it('does not trap the user when the queue cannot be read', async () => {
    // A diagnostic failure must not become a reason someone cannot sign out.
    mockSummary.mockRejectedValue(new Error('database not open'));
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { result } = await renderHook(() => useSignOut());
    await act(async () => {
      await result.current.signOut();
    });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });
});
