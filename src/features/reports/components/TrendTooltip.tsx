import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DARK_SURFACES, useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { SalesAnalyticsDailyPoint } from '@/api';

export interface TrendTooltipProps {
  point: SalesAnalyticsDailyPoint | null;
  onStep: (direction: 'prev' | 'next') => void;
  canStepPrev: boolean;
  canStepNext: boolean;
}

/**
 * The chart's "exact amount" readout (the redesign's brand pill "Sun 11 ·
 * Rs. 41,200"), plus Prev/Next day buttons — the accessible way to reach every
 * point without a drag gesture, for a screen reader or anyone who can't do a
 * precise touch-drag.
 */
export function TrendTooltip({ point, onStep, canStepPrev, canStepNext }: TrendTooltipProps) {
  const theme = useAppTheme();
  const pillBg = theme.isDark ? DARK_SURFACES.brandSoft : '#EFEBFF';
  const pillInk = theme.isDark ? DARK_SURFACES.brandInk : '#5B48D8';

  return (
    <View style={styles.row}>
      <StepButton icon="chevron-left" label="Previous day" disabled={!canStepPrev} onPress={() => onStep('prev')} />
      <View style={[styles.pill, { backgroundColor: pillBg }]}>
        {point ? (
          <>
            <Text accessibilityLiveRegion="polite" style={[styles.amount, { color: pillInk }]} numberOfLines={1}>
              {formatCurrency(point.sales)}
            </Text>
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {formatDisplayDate(point.date)} · {point.transactions} orders
            </Text>
          </>
        ) : (
          <Text style={[styles.meta, { color: theme.colors.textFaint }]}>No data</Text>
        )}
      </View>
      <StepButton icon="chevron-right" label="Next day" disabled={!canStepNext} onPress={() => onStep('next')} />
    </View>
  );
}

function StepButton({ icon, label, disabled, onPress }: { icon: 'chevron-left' | 'chevron-right'; label: string; disabled: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.stepButton,
        { backgroundColor: theme.isDark ? theme.colors.border : theme.colors.surface, opacity: disabled ? 0.35 : 1 },
        theme.isDark || disabled ? null : styles.lift,
      ]}>
      <Icon name={icon} size={16} color={theme.colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { flex: 1, minWidth: 0, alignItems: 'center', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10 },
  amount: { fontSize: 16, lineHeight: 21, fontWeight: '700', fontVariant: ['tabular-nums'] },
  meta: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  stepButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  lift: { shadowColor: '#4C3CAA', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
});
