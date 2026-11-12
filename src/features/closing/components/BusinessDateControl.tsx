import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';

export interface BusinessDateControlProps {
  /** 'YYYY-MM-DD'. */
  value: string;
  onChange: (date: string) => void;
  /** 'YYYY-MM-DD' — dates after this are shown but not selectable (today, in practice). */
  maxDate: string;
  /** A one-line note under the field. */
  help?: string;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/**
 * Design line 946 — the single "Business date · 10/12/2026" row with a
 * calendar icon, replacing the old prev/next chevron date control. There's no
 * native date-picker dependency in this project (confirmed when
 * `RequiredDateField`, src/features/orders/components/RequiredDateField.tsx,
 * was built for Create Order), so this adapts that same self-built
 * month-grid calendar-modal pattern rather than adding one, with its own
 * trigger row to match this screen's exact copy/shape.
 */
export function BusinessDateControl({ value, onChange, maxDate, help }: BusinessDateControlProps) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => new Date(`${value}T00:00:00`).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date(`${value}T00:00:00`).getMonth());

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
    const base = new Date(`${value}T00:00:00`);
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setOpen(true);
  };

  const handleSelect = (day: number) => {
    const iso = toIso(viewYear, viewMonth, day);
    if (iso > maxDate) return;
    onChange(iso);
    setOpen(false);
  };

  return (
    <>
      <View>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700' }]}>Business date</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Business date ${formatDisplayDate(value)}. Change business date`}
          onPress={handleOpen}
          style={[styles.field, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.border, borderRadius: theme.radii.lg }]}>
          <Text style={[styles.value, { color: theme.colors.text }]}>{formatDisplayDate(value)}</Text>
          <Icon name="calendar" size={20} color={theme.colors.textFaint} />
        </Pressable>
        {help ? <Text style={[styles.help, { color: theme.colors.textFaint }]}>{help}</Text> : null}
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.isDark ? theme.colors.background : '#F7F5FF', borderColor: theme.colors.border, borderRadius: 26 }]}
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
                const disabled = iso > maxDate;
                return (
                  <Pressable
                    key={iso}
                    accessibilityRole="button"
                    disabled={disabled}
                    onPress={() => handleSelect(day)}
                    style={[styles.dayCell, selected ? { backgroundColor: theme.colors.primary, borderRadius: 12 } : null]}>
                    <Text
                      style={[
                        theme.typography.bodySmall,
                        {
                          color: selected ? theme.colors.primaryText : disabled ? theme.colors.textFaint : theme.colors.text,
                          fontWeight: '600',
                          opacity: disabled ? 0.4 : 1,
                        },
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
  field: { height: 52, marginTop: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  value: { fontSize: 15, fontWeight: '500' },
  help: { fontSize: 12, lineHeight: 17, marginTop: 7 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 360, borderWidth: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row' },
  weekCell: { width: `${100 / 7}%`, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  dayCell: { width: `${100 / 7}%`, height: 38, alignItems: 'center', justifyContent: 'center' },
  closeRow: { marginTop: 8, alignItems: 'center' },
});
