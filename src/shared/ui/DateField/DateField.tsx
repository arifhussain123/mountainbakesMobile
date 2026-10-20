import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useAppTheme } from '@/shared/theme';
import { formatDisplayDate } from '@/shared/utils';
import { Icon } from '../Icon';
import { dateToHm, dateToYmd, hmToDate, ymdToDate } from './dateFieldValue';

export interface DateFieldProps {
  label?: string;
  /** `YYYY-MM-DD` (mode `date`) or `HH:mm` (mode `time`); `''` while nothing is picked. */
  value: string;
  onChange: (value: string) => void;
  mode?: 'date' | 'time';
  placeholder?: string;
  /** Earliest / latest pickable day, `YYYY-MM-DD` (date mode only). */
  minimumDate?: string;
  maximumDate?: string;
  /** Shows an × that empties the field. */
  onClear?: () => void;
  error?: string;
  required?: boolean;
  /**
   * Draw your own trigger instead of the field (e.g. a calendar icon inside a
   * day stepper). Gets the function that opens the picker.
   */
  renderTrigger?: (open: () => void) => ReactNode;
}

/**
 * A date or time picked from the platform's own picker, never typed. On
 * Android the system dialog opens over the screen; on iOS the inline picker
 * opens under the field until "Done". The value stays a plain `YYYY-MM-DD` /
 * `HH:mm` string, so forms and queries are unchanged.
 */
export function DateField({
  label,
  value,
  onChange,
  mode = 'date',
  placeholder,
  minimumDate,
  maximumDate,
  onClear,
  error,
  required,
  renderTrigger,
}: DateFieldProps) {
  const theme = useAppTheme();
  const [iosOpen, setIosOpen] = useState(false);

  const current = (mode === 'date' ? ymdToDate(value) : hmToDate(value)) ?? ymdToDate(maximumDate) ?? new Date();
  const min = mode === 'date' ? ymdToDate(minimumDate) ?? undefined : undefined;
  const max = mode === 'date' ? ymdToDate(maximumDate) ?? undefined : undefined;
  const emit = (d: Date) => onChange(mode === 'date' ? dateToYmd(d) : dateToHm(d));

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode,
        is24Hour: true,
        minimumDate: min,
        maximumDate: max,
        onValueChange: (_event, date) => emit(date),
      });
      return;
    }
    setIosOpen((o) => !o);
  };

  const display = value ? (mode === 'date' ? formatDisplayDate(value) : value) : '';
  const borderColor = error ? theme.colors.danger : iosOpen ? theme.colors.primary : theme.colors.border;

  return (
    <View>
      {renderTrigger ? (
        renderTrigger(open)
      ) : (
        <View>
          {label ? (
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700', marginBottom: theme.spacing.sm }]}>
              {label}
              {required ? <Text style={{ color: theme.colors.danger }}> *</Text> : null}
            </Text>
          ) : null}
          <View style={[styles.field, { borderColor, backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${label ?? (mode === 'date' ? 'Date' : 'Time')}${display ? `, ${display}` : ''}. Pick ${mode === 'date' ? 'a date' : 'a time'}`}
              onPress={open}
              style={styles.body}>
              <Icon name={mode === 'date' ? 'calendar' : 'clock'} size={14} color={theme.colors.primary} />
              <Text style={[theme.typography.bodySmall, { flex: 1, color: display ? theme.colors.text : theme.colors.textSecondary, fontWeight: display ? '700' : '400' }]} numberOfLines={1}>
                {display || placeholder || (mode === 'date' ? 'Pick a date' : 'Pick a time')}
              </Text>
            </Pressable>
            {onClear && value ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${label ?? 'date'}`} onPress={onClear} hitSlop={8}>
                <Icon name="close" size={12} color={theme.colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          {error ? <Text style={[theme.typography.label, { color: theme.colors.danger, marginTop: 4 }]}>{error}</Text> : null}
        </View>
      )}
      {Platform.OS === 'ios' && iosOpen ? (
        <View style={[styles.iosPanel, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
          <DateTimePicker
            value={current}
            mode={mode}
            display={mode === 'date' ? 'inline' : 'spinner'}
            minimumDate={min}
            maximumDate={max}
            themeVariant={theme.isDark ? 'dark' : 'light'}
            accentColor={theme.colors.primary}
            onValueChange={(_event, date) => emit(date)}
          />
          <Pressable accessibilityRole="button" onPress={() => setIosOpen(false)} style={styles.done}>
            <Text style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '700' }]}>Done</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { height: 44, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: '100%' },
  iosPanel: { marginTop: 6, borderWidth: 1, padding: 8 },
  done: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 8 },
});
