import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { StatusBar, useColorScheme, type ColorSchemeName } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { ACCENT_LIST, type AccentId } from './accents';
import { buildColors, type ThemeColors, type ThemeMode } from './colors';
import { radii } from './radii';
import { cardShadow } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';
import { useThemeStore, type ThemeModeSetting } from './themeStore';

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  cardShadow: typeof cardShadow;
  isDark: boolean;
  /** The user's raw setting (System / Light / Dark). */
  mode: ThemeModeSetting;
  /** What `mode` actually resolves to right now — `mode === 'system'` follows `useColorScheme()` live. */
  resolvedMode: ThemeMode;
  accent: AccentId;
  accentOptions: typeof ACCENT_LIST;
  setMode: (mode: ThemeModeSetting) => void;
  setAccent: (accent: AccentId) => void;
  toggleLightDark: () => void;
}

const ThemeContext = createContext<Theme | undefined>(undefined);

/** `useColorScheme()` can return `null`/`undefined` before the OS reports a preference — treated as dark, same as this app's own default. */
function resolveSystemScheme(scheme: ColorSchemeName | null | undefined): ThemeMode {
  return scheme === 'light' ? 'light' : 'dark';
}

const CROSSFADE_MS = 200;

/**
 * Wraps the app once, at the root (see `App.tsx`). Every screen reads this
 * via `useTheme()` — or `useAppTheme()`, a thin compatibility wrapper kept so
 * the ~150 screens already calling it don't all need touching in this pass.
 *
 * Mode resolution + persistence live in `themeStore.ts` (AsyncStorage,
 * fire-and-forget — Step 0 confirmed the web doesn't persist this
 * server-side either, so there's nothing to sync after login). This
 * component's own job is turning that raw (mode, accent) pair into the
 * actual `ThemeColors` for right now, syncing the status bar to it, and a
 * brief crossfade flash when either changes (live preview from the
 * Appearance sheet, or the quick toggle) — skipped under reduce-motion.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const mode = useThemeStore((s) => s.mode);
  const accent = useThemeStore((s) => s.accent);
  const hydrated = useThemeStore((s) => s.hydrated);
  const setMode = useThemeStore((s) => s.setMode);
  const setAccent = useThemeStore((s) => s.setAccent);
  const toggleLightDark = useThemeStore((s) => s.toggleLightDark);
  const reduceMotion = useReducedMotion();

  // Before AsyncStorage rehydrates, render dark — matching the fixed-dark
  // native bootsplash, so there's no flash of (System-resolved) light on a
  // device whose OS is in light mode, before the persisted choice is known.
  const resolvedMode: ThemeMode = !hydrated ? 'dark' : mode === 'system' ? resolveSystemScheme(systemScheme) : mode;

  const colors = useMemo(() => buildColors(resolvedMode, accent), [resolvedMode, accent]);

  const crossfade = useSharedValue(1);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (reduceMotion) return;
    crossfade.value = withSequence(withTiming(0.35, { duration: CROSSFADE_MS / 2 }), withTiming(1, { duration: CROSSFADE_MS / 2 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedMode, accent]);

  useEffect(() => {
    // Android's status bar is already transparent/edge-to-edge (this app
    // forces it on via targetSdk 35+ — see android/.../styles.xml's own
    // notes from the bootsplash-hang fix), so there's no separate background
    // color to set here, only icon contrast: light icons on the dark theme,
    // dark icons on light.
    StatusBar.setBarStyle(resolvedMode === 'dark' ? 'light-content' : 'dark-content', true);
  }, [resolvedMode]);

  const crossfadeStyle = useAnimatedStyle(() => ({ opacity: crossfade.value }));

  const theme: Theme = useMemo(
    () => ({
      colors,
      spacing,
      radii,
      typography,
      cardShadow,
      isDark: resolvedMode === 'dark',
      mode,
      resolvedMode,
      accent,
      accentOptions: ACCENT_LIST,
      setMode,
      setAccent,
      toggleLightDark,
    }),
    [colors, resolvedMode, mode, accent, setMode, setAccent, toggleLightDark],
  );

  return (
    <ThemeContext.Provider value={theme}>
      <Animated.View style={[{ flex: 1, backgroundColor: colors.background }, crossfadeStyle]}>{children}</Animated.View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
