import { useProductCategories, type ProductCategory } from '@/api';
import { AdminListScreen, AdminRow } from '../components';

/**
 * Web `/categories`: each category's name with an Active/Inactive badge, in
 * sort order. Read-only in this phase (no add / rename / remove).
 */
export function CategoriesScreen() {
  const q = useProductCategories();

  return (
    <AdminListScreen<ProductCategory>
      title="Categories"
      subtitle="Manage product categories"
      data={q.data?.categories ?? []}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <AdminRow title={item.name} badge={{ label: item.isActive ? 'Active' : 'Inactive', variant: item.isActive ? 'success' : 'neutral' }} />
      )}
      isLoading={q.isLoading}
      error={q.error}
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      emptyTitle="No categories"
    />
  );
}
