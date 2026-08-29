import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBIcon } from '@/common/ui/common/MBIcon';
import { MBPressable } from '@/common/ui/common/MBPressable';
import { useTheme } from '@/common/theme/ThemeProvider';
import { businessDateLabel, isFutureBusinessDate, shiftBusinessDate } from '@/common/helpers/businessDay';
import { businessDateStr } from '@/shared/utils/timezone';
import { layout } from '@/common/theme/spacing';

export interface MBDateStepperProps {
  /** The business date on show, `YYYY-MM-DD`. */
  value: string;
  onChange: (date: string) => void;
  /**
   * The oldest date the arrows will reach, inclusive.
   *
   * Not decoration: the stock ledger is derived by walking today's balance
   * backwards and only reaches 365 days, and the server refuses anything older
   * with a reason. Stopping the arrow is better than letting someone step into
   * an error and back out again.
   */
  minDate?: string;
  testID?: string;
}

/**
 * One business day, with an arrow either side.
 *
 * ---------------------------------------------------------------------------
 * A stepper, not a date picker
 * ---------------------------------------------------------------------------
 * Every screen that uses this is read **relative to today** — yesterday's
 * takings, the day before's closing stock — and the overwhelmingly common move
 * is one day back. A picker makes that three taps and a modal; two arrows make
 * it one tap and no modal. The date itself is still printed in full, so the
 * screen states which day it is showing rather than leaving it to be counted.
 *
 * There is deliberately no way to jump to an arbitrary date here. When a screen
 * genuinely needs one it should take `MBDateRangeField`, which is a field with a
 * keyboard — and that is a different control for a different job, not a bigger
 * version of this one.
 *
 * ---------------------------------------------------------------------------
 * Forward stops at today, and it stops rather than warns
 * ---------------------------------------------------------------------------
 * Tomorrow has not happened. Every endpoint behind these screens refuses a
 * future business date outright, so a forward arrow past today is a control
 * whose only outcome is an error message. It is disabled at the boundary and
 * announces itself as such.
 *
 * "Today" and "Yesterday" are the only two days that get a word instead of a
 * date — see `businessDateLabel`.
 *
 * ---------------------------------------------------------------------------
 * The label is the way back to today
 * ---------------------------------------------------------------------------
 * Stepping away is one tap per day and returning was the same, so a week back
 * cost seven taps to undo — on a control whose whole premise is that every
 * screen using it is read *relative to today*. The label already names the
 * anchor, so it is the anchor.
 *
 * This is not the arbitrary-date jump ruled out above: today is the one date
 * this component already knows, already computes for the forward boundary, and
 * already spells as a word. Any *other* destination still needs a real picker.
 *
 * It appears only when there is somewhere to go — on today the label is inert
 * and keeps its heading role. That role is what it costs: a pressable label
 * announces as a button, so the heading is traded for the action exactly when
 * the action exists. The date stays in the accessible name either way, so the
 * day is never lost, only the ability to reach it by heading navigation — and
 * every screen carrying this stepper also carries an `MBHeader` whose title is
 * a heading.
 */
export function MBDateStepper({
  value,
  onChange,
  minDate,
  testID,
}: MBDateStepperProps): React.ReactElement {
  const theme = useTheme();

  const previous = shiftBusinessDate(value, -1);
  const next = shiftBusinessDate(value, 1);

  const canGoBack = minDate === undefined || previous >= minDate;
  const canGoForward = !isFutureBusinessDate(next);

  const today = businessDateStr();
  /*
   * `minDate` is guarded even though a range ending before today is a nonsense
   * configuration: this hands a date straight to `onChange`, and the one thing
   * it must never do is step the screen somewhere its own arrows refuse to go.
   */
  const canReturnToday =
    value !== today && (minDate === undefined || today >= minDate);

  const dayLabel = businessDateLabel(value);

  const arrow = (
    direction: 'back' | 'forward',
    enabled: boolean,
    target: string,
    label: string,
  ) => (
    <MBPressable
      onPress={() => onChange(target)}
      disabled={!enabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      testID={testID ? `${testID}-${direction}` : undefined}
      style={[styles.arrow, { minWidth: theme.layout.tapMin }]}>
      <MBIcon
        name={direction === 'back' ? 'back' : 'chevron'}
        size="action"
        color={enabled ? theme.colors.textSubtle : theme.colors.borderStrong}
      />
    </MBPressable>
  );

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderControl,
          borderRadius: theme.radius.md,
          paddingHorizontal: theme.space.md,
        },
      ]}>
      {arrow('back', canGoBack, previous, 'Previous day')}

      {canReturnToday ? (
        /*
         * `accent` is the app's text-button colour — the mark, which carries
         * link-ness — so the label reads as tappable without a second line or an
         * icon widening the row. Both matter: the row keeps its height whether
         * or not the affordance is there, so stepping one day back does not
         * shift everything under it.
         */
        <MBPressable
          onPress={() => onChange(today)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`${dayLabel}. Back to today`}
          accessibilityHint="Returns the screen to today"
          feedback="opacity"
          testID={testID ? `${testID}-today` : undefined}
          style={styles.label}>
          <Text
            numberOfLines={1}
            style={[theme.type.bodyStrong, styles.labelText, { color: theme.colors.accent }]}>
            {dayLabel}
          </Text>
        </MBPressable>
      ) : (
        /* `accessibilityRole="header"` rather than plain text: this *is* what
            the screen below it is about, and a reader landing on the screen
            should be able to reach it as a heading rather than as the label of
            two arrows. */
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[theme.type.bodyStrong, styles.label, styles.labelText, { color: theme.colors.text }]}>
          {dayLabel}
        </Text>
      )}

      {arrow('forward', canGoForward, next, 'Next day')}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: layout.inputH,
  },
  arrow: { alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  // `label` sizes the slot — on the pressable it has to be the touch target, so
  // it stretches the full height of the row rather than hugging the text.
  label: { flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  labelText: { textAlign: 'center' },
});
