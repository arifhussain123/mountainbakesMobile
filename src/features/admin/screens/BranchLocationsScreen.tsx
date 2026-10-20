import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  useBranchLocations,
  useDeleteBranchLocation,
  useSetBranchLocationStatus,
  type BranchLocationRow,
  type BranchLocationsResponse,
} from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, StatusBadge } from '@/shared/ui';
import { formatCount } from '@/shared/utils';
import { ActionChip, AdminListScreen, FieldGrid, SummaryTiles } from '../components';
import { geofenceToggle } from '../utils/branchActions';
import { formatDistanceKm, googleMapsUrl } from '../utils/catalogFormat';
import { useLocationSheet } from './Branches/branchSheets';

const EMPTY_STATS: BranchLocationsResponse['stats'] = {
  totalBranches: 0,
  activeBranches: 0,
  gpsConfigured: 0,
  missingGps: 0,
  onlineUsers: 0,
  usersOutsideRadius: 0,
};

/**
 * Web `/geofencing` "Branch Locations": every branch, not just the geofenced
 * ones — a branch WITHOUT a location is the actionable row (fail-open: an
 * unconfigured branch is unrestricted). The status is the GEOFENCE's own
 * state (`location.isActive`), not the branch's.
 *
 * Actions (the web's): Set Location / Edit (typed coordinates or the device's
 * current position, address and radius — the map picker stays on the web),
 * Enable / Disable enforcement keeping the pin, Remove after a confirm, and
 * opening the point in Google Maps.
 */
export function BranchLocationsScreen() {
  const theme = useAppTheme();
  const q = useBranchLocations();
  const stats = q.data?.stats ?? EMPTY_STATS;
  const sheet = useLocationSheet();
  const setStatus = useSetBranchLocationStatus();
  const remove = useDeleteBranchLocation();

  const toggle = (row: BranchLocationRow) => {
    const next = geofenceToggle(row);
    if (!next) return;
    setStatus.mutate(
      { branchId: row.branchId, isActive: next.isActive },
      {
        onSuccess: () => Alert.alert(next.isActive ? 'Enabled' : 'Disabled', next.success),
        onError: (e) => Alert.alert('Could Not Change the Status', mapErrorToMessage(e)),
      },
    );
  };

  const confirmRemove = (row: BranchLocationRow) =>
    Alert.alert(
      'Remove location?',
      `${row.branchName} will no longer be geofenced — sales from that branch will be allowed from anywhere. Use Disable instead if you want to keep the coordinates.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Location',
          style: 'destructive',
          onPress: () =>
            remove.mutate(row.branchId, {
              onSuccess: () => Alert.alert('Removed', `Location removed for ${row.branchName}`),
              onError: (e) => Alert.alert('Could Not Remove the Location', mapErrorToMessage(e)),
            }),
        },
      ],
    );

  return (
    <>
      <AdminListScreen<BranchLocationRow>
        title="Branch Locations"
        data={q.data?.branches ?? []}
        keyExtractor={(b) => b.branchId}
        renderItem={({ item }) => (
          <LocationCard
            row={item}
            onSetLocation={() => sheet.open(item)}
            onToggle={() => toggle(item)}
            onRemove={() => confirmRemove(item)}
            toggleBusy={setStatus.isPending}
            removing={remove.isPending && remove.variables === item.branchId}
          />
        )}
        isLoading={q.isLoading}
        error={q.error}
        errorMessage="Could not load branch locations. Please refresh."
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        emptyTitle="No branches yet."
        emptyMessage="Add one under Admin → Branches first."
        header={
          <>
            {q.data && !q.data.geofencingEnabled ? (
              <View
                accessibilityRole="alert"
                style={[
                  styles.banner,
                  { backgroundColor: `${theme.colors.warning}17`, borderColor: `${theme.colors.warning}66`, borderRadius: theme.radii.md },
                ]}>
                <Icon name="warning" size={16} color={theme.colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.warning, fontWeight: '600' }]}>Geofencing is switched off</Text>
                  <Text style={[theme.typography.label, { color: theme.colors.text, marginTop: 4 }]}>
                    Locations configured here are saved but not enforced — sales are allowed from anywhere. Turn it on in Settings → Geofencing
                    once these locations look right.
                  </Text>
                </View>
              </View>
            ) : null}
            <SummaryTiles
              tiles={[
                { label: 'Total Branches', value: formatCount(stats.totalBranches) },
                { label: 'Active', value: formatCount(stats.activeBranches), tone: 'success' },
                { label: 'GPS Configured', value: formatCount(stats.gpsConfigured), tone: 'success' },
                { label: 'Missing GPS', value: formatCount(stats.missingGps), tone: stats.missingGps > 0 ? 'warning' : undefined },
                { label: 'Online Users', value: formatCount(stats.onlineUsers) },
                { label: 'Outside Radius', value: formatCount(stats.usersOutsideRadius), tone: stats.usersOutsideRadius > 0 ? 'warning' : undefined },
              ]}
            />
          </>
        }
      />
      {sheet.element}
    </>
  );
}

function LocationCard({
  row,
  onSetLocation,
  onToggle,
  onRemove,
  toggleBusy,
  removing,
}: {
  row: BranchLocationRow;
  onSetLocation: () => void;
  onToggle: () => void;
  onRemove: () => void;
  toggleBusy: boolean;
  removing: boolean;
}) {
  const theme = useAppTheme();
  const loc = row.location;
  const toggleAction = geofenceToggle(row);
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]} numberOfLines={2}>
            {row.branchName}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            {loc?.address || row.branchAddress || 'No address'}
          </Text>
        </View>
        {!loc ? (
          <StatusBadge label="Missing GPS" variant="warning" />
        ) : loc.isActive ? (
          <StatusBadge label="Enforced" variant="success" />
        ) : (
          <StatusBadge label="Disabled" variant="neutral" />
        )}
      </View>
      {loc ? (
        <>
          <FieldGrid
            items={[
              { label: 'Latitude', value: loc.latitude.toFixed(5) },
              { label: 'Longitude', value: loc.longitude.toFixed(5) },
              { label: 'Radius', value: formatDistanceKm(loc.radiusKm) },
            ]}
          />
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`View ${row.branchName} on Google Maps`}
            onPress={() => void Linking.openURL(googleMapsUrl(loc.latitude, loc.longitude)).catch(() => undefined)}
            style={styles.mapLink}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.primary, fontWeight: '600' }]}>Open in Maps</Text>
            <Icon name="arrow-up-right" size={14} color={theme.colors.primary} />
          </Pressable>
        </>
      ) : null}
      <View style={styles.actions}>
        <ActionChip icon="map-pin" label={loc ? 'Edit' : 'Set Location'} onPress={onSetLocation} />
        {toggleAction ? (
          <>
            {/* The web disables every Enable / Disable while one is in flight. */}
            <ActionChip icon={toggleAction.isActive ? 'check' : 'close'} label={toggleAction.label} onPress={onToggle} disabled={toggleBusy} />
            <ActionChip icon="trash" label="Remove" danger loading={removing} onPress={onRemove} />
          </>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, padding: 12 },
  card: { padding: 14 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 10, paddingVertical: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
});
