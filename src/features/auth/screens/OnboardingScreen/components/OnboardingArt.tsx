import { StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { HERO_GRADIENT, useAppTheme } from '@/shared/theme';
import { Icon, Sphere3D } from '@/shared/ui';
import type { OnboardingArt as ArtKind } from '../onboardingContent';

export interface OnboardingArtProps {
  art: ArtKind;
  height: number;
}

/** The light lavender tint panels sit on (mockup `card tint`). */
const TINT = ['#EFEBFF', '#E2DBFF'] as const;
const HONEY = '#FFD36E';

/**
 * Redesign B02/B02b — the rounded (32pt) tinted art panel at the top of each
 * onboarding slide: a glossy violet tile or sphere with an icon, plus 3D balls.
 * Decorative only; hidden from screen readers. The mockup's floating
 * "Sales today Rs. 19,750" cards are left out — they would be made-up figures.
 */
export function OnboardingArt({ art, height }: OnboardingArtProps) {
  const theme = useAppTheme();
  const disc = Math.round(height * 0.76);

  const content =
    art === 'clock' ? (
      <>
        {theme.isDark ? (
          <View style={[styles.disc, { width: disc * 0.92, height: disc * 0.92, borderRadius: disc, backgroundColor: theme.colors.primary }]} />
        ) : (
          <Sphere3D size={Math.round(disc * 0.92)} tone="lilac" style={styles.centered} />
        )}
        <View style={styles.clockStack}>
          <Icon name="clock" size={48} color={theme.isDark ? theme.colors.primaryText : HONEY} />
          <Text style={[styles.clockTime, { color: theme.isDark ? theme.colors.primaryText : '#FFFFFF' }]}>2:00</Text>
          <Text style={[styles.clockCaption, { color: theme.isDark ? theme.colors.primaryText : HONEY }]}>AM · DAY CLOSES</Text>
        </View>
      </>
    ) : (
      <>
        <View style={[styles.disc, { width: disc, height: disc, borderRadius: disc / 2, backgroundColor: theme.isDark ? theme.colors.border : 'rgba(255, 255, 255, 0.55)' }]} />
        {theme.isDark ? (
          <View style={[styles.tile, { backgroundColor: theme.colors.primary }]}>
            <Icon name={art === 'orders' ? 'orders' : 'store'} size={68} color={theme.colors.primaryText} />
          </View>
        ) : (
          <LinearGradient colors={[HERO_GRADIENT[0], HERO_GRADIENT[2]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tile, styles.tileLift]}>
            <Icon name={art === 'orders' ? 'orders' : 'store'} size={68} color="#FFFFFF" />
          </LinearGradient>
        )}
      </>
    );

  const inner = (
    <>
      {theme.isDark ? null : (
        <>
          <Sphere3D size={56} tone="saffron" style={{ right: 18, top: 18 }} />
          <Sphere3D size={34} tone="mint" style={{ left: 22, bottom: 22 }} />
        </>
      )}
      {content}
    </>
  );

  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.panel, { height }]}>
      {theme.isDark ? (
        <View style={[styles.fill, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>{inner}</View>
      ) : (
        <LinearGradient colors={[...TINT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
          {inner}
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 32, overflow: 'hidden' },
  fill: { flex: 1, borderRadius: 32, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  disc: { position: 'absolute' },
  centered: { position: 'relative' },
  tile: { width: 150, height: 150, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  tileLift: { shadowColor: '#5B48D8', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.35, shadowRadius: 30, elevation: 10 },
  clockStack: { position: 'absolute', alignItems: 'center', gap: 4 },
  clockTime: { fontSize: 56, lineHeight: 60, fontWeight: '600' },
  clockCaption: { fontSize: 13, fontWeight: '600', letterSpacing: 2 },
});
