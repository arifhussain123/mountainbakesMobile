import { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { FINANCE_REPORT_LABELS, FINANCE_REPORT_TYPES, useFinanceReport, type FinanceReportType } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, LoadingSkeleton, Screen, StatCard } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { getFinanceDateRange, type FinanceDateRangePreset } from '../../utils/dateRange';
import { FinanceDateRangeFilter } from '../../components/FinanceDateRangeFilter';
import { styles } from './styles';

function formatCell(value: string | number | null, format: string | undefined): string {
  if (value === null) return '—';
  if (format === 'money' && typeof value === 'number') return formatCurrency(value);
  if (format === 'date' && typeof value === 'string') return formatDisplayDate(value);
  return String(value);
}

/**
 * mountainbakesFinance.html screen 19 — Finance Reports. One generic viewer for
 * all ten reports (`FinanceReport` is a single shape — columns/rows/totals/
 * summary — not ten bespoke ones). Export to PDF/Excel/CSV is deferred: this
 * app has no file-download/share library yet, so screen 19 ships as an
 * on-screen viewer first (see docs/mobile-finance-plan.md).
 */
export function FinanceReportsScreen() {
  const theme = useAppTheme();
  const [type, setType] = useState<FinanceReportType>('daily_cash_book');
  const [preset, setPreset] = useState<FinanceDateRangePreset>('month');

  const range = getFinanceDateRange(preset);
  const { data, isLoading, error, refetch, isRefetching } = useFinanceReport({ type, from: range.from, to: range.to });

  return (
    <Screen>
      <AppHeader title="Finance Reports" subtitle="Ten reports, one viewer" actions={[]} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: 8 }}>
        {FINANCE_REPORT_TYPES.map((t) => {
          const active = t === type;
          return (
            <Pressable
              key={t}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setType(t)}
              style={[
                styles.chip,
                { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.pill },
              ]}>
              <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text }]} numberOfLines={1}>
                {FINANCE_REPORT_LABELS[t]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.md }}>
        <FinanceDateRangeFilter value={preset} onChange={setPreset} />
      </View>

      <FlatList
        data={data?.rows ?? []}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListHeaderComponent={
          <View>
            {isLoading ? <LoadingSkeleton height={120} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
            {data ? (
              <View>
                <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>{data.title}</Text>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>{data.subtitle}</Text>
                {data.summary.length > 0 ? (
                  <View style={[styles.summaryRow, { marginTop: theme.spacing.md }]}>
                    {data.summary.map((s) => (
                      <StatCard key={s.label} label={s.label} value={formatCell(s.value, s.format)} />
                    ))}
                  </View>
                ) : null}
                {data.rows.length > 0 ? (
                  <View style={[styles.headerRow, { marginTop: theme.spacing.lg, borderBottomColor: theme.colors.border }]}>
                    {data.columns.map((col) => (
                      <Text
                        key={col.key}
                        style={[theme.typography.label, { color: theme.colors.textSecondary, flex: col.width ?? 1, textAlign: col.align ?? 'left' }]}
                        numberOfLines={1}>
                        {col.label}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={!isLoading && !error && data ? <EmptyState title="No Rows" message="Nothing matched this report's filters." /> : undefined}
        renderItem={({ item }) => (
          <View style={[styles.dataRow, { borderBottomColor: theme.colors.border }]}>
            {data?.columns.map((col) => (
              <Text key={col.key} style={[theme.typography.bodySmall, { color: theme.colors.text, flex: col.width ?? 1, textAlign: col.align ?? 'left' }]} numberOfLines={2}>
                {formatCell(item[col.key] ?? null, col.format)}
              </Text>
            ))}
          </View>
        )}
        ListFooterComponent={
          data && data.rows.length > 0 ? (
            <View style={[styles.dataRow, { borderBottomColor: 'transparent', paddingTop: theme.spacing.sm }]}>
              {data.columns.map((col) => (
                <Text key={col.key} style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flex: col.width ?? 1, textAlign: col.align ?? 'left' }]}>
                  {col.key in data.totals ? formatCell(data.totals[col.key]!, col.format) : ''}
                </Text>
              ))}
            </View>
          ) : undefined
        }
      />
    </Screen>
  );
}
