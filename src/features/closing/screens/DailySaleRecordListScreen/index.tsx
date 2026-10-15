import { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { getBusinessDate, useDailySaleRecords, useGenerateDailySaleRecord, useVerifyDailySaleRecord } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card, EmptyState, ErrorState, FormBottomSheet, Icon, LoadingSkeleton, Screen } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { DailySaleDifferenceCard, DailySaleHeroCard, DailySaleRecordCard, formatDifferenceAmount } from '../../components';
import { ManualFeedSheetContent } from '../ManualFeedScreen';
import { RequiredDateField } from '@/features/orders/components/RequiredDateField';
import { styles } from './styles';

type DiffFilter = 'all' | 'over' | 'short' | 'matched';

const TILE_DOTS = ['#FF6B35', '#34C38A', '#5A8DEE', '#F5B800', '#FF5A5F', '#8A7A6D'];

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "01–12 OCT" when the range sits in one month, else "01 OCT – 12 NOV". */
function formatRangeLabel(from: string, to: string): string {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return `${from} – ${to}`;
  const fromDay = String(fromDate.getDate()).padStart(2, '0');
  const toDay = String(toDate.getDate()).padStart(2, '0');
  const fromMonth = fromDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const toMonth = toDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  if (fromMonth === toMonth && fromDate.getFullYear() === toDate.getFullYear()) {
    return `${fromDay}–${toDay} ${toMonth}`;
  }
  return `${fromDay} ${fromMonth} – ${toDay} ${toMonth}`;
}

/** branchApp.md screen 21 — Daily Sale Record: takings against what was physically counted. */
export function DailySaleRecordListScreen() {
  const theme = useAppTheme();
  const manualFeedSheetRef = useRef<BottomSheetModal>(null);
  const [generatingDate, setGeneratingDate] = useState<string | null>(null);
  const [manualFeedDate, setManualFeedDate] = useState<string | null>(null);
  const [diffFilter, setDiffFilter] = useState<DiffFilter>('all');

  // Defaults mirror the backend's own "last 30 business days ending today" window
  // (dailySaleService.ts) until the first response tells us the server's actual bounds.
  const [from, setFrom] = useState(() => shiftDate(getBusinessDate(), -29));
  const [to, setTo] = useState(() => getBusinessDate());

  const { data, isLoading, error, refetch, isRefetching } = useDailySaleRecords({ from, to });
  const generate = useGenerateDailySaleRecord();
  const verify = useVerifyDailySaleRecord();

  const records = useMemo(() => data?.records ?? [], [data]);

  const hasCount = (r: (typeof records)[number]) => r.id !== null && (r.manualCash !== null || r.manualEasypaisa !== null || r.manualBank !== null);

  const counts = useMemo(() => {
    const counted = records.filter(hasCount);
    return {
      all: records.length,
      over: counted.filter((r) => r.overallDifference > 0).length,
      short: counted.filter((r) => r.overallDifference < 0).length,
      matched: counted.filter((r) => r.overallDifference === 0).length,
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (diffFilter === 'all') return records;
    const counted = records.filter(hasCount);
    if (diffFilter === 'over') return counted.filter((r) => r.overallDifference > 0);
    if (diffFilter === 'short') return counted.filter((r) => r.overallDifference < 0);
    return counted.filter((r) => r.overallDifference === 0);
  }, [records, diffFilter]);

  const aggregates = useMemo(
    () =>
      filteredRecords.reduce(
        (acc, r) => ({
          totalSale: acc.totalSale + r.autoTotalSale,
          companyShare: acc.companyShare + r.companyShare,
          cashOnTable: acc.cashOnTable + r.expectedCashInHand,
          discount: acc.discount + r.discount,
        }),
        { totalSale: 0, companyShare: 0, cashOnTable: 0, discount: 0 },
      ),
    [filteredRecords],
  );

  const handleGenerate = (businessDate: string) => {
    setGeneratingDate(businessDate);
    generate.mutate(businessDate, {
      onError: (e) => Alert.alert('Could Not Generate', mapErrorToMessage(e)),
      onSettled: () => setGeneratingDate(null),
    });
  };

  const handleVerify = (id: string) => {
    verify.mutate(id, { onError: (e) => Alert.alert('Could Not Verify', mapErrorToMessage(e)) });
  };

  const openManualFeed = (businessDate: string) => {
    setManualFeedDate(businessDate);
    manualFeedSheetRef.current?.present();
  };

  const summary = data?.summary;
  const rangeFrom = data?.from ?? from;
  const rangeTo = data?.to ?? to;

  const filterChips: { key: DiffFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'over', label: 'Over', count: counts.over },
    { key: 'short', label: 'Short', count: counts.short },
    { key: 'matched', label: 'Matched', count: counts.matched },
  ];

  return (
    <Screen>
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md }}>
        <View style={styles.headerActionsRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => handleGenerate(getBusinessDate())}
            disabled={generatingDate === getBusinessDate()}
            style={[styles.headerPill, { backgroundColor: theme.colors.border, borderRadius: theme.radii.md }]}>
            <Icon name="refresh" size={14} color={theme.colors.text} />
            <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>
              {generatingDate === getBusinessDate() ? 'Generating…' : 'Generate Today'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => openManualFeed(getBusinessDate())}
            style={[styles.headerPill, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.md }]}>
            <Icon name="plus" size={14} color={theme.colors.primaryText} />
            <Text style={[theme.typography.label, { color: theme.colors.primaryText, fontWeight: '700' }]}>Manual Feed</Text>
          </Pressable>
        </View>

        <View style={styles.titleBlock}>
          <Text style={[theme.typography.screenTitle, { color: theme.colors.text, fontSize: 26, textTransform: 'uppercase' }]}>
            Daily Sale <Text style={{ color: theme.colors.primary }}>Record</Text>
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 6 }]}>
            The day's takings against what was physically counted. Sales and expenses are never changed by this screen.
          </Text>
        </View>
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.businessDate}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}

            {summary ? (
              <>
                <View style={{ marginTop: theme.spacing.md }}>
                  <DailySaleHeroCard
                    rangeLabel={formatRangeLabel(rangeFrom, rangeTo)}
                    totalSale={summary.totalSale}
                    companyShare={summary.totalSale - summary.cash - summary.easypaisa - summary.foodpanda - summary.bank}
                    cashOnTable={summary.cash}
                  />
                </View>

                <View style={[styles.tilesGrid, { marginTop: theme.spacing.sm }]}>
                  {(
                    [
                      { label: 'Cash', value: summary.cash },
                      { label: 'Easypaisa', value: summary.easypaisa },
                      { label: 'Foodpanda', value: summary.foodpanda },
                      { label: 'Bank', value: summary.bank },
                      { label: 'Expense', value: summary.cashExpense },
                      { label: 'Discount', value: summary.discount },
                    ] as const
                  ).map((t, i) => (
                    <View
                      key={t.label}
                      style={[
                        styles.tile,
                        { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.lg, padding: 11 },
                      ]}>
                      <View style={styles.tileDotRow}>
                        <View style={[styles.tileDot, { backgroundColor: TILE_DOTS[i] }]} />
                        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{t.label}</Text>
                      </View>
                      <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 4 }]}>{formatCurrency(t.value)}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ marginTop: theme.spacing.sm }}>
                  <DailySaleDifferenceCard difference={summary.difference} />
                </View>

                <View style={{ marginTop: theme.spacing.sm, gap: 8 }}>
                  {summary.uncounted > 0 ? (
                    <View
                      style={[
                        styles.banner,
                        { backgroundColor: `${theme.colors.warning}17`, borderColor: `${theme.colors.warning}48`, borderRadius: theme.radii.md, padding: 11 },
                      ]}>
                      <Icon name="warning" size={15} color={theme.colors.warning} />
                      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]}>
                        {summary.uncounted} day{summary.uncounted === 1 ? ' has' : 's have'} nothing counted yet, so the Difference card covers only
                        the days that do.
                      </Text>
                    </View>
                  ) : null}
                  {summary.difference !== 0 ? (
                    <View
                      style={[
                        styles.banner,
                        { backgroundColor: `${theme.colors.warning}17`, borderColor: `${theme.colors.warning}48`, borderRadius: theme.radii.md, padding: 11 },
                      ]}>
                      <Icon name="warning" size={15} color={theme.colors.warning} />
                      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]}>
                        This window is out by{' '}
                        <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{formatDifferenceAmount(summary.difference)}</Text>. Open
                        each day with a difference and check the figure against the counted amount.
                      </Text>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}

            <View style={[styles.dateRangeRow, { marginTop: theme.spacing.md }]}>
              <View style={styles.dateRangeField}>
                <RequiredDateField value={from} onChange={setFrom} />
              </View>
              <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>to</Text>
              <View style={styles.dateRangeField}>
                <RequiredDateField value={to} onChange={setTo} />
              </View>
            </View>

            <View style={[styles.filtersRow, { marginTop: theme.spacing.sm }]}>
              {filterChips.map((f) => {
                const active = diffFilter === f.key;
                return (
                  <Pressable
                    key={f.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setDiffFilter(f.key)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? theme.colors.primary : theme.colors.cardFill,
                        borderColor: active ? theme.colors.primary : theme.colors.cardBorder,
                      },
                    ]}>
                    <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '700' }]}>
                      {f.label}
                    </Text>
                    <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.textSecondary, opacity: 0.8 }]}>
                      {f.count}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: theme.spacing.sm }} />
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? <EmptyState title="No Records" message="Generate today's record to get started." /> : undefined
        }
        renderItem={({ item }) => (
          <DailySaleRecordCard
            record={item}
            isGenerating={generatingDate === item.businessDate}
            onGenerate={() => handleGenerate(item.businessDate)}
            onOpenManualFeed={() => openManualFeed(item.businessDate)}
            onVerify={() => item.id && handleVerify(item.id)}
            isVerifying={verify.isPending}
          />
        )}
        ListFooterComponent={
          filteredRecords.length > 0 ? (
            <View>
              <Card style={[styles.aggregateCard, { marginTop: theme.spacing.sm }]}>
                <View style={styles.aggregateItem}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Total sale</Text>
                  <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 2 }]}>
                    {formatCurrency(aggregates.totalSale)}
                  </Text>
                </View>
                <View style={styles.aggregateItem}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Company share</Text>
                  <Text style={[theme.typography.cardTitle, { color: theme.colors.danger, marginTop: 2 }]}>
                    {formatCurrency(aggregates.companyShare)}
                  </Text>
                </View>
                <View style={[styles.aggregateItem, { marginTop: theme.spacing.sm }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Cash on table</Text>
                  <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 2 }]}>
                    {formatCurrency(aggregates.cashOnTable)}
                  </Text>
                </View>
                <View style={[styles.aggregateItem, { marginTop: theme.spacing.sm }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Discount</Text>
                  <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 2 }]}>
                    {formatCurrency(aggregates.discount)}
                  </Text>
                </View>
              </Card>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.md }]}>
                {filteredRecords.length} record{filteredRecords.length === 1 ? '' : 's'}
              </Text>
            </View>
          ) : undefined
        }
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

      <FormBottomSheet
        ref={manualFeedSheetRef}
        title="Manual Feed"
        subtitle={manualFeedDate ? formatDisplayDate(manualFeedDate) : undefined}
        onRequestClose={() => manualFeedSheetRef.current?.dismiss()}
        onDismiss={() => setManualFeedDate(null)}>
        {manualFeedDate ? <ManualFeedSheetContent businessDate={manualFeedDate} onClose={() => manualFeedSheetRef.current?.dismiss()} /> : null}
      </FormBottomSheet>
    </Screen>
  );
}
