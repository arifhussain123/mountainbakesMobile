import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO, subDays } from 'date-fns';
import { getBusinessDate, getBusinessDayBounds, useOrders } from '@/api';
import { Routes, type SalesStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { ErrorState, Icon, LoadingSkeleton, Screen, SearchBar } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { ItemsSoldCard, paymentMethodColor, PaymentMethodTileGrid, SaleCard, SalesDateChipRow, SalesHeroCard } from '../../components';
import { styles } from './styles';

const PAYMENT_FILTERS = ['All', 'cash', 'easypaisa', 'foodpanda', 'bank_account'] as const;
const PAYMENT_LABEL: Record<string, string> = { All: 'All', cash: 'Cash', easypaisa: 'Easypaisa', foodpanda: 'Foodpanda', bank_account: 'Bank' };
const PAGE_SIZE = 20;

export function SalesListScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<SalesStackParamList>>();
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<(typeof PAYMENT_FILTERS)[number]>('All');
  const [selectedDate, setSelectedDate] = useState(() => getBusinessDate());
  const [page, setPage] = useState(1);

  const today = useMemo(() => getBusinessDate(), []);
  const isToday = selectedDate === today;
  const bounds = useMemo(() => getBusinessDayBounds(selectedDate), [selectedDate]);
  const dateLabel = useMemo(() => format(parseISO(selectedDate), 'EEE d MMM yyyy'), [selectedDate]);

  const { data, isLoading, error, refetch, isRefetching } = useOrders({ status: 'delivered', from: bounds.from, to: bounds.to });

  const filtered = useMemo(() => {
    const orders = data?.orders ?? [];
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (paymentFilter !== 'All' && order.paymentMethod !== paymentFilter) return false;
      if (!term) return true;
      return order.orderNumber.toLowerCase().includes(term) || order.customerName.toLowerCase().includes(term) || order.customerPhone.includes(term);
    });
  }, [data, search, paymentFilter]);

  // Reset to page 1 whenever the underlying list changes shape.
  useEffect(() => {
    setPage(1);
  }, [search, paymentFilter, selectedDate, data]);

  const totals = useMemo(() => {
    const gross = filtered.reduce((sum, o) => sum + o.subtotal, 0);
    const discount = filtered.reduce((sum, o) => sum + o.discountTotal, 0);
    const net = filtered.reduce((sum, o) => sum + o.grandTotal, 0);
    return { gross, discount, net };
  }, [filtered]);

  // Payment-method breakdown — summed client-side from the same order list
  // already fetched for this business date (no separate aggregate endpoint
  // exists yet; see CLAUDE.md §36 note on preferring backend aggregation —
  // there's nothing to call here, so this mirrors the gross/discount/net math
  // already done the same way just above).
  const paymentBreakdown = useMemo(() => {
    const methods = ['cash', 'easypaisa', 'foodpanda', 'bank_account'] as const;
    const sums: Record<string, number> = { cash: 0, easypaisa: 0, foodpanda: 0, bank_account: 0 };
    for (const order of filtered) {
      if (order.paymentMethod in sums) sums[order.paymentMethod] += order.grandTotal;
    }
    return methods.map((method) => ({
      key: method,
      label: PAYMENT_LABEL[method],
      value: formatCurrency(sums[method]),
      dotColor: paymentMethodColor(theme, method),
    }));
  }, [filtered, theme]);

  // Items-sold aggregation — from each order's own `items` (already fetched),
  // grouped by product name.
  const itemsSold = useMemo(() => {
    const qtyByProduct = new Map<string, number>();
    for (const order of filtered) {
      for (const item of order.items) {
        qtyByProduct.set(item.productName, (qtyByProduct.get(item.productName) ?? 0) + item.qty);
      }
    }
    const entries = Array.from(qtyByProduct.entries()).sort((a, b) => b[1] - a[1]);
    const chips = entries.map(([name, qty]) => ({ key: name, n: name, q: `× ${qty}` }));
    const totalUnits = entries.reduce((sum, [, qty]) => sum + qty, 0);
    return { chips, totalUnits, totalProducts: chips.length };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  return (
    <Screen>
      <FlatList
        data={paginated}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            <View style={styles.eyebrowRow}>
              <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>
                Sales on {selectedDate} · {filtered.length} recorded
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Refresh sales" onPress={() => void refetch()} style={styles.refreshAction}>
                <Icon name="refresh" size={13} color={theme.colors.textSecondary} />
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700' }]}>Refresh</Text>
              </Pressable>
            </View>

            <View style={styles.titleRow}>
              <Text style={[theme.typography.screenTitle, { color: theme.colors.text, textTransform: 'uppercase' }]}>
                Today's{'\n'}
                <Text style={{ color: theme.colors.primary }}>Sales</Text>
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate(Routes.NEW_SALE)}
                style={[styles.newSalePill, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.pill }]}>
                <Icon name="plus" size={16} color={theme.colors.primaryText} />
                <Text style={[theme.typography.label, { color: theme.colors.primaryText, fontWeight: '700' }]}>New Sale</Text>
              </Pressable>
            </View>

            <SalesDateChipRow
              dateLabel={dateLabel}
              isToday={isToday}
              onPrevDay={() => setSelectedDate((d) => format(subDays(parseISO(d), 1), 'yyyy-MM-dd'))}
              onToday={() => setSelectedDate(today)}
            />

            {!isLoading && !error ? (
              <>
                <View style={{ marginTop: 14 }}>
                  <SalesHeroCard total={formatCurrency(totals.net)} gross={formatCurrency(totals.gross)} discount={formatCurrency(totals.discount)} />
                </View>
                <PaymentMethodTileGrid tiles={paymentBreakdown} />
                <ItemsSoldCard totalUnits={itemsSold.totalUnits} totalProducts={itemsSold.totalProducts} chips={itemsSold.chips} />
              </>
            ) : null}

            {isLoading ? <LoadingSkeleton height={220} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}

            <View style={{ marginTop: 18 }}>
              <SearchBar value={search} onChangeText={setSearch} placeholder="Search customer, phone, order #…" />
            </View>
            <View style={styles.filterChipsRow}>
              {PAYMENT_FILTERS.map((option) => {
                const active = option === paymentFilter;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setPaymentFilter(option)}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? theme.colors.primary : theme.colors.cardFill, borderColor: active ? theme.colors.primary : theme.colors.cardBorder },
                    ]}>
                    <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text }]}>
                      {PAYMENT_LABEL[option]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? (
            <View style={[styles.emptyBox, { borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
              <Text style={[theme.typography.cardTitle, { color: theme.colors.textSecondary }]}>No sales recorded</Text>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => <SaleCard order={item} />}
        ListFooterComponent={
          !isLoading && !error && filtered.length > 0 ? (
            <View style={styles.paginationRow}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{filtered.length} sales</Text>
              <View style={styles.paginationControls}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous page"
                  disabled={currentPage <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  style={[styles.pageArrow, { borderColor: theme.colors.cardBorder, opacity: currentPage <= 1 ? 0.4 : 1 }]}>
                  <Icon name="chevron-left" size={12} color={theme.colors.textLabel} />
                </Pressable>
                <View style={[styles.pageIndicator, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.primaryText, fontWeight: '700' }]}>{currentPage}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next page"
                  disabled={currentPage >= totalPages}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={[styles.pageArrow, { borderColor: theme.colors.cardBorder, opacity: currentPage >= totalPages ? 0.4 : 1 }]}>
                  <Icon name="chevron-right" size={12} color={theme.colors.textLabel} />
                </Pressable>
              </View>
            </View>
          ) : undefined
        }
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />
    </Screen>
  );
}
