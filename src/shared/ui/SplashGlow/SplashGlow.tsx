import { StyleSheet } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useAppTheme } from '@/shared/theme';

export interface SplashGlowProps {
  /** Opacity of the glow at its brightest point (the top-right corner). The design files use .55. */
  intensity?: number;
}

/**
 * The warm top-right radial glow every brand screen shares (splash, the
 * onboarding pages, login) — mountainbakesBranch.html's
 * `radial-gradient(85% 55% at 100% 0%, rgba(120,52,30,.55), transparent 70%)`,
 * drawn as a real radial gradient rather than a diagonal linear approximation.
 * Absolutely positioned; place it as the first child of a full-screen `View`.
 */
export function SplashGlow({ intensity = 0.55 }: SplashGlowProps) {
  const { colors } = useAppTheme();
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no"
    >
      <Defs>
        <RadialGradient
          id="splashGlow"
          cx="100%"
          cy="0%"
          rx="85%"
          ry="55%"
          fx="100%"
          fy="0%"
          gradientUnits="objectBoundingBox"
        >
          <Stop
            offset="0"
            stopColor={colors.glowWarm}
            stopOpacity={intensity}
          />
          <Stop offset="0.7" stopColor={colors.glowWarm} stopOpacity={0} />
          <Stop offset="1" stopColor={colors.glowWarm} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="100%" cy="0%" rx="85%" ry="55%" fill="url(#splashGlow)" />
    </Svg>
  );
}
