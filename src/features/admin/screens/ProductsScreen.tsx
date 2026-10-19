import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  useAdminProductPages,
  useAllPackingMaterials,
  useProductCategories,
  type AdminProductsQuery,
  type CatalogProduct,
  type PackingMaterial,
} from '@/api';
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
import { AdminListScreen, DetailRow, FieldGrid, MONO_FONT } from '../components';
import { formatRsCompact, karachiDisplayDate } from '../utils/catalogFormat';

type Tab = 'products' | 'packing';
const TABS: FilterChipOption<Tab>[] = [
  { value: 'products', label: 'Products' },
  { value: 'packing', label: 'Packing Materials' },
];

/**
 * Web `/products`: two catalogues, deliberately never mixed — bakery products
 * (priced, sold) and packing materials (service items supplied with a demand).
 * Read-only in this phase: no add / edit / change-price / activate.
 */
export function ProductsScreen() {
  const [tab, setTab] = useState<Tab>('products');
  const tabs = <FilterChipRow options={TABS} value={tab} onChange={setTab} />;
  return tab === 'products' ? <ProductsTab tabs={tabs} /> : <PackingMaterialsTab tabs={tabs} />;
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

function ProductsTab({ tabs }: { tabs: ReactNode }) {
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
      renderItem={({ item }) => <ProductCard product={item} />}
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

/** One product row as a card: name over SKU, then Category / Price / Cost, Status as the badge. */
function ProductCard({ product }: { product: CatalogProduct }) {
  const theme = useAppTheme();
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
    </Card>
  );
}

// ─── Packing Materials ───────────────────────────────────────────────────────

/**
 * The admin catalogue for packing materials — disabled ones included, no
 * Price or Cost (service items, never sold). Tap a card for the web's View.
 */
function PackingMaterialsTab({ tabs }: { tabs: ReactNode }) {
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

const styles = StyleSheet.create({
  card: { padding: 14 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  moreToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rangeInput: { flex: 1, height: 44, borderWidth: 1, paddingHorizontal: 12 },
});
