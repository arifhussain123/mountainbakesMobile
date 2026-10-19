import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAdminCustomersData, useBranches, type AdminCustomer, type AdminCustomersQuery } from '@/api';
import { openDrawer } from '@/navigation';
import { useDebouncedValue } from '@/shared/hooks';
import { useAppTheme } from '@/shared/theme';
import {
  AppHeader,
  Card,
  Dropdown,
  EmptyState,
  ErrorState,
  FormBottomSheet,
  Icon,
  LoadingSkeleton,
  PrimaryButton,
  Screen,
  SearchBar,
  SecondaryButton,
  TextField,
  type DropdownOption,
} from '@/shared/ui';
import { FieldGrid } from '../components';

const ALL = 'all';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The web table's sortable columns (`sortableFields` on the `customers` resource), both directions. */
const SORT_OPTIONS: DropdownOption[] = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'name:desc', label: 'Name Z–A' },
  { value: 'totalOrders:desc', label: 'Most orders' },
  { value: 'totalOrders:asc', label: 'Fewest orders' },
  { value: 'totalSpent:desc', label: 'Highest spent' },
  { value: 'totalSpent:asc', label: 'Lowest spent' },
  { value: 'branchName:asc', label: 'Branch A–Z' },
  { value: 'branchName:desc', label: 'Branch Z–A' },
];

interface SecondaryFilters {
  ordersMin: string;
  ordersMax: string;
  spentMin: string;
  spentMax: string;
  sinceFrom: string;
  sinceTo: string;
}

const NO_FILTERS: SecondaryFilters = { ordersMin: '', ordersMax: '', spentMin: '', spentMax: '', sinceFrom: '', sinceTo: '' };

const numberOrEmpty = (v: string) => (v.trim() !== '' && Number.isFinite(Number(v)) ? v.trim() : '');
const dateOrEmpty = (v: string) => (ISO_DATE.test(v.trim()) ? v.trim() : '');

/**
 * Super Admin → Customers (web /customers). The Data Engine `customers`
 * resource: searched (name, phone, email), filtered, sorted and paged in the
 * database, 50 at a time with the next page on scroll. Branch sits in the bar
 * as on the web; Orders, Total spent and Customer since are in the filter
 * sheet. Read-only this phase — no Add or Edit.
 */
export function CustomersScreen() {
  const theme = useAppTheme();
  const filterSheetRef = useRef<BottomSheetModal>(null);

  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim());
  const [branchId, setBranchId] = useState<string>(ALL);
  const [sort, setSort] = useState<string>('createdAt:desc');
  const [filters, setFilters] = useState<SecondaryFilters>(NO_FILTERS);
  const [draft, setDraft] = useState<SecondaryFilters>(NO_FILTERS);

  const branchesQ = useBranches();
  const branchOptions = useMemo<DropdownOption[]>(
    () => [{ value: ALL, label: 'All Branches' }, ...(branchesQ.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name }))],
    [branchesQ.data],
  );

  const query: AdminCustomersQuery = {
    search: term || undefined,
    branchId: branchId === ALL ? null : branchId,
    ordersMin: numberOrEmpty(filters.ordersMin),
    ordersMax: numberOrEmpty(filters.ordersMax),
    spentMin: numberOrEmpty(filters.spentMin),
    spentMax: numberOrEmpty(filters.spentMax),
    sinceFrom: dateOrEmpty(filters.sinceFrom),
    sinceTo: dateOrEmpty(filters.sinceTo),
    sort,
  };
  const q = useAdminCustomersData(query);
  const customers = useMemo(() => q.data?.pages.flatMap((p) => p.data) ?? [], [q.data]);
  const total = q.data?.pages[0]?.total ?? null;

  const secondaryCount = [
    query.ordersMin || query.ordersMax,
    query.spentMin || query.spentMax,
    query.sinceFrom || query.sinceTo,
  ].filter(Boolean).length;
  const filtered = !!term || branchId !== ALL || secondaryCount > 0;

  const openFilters = () => {
    setDraft(filters);
    filterSheetRef.current?.present();
  };

  const renderItem = ({ item }: { item: AdminCustomer }) => (
    <Card style={{ padding: 14 }}>
      <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={2}>
        {item.name}
      </Text>
      {item.email ? (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
          {item.email}
        </Text>
      ) : null}
      <FieldGrid
        columns={2}
        items={[
          { label: 'Phone', value: item.phone || '—' },
          { label: 'Branch', value: item.branchName || '—' },
          { label: 'Orders', value: String(item.totalOrders), valueStyle: { fontWeight: '600' } },
          { label: 'Total Spent', value: `Rs.${(item.totalSpent || 0).toLocaleString('en-US')}`, valueStyle: { fontWeight: '700' } },
        ]}
      />
      <View style={{ marginTop: 10 }}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Address</Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>{item.address || '—'}</Text>
      </View>
    </Card>
  );

  const header = (
    <View style={{ gap: 10, marginBottom: theme.spacing.sm }}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, phone, email…" />
      <Dropdown options={branchOptions} value={branchId} onChange={setBranchId} placeholder="All Branches" loading={branchesQ.isLoading} />
      <View style={styles.controls}>
        <View style={{ flex: 1 }}>
          <Dropdown options={SORT_OPTIONS} value={sort} onChange={setSort} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={secondaryCount > 0 ? `Filters, ${secondaryCount} active` : 'Filters'}
          onPress={openFilters}
          style={[
            styles.filterButton,
            {
              borderColor: secondaryCount > 0 ? theme.colors.primary : theme.colors.border,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.md,
            },
          ]}>
          <Icon name="list-indent" size={16} color={secondaryCount > 0 ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[theme.typography.label, { color: secondaryCount > 0 ? theme.colors.primary : theme.colors.text, fontWeight: '700' }]}>
            Filters{secondaryCount > 0 ? ` (${secondaryCount})` : ''}
          </Text>
        </Pressable>
      </View>
      {secondaryCount > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => setFilters(NO_FILTERS)} style={{ alignSelf: 'flex-start' }}>
          <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>Clear filters</Text>
        </Pressable>
      ) : null}
      {q.isLoading ? <LoadingSkeleton height={160} /> : null}
      {q.error && customers.length === 0 ? <ErrorState message="Couldn’t load this list" onRetry={() => void q.refetch()} /> : null}
    </View>
  );

  return (
    <Screen>
      <AppHeader
        title="Customers"
        subtitle={total === null ? 'Loading…' : `${total.toLocaleString('en-US')} ${total === 1 ? 'customer' : 'customers'}`}
        actions={[{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <FlatList
        data={q.isLoading || (q.error && customers.length === 0) ? [] : customers}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 3, gap: 8 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          !q.isLoading && !q.error ? (
            <EmptyState title="No customers yet" message={filtered ? 'Try a different search or clear the filters.' : undefined} />
          ) : undefined
        }
        ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: theme.spacing.md }} color={theme.colors.primary} /> : undefined}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
        }}
        refreshing={q.isRefetching && !q.isFetchingNextPage}
        onRefresh={() => void q.refetch()}
        keyboardShouldPersistTaps="handled"
      />

      <FormBottomSheet ref={filterSheetRef} title="Filters" onRequestClose={() => filterSheetRef.current?.dismiss()}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Orders</Text>
        <View style={styles.pair}>
          <View style={{ flex: 1 }}>
            <TextField label="Min" value={draft.ordersMin} onChangeText={(v) => setDraft((d) => ({ ...d, ordersMin: v }))} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Max" value={draft.ordersMax} onChangeText={(v) => setDraft((d) => ({ ...d, ordersMax: v }))} keyboardType="number-pad" />
          </View>
        </View>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>Total spent (Rs.)</Text>
        <View style={styles.pair}>
          <View style={{ flex: 1 }}>
            <TextField label="Min" value={draft.spentMin} onChangeText={(v) => setDraft((d) => ({ ...d, spentMin: v }))} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Max" value={draft.spentMax} onChangeText={(v) => setDraft((d) => ({ ...d, spentMax: v }))} keyboardType="decimal-pad" />
          </View>
        </View>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>Customer since</Text>
        <View style={styles.pair}>
          <View style={{ flex: 1 }}>
            <TextField
              label="From"
              value={draft.sinceFrom}
              onChangeText={(v) => setDraft((d) => ({ ...d, sinceFrom: v }))}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              error={draft.sinceFrom && !ISO_DATE.test(draft.sinceFrom.trim()) ? 'Use YYYY-MM-DD' : undefined}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="To"
              value={draft.sinceTo}
              onChangeText={(v) => setDraft((d) => ({ ...d, sinceTo: v }))}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              error={draft.sinceTo && !ISO_DATE.test(draft.sinceTo.trim()) ? 'Use YYYY-MM-DD' : undefined}
            />
          </View>
        </View>
        <View style={[styles.pair, { marginTop: theme.spacing.lg }]}>
          <View style={{ flex: 1 }}>
            <SecondaryButton
              label="Clear"
              onPress={() => {
                setDraft(NO_FILTERS);
                setFilters(NO_FILTERS);
                filterSheetRef.current?.dismiss();
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label="Apply"
              onPress={() => {
                setFilters(draft);
                filterSheetRef.current?.dismiss();
              }}
            />
          </View>
        </View>
      </FormBottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  filterButton: { height: 46, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pair: { flexDirection: 'row', gap: 10 },
});
