import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getBusinessDate, getBusinessDayBounds, useProductionSales } from '@/api';
import { Routes, type ProductionSalesStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, LoadingSkeleton, PrimaryButton, Screen, SearchBar, StatCard } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { ProductionSaleCard } from '../../components';
import { styles } from './styles';

const PAYMENT_FILTERS = ['All', 'cash', 'easypaisa', 'foodpanda', 'bank_account', 'staff'] as const;
const PAYMENT_LABEL: Record<string, string> = {
  All: 'All',
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  foodpanda: 'Foodpanda',
  bank_account: 'Bank',
  staff: 'Staff',
};

/** mountainbakesProduction.html screen 05 — Sales: the counter's own sale history. */
export function ProductionSalesListScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ProductionSalesStackParamList>>();
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<(typeof PAYMENT_FILTERS)[number]>('All');

  const today = useMemo(() => getBusinessDate(), []);
  const bounds = useMemo(() => getBusinessDayBounds(today), [today]);

  const { data, isLoading, error, refetch, isRefetching } = useProductionSales({ from: bounds.from, to: bounds.to });

  const filtered = useMemo(() => {
    const orders = data?.orders ?? [];
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (paymentFilter !== 'All' && order.paymentMethod !== paymentFilter) return false;
      if (!term) return true;
      return order.orderNumber.toLowerCase().includes(term) || order.customerName.toLowerCase().includes(term) || order.customerPhone.includes(term);
    });
  }, [data, search, paymentFilter]);

  const totals = useMemo(() => {
    const gross = filtered.reduce((sum, o) => sum + o.subtotal, 0);
    const discount = filtered.reduce((sum, o) => sum + o.discountTotal, 0);
    const net = filtered.filter((o) => o.paymentMethod !== 'staff').reduce((sum, o) => sum + o.grandTotal, 0);
    return { gross, discount, net };
  }, [filtered]);

  return (
    <Screen>
      <AppHeader title="Sales" subtitle={`Today's counter sales · ${filtered.length} recorded`} actions={[]} />
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <PrimaryButton label="+ New Sale" onPress={() => navigation.navigate(Routes.PRODUCTION_NEW_SALE)} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search customer, phone, order #…" />
            <View style={styles.filterChipsRow}>
              {PAYMENT_FILTERS.map((option) => {
                const active = option === paymentFilter;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setPaymentFilter(option)}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: active ? theme.colors.primary : theme.colors.border },
                    ]}>
                    <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text }]}>
                      {PAYMENT_LABEL[option]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {!isLoading && !error ? (
              <Card style={{ marginTop: theme.spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm }}>
                  <StatCard label="Gross" value={formatCurrency(totals.gross)} />
                  <StatCard label="Discount" value={formatCurrency(totals.discount)} valueColor={theme.colors.danger} />
                  <StatCard label="Revenue" value={formatCurrency(totals.net)} valueColor={theme.colors.primary} />
                </View>
              </Card>
            ) : null}
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={!isLoading && !error ? <EmptyState title="No Sales Yet" message="Counter sales for today will appear here." /> : undefined}
        renderItem={({ item }) => <ProductionSaleCard order={item} />}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />
    </Screen>
  );
}
