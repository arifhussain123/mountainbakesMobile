import { useMemo } from 'react';
import { useCatalogProducts, useProductCategories, type ProductCategory } from '@/api';
import { formatCount } from '@/shared/utils';
import { AdminListScreen, AdminRow } from '../components';

/** Active product categories in their sort order, each with how many products use it. */
export function CategoriesScreen() {
  const q = useProductCategories();
  const productsQ = useCatalogProducts();

  const countByCategory = useMemo(() => {
    const map = new Map<string, { active: number; total: number }>();
    for (const p of productsQ.data?.products ?? []) {
      if (p.isSpecial || !p.categoryId) continue;
      const c = map.get(p.categoryId) ?? { active: 0, total: 0 };
      c.total += 1;
      if (p.isActive) c.active += 1;
      map.set(p.categoryId, c);
    }
    return map;
  }, [productsQ.data]);

  const categories = q.data?.categories ?? [];

  return (
    <AdminListScreen<ProductCategory>
      title="Categories"
      subtitle={`${formatCount(categories.length)} active categories. Read-only.`}
      data={categories}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => {
        const c = countByCategory.get(item.id);
        return (
          <AdminRow
            title={item.name}
            lines={[`/${item.slug}`, productsQ.data ? `${formatCount(c?.active ?? 0)} active · ${formatCount(c?.total ?? 0)} total products` : null]}
          />
        );
      }}
      isLoading={q.isLoading}
      error={q.error}
      refreshing={q.isRefetching}
      onRefresh={() => {
        void q.refetch();
        void productsQ.refetch();
      }}
      emptyTitle="No Categories"
      emptyMessage="Categories created on the web will appear here."
    />
  );
}
