import { useState } from 'react';
import { useAdminCustomers, type AdminCustomer } from '@/api';
import { useDebouncedValue } from '@/shared/hooks';
import { SearchBar } from '@/shared/ui';
import { formatCount, formatCurrency, formatDisplayDate } from '@/shared/utils';
import { AdminListScreen, AdminRow } from '../components';

/** Every branch's customers, newest first. Search runs on the server (name or phone). */
export function CustomersScreen() {
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim());
  const q = useAdminCustomers(term);
  const customers = q.data?.customers ?? [];

  return (
    <AdminListScreen<AdminCustomer>
      title="Customers"
      subtitle={q.data ? `${formatCount(q.data.total)} customers · all branches` : 'All branches'}
      data={customers}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <AdminRow
          title={item.name || 'Unnamed customer'}
          lines={[
            [item.phone, item.branchName].filter(Boolean).join(' · '),
            `${formatCount(item.totalOrders)} orders · since ${formatDisplayDate(item.createdAt.slice(0, 10))}`,
          ]}
          value={formatCurrency(item.totalSpent)}
        />
      )}
      isLoading={q.isLoading}
      error={q.error}
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      emptyTitle={term ? 'No Matching Customers' : 'No Customers Yet'}
      emptyMessage={term ? 'Try a different name or phone number.' : 'Customers saved at a sale will appear here.'}
      header={<SearchBar value={search} onChangeText={setSearch} placeholder="Search name or phone" />}
    />
  );
}
