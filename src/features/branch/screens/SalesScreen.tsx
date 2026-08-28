import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import {
  MBAccountButton,
  MBCard,
  MBDateStepper,
  MBEmptyState,
  MBErrorState,
  MBFab,
  MBHeader,
  MBIcon,
  MBListCard,
  MBListRow,
  MBModal,
  MBMoney,
  MBPressable,
  MBSaleItem,
  MBSearchBar,
  MBSectionHeader,
  MBSkeletonList,
  MBStatGrid,
  MBStatusTag,
  MBSyncStatus,
  MBWriteOutcome,
  writeOutcomeCopy,
  type WriteOutcomeCopy,
  type WriteSubject,
} from '@/common/ui';
import {
  listQueuedSalesForDay,
  type QueuedSale,
} from '@/common/database/repositories/offlineWriteRepository';
import { useCatalogSettings } from '@/common/hooks/useCatalogSettings';
import { useDebouncedValue } from '@/common/hooks/useDebouncedValue';
import { getOrders } from '@/api/services/financeService';
import { qk } from '@/api/queryKeys';
import type { WriteOutcome } from '@/api/sync/writeOutcome';
import { PAYMENT_METHOD_VALUES } from '@/shared/schemas/order.schemas';
import type { Order } from '@/shared/types/order.types';
import { businessDateStr, businessDayBounds, karachiTimeStr } from '@/shared/utils/timezone';
import { useAuthStore } from '@/state/authStore';
import { useSyncStore } from '@/state/syncStore';
import { useTheme } from '@/common/theme/ThemeProvider';
import { contentColumn, space } from '@/common/theme/spacing';
import { formatBusinessDate } from '@/common/helpers/businessDay';
import { dataAsOfFrom } from '@/common/helpers/dataAsOf';
import { formatCurrency, formatQty, round2, toNumber } from '@/common/utils/money';

/**
 * The branch's sales register: one business day, and everything about it.
 *
 * Built from the `Sales Mobile` design — a daily-summary card over a list of the
 * day's records, with the till behind a create action and a sale's own detail
 * behind a row. What follows is where this implementation departs from that
 * mockup, and why; everything not listed here follows it.
 *
 * ---------------------------------------------------------------------------
 * Why the Sales tab is this and not the till
 * ---------------------------------------------------------------------------
 * It used to be the POS itself, which meant the tab a branch opens most often
 * could answer only one question — "ring up the next sale" — and had no answer
 * at all for the ones asked around it: what have we taken, was that sale
 * recorded, which of them was Mrs Khan's. The till is now `NewSaleScreen`, a
 * modal over this list. A create screen that is a resource's whole tab is a form
 * with nothing to return to.
 *
 * ---------------------------------------------------------------------------
 * The figures are a sum of what is listed, and the screen says so
 * ---------------------------------------------------------------------------
 * `GET /api/reports/summary` is the authoritative day total, and **a
 * `branch_user` may not call it** — the server mounts every `/api/reports` route
 * behind `requireRole('super_admin', 'branch_manager')`. A register that read it
 * would 403 for the shift account this screen exists for, so the totals here are
 * derived from the day's own records, exactly as the admin's money view derives
 * its own (`AdminSalesScreen`). The design's "Charged, after discount" caption
 * on the Total tile is therefore worded as where the figure came from: a branch
 * manager comparing this against Daily Sales must be able to see which of the
 * two has the audit behind it.
 *
 * Cancelled sales are excluded from every figure and still listed. They took no
 * money, but they happened, and a register that hid them would disagree with the
 * paper.
 *
 * ---------------------------------------------------------------------------
 * A queued sale is on this list, and it is not one of the numbers
 * ---------------------------------------------------------------------------
 * Sales written offline live in `local_sales` until the queue drains. The mockup
 * has no state for them — it is a design drawn against a connection — but this
 * app is offline-first and they are drawn at the top of the records, marked for
 * what they are. The question a cashier asks after an offline shift is "did that
 * go through", and a register that showed nothing until the signal returned
 * answers it with silence, which reads as "it is gone".
 *
 * They contribute nothing to the money figures, and cannot: the POS payload
 * carries `{productId, qty, discount}` and no prices, because the server
 * resolves the rate at commit. Pricing them here from the mirrored catalogue
 * would put a number the server never agreed to in a column of numbers it did.
 *
 * ---------------------------------------------------------------------------
 * Three more departures from the mockup, all deliberate
 * ---------------------------------------------------------------------------
 *   - **No nine-column table.** The design's records table is 1106px wide and
 *     scrolls sideways, which is a desktop shape: on the 4.5" handset this runs
 *     on it is three screens of horizontal travel to read one row. The same nine
 *     fields are stacked into a card instead — id and total on one line, then
 *     time and customer, then what was sold, then tender and status — and the
 *     row itself is the design's "View" button.
 *   - **A stepper, not a calendar.** `MBDateStepper`, because a register is read
 *     relative to today and one tap back is the move; see that component.
 *   - **No Reprint.** There is no receipt-printing path in this app at all —
 *     `OrderPrintPreview` is the production floor's docket for a demand, not a
 *     customer receipt — and a button that does nothing is worse on this screen
 *     than on any other.
 */

/** What the cashier is told about the write they just made. */
const SALE: WriteSubject = {
  noun: 'sale',
  confirmed: 'Sale completed.',
  refusedNote: 'do not ring it up again',
};

/** How each payment method reads as a tile label. */
const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  foodpanda: 'Foodpanda',
  bank_account: 'Bank account',
  staff: 'Staff (unpaid)',
};

/**
 * Products shown before the grid has to be asked to open — the mockup's twelve.
 *
 * Two-up on a phone, so six rows: enough that "did we sell any X" is usually
 * answered without opening it, and the count in the toggle says what is behind.
 */
const VISIBLE_PRODUCTS = 12;

/**
 * `NewSaleScreen` hands the outcome back through the route rather than a store.
 *
 * It is a message about one write, consumed once by the screen that was waiting
 * for it — the shape a param has and a store does not. A store would keep the
 * banner alive across a tab switch and re-announce a sale from twenty minutes
 * ago.
 */
type SalesRoute = RouteProp<{ SalesList: { outcome?: WriteOutcome; reason?: string } }, 'SalesList'>;

export function SalesScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{
    navigate: (screen: string, params?: object) => void;
    setParams: (params: object) => void;
  }>();
  const route = useRoute<SalesRoute>();
  const { currencySymbol } = useCatalogSettings();

  const [date, setDate] = useState(() => businessDateStr());
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim().toLowerCase(), 300);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [banner, setBanner] = useState<WriteOutcomeCopy | null>(null);

  const branchId = useAuthStore(s => s.claims?.branchId ?? null);
  /** The drain moves rows out of `local_sales`; re-read when it has run. */
  const syncPhase = useSyncStore(s => s.phase);

  const bounds = useMemo(() => businessDayBounds(date), [date]);
  const filters = useMemo(
    () => ({ from: bounds.fromISO, to: bounds.toISO }),
    [bounds.fromISO, bounds.toISO],
  );

  /**
   * The day's sales as the server has them.
   *
   * A branch role is scoped server-side, so no `branchId` is sent. The bounds
   * are business-day instants and never a bare `YYYY-MM-DD`: `created_at` is
   * compared as an instant and the day rolls at 02:00, so a bare date would cut
   * two hours off both ends and drop a 01:00 sale out of the night it was rung
   * up on.
   */
  const orders = useQuery({
    queryKey: qk.orders.list(filters),
    queryFn: () => getOrders(filters),
    // The previous day stays on screen while the next loads — stepping the date
    // asks this screen a different question rather than opening a new one.
    placeholderData: previous => previous,
  });

  /**
   * The day's sales that have not left the device.
   *
   * Read straight out of SQLite rather than through React Query, matching Sync
   * Center: this is local state that changes when the drain runs, not a response
   * to cache. Re-read when the day changes, when the queue moves, and when a
   * write has just reported back.
   */
  const [queued, setQueued] = useState<readonly QueuedSale[]>([]);
  useEffect(() => {
    if (!branchId) {
      setQueued([]);
      return;
    }
    let alive = true;
    listQueuedSalesForDay(branchId, date)
      .then(rows => {
        if (alive) setQueued(rows);
      })
      .catch(() => {
        // The register is still useful without it; the server's list is the
        // half that matters most and it has its own error state.
        if (alive) setQueued([]);
      });
    return () => {
      alive = false;
    };
  }, [branchId, date, syncPhase, banner]);

  /**
   * A finished sale arrives as a route param.
   *
   * The day is stepped back to today first: the sale was rung up now, and
   * leaving the register on last Tuesday would report a sale onto a screen that
   * cannot show it.
   *
   * Announced once per arrival, and the guard is a **reference** to the params
   * object rather than the outcome value — two identical sales in a row are two
   * announcements, and a re-render is none. Clearing the param is what stops the
   * banner coming back with the tab twenty minutes later; the ref is what stops
   * this effect re-announcing before the clear lands, which is the same shape
   * `MBSyncStatus` uses for its own one-shot confirmation.
   */
  const announced = useRef<object | null>(null);
  useEffect(() => {
    const params = route.params;
    if (!params?.outcome || announced.current === params) return;
    announced.current = params;
    setDate(businessDateStr());
    setBanner(writeOutcomeCopy(params.outcome, SALE, params.reason));
    navigation.setParams({ outcome: undefined, reason: undefined });
  }, [route.params, navigation]);

  const rows = useMemo(() => orders.data ?? [], [orders.data]);
  const day = useMemo(() => summariseDay(rows), [rows]);

  const visible = useMemo(
    () => (search ? rows.filter(order => matchesSale(order, search)) : rows),
    [rows, search],
  );

  const renderItem = useCallback(
    ({ item }: { item: Order }) => (
      <MBSaleItem
        order={item}
        currencySymbol={currencySymbol}
        showTime
        showItems
        onPress={() => setSelected(item)}
      />
    ),
    [currencySymbol],
  );

  const openTill = useCallback(() => navigation.navigate('NewSale'), [navigation]);

  const products = expanded ? day.products : day.products.slice(0, VISIBLE_PRODUCTS);
  const hidden = day.products.length - products.length;

  /** Nothing at all for this day: no record on the server, none on the device. */
  const dayIsEmpty =
    !orders.isPending && !orders.isError && rows.length === 0 && queued.length === 0;

  /** The day is unknown rather than quiet — see the summary block below. */
  const dayUnknown = orders.isError && rows.length === 0;

  const listHeader = (
    <View style={styles.header}>
      {/*
        The mockup's one summary card: the tender split, the two figures that
        explain the total, and what actually left the shelf — one surface,
        because they are one answer to one question about one day.

        Hidden rather than zeroed when the day could not be loaded. A card
        reading "Rs. 0" on a request that failed states a quiet day as a fact.
      */}
      {dayUnknown ? null : (
        <MBCard testID="sales-day-summary">
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
            {`Daily summary · ${formatBusinessDate(date)}`}
          </Text>

          <View style={{ gap: theme.space.md }}>
            <MBStatGrid>
              {day.payments.map(row => (
                <SummaryTile
                  key={row.method}
                  label={METHOD_LABEL[row.method] ?? row.method}
                  value={row.total}
                  currencySymbol={currencySymbol}
                  /* Only cash carries its gross, as in the mockup: it is the
                     one tender counted against a drawer at closing. */
                  caption={
                    row.method === 'cash' && row.gross > 0
                      ? `Gross ${formatCurrency(row.gross, currencySymbol)}`
                      : undefined
                  }
                  /* A tender that took nothing today is still one of the four
                     the shop accepts, so it keeps its tile and loses its
                     emphasis — the absence is the information. */
                  muted={row.count === 0}
                  testID={`sales-payment-${row.method}`}
                />
              ))}

              <SummaryTile
                label="Total sales"
                value={day.total}
                currencySymbol={currencySymbol}
                caption="Summed from the records below"
                tone="highlight"
                testID="sales-day-total"
              />
            </MBStatGrid>

            <MBStatGrid>
              <SummaryTile
                label="Gross (qty × rate)"
                value={day.gross}
                currencySymbol={currencySymbol}
                caption="Before discount"
              />
              <SummaryTile
                label="Discount"
                value={day.discount}
                currencySymbol={currencySymbol}
                caption="Off list price"
                tone="dashed"
              />
            </MBStatGrid>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

          <View style={styles.itemsHead}>
            <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Items sold</Text>
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              {`${formatQty(day.units)} units · ${day.products.length} ${
                day.products.length === 1 ? 'product' : 'products'
              }`}
            </Text>
          </View>

          {day.products.length === 0 ? (
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              Nothing has left the shelf on this day.
            </Text>
          ) : (
            <MBStatGrid>
              {products.map(product => (
                <ProductTile
                  key={product.productId}
                  name={product.productName}
                  qty={product.qty}
                />
              ))}
            </MBStatGrid>
          )}

          {day.products.length > VISIBLE_PRODUCTS ? (
            <MBPressable
              onPress={() => setExpanded(v => !v)}
              accessibilityRole="button"
              feedback="opacity"
              testID="sales-show-all-products"
              style={styles.showAll}>
              <Text style={[theme.type.label, { color: theme.colors.accent }]}>
                {expanded
                  ? 'Show fewer products'
                  : `Show all ${day.products.length} products (+${hidden} more)`}
              </Text>
              <MBIcon
                name={expanded ? 'chevronUp' : 'chevronDown'}
                size="action"
                color={theme.colors.accent}
              />
            </MBPressable>
          ) : null}
        </MBCard>
      )}

      <MBSectionHeader
        title="Records"
        subtitle={
          search
            ? `${visible.length} ${visible.length === 1 ? 'record' : 'records'} matching “${searchInput.trim()}”`
            : `${rows.length} ${rows.length === 1 ? 'record' : 'records'}${
                queued.length > 0 ? ` · ${queued.length} waiting to sync` : ''
              }`
        }
      />

      {/*
        Queued sales sit above the server's, newest work first, and they are the
        one thing on this screen that is not a server record. Marked rather than
        blended: "waiting" and "recorded" are different states of a transaction
        and a register that drew them alike is how a sale nobody checked goes
        missing until the till is reconciled.
      */}
      {queued.map(sale => (
        <QueuedSaleRow key={sale.clientOperationId} sale={sale} />
      ))}

      {orders.isError && rows.length > 0 ? (
        <Text style={[theme.type.caption, { color: theme.colors.offline }]}>
          These records may be out of date — the last refresh did not reach the server.
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        leading={<MBAccountButton />}
        title="Sales"
        /* The mockup's page head, in the slot this app puts it: what day, and
           how many are on it. The money is in the card, where its caption can
           say where it came from. */
        subtitle={
          orders.data ? `${formatBusinessDate(date)} · ${rows.length} recorded` : undefined
        }
        right={<MBSyncStatus />}
        dataAsOf={dataAsOfFrom(orders.dataUpdatedAt)}
      />

      {banner ? (
        // Tapping the banner dismisses it. Without a role that affordance is
        // invisible to a screen reader, which otherwise reads the message and
        // gives no way to clear it. The label stays unset on purpose: the
        // banner text is the announcement, and a label here would replace it.
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

      <View style={styles.controls}>
        <MBDateStepper value={date} onChange={setDate} testID="sales-date" />
        <MBSearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          /* The register's own fields, not the catalogue's: a customer asking
             about "the one at half two" and a manager looking for a receipt
             number are the two searches this list gets. */
          placeholder="Search sale, customer or product"
          searching={searchInput.trim().toLowerCase() !== search}
          testID="sales-search"
        />
      </View>

      {orders.isPending ? (
        <MBSkeletonList rows={6} />
      ) : dayUnknown && queued.length === 0 ? (
        <MBErrorState
          error={orders.error}
          onRetry={() => orders.refetch()}
          retrying={orders.isFetching}
        />
      ) : dayIsEmpty ? (
        <MBEmptyState
          title="No sales on this day"
          message={`Nothing was rung up on ${formatBusinessDate(date)}.`}
          icon="sales"
          actionLabel="New sale"
          onAction={openTill}
        />
      ) : (
        <FlashList
          data={visible}
          renderItem={renderItem}
          keyExtractor={keyOf}
          ListHeaderComponent={listHeader}
          ItemSeparatorComponent={ListSeparator}
          /* A search that matches nothing is not an empty day, and must not be
             reported as one — the summary above it is still the day's. */
          ListEmptyComponent={
            search ? (
              <MBEmptyState
                title="No sales found"
                message="Try another date, or clear the search."
              />
            ) : null
          }
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={orders.isFetching && !orders.isPending}
              onRefresh={() => orders.refetch()}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}

      {/*
        The mockup puts New Sale in the page head. Here it is the corner FAB,
        which is the same single control in the place this app already puts a
        create action — the production counter's own Sales list is the sibling,
        and `docs/screen-patterns.md` carries the rule. One control at a time:
        the empty state holds the instruction while there is nothing to scroll.
      */}
      {!dayIsEmpty ? <MBFab label="New sale" icon="add" onPress={openTill} testID="new-sale" /> : null}

      <MBModal visible={selected !== null} onRequestClose={() => setSelected(null)}>
        {selected ? (
          <SaleDetail
            order={selected}
            currencySymbol={currencySymbol}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </MBModal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// The summary card's parts
// ---------------------------------------------------------------------------

/**
 * One figure in the daily summary.
 *
 * The mockup's three variants, in tokens: the default sits on the sunken field
 * inside the card, `highlight` is the day's total in the brand fill's soft tint,
 * and `dashed` is the discount — a figure that is money *not* taken, which is
 * why its edge is broken and its value is drawn as a real negative.
 *
 * Local to this screen rather than in `@/common/ui`: it is a tile *inside* a
 * card, which `MBStatCard` deliberately is not — that one is a card in its own
 * right and nesting it here would draw two edges and two lifts. If a second
 * screen grows the same block, this is what gets promoted.
 */
function SummaryTile({
  label,
  value,
  caption,
  currencySymbol,
  tone = 'default',
  muted = false,
  testID,
}: {
  label: string;
  value: number;
  caption?: string;
  currencySymbol?: string;
  tone?: 'default' | 'highlight' | 'dashed';
  /** A tender that took nothing today: present, and visibly empty. */
  muted?: boolean;
  testID?: string;
}): React.ReactElement {
  const theme = useTheme();
  const highlight = tone === 'highlight';
  const dashed = tone === 'dashed';

  return (
    <View
      testID={testID}
      style={[
        styles.tile,
        dashed && styles.dashedEdge,
        {
          borderRadius: theme.radius.md,
          padding: theme.layout.tilePad,
          gap: theme.space.hair,
          backgroundColor: highlight ? theme.colors.primarySoft : theme.colors.surfaceSunken,
          borderColor: highlight
            ? theme.colors.primary
            : dashed
              ? theme.colors.borderStrong
              : theme.colors.border,
        },
      ]}>
      <Text
        numberOfLines={1}
        style={[
          theme.type.label,
          { color: highlight ? theme.colors.accent : theme.colors.textMuted },
        ]}>
        {label}
      </Text>

      <MBMoney
        value={value}
        symbol={currencySymbol}
        /* A discount is money off, and it is drawn as such — `sign` renders a
           real minus and says "less" in the accessible name, where a hyphen at
           money size reads as a dash. */
        sign={dashed && value > 0 ? 'out' : undefined}
        color={dashed && value > 0 ? theme.colors.danger : muted ? theme.colors.textMuted : undefined}
      />

      {caption ? (
        <Text numberOfLines={1} style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

/** One product and what left the shelf, in the items-sold grid. */
function ProductTile({ name, qty }: { name: string; qty: number }): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.productTile,
        {
          borderRadius: theme.radius.md,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceSunken,
          paddingVertical: theme.space.snug,
          paddingHorizontal: theme.space.md,
          gap: theme.space.sm,
        },
      ]}>
      <Text numberOfLines={1} style={[theme.type.label, styles.flex, { color: theme.colors.text }]}>
        {name}
      </Text>
      {/* `accent`, never `primary`: the ember is a fill and fails the text bar
          on a card. The mockup's orange figure is this token. */}
      <Text style={[theme.type.number, { color: theme.colors.accent }]}>{formatQty(qty)}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// The day, summed
// ---------------------------------------------------------------------------

export interface PaymentTotal {
  method: string;
  /** What was taken on this tender, after discount. */
  total: number;
  /** Before discount — the drawer figure, and only drawn for cash. */
  gross: number;
  count: number;
}

export interface ProductTotal {
  productId: string;
  productName: string;
  qty: number;
  revenue: number;
}

export interface DaySummary {
  /** Sales counted — cancelled ones are not among them. */
  count: number;
  /** Before discount. */
  gross: number;
  discount: number;
  /** What was taken. */
  total: number;
  /** Units across every line of every counted sale. */
  units: number;
  /** The four branch tenders, always, plus any other one that appears. */
  payments: PaymentTotal[];
  /** Busiest product first. */
  products: ProductTotal[];
}

/**
 * One business day of records → the figures above them.
 *
 * `toNumber` and not `Number`: every money field is `numeric(14,2)` and arrives
 * as a JSON string, and one malformed value under `Number` poisons the whole sum
 * into `NaN` — a register reading "Rs. NaN" rather than one row short.
 *
 * `round2` closes each sum for the same reason `saleTotals` does: the drift is
 * invisible once formatted, but the rounded figure is what the accessibility
 * label reads out and what any later comparison sees.
 *
 * The tender split is in a **fixed** order and always four wide, rather than
 * ranked by what was taken. A card that reorders itself through the day is one
 * nobody can read at a glance, and a tender that took nothing is information —
 * it is drawn muted rather than dropped. Anything else that appears (a `staff`
 * sale, which a branch has no way to ring up but the row could still carry) is
 * appended rather than silently excluded from a total labelled as the day's.
 *
 * Exported because it is the screen's arithmetic and deserves testing without a
 * renderer — a wrong total here is wrong money on the one screen a shift is
 * reconciled from.
 */
export function summariseDay(orders: readonly Order[]): DaySummary {
  const payments = new Map<string, { total: number; gross: number; count: number }>();
  for (const method of PAYMENT_METHOD_VALUES) {
    payments.set(method, { total: 0, gross: 0, count: 0 });
  }
  const products = new Map<string, ProductTotal>();

  let count = 0;
  let gross = 0;
  let discount = 0;
  let total = 0;
  let units = 0;

  for (const order of orders) {
    // Cancelled sales took no money. They stay on the list and out of the sums.
    if (order.status === 'cancelled') continue;

    count += 1;
    const orderGross = toNumber(order.subtotal);
    const grand = toNumber(order.grandTotal);
    gross += orderGross;
    discount += toNumber(order.discountTotal);
    total += grand;

    const method = order.paymentMethod ?? 'cash';
    const bucket = payments.get(method) ?? { total: 0, gross: 0, count: 0 };
    payments.set(method, {
      total: bucket.total + grand,
      gross: bucket.gross + orderGross,
      count: bucket.count + 1,
    });

    for (const item of order.items ?? []) {
      const qty = toNumber(item.qty);
      units += qty;
      const current = products.get(item.productId) ?? {
        productId: item.productId,
        productName: item.productName,
        qty: 0,
        revenue: 0,
      };
      products.set(item.productId, {
        ...current,
        qty: current.qty + qty,
        revenue: current.revenue + toNumber(item.lineTotal),
      });
    }
  }

  return {
    count,
    gross: round2(gross),
    discount: round2(discount),
    total: round2(total),
    units: round2(units),
    payments: [...payments.entries()].map(([method, sums]) => ({
      method,
      total: round2(sums.total),
      gross: round2(sums.gross),
      count: sums.count,
    })),
    products: [...products.values()]
      .map(p => ({ ...p, qty: round2(p.qty), revenue: round2(p.revenue) }))
      .sort((a, b) => b.qty - a.qty),
  };
}

/**
 * Does this sale match what was typed?
 *
 * The mockup's haystack — id, time, customer, payment, comment and the product
 * names — plus the status and the cashier, which this app's rows also show. A
 * register search that matched only the visible line would fail the question it
 * is most often asked: "which sale had the walnut cake on it".
 *
 * `query` arrives already trimmed and lower-cased; doing it here per row would
 * be the same work once per record per keystroke.
 */
export function matchesSale(order: Order, query: string): boolean {
  if (!query) return true;
  const haystack = [
    order.orderNumber,
    order.customerName,
    order.customerPhone,
    order.paymentMethod,
    order.status,
    order.notes,
    order.createdByName,
    order.createdAt ? karachiTimeStr(new Date(order.createdAt)) : '',
    ...(order.items ?? []).map(item => item.productName),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

/**
 * A sale this device is still holding.
 *
 * No money on it, deliberately — see the header. What it carries instead is the
 * two things the cashier needs: that it is safe, and whether it is waiting for a
 * signal or for a person. A `conflict` or `failed` row is the second: the server
 * has already refused it, and it will never sync on its own.
 */
const QueuedSaleRow = React.memo(function QueuedSaleRowView({
  sale,
}: {
  sale: QueuedSale;
}): React.ReactElement {
  const theme = useTheme();
  const refused = sale.queueStatus === 'conflict' || sale.queueStatus === 'failed';

  return (
    <MBCard>
      <View style={styles.queuedHeader}>
        <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
          {karachiTimeStr(new Date(sale.createdAt))} · on this device
        </Text>
        <MBStatusTag
          label={refused ? 'Not accepted' : 'Waiting to sync'}
          status={refused ? 'rejected' : 'pending'}
        />
      </View>
      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
        {`${formatQty(sale.units)} units · ${sale.lineCount} ${
          sale.lineCount === 1 ? 'line' : 'lines'
        } · ${METHOD_LABEL[sale.paymentMethod] ?? sale.paymentMethod}`}
      </Text>
      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
        {refused
          ? 'The server refused this sale. Open Sync Center — it is waiting for a person.'
          : 'Stored on this device. The total is set by the server when it syncs.'}
      </Text>
    </MBCard>
  );
});

/**
 * One sale, in full — the mockup's detail sheet.
 *
 * Everything here is the **server's** record of it: its own line rates, its own
 * discounts, its own totals. Nothing is recomputed — this screen is where a
 * disputed sale is read back, and a figure derived here that disagreed with the
 * receipt by a rounding step would be the thing under dispute.
 *
 * The mockup's five-column line table is a row plus a subtitle here: at 40/70/70
 * /80 the columns leave about 60dp for a product name on this handset, which is
 * not a name. Qty, rate and discount ride under it in that order, and the line
 * total keeps the right edge it has in the design.
 */
function SaleDetail({
  order,
  currencySymbol,
  onClose,
}: {
  order: Order;
  currencySymbol?: string;
  onClose: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const tax = toNumber(order.taxAmount);
  const discount = toNumber(order.discountTotal);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title={order.orderNumber}
        subtitle={`${formatBusinessDate(order.createdAt.slice(0, 10))} · ${karachiTimeStr(
          new Date(order.createdAt),
        )}`}
        onBack={onClose}
        right={<MBStatusTag label={order.status} status={order.status} />}
      />

      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.md },
        ]}>
        {/* The mockup's pair row: who it was for, and how it was paid. */}
        <View style={styles.pairRow}>
          <PairTile label="Customer" value={order.customerName || 'Walk-in'} />
          <PairTile
            label="Payment"
            value={METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}
          />
        </View>

        <MBListCard testID="sale-detail-items">
          {(order.items ?? []).map(item => (
            <MBListRow
              key={`${item.productId}-${item.qty}-${item.lineTotal}`}
              title={item.productName}
              subtitle={`${formatQty(item.qty)} × ${formatCurrency(
                item.unitPrice,
                currencySymbol,
              )}${toNumber(item.discount) > 0 ? ` · less ${formatCurrency(item.discount, currencySymbol)}` : ''}`}
              value={<MBMoney value={item.lineTotal} size="sm" symbol={currencySymbol} />}
            />
          ))}
        </MBListCard>

        {/* Sunken rather than a card: the mockup sets the totals on its wash so
            they read as a block belonging to the lines above, not as the next
            thing along. */}
        <View
          style={[
            styles.totals,
            {
              backgroundColor: theme.colors.surfaceSunken,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
              padding: theme.layout.cardPad,
              gap: theme.space.sm,
            },
          ]}>
          <DetailTotal label="Gross" value={order.subtotal} symbol={currencySymbol} />
          {discount > 0 ? (
            <DetailTotal
              label="Discount"
              value={discount}
              symbol={currencySymbol}
              sign="out"
              color={theme.colors.danger}
            />
          ) : null}
          {toNumber(order.deliveryCharges) > 0 ? (
            <DetailTotal label="Delivery" value={order.deliveryCharges} symbol={currencySymbol} />
          ) : null}
          {tax > 0 ? (
            <DetailTotal label="Government Tax" value={tax} symbol={currencySymbol} />
          ) : null}

          <View style={[styles.hair, { backgroundColor: theme.colors.border }]} />

          <DetailTotal
            label="Grand total"
            value={order.grandTotal}
            symbol={currencySymbol}
            strong
          />

          {order.receivedCash !== undefined ? (
            <>
              <DetailTotal
                label="Cash received"
                value={order.receivedCash}
                symbol={currencySymbol}
              />
              <DetailTotal
                label="Change"
                value={toNumber(order.cashReturned)}
                symbol={currencySymbol}
              />
            </>
          ) : null}
        </View>

        <View style={styles.comment}>
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Comment</Text>
          <Text style={[theme.type.body, { color: theme.colors.text }]}>{order.notes || '—'}</Text>
        </View>

        {order.createdByName ? (
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            Rung up by {order.createdByName}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function PairTile({ label, value }: { label: string; value: string }): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.tile,
        styles.flex,
        {
          borderRadius: theme.radius.md,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceSunken,
          padding: theme.layout.tilePad,
          gap: theme.space.hair,
        },
      ]}>
      <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text numberOfLines={1} style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

function DetailTotal({
  label,
  value,
  symbol,
  sign,
  color,
  strong = false,
}: {
  label: string;
  value: unknown;
  symbol?: string;
  sign?: 'in' | 'out';
  color?: string;
  strong?: boolean;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={styles.totalRow}>
      <Text
        style={[
          strong ? theme.type.bodyStrong : theme.type.body,
          { color: strong ? theme.colors.text : theme.colors.textMuted },
        ]}>
        {label}
      </Text>
      <MBMoney
        value={toNumber(value)}
        size={strong ? 'md' : 'sm'}
        symbol={symbol}
        sign={sign}
        color={color}
      />
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  controls: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm },
  header: { gap: space.md, paddingTop: space.md },
  // ...contentColumn caps the measure on a tablet: a register row is a label at
  // one edge and a figure at the other, and unconstrained on a 10" screen the
  // two end up a hand-span apart with nothing between them.
  listContent: { ...contentColumn, paddingHorizontal: space.lg, paddingBottom: space.huge },
  separator: { height: 8 },
  tile: { borderWidth: 1 },
  // A discount is money that did NOT come in, and the broken edge is the
  // mockup's way of saying so before the figure is read.
  dashedEdge: { borderStyle: 'dashed' },
  productTile: { borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  divider: { height: 1 },
  itemsHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.md,
  },
  showAll: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  queuedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.tight,
  },
  pairRow: { flexDirection: 'row', gap: space.md },
  totals: { borderWidth: 1 },
  hair: { height: 1 },
  comment: { gap: space.hair },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
});
