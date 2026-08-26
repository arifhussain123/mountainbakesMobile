import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  MBButton,
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBFab,
  MBFilterChips,
  MBHeader,
  MBIcon,
  MBInput,
  MBModal,
  MBMoney,
  MBPressable,
  MBSaleItem,
  MBSearchBar,
  MBSelect,
  MBSkeletonList,
  MBSyncStatus,
  MBWriteOutcome,
} from '@/components';
import type { WriteOutcomeCopy } from '@/components';
import { useCart } from '@/hooks/useCart';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useProducts } from '@/hooks/useCatalog';
import {
  createProductionSale,
  getProductionSales,
  getProductionStock,
} from '@/services/api/productionApi';
import { ApiError } from '@/services/api/errors';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import { qk } from '@/services/query/queryKeys';
import { PRODUCTION_SALE_PAYMENT_METHOD_VALUES } from '@/shared/schemas/order.schemas';
import type { Order } from '@/shared/types/order.types';
import { businessDateStr, businessDayBounds } from '@/shared/utils/timezone';
import { stockLevel, type StockLevel } from '@/shared/utils/stock';
import type { Product } from '@/shared/types/product.types';
import { useNetworkStore } from '@/store/networkStore';
import { useTheme } from '@/theme/ThemeProvider';
import { contentColumn, layout, space } from '@/theme/spacing';
import { radius } from '@/theme/radius';
import { shiftBusinessDate } from '@/utils/businessDay';
import { dataAsOfFrom } from '@/utils/dataAsOf';
import { formatCurrency, formatQty, parseCurrency, round2, toNumber } from '@/utils/money';
import { cashReturned, lineGross, resolveDiscount } from '@/utils/saleTotals';

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
  const queryClient = useQueryClient();
  const settings = useCatalogSettings();

  const [range, setRange] = useState<RangeKey>('today');
  const [selling, setSelling] = useState(false);
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

  const sell = useMutation({
    mutationFn: createProductionSale,
    onSuccess: receipt => {
      setSelling(false);
      setBanner({
        tone: 'ok',
        title: `Sale ${receipt.orderNumber} completed.`,
        detail: `${formatCurrency(receipt.grandTotal, settings.currencySymbol)} taken. The units are out of the production pool.`,
      });
      // The sale is in the list and the pool has moved. Both are server truths
      // this device now has a stale copy of.
      queryClient.invalidateQueries({ queryKey: qk.production.all() });
    },
  });

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

      <MBModal visible={selling} onRequestClose={() => setSelling(false)}>
        <CounterSale
          currencySymbol={settings.currencySymbol}
          tax={settings.tax}
          isSaving={sell.isPending}
          error={sell.error}
          onCancel={() => {
            sell.reset();
            setSelling(false);
          }}
          onSell={input => sell.mutate(input)}
        />
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

/** Availability wording. A word as well as a colour — never colour alone. */
const AVAILABILITY_LABEL: Record<StockLevel, (qty: number) => string> = {
  out: () => 'Out of stock',
  critical: qty => `${formatQty(qty)} left`,
  moderate: qty => `${formatQty(qty)} left`,
  healthy: qty => `${formatQty(qty)} in pool`,
};

/**
 * The till itself, in two steps inside one modal.
 *
 * Two steps and not two modals: RN's `Modal` nested inside another `Modal` is
 * unreliable on Android — the inner one can simply fail to appear — which is why
 * the expense form confirms in place as well. The cart survives the swap, so
 * Back from the payment step returns to a full basket rather than an empty one.
 */
function CounterSale({
  currencySymbol,
  tax,
  isSaving,
  error,
  onCancel,
  onSell,
}: {
  currencySymbol?: string;
  tax: ReturnType<typeof useCatalogSettings>['tax'];
  isSaving: boolean;
  error: unknown;
  onCancel: () => void;
  onSell: (input: ProductionSaleRequest) => void;
}): React.ReactElement {
  const theme = useTheme();
  const cart = useCart(tax);

  const [step, setStep] = useState<'pick' | 'pay'>('pick');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 300);

  const products = useProducts({ search: search || undefined, isActive: true });

  /**
   * The **central pool**, not a branch shelf.
   *
   * `GET /api/production-stock`, the same read Production Stock shows. Advisory
   * and never a gate: the server is the only authority and refuses an overdraw
   * with a 409, and blocking here would stop an operator selling something
   * physically in front of them because a balance is a minute stale. What it
   * buys is that the refusal is foreseeable at the counter.
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

  // The setter, not the cart: depending on the object would make this callback
  // new after every tap, and with it every visible product row.
  const addProduct = cart.addProduct;
  const onAdd = useCallback((product: Product) => addProduct(product), [addProduct]);

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <CounterProductRow
        product={item}
        currencySymbol={currencySymbol}
        /* `undefined` is "not known" and must never draw as "out of stock" —
           that is a balance this device has simply never been told. */
        available={availability.get(item.id)}
        onAdd={onAdd}
      />
    ),
    [onAdd, currencySymbol, availability],
  );

  if (step === 'pay') {
    return (
      <CounterCheckout
        cart={cart}
        currencySymbol={currencySymbol}
        isSaving={isSaving}
        error={error}
        onBack={() => setStep('pick')}
        onSell={onSell}
      />
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="New counter sale"
        onBack={onCancel}
        offlineNote="Offline — a counter sale needs a connection and cannot be saved here"
      />

      <View
        style={{ paddingHorizontal: theme.layout.screenPad, paddingTop: theme.layout.screenPad }}>
        <MBSearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          /* Name or code. The server matches both, and so does the offline
             mirror, so a code read off a tray finds the product either way. */
          placeholder="Search name or code"
          searching={searchInput.trim() !== search}
          testID="counter-product-search"
        />
      </View>

      <View style={styles.flex}>
        {products.isPending ? (
          <MBSkeletonList rows={6} />
        ) : products.isError ? (
          <MBErrorState error={products.error} onRetry={() => products.refetch()} />
        ) : (products.data ?? []).length === 0 ? (
          <MBEmptyState title="No products match" message="Try a different name or code." />
        ) : (
          <FlashList
            data={products.data ?? []}
            renderItem={renderProduct}
            keyExtractor={productKeyOf}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={ListSeparator}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>

      {!cart.isEmpty ? (
        <View
          style={[
            styles.cartBar,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              padding: theme.layout.screenPad,
            },
          ]}>
          <View style={styles.cartSummary}>
            <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
              {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}
            </Text>
            {/* The server recomputes this with its own tax settings; this device
                is working from cached AppSettings. Marked as an estimate until
                the sale comes back confirmed. */}
            <MBMoney
              value={cart.totals.grandTotal}
              symbol={currencySymbol}
              estimate
              testID="counter-cart-total"
            />
          </View>
          <MBButton
            label="Review & pay"
            onPress={() => setStep('pay')}
            testID="counter-review-and-pay"
          />
        </View>
      ) : null}
    </View>
  );
}

function productKeyOf(item: Product): string {
  return item.id;
}

/**
 * One tappable product at the counter.
 *
 * Memoised at module scope rather than inline, because this list re-renders on
 * every keystroke and every tap. With stable props none of the visible rows
 * re-render at all; the theme still reaches them, because context bypasses
 * `memo`.
 */
const CounterProductRow = React.memo(function CounterProductRowView({
  product,
  currencySymbol,
  available,
  onAdd,
}: {
  product: Product;
  currencySymbol?: string;
  /** Pool balance, or `undefined` when the device has never been told. */
  available?: number;
  onAdd: (product: Product) => void;
}): React.ReactElement {
  const theme = useTheme();
  const press = useCallback(() => onAdd(product), [onAdd, product]);

  const level = available === undefined ? null : stockLevel(available);
  const availabilityColor: Record<StockLevel, string> = {
    out: theme.colors.danger,
    critical: theme.colors.danger,
    moderate: theme.colors.warning,
    healthy: theme.colors.textMuted,
  };

  return (
    <MBPressable
      onPress={press}
      accessibilityRole="button"
      /* One announcement: what it is, what it costs, what is left. */
      accessibilityLabel={`Add ${product.name}, ${formatCurrency(product.price, currencySymbol)}${
        level ? `, ${AVAILABILITY_LABEL[level](available ?? 0)}` : ''
      }`}>
      <MBCard>
        <View style={styles.productRow}>
          <View style={styles.productMain}>
            <Text numberOfLines={1} style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
              {product.name}
            </Text>
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              {product.sku}
            </Text>
          </View>

          <View style={styles.productPrice}>
            <MBMoney value={product.price} symbol={currencySymbol} />
            {/* Nothing at all when the balance is unknown — drawing "0" would
                stop an operator selling what is in front of them. */}
            {level ? (
              <Text style={[theme.type.caption, { color: availabilityColor[level] }]}>
                {AVAILABILITY_LABEL[level](available ?? 0)}
              </Text>
            ) : null}
          </View>
        </View>
      </MBCard>
    </MBPressable>
  );
});

/**
 * What the counter actually sends.
 *
 * `branchId` is deliberately absent, not optional-and-omitted: the schema
 * accepts one and the handler ignores it, so a field here would be a value that
 * looks authoritative and means nothing.
 */
export interface ProductionSaleRequest {
  customerName: string;
  customerPhone: string;
  items: { productId: string; qty: number; discount: number }[];
  paymentMethod: (typeof PRODUCTION_SALE_PAYMENT_METHOD_VALUES)[number];
  receivedCash?: number;
  notes: string;
}

/** How each payment method reads on a chip. `staff` needs the explanation. */
const METHOD_LABEL: Record<(typeof PRODUCTION_SALE_PAYMENT_METHOD_VALUES)[number], string> = {
  cash: 'cash',
  easypaisa: 'easypaisa',
  foodpanda: 'foodpanda',
  bank_account: 'bank account',
  staff: 'staff (unpaid)',
};

function CounterCheckout({
  cart,
  currencySymbol,
  isSaving,
  error,
  onBack,
  onSell,
}: {
  cart: ReturnType<typeof useCart>;
  currencySymbol?: string;
  isSaving: boolean;
  error: unknown;
  onBack: () => void;
  onSell: (input: ProductionSaleRequest) => void;
}): React.ReactElement {
  const theme = useTheme();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PRODUCTION_SALE_PAYMENT_METHOD_VALUES)[number]>('cash');
  const [receivedCashText, setReceivedCashText] = useState('');
  const [notes, setNotes] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const isStaff = paymentMethod === 'staff';
  const isCash = paymentMethod === 'cash';
  const receivedCash = parseCurrency(receivedCashText);
  const change = cashReturned(receivedCash, cart.totals.grandTotal);
  const shortOnCash = isCash && receivedCashText.trim() !== '' && change < 0;

  /**
   * A staff sale needs a comment, checked here as well as on the server.
   *
   * `CreateProductionSaleSchema.superRefine` refuses it and paths the issue at
   * `notes`, so the server would answer 400 with a field error. Checking first
   * means the operator sees it against the field instead of after a round trip,
   * and it is the same rule stated once in each place rather than two rules.
   */
  const staffNeedsNote = isStaff && notes.trim() === '';

  const apiError = error instanceof ApiError ? error : null;
  const submitError =
    localError ??
    (apiError
      ? apiError.kind === 'conflict'
        ? // The server's own words: they name the products that were short.
          `${apiError.message} Nothing was sold — re-check the pool and try again.`
        : apiError.userMessage
      : error instanceof Error
        ? error.message
        : null);

  const onConfirm = () => {
    setLocalError(null);
    if (shortOnCash) {
      setLocalError('The cash received does not cover the total.');
      return;
    }
    if (staffNeedsNote) {
      setLocalError('A staff sale needs a comment saying who took what and why.');
      return;
    }

    onSell({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      items: cart.toOrderItems(),
      paymentMethod,
      // Only meaningful for a cash sale that took money. A staff sale collects
      // nothing, and the handler guards against a stray figure landing on an
      // unpaid order — so it is not sent in the first place.
      ...(isCash && !isStaff && receivedCashText.trim() ? { receivedCash } : {}),
      notes: notes.trim(),
    });
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Review & pay"
        onBack={onBack}
        offlineNote="Offline — a counter sale needs a connection and cannot be saved here"
      />
      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.lg },
        ]}
        keyboardShouldPersistTaps="handled">
        {cart.lines.map(line => (
          <MBCard key={line.productId}>
            <View style={styles.productRow}>
              <Text style={[theme.type.bodyStrong, styles.flex, { color: theme.colors.text }]}>
                {line.productName}
              </Text>
              <MBMoney
                value={line.unitPrice}
                size="sm"
                color={theme.colors.textMuted}
                symbol={currencySymbol}
              />
            </View>

            <View style={styles.lineControls}>
              <View style={styles.stepper}>
                <MBPressable
                  onPress={() => cart.setQty(line.productId, line.qty - 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`Decrease ${line.productName}`}
                  style={[styles.stepButton, { borderColor: theme.colors.border }]}>
                  <MBIcon name="remove" size="action" color={theme.colors.text} />
                </MBPressable>
                <Text style={[theme.type.money, { color: theme.colors.text }]}>{line.qty}</Text>
                <MBPressable
                  onPress={() => cart.setQty(line.productId, line.qty + 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`Increase ${line.productName}`}
                  style={[styles.stepButton, { borderColor: theme.colors.border }]}>
                  <MBIcon name="add" size="action" color={theme.colors.text} />
                </MBPressable>
              </View>

              <MBInput
                label="Discount"
                numeric
                containerStyle={styles.flex}
                defaultValue=""
                keyboardType="default"
                hint="e.g. 50 or 10%"
                onChangeText={text =>
                  cart.setDiscount(line.productId, resolveDiscount(text, lineGross(line)))
                }
              />
            </View>
          </MBCard>
        ))}

        <MBCard>
          <TotalRow label="Subtotal" value={cart.totals.grossSubtotal} symbol={currencySymbol} />
          {cart.totals.discountTotal > 0 ? (
            <TotalRow label="Discount" value={-cart.totals.discountTotal} symbol={currencySymbol} />
          ) : null}
          {cart.totals.taxAmount > 0 ? (
            <TotalRow label="Government Tax" value={cart.totals.taxAmount} symbol={currencySymbol} />
          ) : null}
          <TotalRow
            label="Grand Total"
            value={cart.totals.grandTotal}
            symbol={currencySymbol}
            strong
          />
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            Final amounts are confirmed by the server.
          </Text>
        </MBCard>

        {/*
          Five methods here against the branch's four. `staff` is the counter's
          own and takes no money; `PRODUCTION_SALE_PAYMENT_METHOD_VALUES` is what
          keeps it out of the branch list without a second check anywhere.
        */}
        <MBSelect
          label="Payment method"
          options={PRODUCTION_SALE_PAYMENT_METHOD_VALUES}
          value={paymentMethod}
          onChange={setPaymentMethod}
          renderLabel={option => METHOD_LABEL[option]}
          testIDPrefix="counter-payment"
        />

        {isStaff ? (
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            No money is taken. The sale is excluded from every revenue total, so the comment
            below is the only record of it — it is required.
          </Text>
        ) : null}

        {isCash && !isStaff ? (
          <>
            <MBInput
              label="Cash received"
              numeric
              keyboardType="decimal-pad"
              value={receivedCashText}
              onChangeText={setReceivedCashText}
              error={shortOnCash ? 'Less than the grand total' : undefined}
              editable={!isSaving}
            />
            {receivedCashText.trim() && change >= 0 ? (
              <TotalRow label="Change" value={change} symbol={currencySymbol} />
            ) : null}
          </>
        ) : null}

        <MBInput
          label="Customer name"
          value={customerName}
          onChangeText={setCustomerName}
          editable={!isSaving}
        />
        <MBInput
          label="Mobile number"
          value={customerPhone}
          onChangeText={setCustomerPhone}
          keyboardType="phone-pad"
          editable={!isSaving}
        />
        <MBInput
          label={isStaff ? 'Comment (required)' : 'Notes'}
          value={notes}
          onChangeText={setNotes}
          editable={!isSaving}
          error={staffNeedsNote && localError ? 'A comment is required for a staff sale' : undefined}
          testID="counter-notes"
        />

        {submitError ? (
          <Text accessibilityRole="alert" style={[theme.type.body, { color: theme.colors.danger }]}>
            {submitError}
          </Text>
        ) : null}

        <MBButton
          label={isStaff ? 'Record staff sale' : 'Confirm sale'}
          onPress={onConfirm}
          loading={isSaving}
          disabled={cart.isEmpty}
          fullWidth
          testID="confirm-counter-sale"
        />
      </ScrollView>
    </View>
  );
}

function TotalRow({
  label,
  value,
  symbol,
  strong = false,
}: {
  label: string;
  value: number;
  symbol?: string;
  strong?: boolean;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={styles.totalRow}>
      <Text
        style={[strong ? theme.type.bodyStrong : theme.type.body, { color: theme.colors.text }]}>
        {label}
      </Text>
      <MBMoney value={value} size={strong ? 'md' : 'sm'} symbol={symbol} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // ...contentColumn caps the measure on a tablet: a row is a label at one edge
  // and a value at the other, and unconstrained on a 10" screen the two end up a
  // hand-span apart with nothing between them.
  listContent: { ...contentColumn, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  separator: { height: 8 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  productMain: { flex: 1, gap: space.hair },
  productPrice: { alignItems: 'flex-end', gap: space.hair },
  cartBar: {
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  cartSummary: { flex: 1, gap: space.hair },
  lineControls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.md,
    marginTop: space.md,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepButton: {
    width: layout.stepperSize,
    height: layout.stepperSize,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.hair,
  },
});
