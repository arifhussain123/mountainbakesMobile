import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import {
  getBusinessDate,
  queryKeys,
  useBranches,
  useFinanceSettings,
  useLedgerHeads,
  useLedgerPages,
  type LedgerQuery,
} from '@/api';
import { navigateToRecord } from '@/navigation/helpers';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, DateRangeSheet, EmptyState, LoadingSkeleton, Screen, SecondaryButton, type DropdownOption } from '@/shared/ui';
import type { DateRange } from '@/shared/utils';
import { ALL, defaultLedgerFilters, LedgerFilters, type LedgerFilterState } from './LedgerFilters';
import {
  LedgerCard,
  LedgerSummaryTiles,
  LedgerTotals,
  OpeningBalanceRow,
  PendingApprovalsPanel,
  PendingCashTransfersPanel,
  ReadOnlyBanner,
} from './LedgerPanels';
import { parseAmount, toDisplayEntries, type DisplayEntry } from './ledgerDisplay';
import { useLedgerSheet } from './ledgerSheets';
import { canDecideCashTransfers, OPEN_CASH_TRANSFERS_TARGET, PENDING_REVIEW_TARGET, type LedgerLinkTarget } from '../../utils/ledgerActions';
import { useAdminHeaderActions } from '../../components/useAdminHeaderActions';

const PAGE_SIZE = 20;

/** Opens one of the finance screens mounted in the Super Admin drawer. */
const openLedgerLink = (target: LedgerLinkTarget) => navigateToRecord(target.stack, target.screen ? { screen: target.screen } : {});

/**
 * Web "/finance-ledger" — the Daily Ledger (cash book) as Super Admin reads
 * it. Every posted voucher in posting order (never re-sorted: the running
 * balance only means anything in that order), server-side filters and paging,
 * opening balance and totals from the server over the whole filtered set.
 *
 * The web page's only write actions are the pending cash transfers' Approve /
 * Reject (`PUT /finance/cash-transfers/:id/approve|reject`), offered only when
 * Finance Settings "Allow Super Admin to modify" is on — the server's
 * `requireFinance('approve')` refuses super_admin otherwise. Row Edit / Delete
 * are switched off on the web for every role, and PDF / Excel export stays on
 * the web. The panels' "Open Cash Transfers" and per-row "Review" links open
 * the Finance screens mounted in this shell (`ledgerActions.ts` targets), as
 * the web's links open /finance-cash-transfers, -entries, -partner-transactions
 * and -payroll.
 */
export function AdminDailyLedgerScreen() {
  const headerActions = useAdminHeaderActions();
  const theme = useAppTheme();
  const today = useMemo(() => getBusinessDate(), []);
  const [filters, setFilters] = useState<LedgerFilterState>(() => defaultLedgerFilters(today));
  const dateSheetRef = useRef<BottomSheetModal>(null);
  const search = useDebouncedValue(filters.search.trim());

  const settingsQ = useFinanceSettings();
  const branchesQ = useBranches();
  const headsQ = useLedgerHeads({ includeInactive: true });

  const branchOptions = useMemo<DropdownOption<string>[]>(
    () => [{ value: ALL, label: 'All branches' }, ...(branchesQ.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name }))],
    [branchesQ.data],
  );
  const headOptions = useMemo<DropdownOption<string>[]>(
    () => [{ value: ALL, label: 'All ledger heads' }, ...(headsQ.data ?? []).map((h) => ({ value: h.id, label: h.name, hint: h.code }))],
    [headsQ.data],
  );

  const query = useMemo<Omit<LedgerQuery, 'limit' | 'offset'>>(
    () => ({
      from: filters.range.from,
      to: filters.range.to,
      branchId: filters.branchId === ALL ? undefined : filters.branchId,
      ledgerHeadId: filters.ledgerHeadId === ALL ? undefined : filters.ledgerHeadId,
      type: filters.type === ALL ? undefined : filters.type,
      account: filters.account === ALL ? undefined : filters.account,
      status: filters.status === ALL ? undefined : filters.status,
      search: search || undefined,
      minAmount: parseAmount(filters.minAmount),
      maxAmount: parseAmount(filters.maxAmount),
    }),
    [filters, search],
  );

  const ledgerQ = useLedgerPages(query, PAGE_SIZE);
  const firstPage = ledgerQ.data?.pages[0];
  const entries = useMemo(() => toDisplayEntries((ledgerQ.data?.pages ?? []).flatMap((p) => p.entries)), [ledgerQ.data]);

  const defaults = useMemo(() => defaultLedgerFilters(today), [today]);
  const dirty = JSON.stringify(filters) !== JSON.stringify(defaults);

  const applyRange = (r: DateRange) => {
    // No future dates, like the web's maxDate; keep from ≤ to.
    const to = r.to > today ? today : r.to;
    const from = r.from > to ? to : r.from;
    setFilters((f) => ({ ...f, range: { from, to } }));
  };

  const { refetch: refetchLedger, fetchNextPage, hasNextPage, isFetchingNextPage } = ledgerQ;
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const queryClient = useQueryClient();
  const onRefresh = () => {
    void refetchLedger();
    void settingsQ.refetch();
    // The panels and summary own their queries; refresh them with the list.
    void queryClient.invalidateQueries({ queryKey: queryKeys.pendingApprovals() });
    void queryClient.invalidateQueries({ queryKey: ['financeCashTransfers'] });
    void queryClient.invalidateQueries({ queryKey: ['ledgerSummary'] });
  };

  const showReadOnly = !!settingsQ.data && !settingsQ.data.allowSuperAdminWrite;
  const canDecide = canDecideCashTransfers(settingsQ.data);
  const decision = useLedgerSheet();
  const ledgerError = ledgerQ.error && !ledgerQ.data;

  return (
    <Screen>
      <AppHeader title="Daily Ledger" subtitle={canDecide ? 'Finance' : 'Finance · read-only'} actions={headerActions} />
      <FlatList<DisplayEntry>
        data={ledgerQ.isLoading || ledgerError ? [] : entries}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <LedgerCard entry={item} />}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 3, gap: 8 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: theme.spacing.sm }}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
              Every posted voucher, in posting order. Balances run down the page as a cash book does.
            </Text>
            {showReadOnly ? <ReadOnlyBanner /> : null}
            <PendingCashTransfersPanel
              canDecide={canDecide}
              onApprove={(transfer) => decision.open({ kind: 'approve', transfer })}
              onReject={(transfer) => decision.open({ kind: 'reject', transfer })}
              onOpenCashTransfers={() => openLedgerLink(OPEN_CASH_TRANSFERS_TARGET)}
            />
            <PendingApprovalsPanel onReview={(kind) => openLedgerLink(PENDING_REVIEW_TARGET[kind])} />
            <LedgerSummaryTiles date={filters.range.to} branchId={query.branchId} />
            <LedgerFilters
              value={filters}
              onChange={setFilters}
              onOpenDates={() => dateSheetRef.current?.present()}
              onClearAll={() => setFilters(defaults)}
              branchOptions={branchOptions}
              headOptions={headOptions}
              headsLoading={headsQ.isLoading}
              dirty={dirty}
            />
            {ledgerError ? (
              <Card style={{ padding: 16, gap: 8 }}>
                <Text style={[theme.typography.cardTitle, { color: theme.colors.text, textAlign: 'center' }]}>Could not load the ledger</Text>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
                  {mapErrorToMessage(ledgerQ.error)}
                </Text>
                <SecondaryButton label="Retry" onPress={() => void refetchLedger()} />
              </Card>
            ) : (
              <>
                <OpeningBalanceRow value={firstPage?.openingBalance} />
                {ledgerQ.isLoading ? <LoadingSkeleton height={160} /> : null}
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          !ledgerQ.isLoading && !ledgerError ? (
            <EmptyState icon="ledger" title="No vouchers for this selection" message="Approved income and expenses post here automatically." />
          ) : undefined
        }
        ListFooterComponent={
          ledgerError || ledgerQ.isLoading ? undefined : (
            <View style={{ gap: 8 }}>
              {isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: theme.spacing.md }} color={theme.colors.primary} /> : null}
              <LedgerTotals page={firstPage} />
            </View>
          )
        }
        onEndReachedThreshold={0.5}
        onEndReached={onEndReached}
        refreshing={ledgerQ.isRefetching && !isFetchingNextPage}
        onRefresh={onRefresh}
      />
      <DateRangeSheet
        ref={dateSheetRef}
        today={today}
        value={filters.range}
        onApply={applyRange}
        onRequestClose={() => dateSheetRef.current?.dismiss()}
      />
      {decision.element}
    </Screen>
  );
}
