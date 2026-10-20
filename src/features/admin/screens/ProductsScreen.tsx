import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  useAdminProductPages,
  useAllPackingMaterials,
  useDeactivateProduct,
  useDeletePackingMaterial,
  useProductCategories,
  useUpdatePackingMaterial,
  useUpdateProduct,
  type AdminProductsQuery,
  type CatalogProduct,
  type PackingMaterial,
} from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useDebouncedValue } from '@/shared/hooks';
import { useAppTheme } from '@/shared/theme';
import {
  Card,
  Dropdown,
  FilterChipRow,
  FormBottomSheet,
  Icon,
  SearchBar,
  StatusBadge,
  type DropdownOption,
  type FilterChipOption,
} from '@/shared/ui';
import { includesTerm } from '@/shared/utils';
import { ActionChip, AdminListScreen, DetailRow, FieldGrid, MONO_FONT } from '../components';
import { formatRsCompact, karachiDisplayDate } from '../utils/catalogFormat';
import { deletePackingMaterialPrompt, packingToggleCopy, productRowActions, removeProductPrompt } from '../utils/productsActions';
import { useProductsSheet, type ProductsSheet } from './Products/productsSheets';

type Tab = 'products' | 'packing';
const TABS: FilterChipOption<Tab>[] = [
  { value: 'products', label: 'Products' },
  { value: 'packing', label: 'Packing Materials' },
];

type OpenSheet = (sheet: ProductsSheet) => void;

/**
 * Web `/products`: two catalogues, deliberately never mixed — bakery products
 * (priced, sold) and packing materials (service items supplied with a demand).
 * With the web's actions: Add / Edit / Change Price / Deactivate / Activate a
 * product, and Add / Edit / Disable / Enable / Delete a packing material.
 * Each tab owns its own Add, as on the web.
 */
export function ProductsScreen() {
  const [tab, setTab] = useState<Tab>('products');
  const sheet = useProductsSheet();
  const tabs = <FilterChipRow options={TABS} value={tab} onChange={setTab} />;
  return (
    <>
      {tab === 'products' ? <ProductsTab tabs={tabs} openSheet={sheet.open} /> : <PackingMaterialsTab tabs={tabs} openSheet={sheet.open} />}
      {sheet.element}
    </>
  );
}

// ─── Products ────────────────────────────────────────────────────────────────

const ALL = '__all__';
type StatusFilter = 'all' | 'active' | 'inactive';
const STATUS_OPTIONS: FilterChipOption<StatusFilter>[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

/** The Data Engine's sortable fields (registry `productsConfig.sortableFields`), name A–Z first as on the web. */
const SORT_OPTIONS: DropdownOption[] = [
  { value: 'name:asc', label: 'Product (A–Z)' },
  { value: 'name:desc', label: 'Product (Z–A)' },
  { value: 'sku:asc', label: 'SKU' },
  { value: 'stockCode:asc', label: 'Code' },
  { value: 'categoryName:asc', label: 'Category' },
  { value: 'price:asc', label: 'Price (low to high)' },
  { value: 'price:desc', label: 'Price (high to low)' },
  { value: 'costPrice:asc', label: 'Cost (low to high)' },
  { value: 'costPrice:desc', label: 'Cost (high to low)' },
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'updatedAt:desc', label: 'Recently updated' },
];

function parsePrice(text: string): number | undefined {
  if (!text) return undefined;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function ProductsTab({ tabs, openSheet }: { tabs: ReactNode; openSheet: OpenSheet }) {
  const theme = useAppTheme();
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim());
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [minText, setMinText] = useState('');
  const [maxText, setMaxText] = useState('');
  const min = useDebouncedValue(minText.trim());
  const max = useDebouncedValue(maxText.trim());
  const [sort, setSort] = useState('name:asc');
  const [moreOpen, setMoreOpen] = useState(false);

  const query = useMemo<AdminProductsQuery>(
    () => ({
      search: term || undefined,
      categoryId: categoryId === ALL ? undefined : categoryId,
      isActive: status === 'all' ? undefined : status === 'active',
      priceMin: parsePrice(min),
      priceMax: parsePrice(max),
      sort,
    }),
    [term, categoryId, status, min, max, sort],
  );

  const q = useAdminProductPages(query);
  const categoriesQ = useProductCategories();
  const rows = useMemo(() => q.data?.pages.flatMap((p) => p.data) ?? [], [q.data]);
  const total = q.data?.pages[0]?.total;

  const categoryOptions = useMemo<DropdownOption[]>(
    () => [{ value: ALL, label: 'All Categories' }, ...(categoriesQ.data?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))],
    [categoriesQ.data],
  );
  const moreActive = (parsePrice(min) !== undefined ? 1 : 0) + (parsePrice(max) !== undefined ? 1 : 0) + (sort !== 'name:asc' ? 1 : 0);

  return (
    <AdminListScreen<CatalogProduct>
      title="Products"
      subtitle={total === undefined ? 'Loading…' : `${total.toLocaleString('en-US')} products in catalog`}
      data={rows}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <ProductCard product={item} openSheet={openSheet} />}
      isLoading={q.isLoading}
      error={q.error}
      refreshing={q.isRefetching && !q.isFetchingNextPage}
      onRefresh={() => {
        void q.refetch();
        void categoriesQ.refetch();
      }}
      onEndReached={() => {
        if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
      }}
      loadingMore={q.isFetchingNextPage}
      emptyTitle="No products found"
      header={
        <>
          {tabs}
          <View style={styles.actions}>
            <ActionChip icon="plus" label="Add Product" primary onPress={() => openSheet({ kind: 'product', product: null })} />
          </View>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search products, SKU, code…" />
          <Dropdown options={categoryOptions} value={categoryId} onChange={setCategoryId} loading={categoriesQ.isLoading} />
          <FilterChipRow options={STATUS_OPTIONS} value={status} onChange={setStatus} />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: moreOpen }}
            onPress={() => setMoreOpen((o) => !o)}
            style={styles.moreToggle}>
            <Icon name="sort" size={16} color={theme.colors.primary} />
            <Text style={[theme.typography.bodySmall, { color: theme.colors.primary, fontWeight: '600', flex: 1 }]}>
              Price range & sort{moreActive > 0 ? ` (${moreActive})` : ''}
            </Text>
            <Icon name={moreOpen ? 'chevron-down' : 'chevron-right'} size={16} color={theme.colors.textSecondary} />
          </Pressable>
          {moreOpen ? (
            <View style={{ gap: 10 }}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Price (Rs.)</Text>
              <View style={styles.rangeRow}>
                <RangeInput value={minText} onChangeText={setMinText} placeholder="Min" />
                <Text style={{ color: theme.colors.textSecondary }}>–</Text>
                <RangeInput value={maxText} onChangeText={setMaxText} placeholder="Max" />
              </View>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Sort by</Text>
              <Dropdown options={SORT_OPTIONS} value={sort} onChange={setSort} />
            </View>
          ) : null}
        </>
      }
    />
  );
}

function RangeInput({ value, onChangeText, placeholder }: { value: string; onChangeText: (t: string) => void; placeholder: string }) {
  const theme = useAppTheme();
  return (
    <TextInput
      value={value}
      onChangeText={(t) => onChangeText(t.replace(/[^0-9.]/g, ''))}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textSecondary}
      keyboardType="decimal-pad"
      style={[
        theme.typography.body,
        styles.rangeInput,
        { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radii.md },
      ]}
    />
  );
}

/**
 * One product row as a card: name over SKU, then Category / Price / Cost,
 * Status as the badge, and the web's row actions. "Deactivate" is the web's
 * trash button — a soft delete (`DELETE /products/:id`), confirmed first;
 * Activate takes it back with `PUT { isActive: true }`.
 */
function ProductCard({ product, openSheet }: { product: CatalogProduct; openSheet: OpenSheet }) {
  const theme = useAppTheme();
  const deactivate = useDeactivateProduct();
  const update = useUpdateProduct();
  const actions = productRowActions(product);

  const confirmDeactivate = () =>
    Alert.alert('Deactivate Product', removeProductPrompt(product.name), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () =>
          deactivate.mutate(product.id, {
            onSuccess: () => Alert.alert('Removed', `${product.name} removed`),
            onError: (e) => Alert.alert('Could Not Remove the Product', mapErrorToMessage(e)),
          }),
      },
    ]);

  const activate = () =>
    update.mutate(
      { id: product.id, input: { isActive: true } },
      {
        onSuccess: () => Alert.alert('Activated', `${product.name} activated`),
        onError: (e) => Alert.alert('Could Not Activate the Product', mapErrorToMessage(e)),
      },
    );

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]} numberOfLines={2}>
            {product.name}
          </Text>
          {product.sku ? (
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontFamily: MONO_FONT, marginTop: 2 }]} numberOfLines={1}>
              {product.sku}
            </Text>
          ) : null}
        </View>
        <StatusBadge label={product.isActive ? 'Active' : 'Inactive'} variant={product.isActive ? 'success' : 'neutral'} />
      </View>
      <FieldGrid
        items={[
          { label: 'Category', value: product.categoryName || '—' },
          { label: 'Price', value: formatRsCompact(product.price), valueStyle: { color: theme.colors.primary, fontWeight: '700' } },
          { label: 'Cost', value: formatRsCompact(product.costPrice), valueStyle: { color: theme.colors.textSecondary } },
        ]}
      />
      <View style={[styles.actions, styles.rowActions]}>
        {actions.changePrice ? <ActionChip icon="banknote" label="Change Price" onPress={() => openSheet({ kind: 'price', product })} /> : null}
        {actions.edit ? <ActionChip icon="pencil" label="Edit" onPress={() => openSheet({ kind: 'product', product })} /> : null}
        {actions.deactivate ? <ActionChip icon="trash" label="Deactivate" danger loading={deactivate.isPending} onPress={confirmDeactivate} /> : null}
        {actions.activate ? <ActionChip icon="check" label="Activate" loading={update.isPending} onPress={activate} /> : null}
      </View>
    </Card>
  );
}

// ─── Packing Materials ───────────────────────────────────────────────────────

/**
 * The admin catalogue for packing materials — disabled ones included, no
 * Price or Cost (service items, never sold). Tap a card for the web's View.
 * Disable and Delete differ here, unlike products: Disable hides a material
 * from new demands; Delete removes it (past demands snapshot the name).
 */
function PackingMaterialsTab({ tabs, openSheet }: { tabs: ReactNode; openSheet: OpenSheet }) {
  const theme = useAppTheme();
  const q = useAllPackingMaterials();
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim().toLowerCase());
  const [viewing, setViewing] = useState<PackingMaterial | null>(null);
  const sheetRef = useRef<BottomSheetModal>(null);

  const materials = useMemo(() => q.data?.packingMaterials ?? [], [q.data]);
  const rows = useMemo(
    () =>
      term
        ? materials.filter(
            (m) => includesTerm(m.materialName, term) || includesTerm(m.materialCode, term) || includesTerm(m.category ?? '', term),
          )
        : materials,
    [materials, term],
  );
  const n = materials.length;

  return (
    <>
      <AdminListScreen<PackingMaterial>
        title="Products"
        subtitle={q.data ? `${n} item${n === 1 ? '' : 's'} · supplied with branch demands, not sold` : 'Loading…'}
        data={rows}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${item.materialName}`}
            onPress={() => {
              setViewing(item);
              sheetRef.current?.present();
            }}>
            <Card style={styles.card}>
              <View style={styles.head}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]} numberOfLines={2}>
                    {item.materialName}
                  </Text>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontFamily: MONO_FONT, marginTop: 2 }]} numberOfLines={1}>
                    {item.materialCode}
                  </Text>
                </View>
                <StatusBadge label={item.isActive ? 'Active' : 'Inactive'} variant={item.isActive ? 'success' : 'neutral'} />
              </View>
              <FieldGrid
                columns={2}
                items={[
                  { label: 'Category', value: item.category || '—', valueStyle: item.category ? undefined : { color: theme.colors.textSecondary } },
                  { label: 'Created Date', value: karachiDisplayDate(item.createdAt), valueStyle: { color: theme.colors.textSecondary } },
                ]}
              />
              <PackingMaterialActions material={item} openSheet={openSheet} />
            </Card>
          </Pressable>
        )}
        isLoading={q.isLoading}
        error={q.error}
        errorMessage="Failed to load packing materials"
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        emptyTitle="No results found"
        emptyMessage={term ? 'Try a different search term.' : undefined}
        header={
          <>
            {tabs}
            <View style={styles.actions}>
              <ActionChip icon="plus" label="Add Packing Material" primary onPress={() => openSheet({ kind: 'material', material: null })} />
            </View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search packing materials, code…" />
          </>
        }
      />
      <FormBottomSheet
        ref={sheetRef}
        title={viewing?.materialName ?? 'Packing Material'}
        snapPoints={['55%']}
        onRequestClose={() => sheetRef.current?.dismiss()}
        onDismiss={() => setViewing(null)}>
        {viewing ? (
          <View>
            <DetailRow label="Code" value={viewing.materialCode} mono />
            <DetailRow label="Category" value={viewing.category || '—'} />
            <DetailRow label="Status" value={viewing.isActive ? 'Active' : 'Inactive'} />
            <DetailRow label="Created" value={karachiDisplayDate(viewing.createdAt)} />
            {viewing.description ? <DetailRow label="Description" value={viewing.description} block /> : null}
          </View>
        ) : null}
      </FormBottomSheet>
    </>
  );
}

/** The web row's Edit / Disable–Enable / Delete (View is the card tap). */
function PackingMaterialActions({ material, openSheet }: { material: PackingMaterial; openSheet: OpenSheet }) {
  const update = useUpdatePackingMaterial();
  const remove = useDeletePackingMaterial();
  const toggle = packingToggleCopy(material);

  const runToggle = () =>
    update.mutate(
      { id: material.id, input: { isActive: !material.isActive } },
      {
        onSuccess: () => Alert.alert(toggle.label === 'Disable' ? 'Disabled' : 'Enabled', toggle.success),
        onError: (e) => Alert.alert(toggle.failure, mapErrorToMessage(e)),
      },
    );

  const pressToggle = () => {
    if (!toggle.confirm) {
      runToggle();
      return;
    }
    Alert.alert('Disable Packing Material', toggle.confirm, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disable', style: 'destructive', onPress: runToggle },
    ]);
  };

  const confirmDelete = () =>
    Alert.alert('Delete Packing Material', deletePackingMaterialPrompt(material.materialName), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(material.id, {
            onSuccess: () => Alert.alert('Deleted', `${material.materialName} deleted`),
            onError: (e) => Alert.alert('Could Not Delete the Packing Material', mapErrorToMessage(e)),
          }),
      },
    ]);

  return (
    <View style={[styles.actions, styles.rowActions]}>
      <ActionChip icon="pencil" label="Edit" onPress={() => openSheet({ kind: 'material', material })} />
      <ActionChip icon={material.isActive ? 'close' : 'check'} label={toggle.label} loading={update.isPending} onPress={pressToggle} />
      <ActionChip icon="trash" label="Delete" danger loading={remove.isPending} onPress={confirmDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowActions: { marginTop: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  moreToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rangeInput: { flex: 1, height: 44, borderWidth: 1, paddingHorizontal: 12 },
});
