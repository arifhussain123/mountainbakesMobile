import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
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
 * The chart's "exact amount" readout, plus Prev/Next day buttons — the
 * accessible way to reach every point without a drag gesture, for a screen
 * reader or anyone who can't do a precise touch-drag.
 */
export function TrendTooltip({ point, onStep, canStepPrev, canStepNext }: TrendTooltipProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous day"
        disabled={!canStepPrev}
        onPress={() => onStep('prev')}
        style={[styles.stepButton, { borderColor: theme.colors.cardBorder, opacity: canStepPrev ? 1 : 0.35 }]}>
        <Icon name="chevron-left" size={14} color={theme.colors.text} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        {point ? (
          <>
            <Text
              accessibilityLiveRegion="polite"
              style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '700' }]}>
              {formatCurrency(point.revenue)}
            </Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              {formatDisplayDate(point.date)} · {point.orders} orders
            </Text>
          </>
        ) : (
          <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>No data</Text>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next day"
        disabled={!canStepNext}
        onPress={() => onStep('next')}
        style={[styles.stepButton, { borderColor: theme.colors.cardBorder, opacity: canStepNext ? 1 : 0.35 }]}>
        <Icon name="chevron-right" size={14} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
