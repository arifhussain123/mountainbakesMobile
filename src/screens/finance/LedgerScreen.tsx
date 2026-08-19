import React, { useCallback, useMemo } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';

import {
  MBCard,
  MBEmptyState,
  MBMoney,
  MBErrorState,
  MBHeader,
  MBSkeletonList,
  MBSyncStatus,
} from '@/components';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { getLedger } from '@/services/api/financeApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import { qk } from '@/services/query/queryKeys';
import type { LedgerEntry } from '@/shared/types/finance.types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency, toNumber } from '@/utils/money';
import { dataAsOfFrom } from '@/utils/dataAsOf';
import { contentColumn, space } from '@/theme/spacing';

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
    queryKey: qk.finance.ledger(),
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
    ({ item }: { item: LedgerEntry }) => <EntryRow entry={item} currencySymbol={currencySymbol} />,
    [currencySymbol],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Daily ledger"
        dataAsOf={dataAsOfFrom(ledger.dataUpdatedAt)}
        subtitle={firstPage ? `${firstPage.total} entries` : undefined}
        right={<MBSyncStatus />}
      />

      {firstPage ? (
        <View
          style={{
            paddingHorizontal: theme.layout.screenPad,
            paddingTop: theme.space.md,
          }}>
          <MBCard>
            <SummaryRow
              label="Opening balance"
              value={<MBMoney value={firstPage.openingBalance} size="sm" symbol={currencySymbol} />}
            />
            <SummaryRow
              label="Total in"
              value={<MBMoney value={firstPage.totalDebit} size="sm" symbol={currencySymbol} />}
            />
            <SummaryRow
              label="Total out"
              value={<MBMoney value={firstPage.totalCredit} size="sm" symbol={currencySymbol} />}
            />
            <SummaryRow
              label="Closing balance"
              value={<MBMoney value={firstPage.closingBalance} symbol={currencySymbol} />}
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
        <MBEmptyState
          title="No ledger entries"
          message="Nothing has been posted yet."
          icon="ledger"
        />
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
              <Text style={[theme.type.caption, styles.footer, { color: theme.colors.textMuted }]}>
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

/**
 * Memoised. This list re-renders whenever the screen does — a filter chip, a
 * refetch, a keystroke — and with props that do not change, none of the visible
 * rows re-render with it. Theme changes still reach it: context bypasses `memo`.
 */
const EntryRow = React.memo(function EntryRowView({
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
      accessibilityLabel={`${entry.ledgerHeadName}, ${isMoneyIn ? 'in' : 'out'} ${formatCurrency(
        amount,
        currencySymbol,
      )}`}>
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
              well as colour so direction survives a monochrome reading, and
              spelled out again in the accessible name. */}
          <MBMoney
            value={amount}
            sign={isMoneyIn ? 'in' : 'out'}
            color={isMoneyIn ? theme.colors.success : theme.colors.danger}
            symbol={currencySymbol}
          />
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
});

/**
 * Ledger summary line. Kept local rather than folded into `MBDataRow` because
 * of `strong`: the closing balance is the figure a bookkeeper checks first and
 * is drawn a size up from the three that feed it.
 *
 * `value` takes a node so a currency amount arrives as `<MBMoney />` — that
 * component is the only thing in the app that renders money.
 */
function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={styles.summaryRow}>
      <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={[strong ? theme.type.money : theme.type.number, { color: theme.colors.text }]}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

/** Module scope: a separator defined during render remounts the list each pass. */
function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // ...contentColumn caps the measure on a tablet. A list row is a label at
  // one edge and a value at the other; unconstrained on a 10" screen the two
  // end up a hand-span apart with nothing between them.
  listContent: { ...contentColumn, paddingHorizontal: space.lg, paddingVertical: space.lg },
  separator: { height: 8 },
  row: { flexDirection: 'row', gap: space.md },
  rowMain: { flex: 1, gap: space.hair },
  amounts: { alignItems: 'flex-end', gap: space.hair },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
    marginTop: space.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.hair,
  },
  footer: { textAlign: 'center', padding: space.lg },
});
