import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MonthlyCashTransferSummary } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card, ErrorState, LoadingSkeleton } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatMonthToDateLine, formatSummaryWindow } from '@/shared/utils';
import { buildCashTransferSummaryTiles, type CashSummaryTone } from '../cashTransferSummary';

export interface MonthlyCashTransferSummaryCardProps {
  summary: MonthlyCashTransferSummary | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}

/**
 * The month-to-date Cash Transfer summary at the top of Cash Transfers — the
 * web's Branch → Cash Transfer Details block, laid out for a phone as a
 * sideways-scrolling strip of the same eight figures. It always covers this
 * branch's business month to date and never follows the list's filters or
 * search, which only change the list below. A failure here leaves the list
 * working: it only replaces this card.
 */
export function MonthlyCashTransferSummaryCard({ summary, isLoading, error, onRetry }: MonthlyCashTransferSummaryCardProps) {
  const theme = useAppTheme();
  const toneColor: Record<CashSummaryTone, string> = {
    neutral: theme.colors.text,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
  };

  if (error && !summary) {
    return <ErrorState message={mapErrorToMessage(error)} onRetry={onRetry} />;
  }

  return (
    <Card>
      <Text style={[theme.typography.label, styles.eyebrow, { color: theme.colors.textFaint }]}>MONTHLY TRANSFERS</Text>
      <Text style={[theme.typography.body, styles.bold, styles.mt2, { color: theme.colors.text }]}>
        {summary ? formatSummaryWindow(summary.from, summary.to) : 'This month'}
      </Text>
      {summary ? (
        <Text style={[theme.typography.label, styles.mt2, { color: theme.colors.textSecondary }]}>{formatMonthToDateLine(summary.from)}</Text>
      ) : null}
      <Text style={[theme.typography.label, styles.mt2, { color: theme.colors.textFaint }]}>Approved transfers are confirmed by Finance</Text>

      {isLoading || !summary ? (
        <View style={{ marginTop: theme.spacing.sm }}>
          <LoadingSkeleton height={64} />
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: theme.spacing.sm }} contentContainerStyle={styles.row}>
          {buildCashTransferSummaryTiles(summary).map((tile) => (
            <View
              key={tile.key}
              accessible
              accessibilityLabel={`${tile.label}: ${tile.value}, ${tile.sub}`}
              style={[
                styles.tile,
                {
                  backgroundColor: tile.highlight ? theme.colors.primary : theme.colors.cardFill,
                  borderColor: tile.highlight ? theme.colors.primary : theme.colors.cardBorder,
                  borderRadius: theme.radii.md,
                },
              ]}>
              <Text style={[theme.typography.label, { color: tile.highlight ? theme.colors.primaryText : theme.colors.textSecondary }]} numberOfLines={1}>
                {tile.label}
              </Text>
              <Text
                style={[theme.typography.cardTitle, styles.mt2, { color: tile.highlight ? theme.colors.primaryText : toneColor[tile.tone] }]}
                numberOfLines={1}>
                {tile.value}
              </Text>
              <Text style={[theme.typography.label, styles.mt2, { color: tile.highlight ? theme.colors.primaryText : theme.colors.textFaint }]} numberOfLines={1}>
                {tile.sub}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  tile: { minWidth: 140, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  eyebrow: { letterSpacing: 1.2 },
  bold: { fontWeight: '700' },
  mt2: { marginTop: 2 },
});
