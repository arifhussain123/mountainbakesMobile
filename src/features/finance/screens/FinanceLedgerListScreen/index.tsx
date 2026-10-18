import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useLedgerPage } from '@/api';
import { useTabBarHeight } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, FormBottomSheet, LoadingSkeleton, Screen, StatCard } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { LedgerEntryRow } from '../../components';
import { getFinanceDateRange, type FinanceDateRangePreset } from '../../utils/dateRange';
import { FinanceDateRangeFilter } from '../../components/FinanceDateRangeFilter';
import { LedgerEntryDetailSheet } from './LedgerEntryDetailSheet';
import { styles } from './styles';
import type { LedgerEntry } from '@/api';

/**
 * mountainbakesFinance.html screen 02 — Daily Ledger. Strictly read-only here:
 * the three `adjust`-gated correction actions (reverse, edit, delete) are
 * `finance_admin`-only and are deferred to their own pass per
 * docs/mobile-finance-plan.md's build order — this slice is view-only reads.
 */
export function FinanceLedgerListScreen() {
  const theme = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const [preset, setPreset] = useState<FinanceDateRangePreset>('today');
  const [selected, setSelected] = useState<LedgerEntry | null>(null);
  const sheetRef = useRef<BottomSheetModal>(null);

  const range = useMemo(() => getFinanceDateRange(preset), [preset]);
  const { data, isLoading, error, refetch, isRefetching } = useLedgerPage({ from: range.from, to: range.to });

  const openEntry = (entry: LedgerEntry) => {
    setSelected(entry);
    sheetRef.current?.present();
  };

  return (
    <Screen>
      <AppHeader title="Daily Ledger" subtitle="The cash book" actions={[]} />
      <FlatList
        data={data?.entries ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.lg + tabBarHeight }}
        ListHeaderComponent={
          <View>
            <FinanceDateRangeFilter value={preset} onChange={setPreset} />
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
            {data ? (
              <Card style={{ marginTop: theme.spacing.md }}>
                <View style={styles.statsRow}>
                  <StatCard label="Opening" value={formatCurrency(data.openingBalance)} />
                  <StatCard label="Closing" value={formatCurrency(data.closingBalance)} />
                </View>
                <View style={[styles.statsRow, { marginTop: theme.spacing.sm }]}>
                  <StatCard label="Total Debit" value={formatCurrency(data.totalDebit)} valueColor={theme.colors.danger} />
                  <StatCard label="Total Credit" value={formatCurrency(data.totalCredit)} valueColor={theme.colors.success} />
                </View>
              </Card>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? <EmptyState title="No Entries" message="No ledger entries were posted in this window." /> : undefined
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => openEntry(item)}>
            <LedgerEntryRow entry={item} />
          </Pressable>
        )}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

      <FormBottomSheet ref={sheetRef} title="Ledger Entry" onRequestClose={() => sheetRef.current?.dismiss()}>
        {selected ? <LedgerEntryDetailSheet entry={selected} /> : null}
      </FormBottomSheet>
    </Screen>
  );
}
