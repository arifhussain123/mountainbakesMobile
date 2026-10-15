import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';

export interface RequiredDateFieldProps {
  /** 'YYYY-MM-DD' or '' when unset. */
  value: string;
  onChange: (date: string) => void;
  /** Red border — the design's `coDateBorder`, shown while the required date is missing. */
  error?: boolean;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/**
 * The design's `<input type="date">` has no direct RN equivalent, and this
 * project has no native date-picker dependency installed anywhere yet (no
 * existing pattern to reuse — checked `NewShopExpenseScreen` and every other
 * screen). Rather than add a new native module (pod install / gradle sync,
 * unverifiable in this environment), this is a small self-contained JS
 * calendar modal: a button showing the chosen date, opening a month grid.
 */
export function RequiredDateField({ value, onChange, error }: RequiredDateFieldProps) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => (value ? new Date(`${value}T00:00:00`).getFullYear() : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (value ? new Date(`${value}T00:00:00`).getMonth() : new Date().getMonth()));

  const monthLabel = useMemo(
    () => new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    [viewYear, viewMonth],
  );

  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = Array.from({ length: firstDay }, () => null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleOpen = () => {
    const base = value ? new Date(`${value}T00:00:00`) : new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setOpen(true);
  };

  const handleSelect = (day: number) => {
    onChange(toIso(viewYear, viewMonth, day));
    setOpen(false);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={handleOpen}
        style={[
          styles.field,
          { borderColor: error ? theme.colors.danger : theme.colors.border, backgroundColor: theme.colors.cardFill, borderRadius: theme.radii.md },
        ]}>
        <Icon name="calendar" size={16} color={theme.colors.textSecondary} />
        <Text
          style={[
            theme.typography.bodySmall,
            { color: value ? theme.colors.text : theme.colors.textSecondary, fontWeight: '600', marginLeft: 8 },
          ]}>
          {value ? formatDisplayDate(value) : 'Select date'}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, borderRadius: theme.radii.lg }]}
            onPress={(event) => event.stopPropagation()}>
            <View style={styles.header}>
              <Pressable accessibilityRole="button" onPress={() => shiftMonth(-1)} style={styles.navButton}>
                <Icon name="chevron-left" size={16} color={theme.colors.text} />
              </Pressable>
              <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{monthLabel}</Text>
              <Pressable accessibilityRole="button" onPress={() => shiftMonth(1)} style={styles.navButton}>
                <Icon name="chevron-right" size={16} color={theme.colors.text} />
              </Pressable>
            </View>
            <View style={styles.weekRow}>
              {WEEKDAY_LABELS.map((label, i) => (
                <Text key={`${label}-${i}`} style={[theme.typography.label, styles.weekCell, { color: theme.colors.textSecondary }]}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {days.map((day, i) => {
                if (day === null) return <View key={`empty-${i}`} style={styles.dayCell} />;
                const iso = toIso(viewYear, viewMonth, day);
                const selected = iso === value;
                return (
                  <Pressable
                    key={iso}
                    accessibilityRole="button"
                    onPress={() => handleSelect(day)}
                    style={[styles.dayCell, selected ? { backgroundColor: theme.colors.primary, borderRadius: theme.radii.sm } : null]}>
                    <Text
                      style={[
                        theme.typography.bodySmall,
                        { color: selected ? theme.colors.primaryText : theme.colors.text, fontWeight: selected ? '700' : '400' },
                      ]}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.closeRow}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { height: 44, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 360, borderWidth: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row' },
  weekCell: { width: `${100 / 7}%`, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  dayCell: { width: `${100 / 7}%`, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeRow: { marginTop: 8, alignItems: 'center' },
});
