import React, { useCallback, useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { logoOn } from '@/assets/logo';
import { useReducedMotion } from '@/common/hooks/useReducedMotion';
import { MBButton, MBWave, WAVE_TAIL } from '@/common/ui';
import { useTheme } from '@/common/theme/ThemeProvider';
import { space } from '@/common/theme/spacing';

import { OnboardingDots } from '../components/OnboardingDots';
import { PANELS } from '../panels';
import { useOnboardingStore } from '../store/onboardingStore';

/**
 * The first-run panels — v6's screen 01.
 *
 * ---------------------------------------------------------------------------
 * This is not the splash, and the distinction is the whole reason it is a
 * separate screen
 * ---------------------------------------------------------------------------
 * v6's screen 01 carries a START button and a row of dots, which describes a
 * sequence the *user* drives. `features/app/screens/SplashScreen.tsx` cannot be
 * that screen: it is `BootGate`'s loading state, it unmounts the instant
 * `runBootSequence` resolves, and a fast boot would therefore blink a START
 * button out of existence under the thumb reaching for it. Its own file records
 * why it holds nothing for a fixed beat — somebody opened this app to ring up a
 * sale.
 *
 * So the panels live here, after boot and before sign-in, gated on a stored
 * flag. The splash stays what it is.
 *
 * ---------------------------------------------------------------------------
 * A pager, not a cross-fade
 * ---------------------------------------------------------------------------
 * Dots assert that there are three of something laid out side by side. Fading
 * one panel into the next draws that claim and then refuses the swipe every
 * user tries first, so this is a `pagingEnabled` ScrollView: the swipe works,
 * the slide is the feedback, and the dot index is derived from the scroll
 * offset rather than kept in step with it by hand.
 *
 * Under Reduce Motion the travel goes and the change stays — `Next` jumps to
 * the page instead of sliding to it. Slowing the slide down would not be
 * honouring the setting.
 *
 * ---------------------------------------------------------------------------
 * Why the CTA is on the field and not on the plum
 * ---------------------------------------------------------------------------
 * v6 draws a white pill on the purple. This app cannot: the action fill is a
 * *selectable* accent (`theme/accents.ts`), one of the five choices is the plum
 * itself, and `primary` on the plum block is then 1:1 — a button that is not
 * there. Pine and Indigo are no better at 2.31:1 and 2.5:1, under the 3:1 that
 * WCAG 1.4.11 asks of a control's own fill.
 *
 * The fix is not a hard-coded white pill; it is to put the button where the
 * app's own rule already holds. The wave carries the brand and the words, the
 * field below carries the action, and there `MBButton` is the ember —
 * `contrast.test.ts` already holds all five accents to 3:1 on the field and
 * 4.5:1 for the label. Which is the ordinary arrangement of every other screen
 * in the app, and the reason it looks like one.
 */
/**
 * Where a page change scrolls to, and whether it travels to get there.
 *
 * Pure and exported so the Reduce Motion rule is testable without a renderer —
 * exactly why `MBPressable` exports `pressTargets`. Under Jest a ref's
 * `scrollTo` is a no-op on a host component, so the rendered tree says nothing
 * about the decision that was made.
 *
 * Reduce Motion drops the travel and keeps the change: the page still turns, it
 * just arrives instead of sliding. Slowing the slide down is not honouring the
 * setting.
 */
export function pageScroll(
  next: number,
  width: number,
  reduceMotion: boolean,
): { x: number; y: number; animated: boolean } {
  return { x: next * width, y: 0, animated: !reduceMotion };
}

export function FirstRunScreen(): React.ReactElement {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const markSeen = useOnboardingStore(s => s.markSeen);

  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  /**
   * The wave is measured, not a fraction of the screen.
   *
   * `minHeight` sets the floor so the first frame — before any layout has run —
   * is already the right shape, and the measurement then grows it if the body
   * text needs more room. That second half is the load-bearing one: every word
   * above sits on the plum in `onSecondary`, and at the largest font scale a
   * three-line body on a fixed-height wave becomes white text on a lilac field.
   * That exact bug is what v6 shipped before the masthead was centralised.
   */
  const [waveH, setWaveH] = useState(0);
  const onWaveLayout = useCallback((e: LayoutChangeEvent) => {
    setWaveH(e.nativeEvent.layout.height);
  }, []);

  const last = index === PANELS.length - 1;

  const goTo = useCallback(
    (next: number) => {
      scroller.current?.scrollTo(pageScroll(next, width, reduceMotion));
      // Set here as well as in the scroll handler: `animated: false` fires no
      // momentum event, so the dots would not move under Reduce Motion.
      setIndex(next);
    },
    [width, reduceMotion],
  );

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      setIndex(Math.max(0, Math.min(PANELS.length - 1, next)));
    },
    [width],
  );

  const advance = useCallback(() => {
    if (last) markSeen();
    else goTo(index + 1);
  }, [last, index, goTo, markSeen]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      {/* `edges` stops at the sides and the top: the wave is meant to run under
          the status bar, and the footer takes the bottom inset itself so the
          CTA is not sitting on the gesture bar. */}
      <SafeAreaView edges={['top']} style={styles.flex}>
        <View
          onLayout={onWaveLayout}
          style={[
            styles.wave,
            {
              // The floor, and the frame-one shape. 0.52 leaves the footer a
              // comfortable third on a 844pt canvas.
              minHeight: Math.round(height * 0.52),
              // Under the SVG, so the frame between this View laying out and
              // the wave's first paint is plum rather than a flash of lilac
              // behind white text. The same guard `SplashScreen` puts under its
              // gradient.
              backgroundColor: theme.colors.secondaryWave,
              // The tail bleeds INTO this box rather than out of it — Android
              // clips an absolutely-positioned child at the parent's bounds.
              // `MBHeader` reserves it the same way.
              paddingBottom: WAVE_TAIL + space.lg,
            },
          ]}>
          {waveH > 0 ? <MBWave height={waveH} /> : null}

          <View style={styles.brand}>
            {/* `logoOn('dark')`, not `MBLogo`. `MBLogo` picks by scheme, and the
                wave is the same two plums in BOTH schemes (see the dark map's
                `secondary`/`secondaryWave`) — so a mark chosen by scheme comes
                out inverted here in light. `-light`/`-dark` name the background.
                `SplashScreen` makes the same call for the same reason. */}
            <Image
              source={logoOn('dark')}
              style={styles.logo}
              resizeMode="contain"
              fadeDuration={0}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </View>

          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            style={styles.pager}
            /* The pager sizes to its tallest page, so all three occupy the same
               box and the dots below do not move as you swipe. */
            contentContainerStyle={styles.pagerContent}>
            {PANELS.map((panel, i) => (
              <View
                key={panel.key}
                style={[styles.page, { width, paddingHorizontal: theme.layout.screenPad }]}
                accessible
                /* One node per page, and it says where it is. A reader walking a
                   heading, a paragraph and then a row of dots would announce the
                   position last and describe it worst. */
                accessibilityLabel={`${panel.title}. ${panel.body} Step ${i + 1} of ${PANELS.length}.`}>
                <Text style={[theme.type.h1, styles.center, { color: theme.colors.onSecondary }]}>
                  {panel.title}
                </Text>
                <Text
                  style={[
                    theme.type.body,
                    styles.center,
                    styles.body,
                    { color: theme.colors.onSecondaryMuted },
                  ]}>
                  {panel.body}
                </Text>
              </View>
            ))}
          </ScrollView>

          <OnboardingDots index={index} />
        </View>

        <SafeAreaView
          edges={['bottom']}
          style={[styles.footer, { padding: theme.layout.screenPad }]}>
          <MBButton
            label={last ? 'Get started' : 'Next'}
            onPress={advance}
            fullWidth
            testID="onboarding-cta"
            accessibilityHint={
              last ? 'Goes to sign in.' : `Shows step ${index + 2} of ${PANELS.length}.`
            }
          />
          {/*
            Skip is offered on every panel but the last, where `Get started` is
            already the same action — two controls doing one thing side by side
            is a choice the user has to stop and read.

            The slot keeps its height either way, so the CTA does not jump up the
            screen on the final swipe.
          */}
          <View style={[styles.skipSlot, { minHeight: theme.layout.btnH.md }]}>
            {last ? null : (
              <MBButton
                label="Skip"
                variant="ghost"
                size="md"
                onPress={markSeen}
                testID="onboarding-skip"
                accessibilityHint="Goes straight to sign in."
              />
            )}
          </View>
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wave: { alignItems: 'center', justifyContent: 'center', gap: space.xl },
  brand: { alignItems: 'center' },
  /** Matches `SplashScreen`'s 171 — the two screens are seconds apart. */
  logo: { width: 171, height: 171 },
  pager: { flexGrow: 0 },
  pagerContent: { alignItems: 'center' },
  page: { alignItems: 'center', justifyContent: 'center', gap: space.sm },
  body: { maxWidth: 340 },
  center: { textAlign: 'center' },
  footer: { justifyContent: 'flex-end', gap: space.sm },
  skipSlot: { alignItems: 'center', justifyContent: 'center' },
});
