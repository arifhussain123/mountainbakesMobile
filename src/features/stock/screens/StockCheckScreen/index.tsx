import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Share, Text, View } from 'react-native';
import { getBusinessDate, useStock as useStockRows } from '@/api';
import { useHideTabBarOnFocus } from '@/navigation/tabBar/useTabBarVisibility';
import { useAuthStore } from '@/state';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Checkbox, EmptyState, ErrorState, LoadingSkeleton, Screen, SearchBar } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { classifyCount, isHeldForStockCheck, summarizeClassifications } from '../../calculations';
import { CountProgressFooter, CountRow, StockCheckResult } from '../../components';
import { useStockCheckStore } from '../../useStockCheckStore';
import { styles } from './styles';

type ViewMode = 'counting' | 'result';

/**
 * branchApp.md screen 12 — full-screen counting mode. NOTHING HERE IS SAVED
 * to the server: this only compares a physical count against the live
 * balance. Only reachable for today (`StockScreen` disables the entry point
 * on a past date), so there is no date param — the screen always counts
 * against `getBusinessDate()`.
 */
export function StockCheckScreen() {
  useHideTabBarOnFocus();
  const theme = useAppTheme();
  const branchId = useAuthStore((state) => state.user?.branchId);
  const branchName = useAuthStore((state) => state.user?.branchName ?? 'Branch');
  const businessDate = getBusinessDate();

  const { data, isLoading, error, refetch } = useStockRows();
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const held = useMemo(() => rows.filter(isHeldForStockCheck), [rows]);
  const hiddenAtZero = rows.length - held.length;

  const store = useStockCheckStore();
  const [search, setSearch] = useState('');
  const [uncountedOnly, setUncountedOnly] = useState(false);
  const [includeZero, setIncludeZero] = useState(false);
  const [view, setView] = useState<ViewMode>('counting');
  // `any`, matching `TextField`/`QtyStepper`'s own `inputRef` typing — RN
  // 0.87's generated `TextInput` ref type and its own class instance type
  // (which actually has `.focus`) disagree with each other.
  const inputRefs = useRef<Record<string, React.RefObject<any>>>({});
  const getInputRef = (productId: string): React.RefObject<any> => {
    inputRefs.current[productId] ??= { current: null };
    return inputRefs.current[productId]!;
  };

  useEffect(() => {
    if (branchId) void store.load(branchId, businessDate);
  }, [branchId, businessDate]); // eslint-disable-line react-hooks/exhaustive-deps -- `store` is a stable Zustand hook result, not a dependency

  const countableRows = useMemo(() => (includeZero ? rows : held), [includeZero, rows, held]);

  const countedCount = useMemo(
    () => held.filter((row) => (store.counts[row.productId] ?? '').trim() !== '').length,
    [held, store.counts],
  );

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return countableRows.filter((row) => {
      if (term && !row.productName.toLowerCase().includes(term)) return false;
      if (uncountedOnly && (store.counts[row.productId] ?? '').trim() !== '') return false;
      return true;
    });
  }, [countableRows, search, uncountedOnly, store.counts]);

  const hasResumableCount = store.loaded && Object.keys(store.counts).length > 0 && view === 'counting';

  const handleClear = () => {
    Alert.alert('Clear all counts?', 'This removes every count entered so far.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => void store.clear() },
    ]);
  };

  const classifications = useMemo(() => held.map((row) => classifyCount(row, store.counts[row.productId])), [held, store.counts]);
  const summary = useMemo(() => summarizeClassifications(classifications), [classifications]);

  const handleVerify = () => setView('result');

  const handleShare = async () => {
    const lines = [
      `Stock Check — ${branchName} — ${businessDate}`,
      `Matched ${summary.matched} · Short ${summary.short} · Over ${summary.over} · Not counted ${summary.notCounted}`,
      '',
      ...classifications
        .filter((c) => c.verdict === 'short' || c.verdict === 'over')
        .map((c) => `${c.productName}: balance ${c.balance}, counted ${c.counted}, ${c.diff! > 0 ? `+${c.diff}` : c.diff} `),
    ];
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      // The user dismissed the share sheet — nothing to do.
    }
  };

  const handleDone = () => {
    void store.clear();
    setView('counting');
  };

  if (view === 'result') {
    return (
      <Screen>
        <AppHeader title="Stock Check Result" subtitle={`${branchName} · ${businessDate}`} />
        <View style={{ padding: theme.spacing.lg }}>
          <StockCheckResult
            summary={summary}
            classifications={classifications.filter((c) => c.verdict !== 'notCounted')}
            onBackToCounting={() => setView('counting')}
            onShare={() => void handleShare()}
            onDone={handleDone}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Stock Check" subtitle={`${branchName} · ${businessDate}`} />
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
          Count what is on the shelf, then Verify. Nothing here is saved to the server; it only compares your count with the balance.
        </Text>
        {hasResumableCount ? (
          <Text style={[theme.typography.label, { color: theme.colors.primary, marginTop: 8, fontWeight: '700' }]}>
            Resume count ({countedCount} of {held.length})
          </Text>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.md }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search products…" />
        <View style={styles.toggleRow}>
          <Pressable accessibilityRole="button" onPress={() => setUncountedOnly((v) => !v)} style={styles.toggleItem}>
            <Checkbox checked={uncountedOnly} onChange={setUncountedOnly} accessibilityLabel="Uncounted only" />
            <Text style={[theme.typography.label, { color: theme.colors.text }]}>Uncounted only</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setIncludeZero((v) => !v)} style={styles.toggleItem}>
            <Checkbox checked={includeZero} onChange={setIncludeZero} accessibilityLabel="Include zero-balance products" />
            <Text style={[theme.typography.label, { color: theme.colors.text }]}>Include zero-balance products</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => store.setBlindMode(!store.blindMode)} style={styles.toggleItem}>
            <Checkbox checked={store.blindMode} onChange={store.setBlindMode} accessibilityLabel="Hide balance while counting" />
            <Text style={[theme.typography.label, { color: theme.colors.text }]}>Hide balance while counting</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? <View style={{ padding: theme.spacing.lg }}><LoadingSkeleton height={100} /></View> : null}
      {error ? (
        <View style={{ padding: theme.spacing.lg }}>
          <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} />
        </View>
      ) : null}
      {!isLoading && !error && visibleRows.length === 0 ? (
        <EmptyState title="No Stock Held" message="There is nothing in balance today to check." />
      ) : null}

      <FlatList
        data={visibleRows}
        keyExtractor={(item) => item.productId}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
        renderItem={({ item, index }) => (
          <CountRow
            inputRef={getInputRef(item.productId)}
            productName={item.productName}
            balance={item.balance}
            blindMode={store.blindMode}
            countInput={store.counts[item.productId] ?? ''}
            onChangeCount={(text) => store.setCount(item.productId, text)}
            returnKeyType={index < visibleRows.length - 1 ? 'next' : 'done'}
            onSubmitEditing={() => {
              const next = visibleRows[index + 1];
              if (next) getInputRef(next.productId).current?.focus();
            }}
          />
        )}
      />

      <CountProgressFooter countedCount={countedCount} heldCount={held.length} hiddenAtZero={hiddenAtZero} onClear={handleClear} onVerify={handleVerify} />
    </Screen>
  );
}
