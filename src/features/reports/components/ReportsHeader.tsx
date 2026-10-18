import { Pressable, Text, View } from 'react-native';
import { openDrawer } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { FilterChipRow, Icon, type FilterChipOption } from '@/shared/ui';
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
}

/** branchApp.md screen 23 header — title, resolved-range subtitle, period chips + step arrows, export overflow. */
export function ReportsHeader({ rangeLabel, includesTodayNote, period, onChangePeriod, onStep, onOpenExport }: ReportsHeaderProps) {
  const theme = useAppTheme();
  const canStep = period !== 'custom';

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          onPress={openDrawer}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
          <Icon name="menu" size={20} color={theme.colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>Branch Reports</Text>
          <Text style={[theme.typography.screenTitle, { color: theme.colors.text, textTransform: 'uppercase', fontSize: 30, marginTop: 4 }]}>
            Reports &{'\n'}
            <Text style={{ color: theme.colors.primary }}>Analytics</Text>
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export report"
          onPress={onOpenExport}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.cardFill, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="file-spreadsheet" size={18} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: theme.spacing.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous period"
          disabled={!canStep}
          onPress={() => onStep('prev')}
          style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.cardBorder, alignItems: 'center', justifyContent: 'center', opacity: canStep ? 1 : 0.35 }}>
          <Icon name="chevron-left" size={14} color={theme.colors.text} />
        </Pressable>
        <Text style={[theme.typography.body, { color: theme.colors.textSecondary, flex: 1 }]} numberOfLines={1}>
          {rangeLabel}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next period"
          disabled={!canStep}
          onPress={() => onStep('next')}
          style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.cardBorder, alignItems: 'center', justifyContent: 'center', opacity: canStep ? 1 : 0.35 }}>
          <Icon name="chevron-right" size={14} color={theme.colors.text} />
        </Pressable>
      </View>

      {includesTodayNote ? (
        <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 4 }]}>{includesTodayNote}</Text>
      ) : null}

      <View style={{ marginTop: theme.spacing.md }}>
        <FilterChipRow options={PERIOD_OPTIONS} value={period} onChange={onChangePeriod} />
      </View>
    </View>
  );
}
