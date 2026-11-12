import { Pressable, StyleSheet, Text, View } from 'react-native';
import { openDrawer } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { type FilterChipOption, FilterChipRow, Icon, IconButton, type IconName } from '@/shared/ui';
import type { UiReportPeriod } from '../ranges';

const PERIOD_OPTIONS: FilterChipOption<UiReportPeriod>[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

export interface ReportsHeaderProps {
  rangeLabel: string;
  includesTodayNote?: string;
  period: UiReportPeriod;
  onChangePeriod: (period: UiReportPeriod) => void;
  onStep: (direction: 'prev' | 'next') => void;
  onOpenExport: () => void;
  /** Custom period only: tapping the Period field opens the custom-range sheet. */
  onPressRange?: () => void;
}

/**
 * 2026 redesign B23 header — "Reports" h1 with round icon buttons (export,
 * menu), the period chips, then a Period field (calendar icon + resolved
 * range) flanked by the previous/next step arrows.
 */
export function ReportsHeader({ rangeLabel, includesTodayNote, period, onChangePeriod, onStep, onOpenExport, onPressRange }: ReportsHeaderProps) {
  const theme = useAppTheme();
  const canStep = period !== 'custom';
  const fieldBorder = theme.isDark ? theme.colors.border : '#E6E1FA';

  return (
    <View>
      <View style={styles.titleRow}>
        <Text style={[styles.h1, { color: theme.colors.text }]}>Reports</Text>
        <View style={styles.actions}>
          <IconButton icon="file-spreadsheet" accessibilityLabel="Export report" onPress={onOpenExport} />
          <IconButton icon="menu" accessibilityLabel="Open menu" onPress={openDrawer} />
        </View>
      </View>

      <View style={{ marginTop: theme.spacing.lg }}>
        <FilterChipRow options={PERIOD_OPTIONS} value={period} onChange={onChangePeriod} />
      </View>

      <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>Period</Text>
      <View style={[styles.fieldRow, { marginTop: theme.spacing.sm }]}>
        <StepButton icon="chevron-left" label="Previous period" disabled={!canStep} onPress={() => onStep('prev')} />
        <Pressable
          accessibilityRole={onPressRange ? 'button' : undefined}
          accessibilityLabel={onPressRange ? `Change custom range, ${rangeLabel}` : undefined}
          disabled={!onPressRange}
          onPress={onPressRange}
          style={[styles.field, { backgroundColor: theme.colors.cardFill, borderColor: fieldBorder }]}>
          <Icon name="calendar" size={20} color={theme.colors.textFaint} />
          <Text style={[styles.fieldText, { color: theme.colors.text }]} numberOfLines={1}>
            {rangeLabel}
          </Text>
          {onPressRange ? <Text style={[styles.change, { color: theme.colors.primary }]}>Change</Text> : null}
        </Pressable>
        <StepButton icon="chevron-right" label="Next period" disabled={!canStep} onPress={() => onStep('next')} />
      </View>

      {includesTodayNote ? <Text style={[styles.help, { color: theme.colors.textFaint }]}>{includesTodayNote}</Text> : null}
    </View>
  );
}

function StepButton({ icon, label, disabled, onPress }: { icon: IconName; label: string; disabled: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.stepBtn,
        { backgroundColor: theme.isDark ? theme.colors.border : theme.colors.surface, opacity: disabled ? 0.35 : 1 },
        theme.isDark || disabled ? null : styles.lift,
      ]}>
      <Icon name={icon} size={16} color={theme.colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  h1: { flex: 1, fontSize: 32, lineHeight: 38, fontWeight: '600', letterSpacing: -1 },
  actions: { flexDirection: 'row', gap: 8 },
  lift: { shadowColor: '#4C3CAA', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: { flex: 1, minWidth: 0, height: 52, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  fieldText: { flex: 1, fontSize: 15, fontWeight: '500' },
  change: { fontSize: 13, fontWeight: '600' },
  stepBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  help: { fontSize: 12, lineHeight: 17, marginTop: 6 },
});
