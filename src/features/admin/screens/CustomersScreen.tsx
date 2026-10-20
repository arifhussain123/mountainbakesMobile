import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  customersExportParams,
  getBusinessDate,
  useAdminCustomersData,
  useBranches,
  useCreateCustomer,
  useUpdateCustomer,
  type AdminCustomer,
  type AdminCustomersQuery,
} from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useDebouncedValue } from '@/shared/hooks';
import { useAppTheme } from '@/shared/theme';
import {
  AppHeader,
  Card,
  DateField,
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
import { formatDisplayDate } from '@/shared/utils';
import { ActionChip, ActiveFilterChips, FieldGrid } from '../components';
import { useDataTableExport } from '../components/ExportSheet';
import { customerFormErrors, initialCustomerValues, type CustomerFormValues } from '../utils/catalogActions';
import { activeChips, chipLabel, rangeSideChips, searchChipLabel } from '../utils/listControls';
import { useAdminHeaderActions } from '../components/useAdminHeaderActions';

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
 * sheet (Customer since picked from the date picker), and every filter that
 * is on shows as a removable chip, as the web's do. The web's two actions: Add Customer (above the list) and Edit on each
 * card, one form sheet for both — the web has no delete. Saving refetches the
 * list. Export is the web table's menu (CSV of the loaded rows or of every
 * result, shared as text).
 */
export function CustomersScreen() {
  const headerActions = useAdminHeaderActions();
  const theme = useAppTheme();
  const filterSheetRef = useRef<BottomSheetModal>(null);
  const customerSheet = useCustomerSheet();

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
  const exportUi = useDataTableExport(
    {
      resource: 'customers',
      fileName: 'mountain-bakes-customers',
      params: customersExportParams(query),
      pageSize: 50,
      loadedPages: q.data?.pages.length ?? 0,
      loadedRows: customers.length,
      total,
    },
    'Export Customers',
  );

  const secondaryCount = [
    query.ordersMin || query.ordersMax,
    query.spentMin || query.spentMax,
    query.sinceFrom || query.sinceTo,
  ].filter(Boolean).length;
  const filtered = !!term || branchId !== ALL || secondaryCount > 0;

  // The web's chips: one per side of each range ("Orders from 5"), each removable on its own.
  const clearField = (field: keyof SecondaryFilters) => () => setFilters((f) => ({ ...f, [field]: '' }));
  const chips = activeChips([
    !!term && { key: 'search', label: searchChipLabel(term), onRemove: () => setSearch('') },
    branchId !== ALL && {
      key: 'branchId',
      label: chipLabel('Branch', branchOptions.find((o) => o.value === branchId)?.label ?? 'Branch'),
      onRemove: () => setBranchId(ALL),
    },
    rangeSideChips('totalOrders', 'Orders', { from: query.ordersMin, to: query.ordersMax }, { from: clearField('ordersMin'), to: clearField('ordersMax') }),
    rangeSideChips('totalSpent', 'Total spent (Rs.)', { from: query.spentMin, to: query.spentMax }, { from: clearField('spentMin'), to: clearField('spentMax') }),
    rangeSideChips(
      'createdAt',
      'Customer since',
      { from: query.sinceFrom, to: query.sinceTo },
      { from: clearField('sinceFrom'), to: clearField('sinceTo') },
      formatDisplayDate,
    ),
  ]);
  const clearAll = () => {
    setSearch('');
    setBranchId(ALL);
    setFilters(NO_FILTERS);
  };
  const today = getBusinessDate();

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
      <View style={[styles.pair, { marginTop: 10 }]}>
        <ActionChip icon="pencil" label="Edit" onPress={() => customerSheet.open(item)} />
      </View>
    </Card>
  );

  const header = (
    <View style={{ gap: 10, marginBottom: theme.spacing.sm }}>
      <View style={{ alignSelf: 'flex-end', flexDirection: 'row', gap: 8 }}>
        {exportUi.chip}
        <ActionChip icon="plus" label="Add Customer" primary onPress={() => customerSheet.open(null)} />
      </View>
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
      <ActiveFilterChips chips={chips} onClearAll={clearAll} />
      {q.isLoading ? <LoadingSkeleton height={160} /> : null}
      {q.error && customers.length === 0 ? <ErrorState message="Couldn’t load this list" onRetry={() => void q.refetch()} /> : null}
    </View>
  );

  return (
    <Screen>
      <AppHeader
        title="Customers"
        subtitle={total === null ? 'Loading…' : `${total.toLocaleString('en-US')} ${total === 1 ? 'customer' : 'customers'}`}
        actions={headerActions}
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
            <DateField
              label="From"
              value={draft.sinceFrom}
              onChange={(v) => setDraft((d) => ({ ...d, sinceFrom: v }))}
              onClear={() => setDraft((d) => ({ ...d, sinceFrom: '' }))}
              placeholder="Any"
              maximumDate={draft.sinceTo || today}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DateField
              label="To"
              value={draft.sinceTo}
              onChange={(v) => setDraft((d) => ({ ...d, sinceTo: v }))}
              onClear={() => setDraft((d) => ({ ...d, sinceTo: '' }))}
              placeholder="Any"
              minimumDate={draft.sinceFrom || undefined}
              maximumDate={today}
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
      {customerSheet.element}
      {exportUi.element}
    </Screen>
  );
}

/**
 * Web `CustomerForm`, for Add (`customer` null) and Edit. Errors show after
 * the first Save, as react-hook-form does. Branch is picked on Add only: the
 * web's Edit sends `branchId` too, but the server's update schema drops it, so
 * here it is shown read-only rather than as a choice that would not stick.
 */
function CustomerForm({ customer, onClose }: { customer: AdminCustomer | null; onClose: () => void }) {
  const theme = useAppTheme();
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const branchesQ = useBranches();
  const [values, setValues] = useState<CustomerFormValues>(() => initialCustomerValues(customer));
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? customerFormErrors(values) : {};
  const busy = create.isPending || update.isPending;
  const set = (field: keyof CustomerFormValues) => (v: string) => setValues((p) => ({ ...p, [field]: v }));

  const branchOptions = useMemo<DropdownOption[]>(
    () => (branchesQ.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name })),
    [branchesQ.data],
  );

  const save = () => {
    setSubmitted(true);
    if (Object.keys(customerFormErrors(values)).length > 0) return;
    const onError = (e: unknown) => Alert.alert('Could Not Save Customer', mapErrorToMessage(e));
    if (customer) {
      update.mutate(
        { id: customer.id, input: values },
        {
          onSuccess: () => {
            Alert.alert('Updated', 'Customer updated.');
            onClose();
          },
          onError,
        },
      );
    } else {
      create.mutate(values, {
        onSuccess: () => {
          Alert.alert('Added', 'Customer added.');
          onClose();
        },
        onError,
      });
    }
  };

  return (
    <View>
      <TextField label="Full Name" value={values.name} onChangeText={set('name')} placeholder="Ahmed Khan" error={errors.name} />
      <TextField
        label="Phone Number"
        value={values.phone}
        onChangeText={set('phone')}
        placeholder="03001234567"
        keyboardType="phone-pad"
        error={errors.phone}
      />
      <TextField
        label="Email (optional)"
        value={values.email}
        onChangeText={set('email')}
        placeholder="ahmed@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
      />
      <TextField label="Address (optional)" value={values.address} onChangeText={set('address')} placeholder="Street, area, city" />
      {customer ? (
        <TextField label="Branch" value={customer.branchName || '—'} editable={false} />
      ) : (
        <View style={{ marginTop: 16, gap: 8 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700' }]}>Branch</Text>
          <Dropdown options={branchOptions} value={values.branchId || null} onChange={set('branchId')} placeholder="Select branch" loading={branchesQ.isLoading} />
          {errors.branchId ? <Text style={[theme.typography.label, { color: theme.colors.danger }]}>{errors.branchId}</Text> : null}
        </View>
      )}
      <View style={{ marginTop: 18 }}>
        <PrimaryButton label={customer ? 'Update Customer' : 'Add Customer'} onPress={save} loading={busy} />
      </View>
    </View>
  );
}

function useCustomerSheet() {
  const ref = useRef<BottomSheetModal>(null);
  // undefined = closed; null = Add; a customer = Edit.
  const [customer, setCustomer] = useState<AdminCustomer | null | undefined>(undefined);
  const close = () => ref.current?.dismiss();

  const open = (next: AdminCustomer | null) => {
    setCustomer(next);
    ref.current?.present();
  };

  const element = (
    <FormBottomSheet
      ref={ref}
      title={customer ? 'Edit Customer' : 'Add Customer'}
      subtitle={customer?.name}
      onRequestClose={close}
      onDismiss={() => setCustomer(undefined)}>
      {customer !== undefined ? <CustomerForm key={customer?.id ?? 'new'} customer={customer} onClose={close} /> : null}
    </FormBottomSheet>
  );

  return { open, element };
}

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  filterButton: { height: 46, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pair: { flexDirection: 'row', gap: 10 },
});
