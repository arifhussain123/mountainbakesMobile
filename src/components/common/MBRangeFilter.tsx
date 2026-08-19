import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MBDateRangeField } from './MBDateRangeField';
import { MBPressable } from './MBPressable';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, space } from '@/theme/spacing';
import {
  DASHBOARD_RANGES,
  describeCustom,
  type CustomDates,
  type DashboardRangeKey,
} from '@/utils/dashboardRange';

/**
 * The period a set of figures covers, as a chip row plus the custom picker.
 *
 * ---------------------------------------------------------------------------
 * One vocabulary, one control
 * ---------------------------------------------------------------------------
 * The dashboard and Reports ask `/api/reports/summary` the *same question*, and
 * they were asking it with two different controls: the dashboard had this chip
 * row, and Reports had four hand-rolled chips carrying raw `ReportPeriod`
 * values (`daily`/`weekly`/`monthly`/`yearly`) with no custom option at all. So
 * "Week" on one screen and "7 days" on the other were different windows —
 * `weekly` is the calendar week to date, seven days is the last seven days —
 * and a manager moving between the two screens had no way to know that.
 *
 * The markup was the same forty lines twice, which is the state
 * `MBFilterChips` was extracted to stop. This is not that component because the
 * custom chip does two things a filter chip does not: it **relabels itself**
 * with the chosen window (`1 Aug – 19 Aug`) so the current range is readable
 * without opening anything, and it reveals a date field beneath the row.
 *
 * ---------------------------------------------------------------------------
 * The chips resolve to a query, not to a name
 * ---------------------------------------------------------------------------
 * `resolveRange()` in `utils/dashboardRange.ts` owns the translation, and the
 * reason it exists is that the server takes a **named period or an explicit
 * range, never both** — `getDateRange()` in `reports.routes.ts` ignores
 * `from`/`to` whenever the period is one of its four names. Screens hold a chip
 * key; only that helper turns one into a request.
 *
 * There is no "Year" chip, and its absence is deliberate. The summary route
 * pulls every order in range **with its line items** into the dyno's memory and
 * aggregates in Node — a year of that is the one range on this screen that can
 * be genuinely large, and Custom already covers anyone who truly needs it.
 */

export interface MBRangeFilterProps {
  value: DashboardRangeKey;
  onChange: (key: DashboardRangeKey) => void;
  /** The custom window, kept by the caller so it survives switching chips away and back. */
  custom: CustomDates;
  onCustomChange: (custom: CustomDates) => void;
  testIDPrefix?: string;
}

export function MBRangeFilter({
  value,
  onChange,
  custom,
  onCustomChange,
  testIDPrefix = 'range',
}: MBRangeFilterProps): React.ReactElement {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space.sm }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.space.sm }}>
        {DASHBOARD_RANGES.map(option => {
          const selected = option.key === value;
          // The custom chip carries its window once chosen. A chip reading
          // "Custom" tells you which mode you are in and nothing about what you
          // are looking at, and the dates are the whole point of choosing it.
          const label = option.key === 'custom' && selected ? describeCustom(custom) : option.label;
          return (
            <MBPressable
              key={option.key}
              onPress={() => onChange(option.key)}
              // `radio`, not `button`: one choice from a set, and a screen
              // reader should say which.
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              testID={`${testIDPrefix}-${option.key}`}
              style={[
                styles.chip,
                {
                  borderRadius: theme.radius.pill,
                  backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                },
              ]}>
              <Text
                style={[
                  theme.type.label,
                  { color: selected ? theme.colors.onPrimary : theme.colors.text },
                ]}>
                {label}
              </Text>
            </MBPressable>
          );
        })}
      </ScrollView>

      {value === 'custom' ? (
        <MBDateRangeField
          from={custom.from}
          to={custom.to}
          onChange={onCustomChange}
          testID={`${testIDPrefix}-custom-dates`}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: layout.chipH,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
