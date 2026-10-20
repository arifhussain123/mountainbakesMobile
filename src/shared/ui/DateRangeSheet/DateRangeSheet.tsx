import { forwardRef, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAppTheme } from '@/shared/theme';
import { DATE_RANGE_PRESETS, isValidDateRange, resolveDateRangePreset, type DateRange, type DateRangePreset } from '@/shared/utils';
import { FormBottomSheet } from '../FormBottomSheet';
import { DateField } from '../DateField';
import { PillButton } from '../PillButton';

export interface DateRangeSheetProps {
  /** The business date (2 AM cutoff) presets are anchored to — never the device's raw calendar date. */
  today: string;
  value: DateRange;
  onApply: (range: DateRange) => void;
  onRequestClose: () => void;
  /** Latest pickable day for the custom range (e.g. `today`); no limit when absent. */
  maxDate?: string;
}

/**
 * A generic "pick a date range" sheet — quick presets (Today/Last 7 days/This
 * month/Last 90 days) plus a custom from/to, each picked from the platform's
 * date picker (never typed). "From" cannot pass "To", and neither end can
 * pass `maxDate` when one is given.
 */
export const DateRangeSheet = forwardRef<BottomSheetModal, DateRangeSheetProps>(({ today, value, onApply, onRequestClose, maxDate }, ref) => {
  const theme = useAppTheme();
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);

  useEffect(() => {
    setFrom(value.from);
    setTo(value.to);
  }, [value.from, value.to]);

  const valid = isValidDateRange(from, to);

  const applyPreset = (preset: DateRangePreset) => {
    const range = resolveDateRangePreset(preset, today);
    setFrom(range.from);
    setTo(range.to);
    onApply(range);
    onRequestClose();
  };

  const applyCustom = () => {
    if (!valid) return;
    onApply({ from, to });
    onRequestClose();
  };

  return (
    <FormBottomSheet ref={ref} title="Date Range" onRequestClose={onRequestClose} snapPoints={['55%']}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {DATE_RANGE_PRESETS.map((item) => (
          <Pressable
            key={item.preset}
            accessibilityRole="button"
            onPress={() => applyPreset(item.preset)}
            style={{
              height: 36,
              paddingHorizontal: 14,
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              borderColor: theme.colors.cardBorder,
              backgroundColor: theme.colors.cardFill,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: theme.spacing.lg }]}>CUSTOM RANGE</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <DateField label="From" value={from} onChange={setFrom} maximumDate={to && (!maxDate || to < maxDate) ? to : maxDate} />
        </View>
        <View style={{ flex: 1 }}>
          <DateField label="To" value={to} onChange={setTo} minimumDate={from || undefined} maximumDate={maxDate} />
        </View>
      </View>
      {!valid ? (
        <Text style={[theme.typography.label, { color: theme.colors.danger, marginTop: theme.spacing.sm }]}>
          Pick two dates, with "From" on or before "To".
        </Text>
      ) : null}

      <View style={{ marginTop: theme.spacing.lg }}>
        <PillButton label="Apply Range" onPress={applyCustom} disabled={!valid} />
      </View>
    </FormBottomSheet>
  );
});
