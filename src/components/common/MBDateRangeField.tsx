import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { MBPressable } from '@/components/common/MBPressable';
import { businessDateStr } from '@/shared/utils/timezone';
import { layout, space } from '@/theme/spacing';
import { useTheme } from '@/theme/ThemeProvider';

export interface MBDateRangeFieldProps {
  /** Inclusive endpoints as business dates (`YYYY-MM-DD`). */
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  testID?: string;
}

/**
 * A from/to date range, using each platform's native picker.
 *
 * ---------------------------------------------------------------------------
 * Business dates, not calendar dates
 * ---------------------------------------------------------------------------
 * The value handed up is a **business date** string. The picker deals in
 * `Date` objects, so the two conversions at the boundary are the whole subtlety
 * here: a date is turned into local noon before being shown (so a timezone
 * shift cannot roll it to the previous day), and read back through
 * `toBusinessDate()` rather than `toISOString().slice(0, 10)`, which would be
 * UTC and therefore wrong for two hours either side of midnight in Karachi.
 *
 * ---------------------------------------------------------------------------
 * Ordering is corrected, not rejected
 * ---------------------------------------------------------------------------
 * Picking a "from" after the "to" drags the other endpoint along instead of
 * showing a validation error. Nobody means "I would like an empty range"; they
 * mean they are choosing a new window and started at the wrong end.
 *
 * The future is capped at today's business date. A report over tomorrow is
 * always empty, and an empty report reads as a broken screen rather than as an
 * impossible question.
 */

type OpenField = 'from' | 'to' | null;

export function MBDateRangeField({
  from,
  to,
  onChange,
  testID,
}: MBDateRangeFieldProps): React.ReactElement {
  const theme = useTheme();
  const [open, setOpen] = useState<OpenField>(null);

  const today = businessDateStr();

  const pick = (field: 'from' | 'to', picked?: Date) => {
    // Android fires onChange for dismiss too, with no date. iOS keeps the
    // spinner mounted, so it is closed here either way.
    setOpen(null);
    if (!picked) return;

    const value = toBusinessDate(picked);
    const capped = value > today ? today : value;

    if (field === 'from') {
      onChange({ from: capped, to: capped > to ? capped : to });
    } else {
      onChange({ from: capped < from ? capped : from, to: capped });
    }
  };

  return (
    <View style={[styles.row, { gap: space.sm }]} testID={testID}>
      <Field
        label="From"
        value={from}
        onPress={() => setOpen('from')}
        testID={testID ? `${testID}-from` : undefined}
      />
      <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>–</Text>
      <Field
        label="To"
        value={to}
        onPress={() => setOpen('to')}
        testID={testID ? `${testID}-to` : undefined}
      />

      {open ? (
        <DateTimePicker
          testID={testID ? `${testID}-picker` : 'date-picker'}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          value={toDate(open === 'from' ? from : to)}
          maximumDate={toDate(today)}
          onChange={(_event, picked) => pick(open, picked)}
        />
      ) : null}
    </View>
  );
}

function Field({
  label,
  value,
  onPress,
  testID,
}: {
  label: string;
  value: string;
  onPress: () => void;
  testID?: string;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <MBPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. Change.`}
      testID={testID}
      style={[
        styles.field,
        {
          minHeight: layout.tapMin,
          paddingHorizontal: space.md,
          borderRadius: theme.radius.md,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        },
      ]}>
      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[theme.type.label, { color: theme.colors.text }]}>{value}</Text>
    </MBPressable>
  );
}

/** `YYYY-MM-DD` → local noon, so no timezone shift can roll it a day back. */
function toDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12);
}

/** A picked `Date` → `YYYY-MM-DD`, read in local time rather than UTC. */
function toBusinessDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  field: { flex: 1, justifyContent: 'center', borderWidth: 1 },
});
