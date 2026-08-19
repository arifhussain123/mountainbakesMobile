import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { themeFor, type ResolvedScheme, type Theme, type ThemeMode } from './theme';

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
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  mode,
  children,
}: {
  mode: ThemeMode;
  children: React.ReactNode;
}): React.ReactElement {
  const systemScheme = useColorScheme();

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: ResolvedScheme =
      mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
    return { theme: themeFor(scheme), scheme, mode };
  }, [mode, systemScheme]);

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
