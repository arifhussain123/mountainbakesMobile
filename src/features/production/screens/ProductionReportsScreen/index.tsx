import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import {
  PRODUCTION_REPORT_LABELS,
  PRODUCTION_REPORT_TYPES,
  PRODUCTION_REPORT_USES_DATE_RANGE,
  useProductionReportSummary,
} from '@/api';
import type { ProductionReportPeriod, ProductionReportType } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, LoadingSkeleton, Screen } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { FilterChip } from '../../components';
import { styles } from './styles';

const PERIODS: { value: ProductionReportPeriod; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

/**
 * mountainbakesProduction.html screen 13 — Production Reports. Wired to
 * `GET /api/production-reports/summary` (`production-reports.routes.ts`) — a
 * reporting surface Production genuinely has, deliberately separate from
 * `/api/reports` (sales/financials), which refuses `production_user`. An
 * earlier pass checked only `reports.routes.ts` and missed this one.
 *
 * PDF/Excel/CSV export and Print are deferred — this app has no
 * file-download/share library yet (same precedent as Finance Reports, screen
 * 19 of mountainbakesFinance.html); this ships as an on-screen viewer first.
 * The two date-range report types (Prepared Detail, Collections) default to
 * today only — a custom from/to date picker is also deferred.
 */
export function ProductionReportsScreen() {
  const theme = useAppTheme();
  const [report, setReport] = useState<ProductionReportType>('production');
  const [period, setPeriod] = useState<ProductionReportPeriod>('monthly');

  const usesDateRange = PRODUCTION_REPORT_USES_DATE_RANGE.has(report);
  const { data, isLoading, error, refetch, isRefetching } = useProductionReportSummary({
    report,
    ...(usesDateRange ? {} : { period }),
  });

  const dataRowCount = data ? data.rows.length - (data.specialRowCount ?? 0) : 0;

  return (
    <Screen>
      <AppHeader title="Production Reports" subtitle="Ten reports, one viewer" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: 8 }} contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: 8 }}>
        {PRODUCTION_REPORT_TYPES.map((t) => (
          <FilterChip key={t} label={PRODUCTION_REPORT_LABELS[t]} active={t === report} onPress={() => setReport(t)} />
        ))}
      </ScrollView>

      {!usesDateRange ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: 8 }} contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: 8 }}>
          {PERIODS.map((p) => (
            <FilterChip key={p.value} label={p.label} active={p.value === period} onPress={() => setPeriod(p.value)} />
          ))}
        </ScrollView>
      ) : (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, paddingHorizontal: theme.spacing.lg, marginTop: 8 }]}>
          Today only — a custom date range isn't built yet for this report.
        </Text>
      )}

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={theme.colors.primary} />}>
        {isLoading ? <LoadingSkeleton height={160} /> : null}
        {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}

        {!isLoading && !error && data ? (
          <View>
            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>{data.title}</Text>
            {dataRowCount === 0 ? (
              <EmptyState title="No Rows" message="Nothing matched this report's filters." />
            ) : (
              <View style={[styles.table, { marginTop: theme.spacing.md }]}>
                <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
                  {data.headers.map((h, i) => (
                    <Text
                      key={h}
                      style={[theme.typography.label, { color: theme.colors.primary, flex: i === 0 ? 1.6 : 1, textAlign: i === 0 ? 'left' : 'right' }]}
                      numberOfLines={1}>
                      {h}
                    </Text>
                  ))}
                </View>
                {data.rows.map((row, rowIndex) => {
                  const isSpecial = rowIndex >= data.rows.length - (data.specialRowCount ?? 0);
                  return (
                    <View key={rowIndex} style={[styles.row, { borderBottomColor: theme.colors.border }]}>
                      {row.map((cell, i) => (
                        <Text
                          key={i}
                          style={[
                            theme.typography.bodySmall,
                            {
                              color: isSpecial ? theme.colors.primary : theme.colors.text,
                              fontWeight: isSpecial || i === 0 ? '700' : '400',
                              flex: i === 0 ? 1.6 : 1,
                              textAlign: i === 0 ? 'left' : 'right',
                            },
                          ]}
                          numberOfLines={2}>
                          {String(cell)}
                        </Text>
                      ))}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}
        {!isLoading && !error ? (
          <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: theme.spacing.lg }]}>
            PDF / Excel / CSV export and Print are not built yet — see this screen's own code comment for why.
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
