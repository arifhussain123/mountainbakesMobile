import { useBranchLocations, type BranchLocationRow } from '@/api';
import { formatCount } from '@/shared/utils';
import { AdminListScreen, AdminRow, SummaryTiles } from '../components';

/** Each branch's geofence (centre and radius) and who is signed in near it right now. */
export function BranchLocationsScreen() {
  const q = useBranchLocations();
  const stats = q.data?.stats;

  return (
    <AdminListScreen<BranchLocationRow>
      title="Branch Locations"
      subtitle={q.data ? `Geofencing is ${q.data.geofencingEnabled ? 'ON' : 'OFF'}. Read-only.` : 'Read-only.'}
      data={q.data?.branches ?? []}
      keyExtractor={(b) => b.branchId}
      renderItem={({ item }) => (
        <AdminRow
          title={item.branchName}
          lines={[
            item.branchAddress || null,
            item.location
              ? `${item.location.latitude.toFixed(5)}, ${item.location.longitude.toFixed(5)} · radius ${item.location.radiusKm} km`
              : 'No GPS location set',
          ]}
          badge={
            item.location
              ? { label: item.branchIsActive ? 'GPS set' : 'Deactivated', variant: item.branchIsActive ? 'success' : 'neutral' }
              : { label: 'Missing GPS', variant: 'warning' }
          }
        />
      )}
      isLoading={q.isLoading}
      error={q.error}
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      emptyTitle="No Branches"
      header={
        stats ? (
          <SummaryTiles
            tiles={[
              { label: 'GPS configured', value: formatCount(stats.gpsConfigured) },
              { label: 'Missing GPS', value: formatCount(stats.missingGps), tone: stats.missingGps > 0 ? 'warning' : undefined },
              { label: 'Online users', value: formatCount(stats.onlineUsers) },
              { label: 'Outside radius', value: formatCount(stats.usersOutsideRadius), tone: stats.usersOutsideRadius > 0 ? 'danger' : undefined },
            ]}
          />
        ) : null
      }
    />
  );
}
