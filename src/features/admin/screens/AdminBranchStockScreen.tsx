import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  getBusinessDate,
  useSaveAdminStock,
  useAllBranchesStockSummary,
  useBranchStock,
  useBranchStockHistorySeries,
  useBranches,
  type StockRow,
} from '@/api';
import { useTabBarHeight } from '@/navigation';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import {
  AppHeader,
  Card,
  DateField,
  Dropdown,
  EmptyState,
  ErrorState,
  Icon,
  LoadingSkeleton,
  Screen,
  SearchBar,
  TextField,
  type DropdownOption,
} from '@/shared/ui';
import { formatCount, formatDisplayDate, formatSigned } from '@/shared/utils';
import { ActionChip } from '../components';
import { StockActivityCard, type HistoryDays, type StockActivityRow } from '../components/StockActivityCard';
import {
  dirtyRows as findDirtyRows,
  draftFromRow,
  draftsAfterSave,
  figureNum,
  isDirty,
  rowError,
  saveOutcome,
  savePayload,
  withoutDraft,
  type StockDraft,
  type StockDrafts,
} from '../utils/branchStockActions';
import { addDays, filterStockRows, formatDay, toActivityFigures, totalBranchSummary } from '../utils/stockActivity';
import { useBranchStockSheet } from './BranchStock/branchStockSheets';
import { useAdminHeaderActions } from '../components/useAdminHeaderActions';

/** The picker value meaning "every branch at once" — never a uuid, so it cannot collide with one. */
const ALL_BRANCHES = 'all';

const shortBranch = (name: string) => name.replace('Mountain Bakes ', '');

const LEDGER_COLUMNS: { key: keyof Pick<StockRow, 'opening' | 'newQty' | 'sold' | 'returned' | 'adjustment' | 'balance'>; label: string }[] = [
  { key: 'opening', label: 'Opening' },
  { key: 'newQty', label: 'New' },
  { key: 'sold', label: 'Sold' },
  { key: 'returned', label: 'Returned' },
  { key: 'adjustment', label: 'Adjustment' },
  { key: 'balance', label: 'Balance' },
];

/**
 * One product's ledger. A pending edit shows its figures in place of the
 * server's — the changed ones in the accent colour — until Save or Undo.
 */
function LedgerCard({
  row,
  draft,
  busy,
  onEdit,
  onUndo,
  onDelete,
}: {
  row: StockRow;
  draft: StockDraft | undefined;
  busy: boolean;
  onEdit: () => void;
  onUndo: () => void;
  onDelete: () => void;
}) {
  const theme = useAppTheme();
  const dirty = !!draft && isDirty(draft, row);
  const error = dirty ? rowError(draft!) : null;
  return (
    <Card
      style={{
        padding: 14,
        ...(dirty ? { borderColor: error ? theme.colors.danger : theme.colors.primary, borderWidth: 1 } : null),
      }}>
      <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]} numberOfLines={2}>
        {row.productName}
      </Text>
      {row.stockCode ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{row.stockCode}</Text> : null}
      {dirty ? (
        <Text style={[theme.typography.label, { color: error ? theme.colors.danger : theme.colors.primary, marginTop: 2 }]}>{error ?? 'Unsaved change'}</Text>
      ) : null}
      <View style={styles.ledgerGrid}>
        {LEDGER_COLUMNS.map((c) => {
          const server = Number(row[c.key]) || 0;
          const value = dirty ? figureNum(draft![c.key]) : server;
          const changed = dirty && value !== server;
          return (
            <View key={c.key} style={styles.ledgerCell}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{c.label}</Text>
              <Text
                style={[
                  theme.typography.bodySmall,
                  {
                    color: c.key === 'balance' && value < 0 ? theme.colors.danger : changed ? theme.colors.primary : theme.colors.text,
                    fontWeight: c.key === 'balance' || changed ? '700' : '600',
                  },
                ]}>
                {c.key === 'adjustment' ? formatSigned(value) : formatCount(value)}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.rowActions}>
        <ActionChip icon="pencil" label="Edit" onPress={onEdit} disabled={busy} />
        <ActionChip icon="rotate-ccw" label="Undo" onPress={onUndo} disabled={!dirty || busy} />
        <ActionChip icon="trash" label="Delete" danger onPress={onDelete} disabled={busy} />
      </View>
    </Card>
  );
}

/**
 * Business date, a day at a time with the arrows, or any past day from the
 * calendar button (the date picker). Never past today.
 */
function DateStepper({ date, today, onChange }: { date: string; today: string; onChange: (date: string) => void }) {
  return <DateField value={date} onChange={onChange} maximumDate={today} renderTrigger={(open) => <StepperRow date={date} today={today} onChange={onChange} onPick={open} />} />;
}

function StepperRow({ date, today, onChange, onPick }: { date: string; today: string; onChange: (date: string) => void; onPick: () => void }) {
  const theme = useAppTheme();
  const atToday = date >= today;
  return (
    <View style={[styles.stepper, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardFill, borderRadius: theme.radii.md }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous day" onPress={() => onChange(addDays(date, -1))} style={styles.stepBtn} hitSlop={6}>
        <Icon name="chevron-left" size={16} color={theme.colors.text} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to today"
        onPress={() => onChange(today)}
        disabled={atToday}
        style={{ flex: 1, alignItems: 'center' }}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]}>{formatDisplayDate(date)}</Text>
        {!atToday ? <Text style={[theme.typography.label, { color: theme.colors.primary }]}>Tap for today</Text> : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next day"
        accessibilityState={{ disabled: atToday }}
        disabled={atToday}
        onPress={() => onChange(addDays(date, 1))}
        style={[styles.stepBtn, { opacity: atToday ? 0.35 : 1 }]}
        hitSlop={6}>
        <Icon name="chevron-right" size={16} color={theme.colors.text} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Pick a date" onPress={onPick} style={styles.stepBtn} hitSlop={6}>
        <Icon name="calendar" size={16} color={theme.colors.primary} />
      </Pressable>
    </View>
  );
}

/**
 * Super Admin → Branch Stock: the web `/stock-control` page ("Branch Stock
 * Control"). One branch: its per-product ledger for a business date, editable
 * the web's way — Edit keeps an unsaved change per row (ABSOLUTE figures,
 * Balance/Adjustment driving each other), Save sends every changed row in one
 * `PATCH /stock/admin`, Discard / Undo drop them, Add Stock adds a quantity and
 * Delete sets a product to zero or purges it — plus its day-by-day stock
 * history. "All branches": each branch's stock activity over the window, with
 * no editing (a correction targets one branch's ledger).
 */
export function AdminBranchStockScreen() {
  const headerActions = useAdminHeaderActions();
  const theme = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const today = getBusinessDate();

  const branchesQ = useBranches();
  const branches = useMemo(() => branchesQ.data?.branches ?? [], [branchesQ.data]);
  const [picked, setPicked] = useState<string | null>(null);
  // First branch by default, once the list arrives — as the web does.
  const branchId = picked ?? branches[0]?.id ?? null;
  const single = !!branchId && branchId !== ALL_BRANCHES;
  const branchName = branches.find((b) => b.id === branchId)?.name ?? '';

  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');
  // Rides along on the notification the branch receives, for Save, Add and Delete alike.
  const [reason, setReason] = useState('');
  const [drafts, setDrafts] = useState<StockDrafts>({});
  const save = useSaveAdminStock();
  const sheet = useBranchStockSheet();
  // Shared by both history views, so switching keeps the chosen window.
  const [days, setDays] = useState<HistoryDays>('7');

  const stockQ = useBranchStock(single ? branchId : null, date);
  const historyQ = useBranchStockHistorySeries(single ? branchId : null, Number(days));
  const allQ = useAllBranchesStockSummary(Number(days), branchId === ALL_BRANCHES);

  const rows = useMemo(() => stockQ.data?.rows ?? [], [stockQ.data]);
  const visible = useMemo(() => filterStockRows(rows, search), [rows, search]);
  const dirty = useMemo(() => findDirtyRows(rows, drafts), [rows, drafts]);
  const busy = save.isPending;

  // A pending edit belongs to one branch's ledger on one day: switching either drops them, as on the web.
  const pickBranch = (v: string) => {
    setPicked(v);
    setDrafts({});
  };
  const pickDate = (d: string) => {
    setDate(d > today ? today : d);
    setDrafts({});
  };

  const target = { branchId: branchId ?? '', branchName, date, reason };
  // The row cards read these through closures, so the list must re-render when they change.
  const listExtra = useMemo(() => ({ drafts, busy, reason, branchName, date }), [drafts, busy, reason, branchName, date]);
  const undo = useCallback((productId: string) => setDrafts((prev) => withoutDraft(prev, productId)), []);

  const openEdit = (row: StockRow) =>
    sheet.open({
      kind: 'edit',
      row,
      draft: drafts[row.productId] ?? draftFromRow(row),
      branchName,
      onKeep: (draft) => setDrafts((prev) => (isDirty(draft, row) ? { ...prev, [row.productId]: draft } : withoutDraft(prev, row.productId))),
    });

  const onSave = () => {
    if (!single || !branchId || dirty.length === 0) return;
    const built = savePayload(dirty, drafts);
    if ('error' in built) {
      Alert.alert('Check the Figures', built.error);
      return;
    }
    save.mutate(
      { branchId, date, reason: reason.trim(), rows: built.rows },
      {
        onSuccess: (result) => {
          const outcome = saveOutcome(result);
          Alert.alert(outcome.title, outcome.message);
          setDrafts((prev) => draftsAfterSave(prev, result.saved));
          setReason('');
        },
        onError: (e) => Alert.alert('Could Not Save Stock', mapErrorToMessage(e)),
      },
    );
  };

  const branchOptions = useMemo<DropdownOption<string>[]>(
    () => [{ value: ALL_BRANCHES, label: 'All branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))],
    [branches],
  );

  const onRefresh = useCallback(() => {
    void branchesQ.refetch();
    if (single) {
      void stockQ.refetch();
      void historyQ.refetch();
    } else if (branchId === ALL_BRANCHES) {
      void allQ.refetch();
    }
  }, [branchesQ, stockQ, historyQ, allQ, single, branchId]);
  const refreshing = stockQ.isRefetching || historyQ.isRefetching || allQ.isRefetching;

  const historyRows = useMemo<StockActivityRow[]>(
    () => (historyQ.data?.rows ?? []).map((r) => ({ key: r.date, title: formatDay(r.date), figures: toActivityFigures(r) })),
    [historyQ.data],
  );
  const allRows = useMemo<StockActivityRow[]>(
    () =>
      (allQ.data?.rows ?? []).map((r) => ({
        key: r.branchId,
        title: shortBranch(r.branchName),
        note: r.capped ? `from ${r.from}` : undefined,
        figures: toActivityFigures(r),
      })),
    [allQ.data],
  );
  const allTotal = useMemo<StockActivityRow | undefined>(
    () => (allQ.data && allQ.data.rows.length > 0 ? { key: 'total', title: 'Total', figures: totalBranchSummary(allQ.data.rows), emphasis: true } : undefined),
    [allQ.data],
  );

  const header = (
    <View>
      <Card>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 6 }]}>Branch</Text>
        <Dropdown
          options={branchOptions}
          value={branchId}
          onChange={pickBranch}
          placeholder={branchesQ.isLoading ? 'Loading…' : 'Choose a branch'}
          loading={branchesQ.isLoading}
        />
        {single ? (
          <>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 12, marginBottom: 6 }]}>Business date</Text>
            <DateStepper date={date} today={today} onChange={pickDate} />
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 12, marginBottom: 6 }]}>Search</Text>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Product or ID…" />
            <TextField label="Reason (optional)" value={reason} onChangeText={setReason} placeholder="Why is this changing?" maxLength={300} />
          </>
        ) : null}
      </Card>
      {branchesQ.error ? (
        <View style={{ marginTop: theme.spacing.md }}>
          <ErrorState message={mapErrorToMessage(branchesQ.error)} onRetry={() => void branchesQ.refetch()} />
        </View>
      ) : null}
      {single ? (
        <View style={[styles.actions, { marginTop: theme.spacing.md }]}>
          <ActionChip icon="plus" label="Add Stock" primary onPress={() => sheet.open({ kind: 'add', rows, target })} disabled={busy || stockQ.isLoading} />
          <ActionChip icon="check" label={busy ? 'Saving…' : `Save${dirty.length ? ` (${dirty.length})` : ''}`} onPress={onSave} loading={busy} disabled={dirty.length === 0} />
          <ActionChip icon="close" label="Discard" onPress={() => setDrafts({})} disabled={dirty.length === 0 || busy} />
        </View>
      ) : null}
      {single ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm }]}>
          {branchName} · {date}
          {dirty.length > 0 ? ` · ${dirty.length} unsaved` : ''}
        </Text>
      ) : null}
      {single && stockQ.isLoading ? <LoadingSkeleton height={220} /> : null}
      {single && stockQ.error ? <ErrorState message={mapErrorToMessage(stockQ.error)} onRetry={() => void stockQ.refetch()} /> : null}
      {!branchId && !branchesQ.isLoading && !branchesQ.error ? (
        <EmptyState title="Choose a branch" message="Pick a branch to load its stock." />
      ) : null}
    </View>
  );

  const footer = single ? (
    <StockActivityCard
      title="Branch Stock History"
      subtitle="Qty and value per business day · stock valued at current prices, so Sold here is not the till total"
      days={days}
      onDaysChange={setDays}
      rows={historyRows}
      loading={historyQ.isLoading}
      error={historyQ.error}
      onRetry={() => void historyQ.refetch()}
      emptyTitle="No stock history yet"
      emptyMessage="Days appear here once stock starts moving in this branch."
      footnote={historyQ.data?.capped ? `Too much history to summarise in one read — showing from ${historyQ.data.from} onwards.` : undefined}
    />
  ) : branchId === ALL_BRANCHES ? (
    <StockActivityCard
      title="All Branches — Stock Activity"
      subtitle={`Qty and value per branch${allQ.data ? ` · ${allQ.data.from} → ${allQ.data.to}` : ''} · stock valued at current prices, so Sold here is not the till total`}
      days={days}
      onDaysChange={setDays}
      rows={allRows}
      total={allTotal}
      loading={allQ.isLoading}
      error={allQ.error}
      onRetry={() => void allQ.refetch()}
      emptyTitle="No branches"
      emptyMessage="Add an active branch and its stock activity appears here."
      footnote={
        allQ.data?.capped
          ? 'At least one branch has more history than can be summarised in one read — those rows are marked with the date they start from.'
          : undefined
      }
    />
  ) : undefined;

  const showLedger = single && !stockQ.isLoading && !stockQ.error;

  return (
    <Screen>
      <AppHeader
        title="Branch Stock Control"
        subtitle={single ? shortBranch(branchName) : branchId === ALL_BRANCHES ? 'All branches' : undefined}
        actions={headerActions}
      />
      <FlatList
        data={showLedger ? visible : []}
        keyExtractor={(r) => r.productId}
        renderItem={({ item }) => (
          <LedgerCard
            row={item}
            draft={drafts[item.productId]}
            busy={busy}
            onEdit={() => openEdit(item)}
            onUndo={() => undo(item.productId)}
            onDelete={() => sheet.open({ kind: 'delete', row: item, target, onDeleted: undo })}
          />
        )}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.lg + tabBarHeight, gap: 10 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          showLedger ? (
            <EmptyState title="No products found" message={search.trim() ? 'Try a different search term.' : 'This branch has no active products.'} />
          ) : undefined
        }
        ListFooterComponent={footer}
        refreshing={refreshing}
        onRefresh={onRefresh}
        initialNumToRender={10}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        extraData={listExtra}
      />
      {sheet.element}
    </Screen>
  );
}

const styles = StyleSheet.create({
  ledgerGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginTop: 10 },
  ledgerCell: { width: '33.33%', paddingRight: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingVertical: 6, paddingHorizontal: 4 },
  stepBtn: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
});
