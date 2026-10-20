import { useMemo, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useDeleteAdminStock, useSaveAdminStock, type StockRow } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { Dropdown, FormBottomSheet, Icon, PrimaryButton, SecondaryButton, TextField, type DropdownOption } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import {
  BOOK_AS,
  FIGURE_COLUMNS,
  addStockPreview,
  addStockRow,
  addableRows,
  canPurge,
  deleteSuccessMessage,
  editDraft,
  figureNum,
  rowError,
  sanitizeQty,
  type BookAs,
  type DeleteMode,
  type StockDraft,
} from '../../utils/branchStockActions';

/** The branch and day every stock action is written against, plus the page's optional reason. */
export interface StockTarget {
  branchId: string;
  branchName: string;
  date: string;
  reason: string;
}

function Buttons({ busy, label, onCancel, onSave, disabled }: { busy?: boolean; label: string; onCancel: () => void; onSave: () => void; disabled?: boolean }) {
  return (
    <View style={styles.buttons}>
      <View style={{ flex: 1 }}>
        <SecondaryButton label="Cancel" onPress={onCancel} disabled={busy} />
      </View>
      <View style={{ flex: 1.4 }}>
        <PrimaryButton label={label} onPress={onSave} loading={busy} disabled={disabled} />
      </View>
    </View>
  );
}

function ProductHead({ row, branchName }: { row: StockRow; branchName: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.head, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
      <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{row.productName}</Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
        {row.stockCode ? `${row.stockCode} · ` : ''}
        {branchName || 'this branch'} · balance {row.balance}
      </Text>
    </View>
  );
}

/**
 * One row of the web's editable stock table. Every input is the figure as it
 * should READ; Balance and Adjustment drive each other as they are typed. The
 * edit is kept as a pending change on the screen and goes out with Save —
 * together with any other rows edited — exactly as on the web.
 */
function EditRowForm({
  row,
  initial,
  branchName,
  onKeep,
  onClose,
}: {
  row: StockRow;
  initial: StockDraft;
  branchName: string;
  onKeep: (draft: StockDraft) => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const [draft, setDraft] = useState(initial);
  const error = rowError(draft);

  return (
    <View>
      <ProductHead row={row} branchName={branchName} />
      <View style={styles.grid}>
        {FIGURE_COLUMNS.map((c) => {
          const changed = figureNum(draft[c.key]) !== row[c.key];
          return (
            <View key={c.key} style={styles.cell}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 4 }]}>{c.label}</Text>
              <TextInput
                accessibilityLabel={`${row.productName} ${c.label}`}
                value={draft[c.key]}
                onChangeText={(v) => setDraft((d) => editDraft(d, c.key, v))}
                keyboardType={c.signed ? (Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric') : 'number-pad'}
                placeholder="0"
                placeholderTextColor={theme.colors.textSecondary}
                style={[
                  styles.input,
                  {
                    borderColor: changed ? theme.colors.primary : theme.colors.border,
                    color: theme.colors.text,
                    borderRadius: theme.radii.md,
                    fontWeight: c.key === 'balance' ? '700' : '500',
                  },
                ]}
              />
              {changed ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>was {row[c.key]}</Text> : null}
            </View>
          );
        })}
      </View>
      {error ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: 10 }]}>{error}</Text> : null}
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 10 }]}>
        Type each figure as it should read. Editing Balance moves Adjustment, and editing anything else moves Balance. An Opening edit lands on the day
        before this one, and is refused if that day has been closed. Kept as an unsaved change until you press Save.
      </Text>
      <Buttons
        label="Keep Edit"
        onCancel={onClose}
        onSave={() => {
          onKeep(draft);
          onClose();
        }}
      />
    </View>
  );
}

/**
 * Web `AddBranchStockModal`: a quantity to ADD, turned into the absolute
 * target (current + qty) here, where the current figure is known.
 */
function AddStockForm({ rows, target, onClose }: { rows: StockRow[]; target: StockTarget; onClose: () => void }) {
  const theme = useAppTheme();
  const save = useSaveAdminStock();
  const sellable = useMemo(() => addableRows(rows), [rows]);
  const [productId, setProductId] = useState<string | null>(null);
  const [qty, setQty] = useState('');
  const [bookAs, setBookAs] = useState<BookAs>('newQty');
  const product = sellable.find((r) => r.productId === productId) ?? null;
  const row = addStockRow(product, qty, bookAs);

  const options = useMemo<DropdownOption<string>[]>(
    () => sellable.map((r) => ({ value: r.productId, label: r.productName, hint: r.stockCode, sublabel: `${r.stockCode} · ${r.balance} in stock` })),
    [sellable],
  );

  const submit = () => {
    if (!row || !product) return;
    const amount = parseInt(qty, 10);
    save.mutate(
      { branchId: target.branchId, date: target.date, reason: target.reason.trim(), rows: [row] },
      {
        onSuccess: (result) => {
          if (result.failed.length > 0) {
            Alert.alert('Could Not Add Stock', `${result.failed[0]!.productName}: ${result.failed[0]!.error}`);
            return;
          }
          Alert.alert('Stock Added', `Added ${amount} × ${product.productName} to ${target.branchName}`);
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Add Stock', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 6 }]}>PRODUCT</Text>
      <Dropdown options={options} value={productId} onChange={setProductId} placeholder="Search product…" emptyLabel="No products found." />
      <TextField label="Quantity to add" value={qty} onChangeText={(v) => setQty(sanitizeQty(v))} keyboardType="number-pad" placeholder="0" />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 16, marginBottom: 6 }]}>BOOK AS</Text>
      <Dropdown options={BOOK_AS.map((o) => ({ value: o.value, label: o.label }))} value={bookAs} onChange={setBookAs} />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 8 }]}>
        {BOOK_AS.find((o) => o.value === bookAs)!.hint} Dated {target.date}.
      </Text>
      {product ? (
        <View style={[styles.head, { marginTop: 12, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>{addStockPreview(product, qty, bookAs)}</Text>
        </View>
      ) : null}
      <Buttons busy={save.isPending} label="Add Stock" onCancel={onClose} onSave={submit} disabled={!row} />
    </View>
  );
}

/**
 * Web `DeleteBranchStockDialog`: two genuinely different things, so the admin
 * picks. Set to zero is an ordinary, reversible correction; Delete permanently
 * removes the stock row and every movement for this product at this branch,
 * and is gated on typing the product name.
 */
function DeleteForm({
  row,
  target,
  onDeleted,
  onClose,
}: {
  row: StockRow;
  target: StockTarget;
  onDeleted: (productId: string) => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const remove = useDeleteAdminStock();
  const [confirmText, setConfirmText] = useState('');
  const [pendingMode, setPendingMode] = useState<DeleteMode | null>(null);

  const run = (mode: DeleteMode) => {
    setPendingMode(mode);
    remove.mutate(
      { branchId: target.branchId, productId: row.productId, mode, date: target.date, reason: target.reason.trim() },
      {
        onSuccess: () => {
          Alert.alert(mode === 'purge' ? 'Deleted' : 'Set to Zero', deleteSuccessMessage(mode, row.productName, target.branchName));
          onDeleted(row.productId);
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Delete Stock', mapErrorToMessage(e)),
        onSettled: () => setPendingMode(null),
      },
    );
  };

  const confirm = (mode: DeleteMode) => {
    if (mode === 'zero') {
      Alert.alert('Set to Zero?', `${row.productName}'s balance at ${target.branchName || 'this branch'} goes to 0. The movement history is kept.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Set to zero', style: 'destructive', onPress: () => run('zero') },
      ]);
      return;
    }
    Alert.alert('Delete Permanently?', `Every movement ever recorded for ${row.productName} at ${target.branchName || 'this branch'} is deleted. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete permanently', style: 'destructive', onPress: () => run('purge') },
    ]);
  };

  const purgeUnlocked = canPurge(row.productName, confirmText);

  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        {row.productName} currently has a balance of <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{row.balance}</Text> at{' '}
        {target.branchName || 'this branch'}.
      </Text>

      <View style={[styles.option, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>Set to zero</Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 4 }]}>
          Corrects the balance to 0 and keeps the movement history. Reversible — type the old figure back in to undo it.
        </Text>
        <View style={{ marginTop: 10 }}>
          <PrimaryButton label="Set to zero" onPress={() => confirm('zero')} loading={pendingMode === 'zero'} disabled={remove.isPending} />
        </View>
      </View>

      <View style={[styles.option, { borderColor: theme.colors.danger, borderRadius: theme.radii.md }]}>
        <View style={styles.inline}>
          <Icon name="warning" size={15} color={theme.colors.danger} />
          <Text style={[theme.typography.body, { color: theme.colors.danger, fontWeight: '700' }]}>Delete permanently</Text>
        </View>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 4 }]}>
          Deletes the stock row and every movement ever recorded for this product at this branch. This cannot be undone, and past figures derived from
          those movements — opening balances, closing snapshots, reports — will change. Sales themselves are not deleted.
        </Text>
        <TextField
          label={`Type ${row.productName} to confirm`}
          value={confirmText}
          onChangeText={setConfirmText}
          placeholder={row.productName}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={{ marginTop: 10 }}>
          <SecondaryButton label="Delete permanently" onPress={() => confirm('purge')} disabled={!purgeUnlocked || remove.isPending} />
        </View>
      </View>

      <View style={styles.buttons}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Cancel" onPress={onClose} disabled={remove.isPending} />
        </View>
      </View>
    </View>
  );
}

export type BranchStockSheet =
  | { kind: 'edit'; row: StockRow; draft: StockDraft; branchName: string; onKeep: (draft: StockDraft) => void }
  | { kind: 'add'; rows: StockRow[]; target: StockTarget }
  | { kind: 'delete'; row: StockRow; target: StockTarget; onDeleted: (productId: string) => void };

function sheetTitle(sheet: BranchStockSheet | null): string {
  if (!sheet) return '';
  if (sheet.kind === 'edit') return 'Edit Stock';
  if (sheet.kind === 'add') return `Add Stock — ${sheet.target.branchName || 'branch'}`;
  return `Delete stock — ${sheet.row.productName}`;
}

/**
 * One bottom sheet for every Branch Stock form. `open(sheet)` presents it; the
 * form is mounted only while it is open, so each opening starts clean (the
 * typed purge confirmation can never carry over to another product).
 */
export function useBranchStockSheet() {
  const ref = useRef<BottomSheetModal>(null);
  const [sheet, setSheet] = useState<BranchStockSheet | null>(null);
  const close = () => ref.current?.dismiss();

  const open = (next: BranchStockSheet) => {
    setSheet(next);
    ref.current?.present();
  };

  const element = (
    <FormBottomSheet
      ref={ref}
      title={sheetTitle(sheet)}
      subtitle={sheet && sheet.kind !== 'edit' ? `${sheet.target.branchName} · ${formatDisplayDate(sheet.target.date)}` : undefined}
      onRequestClose={close}
      onDismiss={() => setSheet(null)}>
      {sheet?.kind === 'edit' ? (
        <EditRowForm row={sheet.row} initial={sheet.draft} branchName={sheet.branchName} onKeep={sheet.onKeep} onClose={close} />
      ) : null}
      {sheet?.kind === 'add' ? <AddStockForm rows={sheet.rows} target={sheet.target} onClose={close} /> : null}
      {sheet?.kind === 'delete' ? <DeleteForm row={sheet.row} target={sheet.target} onDeleted={sheet.onDeleted} onClose={close} /> : null}
    </FormBottomSheet>
  );

  return { open, element };
}

const styles = StyleSheet.create({
  head: { borderWidth: 1, padding: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, marginTop: 14, marginHorizontal: -5 },
  cell: { width: '50%', paddingHorizontal: 5 },
  input: { height: 46, borderWidth: 1, paddingHorizontal: 12, fontSize: 16 },
  option: { borderWidth: 1, padding: 12, marginTop: 14 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
