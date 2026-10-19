import { useMemo, useState } from 'react';
import { useCatalogProducts, type CatalogProduct } from '@/api';
import { useDebouncedValue } from '@/shared/hooks';
import { FilterChipRow, SearchBar, type FilterChipOption } from '@/shared/ui';
import { formatCount, formatCurrency, includesTerm } from '@/shared/utils';
import { AdminListScreen, AdminRow, SummaryTiles } from '../components';

type ActiveFilter = 'active' | 'inactive' | 'all';
const ACTIVE_OPTIONS: FilterChipOption<ActiveFilter>[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'all', label: 'All' },
];

/**
 * The product catalogue (Special Order one-offs left out), A–Z. Products shows
 * code, category, price and cost; Price List is the same rows grouped by
 * category with the current selling price only.
 */
export function ProductsScreen({ mode = 'products' }: { mode?: 'products' | 'priceList' }) {
  const q = useCatalogProducts();
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim().toLowerCase());
  const [active, setActive] = useState<ActiveFilter>('active');

  const all = useMemo(() => (q.data?.products ?? []).filter((p) => !p.isSpecial), [q.data]);
  const rows = useMemo(() => {
    const filtered = all.filter(
      (p) =>
        (active === 'all' || p.isActive === (active === 'active')) &&
        (!term || includesTerm(p.name, term) || includesTerm(p.sku ?? '', term) || includesTerm(p.stockCode, term)),
    );
    if (mode === 'priceList') {
      return filtered.sort((a, b) => (a.categoryName ?? '').localeCompare(b.categoryName ?? '') || a.name.localeCompare(b.name));
    }
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [all, active, term, mode]);

  const activeCount = all.filter((p) => p.isActive).length;
  const noCost = all.filter((p) => p.isActive && (p.costPrice === null || p.costPrice === 0)).length;

  return (
    <AdminListScreen<CatalogProduct>
      title={mode === 'priceList' ? 'Price List' : 'Products'}
      subtitle={mode === 'priceList' ? 'Current selling prices by category. Read-only.' : 'The catalogue every branch sells from. Read-only.'}
      data={rows}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) =>
        mode === 'priceList' ? (
          <AdminRow
            title={item.name}
            lines={[`${item.categoryName || 'No category'} · ${item.sku || item.stockCode}`]}
            value={formatCurrency(item.price)}
            badge={item.isActive ? undefined : { label: 'Inactive', variant: 'neutral' }}
          />
        ) : (
          <AdminRow
            title={item.name}
            lines={[
              `${item.stockCode}${item.sku ? ` · SKU ${item.sku}` : ''}`,
              `${item.categoryName || 'No category'} · cost ${item.costPrice === null ? 'not set' : formatCurrency(item.costPrice)}`,
            ]}
            value={formatCurrency(item.price)}
            badge={{ label: item.isActive ? 'Active' : 'Inactive', variant: item.isActive ? 'success' : 'neutral' }}
          />
        )
      }
      isLoading={q.isLoading}
      error={q.error}
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      emptyTitle="No Products"
      emptyMessage={term ? 'Nothing matches that search.' : 'No products in this filter.'}
      header={
        <>
          <SummaryTiles
            tiles={[
              { label: 'Active', value: formatCount(activeCount) },
              { label: 'Inactive', value: formatCount(all.length - activeCount) },
              ...(mode === 'products' ? [{ label: 'Active, no cost', value: formatCount(noCost), tone: noCost > 0 ? ('warning' as const) : undefined }] : []),
            ]}
          />
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, code or SKU" />
          <FilterChipRow options={ACTIVE_OPTIONS} value={active} onChange={setActive} />
        </>
      }
    />
  );
}

export function PriceListScreen() {
  return <ProductsScreen mode="priceList" />;
}
