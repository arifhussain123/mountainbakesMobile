import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useStock } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { EmptyState, ErrorState, LoadingSkeleton, PrimaryButton, SearchBar, SecondaryButton } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { StockCheckRow } from '../../components';
import { styles } from './styles';

/**
 * branchApp.md screen 12 — count what is on the shelf against the balance.
 * NOTHING HERE IS SAVED: there is no backend endpoint for a stock-check result,
 * this screen only compares a physical count against the live balance.
 */
export function StockCheckSheetContent() {
  const theme = useAppTheme();
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState<Record<string, string>>({});
  const { data, isLoading, error, refetch } = useStock();

  // "Only stock held today is listed" (branchApp.md 12) — balance > 0 only.
  const rows = useMemo(() => (data?.rows ?? []).filter((row) => row.balance > 0), [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => row.productName.toLowerCase().includes(term));
  }, [rows, search]);

  const countedCount = useMemo(() => rows.filter((row) => (counts[row.productId] ?? '').trim() !== '').length, [rows, counts]);

  const setCount = (productId: string, text: string) => setCounts((prev) => ({ ...prev, [productId]: text }));
  const clear = () => setCounts({});

  const handleVerify = () => {
    const mismatches = rows
      .map((row) => {
        const raw = counts[row.productId];
        if (raw === undefined || raw.trim() === '') return null;
        const count = parseInt(raw, 10) || 0;
        const diff = count - row.balance;
        return diff !== 0 ? { name: row.productName, diff } : null;
      })
      .filter((m): m is { name: string; diff: number } => m !== null);

    if (mismatches.length === 0) {
      Alert.alert('All Matched', `${countedCount} of ${rows.length} products counted — every count matched the balance.`);
      return;
    }
    Alert.alert(
      'Differences Found',
      mismatches.map((m) => `${m.name}: ${m.diff > 0 ? `+${m.diff} over` : `${m.diff} short`}`).join('\n'),
    );
  };

  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        Only stock held today is listed. Nothing on this screen is saved — it only compares your count against the balance.
      </Text>
      <View style={{ marginTop: theme.spacing.md }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search products…" />
      </View>
      <View style={[styles.tableHeader, { borderBottomColor: theme.colors.border }]}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, flex: 1 }]}>PRODUCT</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, width: 56, textAlign: 'center' }]}>BALANCE</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, width: 76, textAlign: 'center' }]}>COUNT</Text>
      </View>
      {isLoading ? <LoadingSkeleton height={100} /> : null}
      {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
      {!isLoading && !error && filtered.length === 0 ? (
        <EmptyState title="No Stock Held" message="There is nothing in balance today to check." />
      ) : null}
      {filtered.map((row) => (
        <StockCheckRow key={row.productId} row={row} countInput={counts[row.productId] ?? ''} onChangeCount={(text) => setCount(row.productId, text)} />
      ))}

      <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop: theme.spacing.lg }]}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
          Counted <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{countedCount}</Text> of {rows.length} held
        </Text>
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Clear" onPress={clear} />
          </View>
          <View style={{ flex: 1.4 }}>
            <PrimaryButton label="Verify" onPress={handleVerify} disabled={countedCount === 0} />
          </View>
        </View>
      </View>
    </View>
  );
}
