import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { getBusinessDate, useStock as useStockRows } from '@/api';
import { useHideTabBarOnFocus } from '@/navigation/tabBar';
import { useAuthStore } from '@/state';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FormBottomSheet, LoadingSkeleton, Screen, SearchBar } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { buildCheckResult, isHeldForStockCheck, parseCountInput, type StockCheckItem } from '../../calculations';
import { CountProgressFooter, CountRow, StockCheckResult } from '../../components';
import { useStockCheckStore } from '../../useStockCheckStore';
import { ReturnItemsSheetContent } from '../ReturnItemsScreen';

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
  const returnItemsSheetRef = useRef<BottomSheetModal>(null);

  const { data, isLoading, error, refetch } = useStockRows();
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const held = useMemo(() => rows.filter(isHeldForStockCheck), [rows]);
  const hiddenAtZero = rows.length - held.length;

  const store = useStockCheckStore();
  const [search, setSearch] = useState('');
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

  const countedCount = useMemo(
    () => held.filter((row) => (store.counts[row.productId] ?? '').trim() !== '').length,
    [held, store.counts],
  );

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return held;
    return held.filter((row) => row.productName.toLowerCase().includes(term));
  }, [held, search]);

  const hasResumableCount = store.loaded && Object.keys(store.counts).length > 0 && view === 'counting';

  const handleClear = () => {
    Alert.alert('Clear all counts?', 'This removes every count entered so far.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => void store.clear() },
    ]);
  };

  // Only products with an entered count are compared — uncounted products are
  // ignored entirely (never shown as a 0-vs-balance deficit).
  const checkResult = useMemo(() => {
    const items: StockCheckItem[] = [];
    for (const row of held) {
      const counted = parseCountInput(store.counts[row.productId]);
      if (counted === null) continue;
      items.push({ productId: row.productId, productName: row.productName, balance: row.balance, counted });
    }
    return buildCheckResult(items);
  }, [held, store.counts]);

  const handleVerify = () => setView('result');

  // "Edit counts" closes the result and restores the full counting list with
  // every entered count kept; changing any count afterward is read fresh
  // from `store.counts` the next time Verify is pressed, so there's no stale
  // result to separately invalidate.
  const handleEditCounts = () => setView('counting');

  if (view === 'result') {
    return (
      <Screen>
        <AppHeader title="Stock Check Result" subtitle={`${branchName} · ${businessDate}`} />
        <View style={{ padding: theme.spacing.lg }}>
          <StockCheckResult
            result={checkResult}
            onEditCounts={handleEditCounts}
            onOpenReturnItems={() => returnItemsSheetRef.current?.present()}
          />
        </View>
        <FormBottomSheet ref={returnItemsSheetRef} title="Return Items" onRequestClose={() => returnItemsSheetRef.current?.dismiss()}>
          <ReturnItemsSheetContent onClose={() => returnItemsSheetRef.current?.dismiss()} />
        </FormBottomSheet>
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
