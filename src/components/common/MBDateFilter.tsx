import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { MBPressable } from './MBPressable';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/spacing';
import { businessDateStr, businessDaysAgoStr } from '@/shared/utils/timezone';

/**
 * The business-date range a list is showing, as a row of presets.
 *
 * ---------------------------------------------------------------------------
 * Presets, and where they stop
 * ---------------------------------------------------------------------------
 * The windows are bounded on purpose. `GET /api/expenses` applies a seven-day
 * cutoff backed by an index, so an "all time" option would either be refused or
 * be slow enough to look broken; 30 days is the widest thing worth offering.
 * The same reasoning holds anywhere else this is used — the server, not the
 * chip row, decides what is cheap to ask for.
 *
 * `to` is always **today's business date**. Nothing in this app can be filed
 * for the future, so a range that reaches past today can only return the same
 * rows with a wider promise.
 *
 * ---------------------------------------------------------------------------
 * Business dates, not calendar dates
 * ---------------------------------------------------------------------------
 * Every bound comes from the `business*` helpers, so "Today" means the business
 * day that rolls at 02:00 Karachi rather than the device's midnight. A 01:30
 * expense belongs to the previous business day and this row must agree with the
 * screen showing it — see `docs/timezone.md`.
 *
 * ---------------------------------------------------------------------------
 * Why not MBFilterChips
 * ---------------------------------------------------------------------------
 * `MBFilterChips` takes `{key, label}` and hands back a key. This owns the
 * *dates* as well as the labels, so a screen asks for "7 days" and gets a
 * `{from, to}` it can put straight into a query — rather than every caller
 * re-deriving the same three windows and one of them getting the off-by-one
 * wrong (6 days back is a 7-day inclusive window, not 7).
 */

export interface DateRange {
  /** Inclusive business date, `YYYY-MM-DD`. */
  from: string;
  to: string;
}

export const DATE_FILTER_PRESETS = {
  today: { label: 'Today', from: () => businessDateStr() },
  // 6 back plus today is a 7-day inclusive window. 7 would be eight days.
  week: { label: '7 days', from: () => businessDaysAgoStr(6) },
  month: { label: '30 days', from: () => businessDaysAgoStr(29) },
} as const;

export type DateFilterKey = keyof typeof DATE_FILTER_PRESETS;

/** The resolved range for a preset, evaluated now. */
export function dateRangeFor(key: DateFilterKey): DateRange {
  return { from: DATE_FILTER_PRESETS[key].from(), to: businessDateStr() };
}

/** The label a header subtitle shows for the current selection. */
export function dateFilterLabel(key: DateFilterKey): string {
  return DATE_FILTER_PRESETS[key].label;
}

export interface MBDateFilterProps {
  value: DateFilterKey;
  onChange: (key: DateFilterKey) => void;
  testIDPrefix?: string;
}

export function MBDateFilter({
  value,
  onChange,
  testIDPrefix,
}: MBDateFilterProps): React.ReactElement {
  const theme = useTheme();
  const keys = Object.keys(DATE_FILTER_PRESETS) as DateFilterKey[];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Horizontal so the options never push the list down as they grow, and so
      // the current filter stays readable without opening anything.
      contentContainerStyle={{ gap: theme.space.sm, paddingHorizontal: theme.layout.screenPad }}>
      {keys.map(key => {
        const selected = key === value;
        return (
          <MBPressable
            key={key}
            testID={testIDPrefix ? `${testIDPrefix}-${key}` : undefined}
            onPress={() => onChange(key)}
            // `radio` rather than `button`: these are one choice from a set, and
            // a screen reader should say so.
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`Show ${DATE_FILTER_PRESETS[key].label.toLowerCase()}`}
            style={[
              styles.chip,
              {
                borderRadius: theme.radius.pill,
                borderColor: selected ? theme.colors.primary : theme.colors.border,
                backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
              },
            ]}>
            <Text
              style={[
                theme.type.caption,
                { color: selected ? theme.colors.onPrimary : theme.colors.text },
              ]}>
              {DATE_FILTER_PRESETS[key].label}
            </Text>
          </MBPressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 40,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
