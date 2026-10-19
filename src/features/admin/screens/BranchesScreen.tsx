import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useActiveAdminBranches, useFinanceSettings, type AdminBranch } from '@/api';
import { useDebouncedValue } from '@/shared/hooks';
import { useAppTheme } from '@/shared/theme';
import { Card, SearchBar, StatusBadge } from '@/shared/ui';
import { includesTerm } from '@/shared/utils';
import { AdminListScreen, FieldGrid } from '../components';
import { resolveShareSplit } from '../utils/catalogFormat';

/** The web's fallback when Finance Settings cannot be read. */
const DEFAULT_COMPANY_PCT = 75;

/**
 * Web `/branches`: active branches (DELETE is a soft deactivate, so a
 * deactivated branch drops off this list), each with manager, phone and the
 * company / branch income split — "Default" when the branch follows the
 * global split in Finance Settings. Read-only in this phase.
 */
export function BranchesScreen() {
  const theme = useAppTheme();
  const q = useActiveAdminBranches();
  // Best-effort, as on the web: without finance access the split falls back to 75%.
  const settingsQ = useFinanceSettings();
  const defaultCompanyPct = settingsQ.data?.companySharePct ?? DEFAULT_COMPANY_PCT;

  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim().toLowerCase());

  const branches = useMemo(() => q.data?.branches ?? [], [q.data]);
  const rows = useMemo(
    () =>
      term
        ? branches.filter((b) =>
            [b.name, b.location, b.managerName, b.phone, b.address, b.city].some((v) => includesTerm(v ?? '', term)),
          )
        : branches,
    [branches, term],
  );

  return (
    <AdminListScreen<AdminBranch>
      title="Branches"
      subtitle={`${branches.length} branches`}
      data={rows}
      keyExtractor={(b) => b.id}
      renderItem={({ item }) => {
        const split = resolveShareSplit(item.companySharePct, defaultCompanyPct);
        return (
          <Card style={styles.card}>
            <View style={styles.head}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.location ? (
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
                    {item.location}
                  </Text>
                ) : null}
              </View>
              <StatusBadge label={item.isActive ? 'Active' : 'Inactive'} variant={item.isActive ? 'success' : 'neutral'} />
            </View>
            <FieldGrid
              items={[
                {
                  label: 'Manager',
                  value: item.managerName || 'Unassigned',
                  valueStyle: item.managerName ? undefined : { color: theme.colors.textSecondary },
                },
                { label: 'Phone', value: item.phone || '—' },
                {
                  label: 'Company / Branch',
                  value: (
                    <View style={styles.share}>
                      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>
                        {split.companySharePct}%
                        <Text style={{ color: theme.colors.textSecondary, fontWeight: '400' }}> / {split.branchSharePct}%</Text>
                      </Text>
                      {!split.isOverride ? <StatusBadge label="Default" variant="neutral" /> : null}
                    </View>
                  ),
                },
              ]}
            />
          </Card>
        );
      }}
      isLoading={q.isLoading}
      error={q.error}
      refreshing={q.isRefetching}
      onRefresh={() => {
        void q.refetch();
        void settingsQ.refetch();
      }}
      emptyTitle="No results found"
      emptyMessage={term ? 'Try a different search term.' : undefined}
      header={<SearchBar value={search} onChangeText={setSearch} placeholder="Search branches…" />}
    />
  );
}

const styles = StyleSheet.create({
  card: { padding: 14 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  share: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
});
