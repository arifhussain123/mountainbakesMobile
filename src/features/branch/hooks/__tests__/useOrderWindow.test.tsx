import { renderHook } from '@testing-library/react-native';
import { useOrderWindow } from '../useOrderWindow';
import { useSettings } from '@/api/hooks/useCatalogApi';
import { karachiMinutesOfDay } from '@/shared/utils/timezone';

jest.mock('@/api/hooks/useCatalogApi', () => ({ useSettings: jest.fn() }));
jest.mock('@/shared/utils/timezone', () => ({
  ...jest.requireActual('@/shared/utils/timezone'),
  karachiMinutesOfDay: jest.fn(),
}));

const mockSettings = useSettings as unknown as jest.Mock;
const mockNow = karachiMinutesOfDay as unknown as jest.Mock;

function atKarachi(hh: number, mm = 0) {
  mockNow.mockReturnValue(hh * 60 + mm);
}

function withSettings(orderStartTime?: string, orderEndTime?: string, isPending = false) {
  mockSettings.mockReturnValue({ data: { orderStartTime, orderEndTime }, isPending });
}

beforeEach(() => {
  jest.clearAllMocks();
  withSettings('08:00', '02:00');
  atKarachi(12);
});

/**
 * The window is the **server's** rule, read from the same two settings its own
 * `orderWindowMinutes()` reads. Nothing here invents a cutoff, and these tests
 * exist mostly to pin the one property that is easy to get backwards.
 */
describe('useOrderWindow', () => {
  /**
   * 08:00 → 02:00 wraps past midnight. A naive `open <= now && now <= close` is
   * false for the entire evening — every order after 8pm would be refused by the
   * client while the server happily accepted it.
   */
  it.each([
    ['08:00 exactly, the moment it opens', 8, 0, true],
    ['midday', 12, 0, true],
    ['20:00 — past close if the wrap is mishandled', 20, 0, true],
    ['23:30, the evening rush', 23, 30, true],
    ['00:30, after midnight but still the same trading night', 0, 30, true],
    ['02:00 exactly, inclusive', 2, 0, true],
    ['02:01, one minute late', 2, 1, false],
    ['03:00, the dead of night', 3, 0, false],
    ['07:59, a minute before opening', 7, 59, false],
  ])('%s', async (_label, hh, mm, expected) => {
    atKarachi(hh, mm);
    const { result } = await renderHook(() => useOrderWindow());
    expect(result.current.isOpen).toBe(expected);
  });

  it('follows settings rather than a constant in this file', async () => {
    withSettings('09:00', '17:00');
    atKarachi(20);
    const { result } = await renderHook(() => useOrderWindow());
    // 20:00 is outside a non-wrapping 09:00–17:00 window, and inside the default
    // one — so this passing proves the settings are what decided it.
    expect(result.current).toMatchObject({ isOpen: false, opensAt: '09:00', closesAt: '17:00' });
  });

  /**
   * Same precedence as the server: a malformed value falls back to the shared
   * constant, never to "always open". Failing open here would queue orders the
   * server is certain to refuse.
   */
  it('falls back to the shared default when a setting is malformed', async () => {
    withSettings('not-a-time', undefined);
    atKarachi(3);
    const { result } = await renderHook(() => useOrderWindow());
    expect(result.current).toMatchObject({ isOpen: false, opensAt: '08:00', closesAt: '02:00' });
  });

  /**
   * While settings load the caller must not block a submit — guessing would
   * refuse a legitimate order on a slow connection, and the server is still the
   * authority.
   */
  it('reports loading so a submit is never blocked on a guess', async () => {
    withSettings(undefined, undefined, true);
    const { result } = await renderHook(() => useOrderWindow());
    expect(result.current.isLoading).toBe(true);
  });
});
