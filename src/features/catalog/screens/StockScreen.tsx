import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';

import {
  MBAccountButton,
  MBEmptyState,
  MBFilterChips,
  MBErrorState,
  MBFab,
  MBHeader,
  MBPressable,
  MBSyncStatus,
  MBSkeletonList,
  MBStockCard,
} from '@/common/ui';
import {
  useBranches,
  useCategories,
  useProducts,
  useProductionBalances,
  useStock,
} from '@/api/hooks/useCatalogApi';
import { isBranchRole } from '@/navigation/roleNavigation';
import type { StockRow } from '@/shared/types/stock.types';
import { stockLevel } from '@/shared/utils/stock';
import { businessDateStr } from '@/shared/utils/timezone';
import { useAuthStore } from '@/state/authStore';
import { useTheme } from '@/common/theme/ThemeProvider';
import { dataAsOfFrom } from '@/common/helpers/dataAsOf';
import { contentColumn, space } from '@/common/theme/spacing';

/**
 * Branch stock for the current business date.
 *
 * The server computes the row arithmetic and echoes back the business date it
 * used — the app does not recompute either. That matters because the business
 * day rolls at 2 AM, so an evening shift and the client's idea of "today" can
 * legitimately disagree.
 *
 * Filtering is client-side here, unlike Products: this endpoint returns one row
 * per product for a single branch and day — a bounded set — and offers no search
 * parameter.
 */

const ALL_CATEGORIES = 'all';

/**
 * The health filter, and what "Low" can honestly mean here.
 *
 * ---------------------------------------------------------------------------
 * There is no reorder point, so the bands are the shared ones
 * ---------------------------------------------------------------------------
 * v6's screen 08 grades a product against its **own** reorder quantity — Low at
 * or below it, Watch to 1.6×, Good above — and says in as many words not to use
 * a global threshold, because turnover differs by an order of magnitude across
 * a bakery's catalogue.
 *
 * No such field exists. There is no `reorder` on a product in
 * `@/shared/types`, and the only grading in the system is the opposite kind:
 * `stockLevel()` in `@/shared/utils/stock` with fixed bands at 0 / 5 / 20, which
 * lives in the mirror shared with the server and the web app and drives the
 * server's own low-stock notifications. Inventing a per-product threshold on the
 * phone would put a second, disagreeing definition of "low" in front of the one
 * person who can act on it — the branch would see a product marked Low that the
 * server never warned anybody about. So this filter uses the shared bands, and a
 * per-product reorder point is a server change first: a column, an admin screen
 * to set it, and `levelOf` moving into the mirror.
 *
 * **Low is every band that is not `healthy`** — `out`, `critical` and
 * `moderate`. Not a threshold picked here: it is exactly the set `MBStockCard`
 * already draws a warning colour and a warning word for, so the filter selects
 * what the cards visibly flag and nothing else. Narrowing it to `critical`
 * would be worse than arbitrary, because the card labels `moderate` "Low" — a
 * Low filter that hid the rows saying Low.
 */
const HEALTH_LOW = 'low';
const HEALTH_ALL = 'all';

/** Everything the shared bands do not call `healthy`. See the note above. */
function isBelowTheLine(row: StockRow): boolean {
  return stockLevel(row.balance) !== 'healthy';
}

/**
 * How far back the day picker goes.
 *
 * Seven days rather than a calendar: the server bounds a queued transaction at
 * seven business days, so beyond that there is nothing a branch can still act
 * on — only a report to read, which is Reports' job. A date picker implying
 * otherwise invites someone to go looking for an "edit" that does not exist.
 */
const DAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6] as const;

/** `offset` business days before today, as 'YYYY-MM-DD'. */
function businessDayBefore(offset: number): string {
  const today = businessDateStr();
  if (offset === 0) return today;
  const [y, m, d] = today.split('-').map(Number);
  // Constructed at UTC noon so a day step can never cross a DST or timezone
  // boundary into the wrong date. Only the calendar arithmetic happens here —
  // the business-day rule already applied when `businessDateStr` produced today.
  const base = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12));
  base.setUTCDate(base.getUTCDate() - offset);
  return base.toISOString().slice(0, 10);
}

function dayLabel(offset: number): string {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Yesterday';
  return businessDayBefore(offset).slice(5);
}

export function StockScreen(): React.ReactElement {
  const theme = useTheme();
  const role = useAuthStore(s => s.claims?.role);
  const branchName = useAuthStore(s => s.claims?.branchName);

  const navigation = useNavigation<{ navigate: (screen: string) => void }>();

  const [search, setSearch] = useState('');
  /**
   * Which business day is being looked at.
   *
   * Business dates, not calendar ones — the day rolls at 02:00 Asia/Karachi, so
   * an evening shift's stock belongs to the day that is still running. The
   * server echoes back the date it used and the subtitle shows that rather than
   * this value, so the two can be seen to agree.
   */
  const [dayOffset, setDayOffset] = useState(0);
  const [categoryId, setCategoryId] = useState<string>(ALL_CATEGORIES);
  /**
   * Lands on Low, which v6 asks for and which is the reason the screen gets
   * opened during a shift: what is about to run out. The cost is that a stock
   * *count* — the other thing this list is read for — starts one tap away, and
   * that tap is the All chip sitting directly above the list with its own total
   * on it.
   */
  const [health, setHealth] = useState<string>(HEALTH_LOW);

  /**
   * Which branch, for a role that is not scoped to one.
   *
   * A branch account never sees this: the server reads its branch from the JWT
   * and `useStock` sends no `branchId` at all for it. An admin has no branch of
   * their own, so stock is meaningless until one is chosen — the query stays
   * disabled rather than firing a request the endpoint would 400.
   */
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const date = useMemo(() => businessDayBefore(dayOffset), [dayOffset]);
  const stock = useStock({
    date: dayOffset === 0 ? undefined : date,
    branchId: selectedBranchId,
  });

  /**
   * What Production still owes this shop, for the Waiting and Expected cells.
   *
   * Enabled for branch roles only — the hook scopes itself — and it is a
   * **current** running balance rather than a figure per business date, which is
   * what `showsWaiting` below turns on the date.
   */
  const balances = useProductionBalances();

  /**
   * Whether the two cells are drawn at all, and why the date decides it.
   *
   * `production_balances` is what is outstanding NOW. It carries no history, so
   * against a back-dated day it would pair today's outstanding demand with an
   * old day's balance and call the sum "Expected" — a number describing no
   * moment that ever existed. Today is the only day the two figures belong to
   * each other, so on any other day the cells are not drawn rather than drawn
   * wrong.
   *
   * An admin or production session is excluded for a different reason: the route
   * takes no `branchId` from anyone, so there is no way to ask it about the
   * branch such a session is currently looking at. Showing that session another
   * shop's outstanding demand would be worse than showing none.
   */
  const showsWaiting = dayOffset === 0 && (role ? isBranchRole(role) : false);

  /**
   * `undefined` — not drawn. `null` — asked and unknown. A map — the answer.
   *
   * Loading counts as unknown rather than as zero: a card drawn during the first
   * fetch would otherwise state that nothing is on the way and then quietly
   * change its mind.
   */
  const waitingByProduct = useMemo<Record<string, number> | null | undefined>(() => {
    if (!showsWaiting) return undefined;
    return balances.data ?? null;
  }, [showsWaiting, balances.data]);

  /**
   * The product filter reads the catalogue, not the stock rows: a stock row
   * carries no category, and asking the products endpoint is one cached call
   * that every other screen already makes.
   */
  const products = useProducts({
    categoryId: categoryId === ALL_CATEGORIES ? undefined : categoryId,
  });
  const categories = useCategories();
  const categoryProductIds = useMemo(
    () =>
      categoryId === ALL_CATEGORIES
        ? null
        : new Set((products.data ?? []).map(product => product.id)),
    [categoryId, products.data],
  );

  const onRefresh = useCallback(() => {
    stock.refetch();
  }, [stock]);

  const filterChips = useMemo(
    () => [
      { key: ALL_CATEGORIES, label: 'All' },
      ...(categories.data ?? []).map(c => ({ key: c.id, label: c.name })),
    ],
    [categories.data],
  );

  /**
   * "08-19" on its own tells a screen reader nothing, so each day chip carries
   * the sentence it is short for.
   */
  const dayOptions = useMemo(
    () =>
      DAY_OPTIONS.map(offset => ({
        key: String(offset),
        label: dayLabel(offset),
        accessibilityLabel: `Stock for ${dayLabel(offset)}`,
      })),
    [],
  );

  /**
   * Everything the *other* two filters leave, before the health chips narrow it.
   *
   * Kept separate because the health counts are taken from it: a count says
   * what tapping that chip would show, so it has to be measured after category
   * and search — which are different axes and stay applied — and before the
   * health filter, which is the axis being counted.
   */
  const inScope = useMemo(() => {
    const all = stock.data?.rows ?? [];
    const term = search.trim().toLowerCase();
    const byCategory = categoryProductIds
      ? all.filter(r => categoryProductIds.has(r.productId))
      : all;
    if (!term) return byCategory;
    return byCategory.filter(
      r => r.productName.toLowerCase().includes(term) || r.stockCode.toLowerCase().includes(term),
    );
  }, [stock.data, search, categoryProductIds]);

  const healthChips = useMemo(
    () => [
      { key: HEALTH_LOW, label: 'Low', count: inScope.filter(isBelowTheLine).length },
      { key: HEALTH_ALL, label: 'All', count: inScope.length },
    ],
    [inScope],
  );

  const rows = useMemo(() => {
    const visible = health === HEALTH_LOW ? inScope.filter(isBelowTheLine) : inScope;
    /**
     * Urgency order — the emptiest shelf first.
     *
     * v6 sorts by `qty / reorder`. With one shared scale rather than a
     * per-product one that ratio is monotonic in the balance itself, so this is
     * a plain ascending sort and not a simplification of the rule: `out` comes
     * before `critical` before `moderate` before `healthy` by construction.
     *
     * Sorted on a copy, and stably — two products on the same balance keep the
     * order the server sent, which is the catalogue's. That is what stops the
     * list reshuffling under someone's thumb every time a sale moves one
     * balance.
     */
    return [...visible].sort((a, b) => a.balance - b.balance);
  }, [inScope, health]);

  /**
   * Which rows have their movement breakdown open.
   *
   * Held here rather than inside the card, and that is not a style preference:
   * FlashList recycles row components, so a card holding its own `expanded`
   * state would carry it onto whichever product happened to reuse that
   * instance. Keyed by productId, the open set follows the data.
   */
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

  const onToggle = useCallback((productId: string) => {
    setExpanded(current => {
      const next = new Set(current);
      if (!next.delete(productId)) next.add(productId);
      return next;
    });
  }, []);

  // `onToggle` is passed whole. A per-row closure would be a new prop on every
  // render and would defeat the card's memoisation, so opening one row would
  // re-render every visible row.
  const renderItem = useCallback(
    ({ item }: { item: StockRow }) => (
      <MBStockCard
        row={item}
        expanded={expanded.has(item.productId)}
        onToggle={onToggle}
        /* Absent from the map is a real zero — the route only returns products
           with something outstanding — but only once the map exists at all. */
        waiting={
          waitingByProduct === undefined
            ? undefined
            : waitingByProduct === null
              ? null
              : waitingByProduct[item.productId] ?? 0
        }
      />
    ),
    [expanded, onToggle, waitingByProduct],
  );

  // Admin and production roles carry no branch of their own, so one has to be
  // picked before there is anything to read.
  const picksBranch = role ? !isBranchRole(role) : false;
  const branches = useBranches();
  const branchOptions = useMemo(
    () => (branches.data ?? []).map(b => ({ key: b.id, label: b.name })),
    [branches.data],
  );
  // Nothing chosen yet. The endpoint 400s without a branch, so the query is
  // disabled and this is a prompt rather than an error.
  const needsBranchSelection = picksBranch && !selectedBranchId;

  const selectedBranchName = useMemo(
    () => branchOptions.find(b => b.key === selectedBranchId)?.label ?? null,
    [branchOptions, selectedBranchId],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        leading={<MBAccountButton tone="brand" />}
        tone="brand"
        title="Stock"
        dataAsOf={dataAsOfFrom(stock.dataUpdatedAt)}
        subtitle={
          stock.data?.date
            ? `${selectedBranchName ?? branchName ?? 'Branch'} · business day ${stock.data.date}`
            : selectedBranchName ?? branchName ?? undefined
        }
        // No search button until there is a branch to search: the list below is
        // a "choose a branch" message, and a control that filters nothing is
        // worse than no control at all.
        search={
          needsBranchSelection
            ? undefined
            : {
                value: search,
                onChangeText: setSearch,
                placeholder: 'Search product or stock code',
                testID: 'stock-search',
              }
        }
        right={<MBSyncStatus />}
      />

      {/* The picker stays visible once a branch is chosen, so switching between
          shops is one tap rather than a trip back through an empty state. */}
      {picksBranch ? (
        <View style={{ padding: theme.layout.screenPad }}>
          <MBFilterChips
            options={branchOptions}
            selectedKey={selectedBranchId ?? ''}
            onSelect={setSelectedBranchId}
            scroll
            testIDPrefix="stock-branch"
          />
        </View>
      ) : null}

      {needsBranchSelection ? (
        <MBEmptyState
          title="Choose a branch"
          message={
            branches.isPending
              ? 'Loading branches…'
              : branchOptions.length === 0
              ? 'No branches are available to show stock for.'
              : 'Stock is per branch. Pick one above.'
          }
        />
      ) : (
        <>
          <View style={{ paddingHorizontal: theme.layout.screenPad, gap: theme.space.sm }}>
            {/* Health, first, because it is the question the screen is opened
                for. Two chips and a short fixed set, so it wraps rather than
                scrolls — a scroller hides half of a pair.

                `accent` rather than `primary` for a reason that only shows up
                with three rows stacked: the tone exists so two adjacent
                scrollers are not both painted as "this is the choice", and
                with accent / primary / accent no two neighbours match. The
                counts are what make the pair worth a row at all — Low on its
                own cannot say whether it is hiding two products or forty. */}
            <MBFilterChips
              tone="accent"
              options={healthChips}
              selectedKey={health}
              onSelect={setHealth}
              testIDPrefix="stock-health"
            />

            {/* Business day. `Today` is sent as no date at all so the server
                picks it — its idea of the current business day is the one that
                counts, and after 02:00 the two can differ. */}
            <MBFilterChips
              scroll
              options={dayOptions}
              selectedKey={String(dayOffset)}
              onSelect={key => setDayOffset(Number(key))}
              testIDPrefix="stock-day"
            />

            {/* Category, in the `accent` tone so the two stacked scrollers are
                not both painted as the screen's primary choice. */}
            <MBFilterChips
              scroll
              tone="accent"
              options={filterChips}
              selectedKey={categoryId}
              onSelect={setCategoryId}
              testIDPrefix="stock-category"
            />

            {/* The one way into the ledger, and it is a link rather than a chip
                because it is not a filter on this list — it is a different
                resource. The chips above narrow *what is on the shelf today*;
                this opens *what moved, day by day*, which is the other question
                a manager asks about stock and the only place the money value of
                it is reported.

                Branch roles only. `GET /api/stock/history` refuses production
                and finance outright, and answers 400 to a super admin who has
                not named a branch — which this screen's picker does not do. */}
            {role && isBranchRole(role) ? (
              <MBPressable
                onPress={() => navigation.navigate('StockHistory')}
                accessibilityRole="button"
                accessibilityLabel="Stock history, day by day"
                feedback="opacity"
                hitSlop={8}
                testID="open-stock-history"
                style={styles.ledgerLink}>
                <Text style={[theme.type.label, { color: theme.colors.accent }]}>
                  Stock history →
                </Text>
              </MBPressable>
            ) : null}
          </View>

          {stock.isPending ? (
            <MBSkeletonList rows={8} />
          ) : stock.isError ? (
            <MBErrorState error={stock.error} onRetry={onRefresh} retrying={stock.isFetching} />
          ) : rows.length === 0 && search ? (
            <MBEmptyState
              title="No products match"
              message={`Nothing found for "${search}".`}
              actionLabel="Clear search"
              onAction={() => setSearch('')}
            />
          ) : rows.length === 0 && health === HEALTH_LOW && inScope.length > 0 ? (
            /* Not an empty screen — a good one. There is stock here and none of
               it is below the line, which is the answer the Low chip was asked
               for. Saying "No stock recorded" instead would report a healthy
               shop as an empty one, and the action is the chip that shows what
               is actually there. */
            <MBEmptyState
              title="Everything is above the line"
              message="No product is low, critical or out for this business day."
              actionLabel="Show all stock"
              onAction={() => setHealth(HEALTH_ALL)}
              illustration="empty-stock"
            />
          ) : rows.length === 0 ? (
            <MBEmptyState
              title="No stock recorded"
              message="No stock movements for this business day yet."
              illustration="empty-stock"
            />
          ) : (
            <FlashList
              data={rows}
              renderItem={renderItem}
              keyExtractor={item => item.productId}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={ListSeparator}
              refreshControl={
                <RefreshControl
                  refreshing={stock.isFetching && !stock.isPending}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.primary}
                />
              }
            />
          )}

          {/* Returning is a branch act against what is on the shelf now, so it is
              offered only on today's figures. A return dated into a past day is
              not something this endpoint can express — the server stamps the
              business date from the queue row when it drains. */}
          {!needsBranchSelection && dayOffset === 0 ? (
            <MBFab
              label="Return stock"
              icon="delivery"
              onPress={() => navigation.navigate('StockReturn')}
              testID="return-stock"
            />
          ) : null}
        </>
      )}
    </View>
  );
}

/**
 * Memoised. This list re-renders whenever the screen does — a filter chip, a
 * refetch, a keystroke — and with props that do not change, none of the visible
 * rows re-render with it. Theme changes still reach it: context bypasses `memo`.
 */


/** Module scope: a separator defined during render remounts the list each pass. */
function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // ...contentColumn caps the measure on a tablet. A list row is a label at
  // one edge and a value at the other; unconstrained on a 10" screen the two
  // end up a hand-span apart with nothing between them.
  listContent: { ...contentColumn, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  separator: { height: 8 },
  ledgerLink: { alignSelf: 'flex-start' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  headerMain: { flex: 1, gap: space.hair },
  balance: { alignItems: 'flex-end', gap: space.hair },
  // Centred against the balance rather than pinned to the top of the row.
  disclosure: { alignSelf: 'center' },
  movements: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
  },
  movement: { alignItems: 'center', gap: space.hair, minWidth: 56 },
});
