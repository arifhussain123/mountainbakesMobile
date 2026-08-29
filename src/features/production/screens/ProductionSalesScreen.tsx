import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';

import {
  MBEmptyState,
  MBErrorState,
  MBFab,
  MBFilterChips,
  MBHeader,
  MBModal,
  MBPressable,
  MBSaleItem,
  MBSearchBar,
  MBSkeletonList,
  MBSyncStatus,
  MBWriteOutcome,
} from '@/common/ui';
import type { WriteOutcomeCopy } from '@/common/ui';
import {
  SalePayment,
  SaleProductList,
  SaleReceipt,
  SaleSummaryBar,
  type SaleSlip,
} from '@/common/till';
import { useCatalogSettings } from '@/common/hooks/useCatalogSettings';
import { useProducts } from '@/api/hooks/useCatalogApi';
import { getProductionSales, getProductionStock } from '@/api/services/productionService';
import { LIVE_STALE_TIME_MS } from '@/api/queryClient';
import { qk } from '@/api/queryKeys';
import { PRODUCTION_SALE_PAYMENT_METHOD_VALUES } from '@/shared/schemas/order.schemas';
import type { Order } from '@/shared/types/order.types';
import { businessDateStr, businessDayBounds } from '@/shared/utils/timezone';
import { useNetworkStore } from '@/state/networkStore';
import { useTheme } from '@/common/theme/ThemeProvider';
import { contentColumn, space } from '@/common/theme/spacing';
import { shiftBusinessDate } from '@/common/helpers/businessDay';
import { dataAsOfFrom } from '@/common/helpers/dataAsOf';
import { formatCurrency, round2, toNumber } from '@/common/utils/money';
import { useCounterSale, type CounterSaleResult } from '../hooks';

/**
 * The production counter's own till.
 *
 * ---------------------------------------------------------------------------
 * A different endpoint from the branch POS, not a variant of it
 * ---------------------------------------------------------------------------
 * `POST /api/orders/production-sale` — singular, mounted under `/api/orders`.
 * The branch POS is `POST /api/orders/pos` and is `requireRole('super_admin',
 * ...BRANCH_ROLES)`: a production account is refused it outright, so this is not
 * `SalesScreen` with a fifth chip. Three things differ, and all three are the
 * server's:
 *
 *   - **No branch.** The schema accepts `branchId` and the handler ignores it;
 *     these orders are pinned to the Production sentinel branch because
 *     `orders.branch_id` is NOT NULL. Nothing here sends one.
 *   - **`staff` is a payment method**, and it takes no money — exempt from
 *     payment, excluded from every revenue total. The schema therefore requires
 *     a comment, because that note is the only record of who took what and why.
 *   - **No low-stock alert on the way out.** This sale moves the central pool,
 *     not a branch's shelf, and "create a Production Order" is a branch's
 *     remedy. The pool has its own visibility on Production Stock.
 *
 * ---------------------------------------------------------------------------
 * This write does NOT queue, and that is the whole design of the screen
 * ---------------------------------------------------------------------------
 * Every other transaction in this app is offline-first. This one cannot be, and
 * not because it was skipped — the endpoint is missing both halves of what makes
 * a queued write safe:
 *
 *   - **No `idempotent()` middleware.** The five offline-capable writes carry it
 *     (server migration 84); this route does not. Re-sending after a timeout
 *     would not replay an answer, it would ring up a second sale.
 *   - **No `businessDate` field.** `CreateProductionSaleSchema` has none, and
 *     Zod strips what it does not declare — so a date sent by a queued row would
 *     vanish silently and the handler would stamp `businessDateStr()` at the
 *     moment it drained. A sale made at 21:00 and synced at 07:00 would land on
 *     the wrong business day with nothing appearing to fail, which is precisely
 *     the failure `services/sync/endpoints.ts` names.
 *
 * So it goes straight out and fails loudly, the way the returns review does.
 * What that costs is stated *before* the cart exists rather than at checkout:
 * the FAB is disabled with no connection, and the offline strip carries a
 * corrected sentence — the default one promises the sale is saved here, and on
 * this screen that would be a lie of exactly the kind that gets a sale rung up
 * twice.
 *
 * Making it offline-capable is a server change first: `idempotent('sale.create')`
 * on the route and `businessDate: optionalBusinessDate` on the schema, matching
 * `/api/orders/pos`. Then this screen becomes `writeOffline({entity: 'sale'})`
 * against a new endpoint entry, and nothing else here has to move.
 */

/**
 * The list's ranges.
 *
 * Three, not five. `GET /api/orders/production-sales` bounds `created_at` and
 * paginates nothing, so a wide range is the whole table over the wire — and the
 * question this list answers is "what has this counter taken", which is asked
 * about a shift, not a quarter.
 */
const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: '7 days' },
] as const;

type RangeKey = (typeof RANGES)[number]['key'];

/**
 * A range chip → the ISO instants the endpoint takes.
 *
 * Business-day bounds, never a bare `YYYY-MM-DD`: the day rolls at 02:00
 * Asia/Karachi and `created_at` is compared as an instant, so a bare date would
 * cut two hours off each end and drop a 01:00 sale out of the night it was made.
 */
export function productionSalesRange(
  key: RangeKey,
  now: Date = new Date(),
): { from: string; to: string } {
  const today = businessDateStr(now);
  switch (key) {
    case 'today':
      return bounds(today, today);
    case 'yesterday': {
      const day = shiftBusinessDate(today, -1);
      return bounds(day, day);
    }
    case 'last7':
      // Inclusive of today, so six days back — "7 days" counts today as one.
      return bounds(shiftBusinessDate(today, -6), today);
  }
}

function bounds(fromDate: string, toDate: string): { from: string; to: string } {
  return {
    from: businessDayBounds(fromDate).fromISO,
    to: businessDayBounds(toDate).toISO,
  };
}

export function ProductionSalesScreen(): React.ReactElement {
  const theme = useTheme();
  const settings = useCatalogSettings();

  const [range, setRange] = useState<RangeKey>('today');
  const [selling, setSelling] = useState(false);
  const [slip, setSlip] = useState<SaleSlip | null>(null);
  const [banner, setBanner] = useState<WriteOutcomeCopy | null>(null);

  const isOnline = useNetworkStore(s => s.isOnline);

  const filters = useMemo(() => productionSalesRange(range), [range]);

  const sales = useQuery({
    queryKey: qk.production.sales(filters),
    queryFn: () => getProductionSales(filters),
    staleTime: LIVE_STALE_TIME_MS,
  });

  const rows = useMemo(() => sales.data ?? [], [sales.data]);

  /**
   * A sum of what is on screen, and the subtitle says "shown" for that reason.
   *
   * It is not the counter's revenue: a `staff` sale takes no money and is
   * excluded from every server-side total, so this figure and the one on a
   * report legitimately differ. `toNumber` rather than `Number` because
   * `grandTotal` is `numeric(14,2)` and arrives as a JSON string — `Number` on a
   * malformed one poisons the whole sum into NaN.
   */
  const shownTotal = useMemo(
    () => round2(rows.reduce((sum, order) => sum + toNumber(order.grandTotal), 0)),
    [rows],
  );

  const staffCount = useMemo(
    () => rows.filter(order => order.paymentMethod === 'staff').length,
    [rows],
  );

  /**
   * What the counter is told, and where.
   *
   * The banner lands on THIS list rather than inside the till, because the sale
   * is now a row on it — and unlike the branch's POS there is no register to
   * navigate to. One outcome only: this write does not queue, so it either
   * happened or it failed loudly inside the till with the cart still intact.
   */
  const reportSale = useCallback(
    (orderNumber: string, grandTotal: number) => {
      setBanner({
        tone: 'ok',
        title: `Sale ${orderNumber} completed.`,
        detail: `${formatCurrency(grandTotal, settings.currencySymbol)} taken. The units are out of the production pool.`,
      });
    },
    [settings.currencySymbol],
  );

  const renderItem = useCallback(
    ({ item }: { item: Order }) => (
      <MBSaleItem order={item} currencySymbol={settings.currencySymbol} />
    ),
    [settings.currencySymbol],
  );

  const emptyStateShowing = !sales.isPending && !sales.isError && rows.length === 0;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Counter sales"
        dataAsOf={dataAsOfFrom(sales.dataUpdatedAt)}
        /* The default strip says transactions are saved here and sync on their
           own. On this screen they are not — see the header comment. */
        offlineNote="Offline — a counter sale needs a connection and cannot be saved here"
        subtitle={
          sales.data
            ? `${rows.length} ${rows.length === 1 ? 'sale' : 'sales'} · ${formatCurrency(
                shownTotal,
                settings.currencySymbol,
              )} shown${staffCount > 0 ? ` · ${staffCount} to staff` : ''}`
            : undefined
        }
        right={<MBSyncStatus />}
      />

      {banner ? (
        // Tapping dismisses. The role and hint are what make that reachable to
        // a screen reader; the label stays unset because the banner text is the
        // announcement and a label here would replace it.
        <MBPressable
          onPress={() => setBanner(null)}
          accessibilityRole="button"
          accessibilityHint="Dismisses this message"
          feedback="opacity">
          <View style={{ marginHorizontal: theme.layout.screenPad }}>
            <MBWriteOutcome copy={banner} testID="sale-outcome" />
          </View>
        </MBPressable>
      ) : null}

      <MBFilterChips
        options={RANGES.map(r => ({ key: r.key, label: r.label }))}
        selectedKey={range}
        onSelect={key => setRange(key as RangeKey)}
        testIDPrefix="counter-sales-range"
      />

      {sales.isPending ? (
        <MBSkeletonList rows={6} />
      ) : sales.isError ? (
        <MBErrorState
          error={sales.error}
          onRetry={() => sales.refetch()}
          retrying={sales.isFetching}
        />
      ) : rows.length === 0 ? (
        <MBEmptyState
          title="No counter sales yet"
          message={
            range === 'today'
              ? 'Sales rung up at the counter today will appear here.'
              : 'Nothing was sold at the counter in this range.'
          }
          actionLabel={isOnline && range === 'today' ? 'New sale' : undefined}
          onAction={isOnline && range === 'today' ? () => setSelling(true) : undefined}
          icon="sales"
        />
      ) : (
        <FlashList
          data={rows}
          renderItem={renderItem}
          keyExtractor={keyOf}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={ListSeparator}
          refreshControl={
            <RefreshControl
              refreshing={sales.isFetching && !sales.isPending}
              onRefresh={() => sales.refetch()}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}

      {/*
        One control on screen at a time, the same rule Expenses follows: the
        empty state carries the instruction while there is nothing to scroll,
        and the FAB takes over once there is.

        Disabled rather than hidden with no connection. Hiding it would leave an
        operator hunting for a button that was there five minutes ago; disabling
        it says the counter is closed until the signal returns, which is the
        true state of affairs — this sale cannot be queued.
      */}
      {!emptyStateShowing ? (
        <MBFab
          label={isOnline ? 'New sale' : 'New sale — needs a connection'}
          testID="new-counter-sale"
          onPress={() => (isOnline ? setSelling(true) : undefined)}
          disabled={!isOnline}
        />
      ) : null}

      {/*
        Two modals, never both open. RN's `Modal` nested inside another `Modal`
        is unreliable on Android — the inner one can simply fail to appear —
        which is why the till itself confirms in place rather than opening a
        second one, and why the slip is a SIBLING here: the till closes and the
        slip opens in the same batch, so only one is ever mounted.
      */}
      <MBModal visible={selling} onRequestClose={() => setSelling(false)}>
        <CounterSale
          onCancel={() => setSelling(false)}
          onSold={(result, mode) => {
            setSelling(false);
            reportSale(result.orderNumber, result.grandTotal);
            if (mode === 'share') setSlip(result.slip);
          }}
        />
      </MBModal>

      <MBModal visible={slip !== null} onRequestClose={() => setSlip(null)} testID="counter-slip">
        {slip ? (
          <SaleReceipt sale={slip} branchName="Production counter" onDone={() => setSlip(null)} />
        ) : null}
      </MBModal>
    </View>
  );
}

/** Module scope: rebuilt every render, FlashList remounts its rows. */
function keyOf(item: Order): string {
  return item.id;
}

function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

/**
 * The counter's till, in the same two stages as the branch's.
 *
 * ---------------------------------------------------------------------------
 * Two stages inside ONE modal
 * ---------------------------------------------------------------------------
 * Not two modals: RN's `Modal` nested inside another `Modal` is unreliable on
 * Android — the inner one can simply fail to appear — which is why the expense
 * form confirms in place as well. The cart survives the swap, so Back from
 * payment returns to a full basket rather than an empty one.
 *
 * Everything drawn here comes from `common/till/`, and everything decided here
 * comes from `useCounterSale`. What is left in this file is the wiring and the
 * three sentences that are the counter's own: the pool rather than a shelf, the
 * staff explanation, and the offline note.
 */
function CounterSale({
  onCancel,
  onSold,
}: {
  onCancel: () => void;
  onSold: (result: CounterSaleResult, mode: 'save' | 'share') => void;
}): React.ReactElement {
  const theme = useTheme();
  const form = useCounterSale();
  const { cart } = form;

  const products = useProducts({ search: form.search || undefined, isActive: true });

  /**
   * The **central pool**, not a branch shelf.
   *
   * `GET /api/production-stock`, the same read Production Stock shows. Advisory
   * and never a gate: the server is the only authority and refuses an overdraw
   * with a 409, and blocking here would stop an operator selling something
   * physically in front of them because a balance is a minute stale. What the
   * row buys instead is that the refusal is foreseeable at the counter — it says
   * what is left and how many are already rung up.
   */
  const pool = useQuery({
    queryKey: qk.production.stock(),
    queryFn: () => getProductionStock(),
    staleTime: LIVE_STALE_TIME_MS,
  });

  const availability = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of pool.data?.rows ?? []) map.set(row.productId, toNumber(row.balance));
    return map;
  }, [pool.data]);

  const inCart = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cart.lines) map.set(line.productId, line.qty);
    return map;
  }, [cart.lines]);

  const onSave = useCallback(async () => {
    const result = await form.save();
    if (result) onSold(result, 'save');
  }, [form, onSold]);

  const onSaveAndShare = useCallback(async () => {
    const result = await form.saveAndShare();
    if (result) onSold(result, 'share');
  }, [form, onSold]);

  const items = form.stage === 'items';
  const symbol = form.currencySymbol;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title={items ? 'New counter sale' : 'Payment'}
        {...(items
          ? {}
          : { subtitle: `${cart.itemCount} ${cart.itemCount === 1 ? 'item' : 'items'}` })}
        /* Back is one step, not one screen: from payment it returns to the items
           stage with the cart intact, and only from items does it leave the
           till. */
        onBack={items ? onCancel : form.toItems}
        offlineNote="Offline — a counter sale needs a connection and cannot be saved here"
      />

      {items ? (
        <>
          <View
            style={{
              paddingHorizontal: theme.layout.screenPad,
              paddingTop: theme.layout.screenPad,
            }}>
            <MBSearchBar
              value={form.searchInput}
              onChangeText={form.setSearchInput}
              /* Name or code. The server matches both, and so does the offline
                 mirror, so a code read off a tray finds the product either way. */
              placeholder="Search name or code"
              searching={form.searchInput.trim() !== form.search}
              testID="counter-product-search"
            />
          </View>

          <View style={styles.flex}>
            <SaleProductList
              products={products.data ?? []}
              availability={availability}
              inCart={inCart}
              /* The counter sells off the central pool, not a shelf. Only the
                 healthy level names it — "Out of stock" and "3 left" read the
                 same either way, and "Out of pool" reads as nothing at all. */
              availabilityNoun="pool"
              lines={cart.lines}
              {...(symbol ? { currencySymbol: symbol } : {})}
              onAdd={cart.addProduct}
              onQty={cart.setQty}
              onDiscountPct={cart.setDiscountPct}
              onRemove={cart.remove}
              isPending={products.isPending}
              isError={products.isError}
              error={products.error}
              isRefreshing={products.isFetching && !products.isPending}
              onRefresh={() => products.refetch()}
            />
          </View>

          <SaleSummaryBar
            itemCount={cart.itemCount}
            total={cart.totals.grandTotal}
            {...(symbol ? { currencySymbol: symbol } : {})}
            error={form.error}
            disabled={cart.isEmpty}
            onCharge={form.toPayment}
          />
        </>
      ) : (
        <>
          <View style={styles.flex}>
            <SalePayment
              lines={cart.lines}
              totals={cart.totals}
              {...(symbol ? { currencySymbol: symbol } : {})}
              /* Five methods here against the branch's four. `staff` is the
                 counter's own and takes no money;
                 `PRODUCTION_SALE_PAYMENT_METHOD_VALUES` is what keeps it out of
                 the branch list without a second check anywhere. */
              methods={PRODUCTION_SALE_PAYMENT_METHOD_VALUES}
              paymentMethod={form.paymentMethod}
              onPaymentMethod={form.setPaymentMethod}
              {...(form.isStaff
                ? {
                    methodNote:
                      'No money is taken. The sale is excluded from every revenue total, so the comment below is the only record of it — it is required.',
                  }
                : {})}
              {...(form.isCash
                ? {
                    cash: {
                      value: form.receivedText,
                      onChangeText: form.setReceivedText,
                      onAddNote: form.addCash,
                      onExact: form.setExact,
                      returned: form.returned,
                      stillDue: form.stillDue,
                      ...(symbol ? { currencySymbol: symbol } : {}),
                      disabled: form.busy !== null,
                    },
                  }
                : {})}
              customerName={form.customerName}
              onCustomerName={form.setCustomerName}
              customerPhone={form.customerPhone}
              onCustomerPhone={form.setCustomerPhone}
              notes={form.notes}
              onNotes={form.setNotes}
              notesLabel={form.isStaff ? 'Comment (required)' : 'Notes'}
              {...(form.staffNeedsNote && form.error
                ? { notesError: 'A comment is required for a staff sale' }
                : {})}
              disabled={form.busy !== null}
              testIDPrefix="counter-payment"
            />
          </View>

          <SaleSummaryBar
            itemCount={cart.itemCount}
            total={cart.totals.grandTotal}
            {...(symbol ? { currencySymbol: symbol } : {})}
            error={form.error}
            disabled={!form.canFinish}
            busy={form.busy}
            onSave={onSave}
            onSaveAndShare={onSaveAndShare}
            /* A staff sale is not *paid for*, it is recorded — so the verb
               changes with the method rather than promising money changed
               hands. */
            saveLabel={form.isStaff ? 'Record staff sale' : 'Record sale'}
            shareLabel={form.isStaff ? 'Record & share' : 'Record & share'}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // ...contentColumn caps the measure on a tablet: a row is a label at one edge
  // and a value at the other, and unconstrained on a 10" screen the two end up a
  // hand-span apart with nothing between them.
  listContent: { ...contentColumn, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  separator: { height: space.sm },
});
