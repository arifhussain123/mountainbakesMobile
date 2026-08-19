import React, { useCallback, useMemo } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';

import {
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBSkeletonList,
  MBSyncStatus,
} from '@/components';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { getLedger } from '@/services/api/financeApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import type { LedgerEntry } from '@/shared/types/finance.types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency, toNumber } from '@/utils/money';

/**
 * The daily cash book.
 *
 * This is the ONLY paginated endpoint in the API, so it is also the only screen
 * that pages — `limit`/`offset`, server-capped at 500 per page.
 *
 * Entries arrive ordered by `seq`, the global posting order, and are rendered in
 * exactly that order. `balance` is the running book balance at the moment of
 * posting, so sorting by date instead would display balances that never existed.
 * Nothing here re-sorts.
 */

const PAGE_SIZE = 50;

export function LedgerScreen(): React.ReactElement {
  const theme = useTheme();
  const { currencySymbol } = useCatalogSettings();

  const ledger = useInfiniteQuery({
    queryKey: ['finance', 'ledger'],
    queryFn: ({ pageParam }) => getLedger({ limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, page) => n + page.entries.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    staleTime: LIVE_STALE_TIME_MS,
  });

  // Flattened in page order — never sorted. See the note above.
  const entries = useMemo(
    () => (ledger.data?.pages ?? []).flatMap(page => page.entries),
    [ledger.data],
  );

  const firstPage = ledger.data?.pages[0];

  const renderItem = useCallback(
    ({ item }: { item: LedgerEntry }) => (
      <EntryRow entry={item} currencySymbol={currencySymbol} />
    ),
    [currencySymbol],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Daily ledger"
        subtitle={firstPage ? `${firstPage.total} entries` : undefined}
        right={<MBSyncStatus />}
      />

      {firstPage ? (
        <View style={{ paddingHorizontal: theme.layout.screenPad, paddingTop: theme.space.md }}>
          <MBCard>
            <SummaryRow
              label="Opening balance"
              value={formatCurrency(firstPage.openingBalance, currencySymbol)}
            />
            <SummaryRow
              label="Total in"
              value={formatCurrency(firstPage.totalDebit, currencySymbol)}
            />
            <SummaryRow
              label="Total out"
              value={formatCurrency(firstPage.totalCredit, currencySymbol)}
            />
            <SummaryRow
              label="Closing balance"
              value={formatCurrency(firstPage.closingBalance, currencySymbol)}
              strong
            />
          </MBCard>
        </View>
      ) : null}

      {ledger.isPending ? (
        <MBSkeletonList rows={8} />
      ) : ledger.isError ? (
        <MBErrorState
          error={ledger.error}
          onRetry={() => ledger.refetch()}
          retrying={ledger.isFetching}
        />
      ) : entries.length === 0 ? (
        <MBEmptyState title="No ledger entries" message="Nothing has been posted yet." />
      ) : (
        <FlashList
          data={entries}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={ListSeparator}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (ledger.hasNextPage && !ledger.isFetchingNextPage) ledger.fetchNextPage();
          }}
          ListFooterComponent={
            ledger.isFetchingNextPage ? (
              <Text
                style={[
                  theme.type.caption,
                  styles.footer,
                  { color: theme.colors.textMuted },
                ]}>
                Loading more…
              </Text>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={ledger.isRefetching}
              onRefresh={() => ledger.refetch()}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

function EntryRow({
  entry,
  currencySymbol,
}: {
  entry: LedgerEntry;
  currencySymbol?: string;
}): React.ReactElement {
  const theme = useTheme();
  const isMoneyIn = toNumber(entry.debit) > 0;
  const amount = isMoneyIn ? toNumber(entry.debit) : toNumber(entry.credit);
  const reversed = entry.reversedByEntryId !== null || entry.status === 'reversed';

  return (
    <MBCard
      accessibilityLabel={`${entry.ledgerHeadName}, ${isMoneyIn ? 'in' : 'out'} ${formatCurrency(amount, currencySymbol)}`}>
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <Text numberOfLines={1} style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
            {entry.ledgerHeadName}
          </Text>
          <Text numberOfLines={1} style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            {entry.description}
          </Text>
        </View>

        <View style={styles.amounts}>
          {/* Cash-book convention: a debit is money IN. Signed with a glyph as
              well as colour so direction survives a monochrome reading. */}
          <Text
            style={[
              theme.type.money,
              { color: isMoneyIn ? theme.colors.success : theme.colors.danger },
            ]}>
            {isMoneyIn ? '+' : '−'}
            {formatCurrency(amount, currencySymbol)}
          </Text>
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            bal {formatCurrency(entry.balance, currencySymbol)}
          </Text>
        </View>
      </View>

      <View style={styles.meta}>
        <Text style={[theme.type.mono, { color: theme.colors.textMuted }]}>{entry.voucherNo}</Text>
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          {entry.entryDate} · {entry.account}
          {entry.branchName ? ` · ${entry.branchName}` : ''}
        </Text>
      </View>

      {reversed ? (
        <Text style={[theme.type.caption, { color: theme.colors.warning }]}>
          Reversed — cancelled by a later voucher
        </Text>
      ) : null}
    </MBCard>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={styles.summaryRow}>
      <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text
        style={[strong ? theme.type.money : theme.type.mono, { color: theme.colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

/** Module scope: a separator defined during render remounts the list each pass. */
function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingVertical: 16 },
  separator: { height: 8 },
  row: { flexDirection: 'row', gap: 12 },
  rowMain: { flex: 1, gap: 2 },
  amounts: { alignItems: 'flex-end', gap: 2 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 3 },
  footer: { textAlign: 'center', padding: 16 },
});
