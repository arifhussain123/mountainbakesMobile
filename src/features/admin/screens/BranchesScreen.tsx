import { useAdminBranches, type AdminBranch } from '@/api';
import { formatCount } from '@/shared/utils';
import { AdminListScreen, AdminRow, SummaryTiles } from '../components';

/** Every branch, deactivated ones included (delete is a soft deactivate on the server). */
export function BranchesScreen() {
  const q = useAdminBranches();
  const branches = q.data?.branches ?? [];
  const active = branches.filter((b) => b.isActive).length;

  return (
    <AdminListScreen<AdminBranch>
      title="Branches"
      subtitle="Every branch, active and deactivated. Read-only."
      data={branches}
      keyExtractor={(b) => b.id}
      renderItem={({ item }) => (
        <AdminRow
          title={item.name}
          lines={[
            [item.address, item.city].filter(Boolean).join(', ') || null,
            item.phone ? `Phone ${item.phone}` : null,
            `Company share ${item.companySharePct === null || item.companySharePct === undefined ? 'default rate' : `${item.companySharePct}%`}`,
          ]}
          badge={{ label: item.isActive ? 'Active' : 'Deactivated', variant: item.isActive ? 'success' : 'neutral' }}
        />
      )}
      isLoading={q.isLoading}
      error={q.error}
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      emptyTitle="No Branches"
      header={
        q.data ? (
          <SummaryTiles
            tiles={[
              { label: 'Active', value: formatCount(active) },
              { label: 'Deactivated', value: formatCount(branches.length - active) },
            ]}
          />
        ) : null
      }
    />
  );
}
