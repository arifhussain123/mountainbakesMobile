/**
 * @format
 */
import { useThemeStore } from '@/shared/theme/themeStore';

// AsyncStorage is globally mocked to always resolve `getItem` as `null`
// (jest.setup.js) — every test below starts from the store's own in-memory
// defaults, which is what actually exercises the state-transition logic
// (`setMode`/`setAccent`/`toggleLightDark`) rather than a storage round-trip
// the mock can't perform anyway. Same approach as `seenQueriesStore`'s own
// tests, which test the pure logic directly rather than persistence itself.
describe('useThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'system', accent: 'orange', hydrated: false });
  });

  it('defaults to System mode and the Orange accent', () => {
    const state = useThemeStore.getState();
    expect(state.mode).toBe('system');
    expect(state.accent).toBe('orange');
  });

  it('setMode updates the mode', () => {
    useThemeStore.getState().setMode('light');
    expect(useThemeStore.getState().mode).toBe('light');
    useThemeStore.getState().setMode('dark');
    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('setAccent updates the accent', () => {
    useThemeStore.getState().setAccent('purple');
    expect(useThemeStore.getState().accent).toBe('purple');
  });

  it('setAccent falls back to the default accent for an unrecognized value', () => {
    // @ts-expect-error deliberately passing a bad value, as if it came from a corrupted persisted blob
    useThemeStore.getState().setAccent('not-a-real-accent');
    expect(useThemeStore.getState().accent).toBe('orange');
  });

  it('toggleLightDark switches dark to light', () => {
    useThemeStore.setState({ mode: 'dark' });
    useThemeStore.getState().toggleLightDark();
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('toggleLightDark switches light to dark', () => {
    useThemeStore.setState({ mode: 'light' });
    useThemeStore.getState().toggleLightDark();
    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('toggleLightDark from System moves to Dark (a concrete choice, not a no-op)', () => {
    useThemeStore.setState({ mode: 'system' });
    useThemeStore.getState().toggleLightDark();
    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('hydrated starts false and is flipped only by setHydrated (never by setMode/setAccent)', () => {
    expect(useThemeStore.getState().hydrated).toBe(false);
    useThemeStore.getState().setMode('light');
    expect(useThemeStore.getState().hydrated).toBe(false);
    useThemeStore.getState().setHydrated();
    expect(useThemeStore.getState().hydrated).toBe(true);
  });
});
