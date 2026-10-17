import { useWindowDimensions, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useDrawerProgress } from '@react-navigation/drawer';
import Animated, { useAnimatedProps, useAnimatedStyle, useReducedMotion } from 'react-native-reanimated';
import { useAppTheme } from '@/shared/theme';
import { closeDrawer } from '../helpers';
import { CARD_BLUR_AMOUNT, CARD_PERSPECTIVE, computeCardTransform } from './drawerLayout';

const PROGRESS_EPSILON = 0.05;

/**
 * Wraps a screen's own content with the "3D slide-back" open/close effect:
 * translateX + scale + rotateY + rounded corners while the drawer opens,
 * with a blurred/tinted overlay on top of THIS card (not a full-screen
 * overlay — see `withDrawerScreenCard`'s own note on why it has to live
 * here, not in `@react-navigation/drawer`'s built-in overlay).
 *
 * Two nested layers, not one: a view with `overflow: 'hidden'` (needed to
 * clip content to the animated rounded corners) also clips its OWN shadow
 * on both platforms — the left-edge shadow the brief asks for would
 * silently vanish if transform/shadow and the corner-clip lived on the same
 * view. So the transform + shadow sit on the outer (unclipped) layer, and
 * only the borderRadius + overflow + content sit on the inner one; the
 * inner layer visually inherits the outer's transform for free (a parent's
 * transform already affects how its children render).
 *
 * `useReducedMotion()` (OS-level "reduce motion", already this codebase's
 * one accessibility/performance toggle — see Splash/Onboarding's own use of
 * it) collapses this to the brief's low-end/reduce-motion fallback: a plain
 * half-distance slide, no rotation, no blur, just the dark tint every mode
 * already carries.
 */
export function DrawerScreenCard({ children }: { children: React.ReactNode }) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const progress = useDrawerProgress();
  const reduceMotion = useReducedMotion();

  const outerStyle = useAnimatedStyle(() => {
    const t = computeCardTransform(progress.value, width, reduceMotion);
    return {
      transform: [
        { perspective: CARD_PERSPECTIVE },
        { translateX: t.translateX },
        { scale: t.scale },
        { rotateY: `${t.rotateYDeg}deg` },
      ],
    };
  });

  const innerStyle = useAnimatedStyle(() => ({
    borderRadius: computeCardTransform(progress.value, width, reduceMotion).borderRadius,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: computeCardTransform(progress.value, width, reduceMotion).blurOpacity,
  }));
  const overlayProps = useAnimatedProps(() => ({
    pointerEvents: progress.value > PROGRESS_EPSILON ? ('auto' as const) : ('none' as const),
  }));

  return (
    <Animated.View style={[styles.outer, outerStyle]}>
      <Animated.View style={[styles.inner, innerStyle]}>
        {children}
        <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]} animatedProps={overlayProps}>
          {reduceMotion ? null : <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={CARD_BLUR_AMOUNT} />}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: `${theme.colors.background}8C` }]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} accessibilityRole="button" accessibilityLabel="Close drawer" />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    // Soft shadow on the card's left edge (the side facing the menu) —
    // must live on this unclipped layer, not `inner` (see the component doc).
    shadowColor: '#000',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  inner: { flex: 1, overflow: 'hidden' },
});
