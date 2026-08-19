import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';

import {
  MBEmptyState,
  MBFilterChips,
  MBErrorState,
  MBFab,
  MBHeader,
  MBPressable,
  MBSyncStatus,
  MBSkeletonList,
  MBStockCard,
} from '@/components';
import { useBranches, useCategories, useProducts, useStock } from '@/hooks/useCatalog';
import { isBranchRole } from '@/navigation/roleNavigation';
import type { StockRow } from '@/shared/types/stock.types';
import { businessDateStr } from '@/shared/utils/timezone';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { dataAsOfFrom } from '@/utils/dataAsOf';
import { contentColumn, space } from '@/theme/spacing';

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
      { id: ALL_CATEGORIES, name: 'All' },
      ...(categories.data ?? []).map(c => ({ id: c.id, name: c.name })),
    ],
    [categories.data],
  );

  const rows = useMemo(() => {
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
      <MBStockCard row={item} expanded={expanded.has(item.productId)} onToggle={onToggle} />
    ),
    [expanded, onToggle],
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
            {/* Business day. `Today` is sent as no date at all so the server
                picks it — its idea of the current business day is the one that
                counts, and after 02:00 the two can differ. */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: theme.space.sm }}>
              {DAY_OPTIONS.map(offset => {
                const selected = offset === dayOffset;
                return (
                  <MBPressable
                    key={offset}
                    onPress={() => setDayOffset(offset)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Stock for ${dayLabel(offset)}`}
                    testID={`stock-day-${offset}`}
                    style={[
                      styles.chip,
                      {
                        borderRadius: theme.radius.pill,
                        paddingHorizontal: theme.space.lg,
                        backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                        borderColor: selected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}>
                    <Text
                      style={[
                        theme.type.label,
                        { color: selected ? theme.colors.onPrimary : theme.colors.text },
                      ]}>
                      {dayLabel(offset)}
                    </Text>
                  </MBPressable>
                );
              })}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: theme.space.sm }}>
              {filterChips.map(chip => {
                const selected = chip.id === categoryId;
                return (
                  <MBPressable
                    key={chip.id}
                    onPress={() => setCategoryId(chip.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.chip,
                      {
                        borderRadius: theme.radius.pill,
                        paddingHorizontal: theme.space.lg,
                        backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
                        borderColor: selected ? theme.colors.accent : theme.colors.border,
                      },
                    ]}>
                    <Text
                      style={[
                        theme.type.label,
                        { color: selected ? theme.colors.onPrimary : theme.colors.text },
                      ]}>
                      {chip.name}
                    </Text>
                  </MBPressable>
                );
              })}
            </ScrollView>
          </View>

          {stock.isPending ? (
            <MBSkeletonList rows={8} />
          ) : stock.isError ? (
            <MBErrorState error={stock.error} onRetry={onRefresh} retrying={stock.isFetching} />
          ) : rows.length === 0 ? (
            <MBEmptyState
              title={search ? 'No products match' : 'No stock recorded'}
              message={
                search
                  ? `Nothing found for "${search}".`
                  : 'No stock movements for this business day yet.'
              }
              actionLabel={search ? 'Clear search' : undefined}
              onAction={search ? () => setSearch('') : undefined}
              illustration={search ? undefined : 'empty-stock'}
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
  chip: { height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  separator: { height: 8 },
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
