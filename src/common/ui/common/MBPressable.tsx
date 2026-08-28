import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/common/hooks/useReducedMotion';
import { motion } from '@/common/theme/motion';

/**
 * Every tappable surface in the app.
 *
 * ---------------------------------------------------------------------------
 * Why a component rather than a convention
 * ---------------------------------------------------------------------------
 * Press feedback was previously whatever each call site happened to do: a
 * background swap to `surfaceSunken` on cards and quick actions, a different
 * pressed colour on buttons, a 0.6 dim on iOS tabs, and nothing at all on the
 * chips and stepper buttons that get tapped most. Four idioms is three too
 * many — a control that answers a touch differently depending on which screen
 * it is on teaches staff nothing, and the ones answering with silence read as
 * broken on a slow handset, where the only other signal (the screen actually
 * changing) can be a second away.
 *
 * So the acknowledgement lives here, once: **scale to 0.98 with a small opacity
 * shift over 120ms**, in and out. A call site chooses what it looks like; it
 * does not choose how it responds.
 *
 * ---------------------------------------------------------------------------
 * Why the animation is not `Pressable`'s own `pressed` flag
 * ---------------------------------------------------------------------------
 * `style={({ pressed }) => …}` is a step function: the control is at one value
 * on one frame and another on the next. That is fine for a colour, which reads
 * as a state, and wrong for a transform, which reads as a movement — an
 * instantaneous 2% jump looks like a rendering glitch rather than a response.
 * The transform therefore runs on Reanimated, on the UI thread, so it survives a
 * JS thread busy re-rendering a list under the finger.
 *
 * The `pressed` flag is still resolved for call sites that pass a function
 * style, because a colour change genuinely is a state change. That resolution is
 * skipped entirely when the style is static, so a static call site does not
 * re-render on every touch.
 *
 * ---------------------------------------------------------------------------
 * What this deliberately does not do
 * ---------------------------------------------------------------------------
 * No bounce, no spring, no lift-off shadow, no ripple of its own (Android ripple
 * is still available through `android_ripple` where the platform convention
 * calls for it). Motion communicates the state change and then gets out of the
 * way; see `theme/motion.ts`.
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressFeedback = 'press' | 'opacity' | 'none';

export interface MBPressableProps extends Omit<PressableProps, 'style'> {
  children?: React.ReactNode;
  /**
   * Static styles, or the `({ pressed }) => …` form when the surface changes
   * colour while held. Note that a static `opacity` here fights the press
   * animation — use `restOpacity` instead.
   */
  style?:
    | StyleProp<ViewStyle>
    | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  /**
   * `press` (default) scales and dims. `opacity` dims only — for a surface
   * whose scale would be wrong to animate, such as a full-bleed banner. `none`
   * is for a wrapper that is tappable but is not itself the control.
   */
  feedback?: PressFeedback;
  /**
   * What the control's opacity settles at when nothing is touching it. Only a
   * disabled control needs this (0.5); press feedback is applied on top of it,
   * which is why it cannot be set through `style`.
   */
  restOpacity?: number;
}

/**
 * The values a control animates to. Pure and exported so the Reduce Motion rule
 * is testable without a renderer — under the Jest mock an animation resolves
 * instantly and the rendered style tells you nothing about the decision.
 *
 * Reduce Motion drops the scale and keeps the dim. The setting asks for less
 * movement, not for less feedback: a control that stops acknowledging touches
 * entirely is a control the user taps twice, and on the sale button that is a
 * duplicate transaction.
 */
export function pressTargets(
  pressed: boolean,
  feedback: PressFeedback,
  reduceMotion: boolean,
  restOpacity = 1,
): { scale: number; opacity: number } {
  if (!pressed || feedback === 'none') {
    return { scale: 1, opacity: restOpacity };
  }
  const scale = feedback === 'press' && !reduceMotion ? motion.press.scale : 1;
  return { scale, opacity: restOpacity * motion.press.opacity };
}

export function MBPressable({
  children,
  style,
  feedback = 'press',
  restOpacity = 1,
  onPressIn,
  onPressOut,
  ...rest
}: MBPressableProps): React.ReactElement {
  const reduceMotion = useReducedMotion();

  // Only the function form of `style` needs to know, and only it pays for the
  // re-render that knowing costs.
  const tracksPressed = typeof style === 'function';
  const [pressed, setPressed] = useState(false);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(restOpacity);

  // A ref rather than the `pressed` state, because that state is only maintained
  // for function styles — and the effect below needs to know whether a finger is
  // down no matter how the call site styles itself.
  const held = useRef(false);

  const animate = useCallback(
    (down: boolean) => {
      const target = pressTargets(down, feedback, reduceMotion, restOpacity);
      scale.value = withTiming(target.scale, motion.timing.state);
      opacity.value = withTiming(target.opacity, motion.timing.state);
    },
    [feedback, reduceMotion, restOpacity, scale, opacity],
  );

  /**
   * The resting opacity is a prop, not a constant, and it changes under the
   * component: a submit button goes disabled the moment it starts loading. The
   * shared value is seeded once at mount, so without this the button would sit
   * at full strength until something touched it — which is exactly the control
   * a user is most likely to tap twice.
   */
  useEffect(() => {
    if (!held.current) {
      opacity.value = withTiming(restOpacity, motion.timing.state);
    }
  }, [restOpacity, opacity]);

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      held.current = true;
      if (tracksPressed) setPressed(true);
      animate(true);
      onPressIn?.(event);
    },
    [animate, onPressIn, tracksPressed],
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      held.current = false;
      if (tracksPressed) setPressed(false);
      animate(false);
      onPressOut?.(event);
    },
    [animate, onPressOut, tracksPressed],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const resolved = typeof style === 'function' ? style({ pressed }) : style;

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      // Animated last, so the press wins over anything the call site set
      // statically. `restOpacity` exists precisely so it never has to.
      style={[resolved, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}
