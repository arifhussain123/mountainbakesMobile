import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import {
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBFilterChips,
  MBHeader,
  MBListCard,
  MBListRow,
  MBMoney,
  MBRangeFilter,
  MBSectionHeader,
  MBSkeletonList,
  MBStackedBar,
} from '@/components';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { getReportSummary } from '@/services/api/reportsApi';
import { qk } from '@/services/query/queryKeys';
import type { TopProduct } from '@/shared/types/report.types';
import { businessDateStr, businessDaysAgoStr } from '@/shared/utils/timezone';
import { useTheme } from '@/theme/ThemeProvider';
import {
  resolveRange,
  type CustomDates,
  type DashboardRangeKey,
} from '@/utils/dashboardRange';
import { formatQty, toNumber } from '@/utils/money';
import { contentColumn, space } from '@/theme/spacing';

/**
 * What sold, ranked.
 *
 * ---------------------------------------------------------------------------
 * Two orderings, and the one that is missing
 * ---------------------------------------------------------------------------
 * By units and by revenue are genuinely different questions — the shop's best
 * seller and the shop's best earner are rarely the same line, and a bakery
 * routinely has one product carrying the volume and another carrying the money.
 * Both are answered from the same response; switching between them is a sort,
 * not a request.
 *
 * v4 draws a third chip, **By margin**, and it is not here. `TopProduct` carries
 * `totalQty` and `totalRevenue` and nothing else: there is no cost on the line,
 * no cost on the product, and no cost anywhere in the summary response. A margin
 * chip would have to invent one. A ranking that looks authoritative and is made
 * up is worse than a ranking that is missing, particularly this one — it is the
 * screen someone uses to decide what to stop baking.
 *
 * ---------------------------------------------------------------------------
 * The list is the server's top ten, and the screen says so
 * ---------------------------------------------------------------------------
 * `/api/reports/summary` caps `topProducts` at ten. That cap is invisible in the
 * payload — ten rows look exactly like a catalogue of ten — so the footer states
 * it. The share bar is folded from the same ten, which means its "Others" band
 * is *the rest of the top ten*, not the rest of the catalogue, and it says that
 * too. Silently drawing a share-of-everything bar from a truncated list is a
 * pie chart that does not add up to the business.
 */

type Ordering = 'units' | 'revenue';

const ORDERINGS = [
  { key: 'units', label: 'By units' },
  { key: 'revenue', label: 'By revenue' },
] as const;

/** How many get their own colour and a legend entry on the share bar. */
const NAMED_SHARES = 4;

export function TopProductsScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ goBack: () => void }>();
  const { currencySymbol } = useCatalogSettings();

  const [ordering, setOrdering] = useState<Ordering>('units');
  const [rangeKey, setRangeKey] = useState<DashboardRangeKey>('last7');
  const [custom, setCustom] = useState<CustomDates>(() => ({
    from: businessDaysAgoStr(6),
    to: businessDateStr(),
  }));

  const scope = useMemo(() => resolveRange(rangeKey, custom), [rangeKey, custom]);

  const summary = useQuery({
    queryKey: qk.reports.summary(scope),
    queryFn: () => getReportSummary(scope),
    placeholderData: previous => previous,
  });

  /**
   * Sorted here, not re-fetched. The server returns its ten by revenue; asking
   * it again for the same ten in a different order would be a round trip to
   * reverse an array.
   *
   * The ten themselves are always the top ten **by revenue** — the server picked
   * them — so "by units" ranks that set rather than the catalogue's ten biggest
   * sellers by volume. The footer says so; nothing here can widen it.
   */
  const ranked = useMemo<TopProduct[]>(() => {
    const rows = [...(summary.data?.topProducts ?? [])];
    const value = (p: TopProduct) =>
      ordering === 'units' ? toNumber(p.totalQty) : toNumber(p.totalRevenue);
    return rows.sort((a, b) => value(b) - value(a));
  }, [summary.data?.topProducts, ordering]);

  const shares = useMemo(
    () =>
      ranked.map(p => ({
        label: p.productName,
        value: ordering === 'units' ? toNumber(p.totalQty) : toNumber(p.totalRevenue),
      })),
    [ranked, ordering],
  );

  const totalUnits = ranked.reduce((sum, p) => sum + toNumber(p.totalQty), 0);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Top products"
        subtitle={summary.data ? `${summary.data.from} → ${summary.data.to}` : undefined}
        onBack={() => navigation.goBack()}
      />

      <View style={{ padding: theme.layout.screenPad, gap: theme.space.sm }}>
        <MBRangeFilter
          value={rangeKey}
          onChange={setRangeKey}
          custom={custom}
          onCustomChange={setCustom}
        />
        {/* `accent`, so the ordering row is visibly a different kind of control
            from the range row above it: one costs a request, one is a sort. */}
        <MBFilterChips
          tone="accent"
          options={ORDERINGS}
          selectedKey={ordering}
          onSelect={key => setOrdering(key as Ordering)}
          testIDPrefix="top-products-by"
        />
      </View>

      {summary.isPending ? (
        <MBSkeletonList rows={6} />
      ) : summary.isError ? (
        <MBErrorState
          error={summary.error}
          onRetry={() => summary.refetch()}
          retrying={summary.isFetching}
        />
      ) : ranked.length === 0 ? (
        <MBEmptyState
          title="Nothing sold in this period"
          message="Widen the range, or check that sales for these days have synced."
          icon="products"
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            contentColumn,
            { padding: theme.layout.screenPad, gap: theme.space.md },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={summary.isFetching && !summary.isPending}
              onRefresh={() => summary.refetch()}
              tintColor={theme.colors.primary}
            />
          }>
          <MBListCard testID="top-products-list">
            {ranked.map((product, i) => (
              <MBListRow
                key={product.productId}
                rank={i + 1}
                title={product.productName}
                subtitle={`${formatQty(product.totalQty)} units · ${product.categoryName}`}
                value={
                  ordering === 'revenue' ? (
                    <MBMoney value={product.totalRevenue} size="sm" symbol={currencySymbol} />
                  ) : (
                    formatQty(product.totalQty)
                  )
                }
              />
            ))}
          </MBListCard>

          <MBSectionHeader
            title={ordering === 'units' ? 'Share of units' : 'Share of revenue'}
            subtitle={`Across these ${ranked.length}`}
          />
          <MBCard>
            <MBStackedBar
              segments={shares}
              named={NAMED_SHARES}
              othersLabel="Rest of the top ten"
              accessibilityLabel={shareSummary(shares, ordering)}
              testID="top-products-share"
            />
          </MBCard>

          <Text style={[theme.type.caption, styles.note, { color: theme.colors.textMuted }]}>
            The server reports the ten highest-earning products for this range. The share bar
            splits those ten — it is not a share of the whole catalogue.
            {ordering === 'units' ? ` They sold ${formatQty(totalUnits)} units between them.` : ''}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

function shareSummary(
  segments: readonly { label: string; value: number }[],
  ordering: Ordering,
): string {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const head = segments[0];
  if (!head || total <= 0) return 'No share to show for this period.';
  const pct = Math.round((head.value / total) * 100);
  const unit = ordering === 'units' ? 'units' : 'revenue';
  return `Share of ${unit} across the top ten. ${head.label} is the largest at ${pct} per cent.`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  note: { paddingHorizontal: space.xs },
});
