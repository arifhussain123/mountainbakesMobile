import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useStock } from '@/api';
import { Routes, type StockStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, FormBottomSheet, LoadingSkeleton, Screen, SearchBar, StatCard } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { StockRow } from '../../components';
import { ReturnItemsSheetContent } from '../ReturnItemsScreen';
import { StockCheckSheetContent } from '../StockCheckScreen';
import { styles } from './styles';

type StatusFilter = 'All' | 'In stock' | 'Sold out';

export function StockOverviewScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<StockStackParamList>>();
  const stockCheckSheetRef = useRef<BottomSheetModal>(null);
  const returnItemsSheetRef = useRef<BottomSheetModal>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const { data, isLoading, error, refetch, isRefetching } = useStock();

  const rows = useMemo(() => data?.rows ?? [], [data]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          opening: acc.opening + row.opening,
          newQty: acc.newQty + row.newQty,
          sold: acc.sold + row.sold,
          returned: acc.returned + row.returned,
          balance: acc.balance + row.balance,
        }),
        { opening: 0, newQty: 0, sold: 0, returned: 0, balance: 0 },
      ),
    [rows],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === 'In stock' && row.balance <= 0) return false;
      if (statusFilter === 'Sold out' && row.balance > 0) return false;
      if (term && !row.productName.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [rows, search, statusFilter]);

  return (
    <Screen>
      <AppHeader title="Branch Stock" />
      <View style={styles.quickActionsRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => stockCheckSheetRef.current?.present()}
          style={[styles.quickAction, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[theme.typography.label, { color: theme.colors.text }]}>Stock Check</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => returnItemsSheetRef.current?.present()}
          style={[styles.quickAction, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[theme.typography.label, { color: theme.colors.text }]}>Return Items</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate(Routes.RETURN_STOCK_LIST)}
          style={[styles.quickAction, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[theme.typography.label, { color: theme.colors.text }]}>Return Stock</Text>
        </Pressable>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            {!isLoading && !error ? (
              <Card style={{ marginBottom: theme.spacing.md }}>
                <View style={styles.totalsGrid}>
                  <StatCard label="Opening" value={String(totals.opening)} />
                  <StatCard label="New" value={`+${totals.newQty}`} valueColor={theme.colors.success} />
                  <StatCard label="Sold" value={`-${totals.sold}`} valueColor={theme.colors.danger} />
                  <StatCard label="Returned" value={String(totals.returned)} valueColor={theme.colors.warning} />
                  <StatCard label="Remaining" value={String(totals.balance)} valueColor={theme.colors.primary} />
                </View>
              </Card>
            ) : null}
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search products…" />
            <View style={styles.filterRow}>
              {(['All', 'In stock', 'Sold out'] as StatusFilter[]).map((option) => {
                const active = option === statusFilter;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setStatusFilter(option)}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: active ? theme.colors.primary : theme.colors.border },
                    ]}>
                    <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text }]}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
            <View style={{ height: theme.spacing.md }} />
          </View>
        }
        ListEmptyComponent={!isLoading && !error ? <EmptyState title="No Products" message="No stock matches this filter." /> : undefined}
        renderItem={({ item }) => <StockRow row={item} />}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

      <FormBottomSheet ref={stockCheckSheetRef} title="Stock Check" subtitle="Count what's on the shelf, then Verify" onRequestClose={() => stockCheckSheetRef.current?.dismiss()}>
        <StockCheckSheetContent />
      </FormBottomSheet>
      <FormBottomSheet ref={returnItemsSheetRef} title="Return Items" onRequestClose={() => returnItemsSheetRef.current?.dismiss()}>
        <ReturnItemsSheetContent onClose={() => returnItemsSheetRef.current?.dismiss()} />
      </FormBottomSheet>
    </Screen>
  );
}
