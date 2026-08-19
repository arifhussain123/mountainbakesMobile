import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { MBPressable, pressTargets } from '../common/MBPressable';
import { motion } from '@/theme/motion';

/**
 * Press feedback.
 *
 * The animation itself cannot be observed here — under the Reanimated Jest mock
 * `withTiming` resolves to its target immediately and a shared value change does
 * not re-render — so the *decision* is tested instead, through `pressTargets`.
 * That is deliberate: what matters is the rule (how far, and what Reduce Motion
 * takes away), not that Reanimated animates.
 */

describe('pressTargets', () => {
  it('scales and dims while held', () => {
    expect(pressTargets(true, 'press', false)).toEqual({
      scale: 0.98,
      opacity: motion.press.opacity,
    });
  });

  it('returns to rest when released', () => {
    expect(pressTargets(false, 'press', false)).toEqual({ scale: 1, opacity: 1 });
  });

  it('drops the scale under Reduce Motion but keeps the dim', () => {
    // The setting asks for less movement, not for less feedback. A control that
    // stops acknowledging a touch is one the user taps twice, and on the sale
    // button a second tap is a duplicate transaction.
    const held = pressTargets(true, 'press', true);
    expect(held.scale).toBe(1);
    expect(held.opacity).toBe(motion.press.opacity);
  });

  it('never scales when the call site asked for opacity only', () => {
    expect(pressTargets(true, 'opacity', false).scale).toBe(1);
    expect(pressTargets(true, 'opacity', false).opacity).toBe(motion.press.opacity);
  });

  it('leaves a feedback-less surface alone', () => {
    expect(pressTargets(true, 'none', false)).toEqual({ scale: 1, opacity: 1 });
  });

  it('applies the press dim on top of a disabled control, not instead of it', () => {
    // A disabled button sits at 0.5. If the press layer wrote a bare 1 it would
    // brighten the control back to full strength, because both are `opacity`
    // and the later one in the style array wins.
    expect(pressTargets(false, 'press', false, 0.5).opacity).toBe(0.5);
    expect(pressTargets(true, 'press', false, 0.5).opacity).toBeCloseTo(
      0.5 * motion.press.opacity,
    );
  });

  it('lands inside the frame budget a finger allows', () => {
    // Slower than about two frames past this and the acknowledgement arrives
    // after the finger has already lifted, which reads as lag rather than
    // response.
    expect(motion.timing.state.duration).toBe(120);
  });
});

describe('MBPressable', () => {
  it('calls onPress and forwards the press lifecycle', async () => {
    const onPress = jest.fn();
    const onPressIn = jest.fn();
    const onPressOut = jest.fn();

    const screen = await render(
      <MBPressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button">
        <Text>Add expense</Text>
      </MBPressable>,
    );

    const button = screen.getByRole('button');
    await fireEvent(button, 'pressIn');
    await fireEvent(button, 'pressOut');
    await fireEvent.press(button);

    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(onPressOut).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('resolves a function style so a call site can still colour the pressed state', async () => {
    const screen = await render(
      <MBPressable
        testID="chip"
        style={({ pressed }) => ({
          backgroundColor: pressed ? 'red' : 'blue',
        })}>
        <Text>Cash</Text>
      </MBPressable>,
    );

    const chip = screen.getByTestId('chip');
    expect(StyleSheet.flatten(chip.props.style).backgroundColor).toBe('blue');

    await fireEvent(chip, 'pressIn');
    expect(StyleSheet.flatten(chip.props.style).backgroundColor).toBe('red');
  });

  it('does not fire when disabled', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <MBPressable onPress={onPress} disabled accessibilityRole="button">
        <Text>Save</Text>
      </MBPressable>,
    );

    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
