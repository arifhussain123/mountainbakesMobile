import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { DEFAULT_ACCENT, type AccentKey } from './accents';
import { DEFAULT_TYPEFACE, type TypefaceKey } from './typography';
import { themeFor, type ResolvedScheme, type Theme, type ThemeMode } from './themes';

/**
 * Theme access.
 *
 * Components read tokens through `useTheme()` and never branch on the scheme
 * themselves — light and dark are two token sets behind one interface, so there
 * is no `isDark ? a : b` anywhere in screens/ or components/.
 */

interface ThemeContextValue {
  theme: Theme;
  scheme: ResolvedScheme;
  mode: ThemeMode;
  accent: AccentKey;
  typeface: TypefaceKey;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  mode,
  accent = DEFAULT_ACCENT,
  typeface = DEFAULT_TYPEFACE,
  children,
}: {
  mode: ThemeMode;
  /**
   * The chosen brand fill. Defaults rather than being required so that every
   * test and story rendering a bare `<ThemeProvider mode=...>` keeps the palette
   * it had before accents existed.
   */
  accent?: AccentKey;
  /**
   * Defaulted for the same reason as `accent`: a test or story rendering a bare
   * `<ThemeProvider mode=...>` keeps the scale it had before the face was
   * selectable, so no existing snapshot moves.
   */
  typeface?: TypefaceKey;
  children: React.ReactNode;
}): React.ReactElement {
  const systemScheme = useColorScheme();

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: ResolvedScheme =
      mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
    return {
      theme: themeFor(scheme, accent, typeface),
      scheme,
      mode,
      accent,
      typeface,
    };
  }, [mode, accent, typeface, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return ctx.theme;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used inside <ThemeProvider>.');
  return ctx;
}
