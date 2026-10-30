import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  AI_CAPTURE_MAX_PHOTOS,
  AI_EXPENSE_ISSUE_LABELS,
  FINANCE_PAYMENT_METHOD_LABELS,
  useLedgerHeads,
  type FinanceAccount,
} from '@/api';
import { openDrawer } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import {
  AppHeader,
  Card,
  DateField,
  Dropdown,
  EmptyState,
  FormBottomSheet,
  Icon,
  PhotoViewer,
  PrimaryButton,
  Screen,
  SecondaryButton,
  StatusBadge,
  TextField,
  type DropdownOption,
} from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { useFinanceCan } from '../../hooks/useFinanceCan';
import { useAiExpenseCapture } from '../../hooks/useAiExpenseCapture';
import { FINANCE_PAYMENT_METHOD_OPTIONS } from '../../utils/paymentMethodOptions';
import { canCombine, missingFields, type AiDraft } from '../../utils/aiCaptureDraft';

/**
 * Finance → AI Expense Capture, the phone's version of the web page
 * (frontend components/finance/ai-capture). Take or pick receipt photos,
 * Generate has the server's AI read them into one expense per bill, each card
 * is checked (Edit opens a sheet), approved, and Save Approved saves the
 * approved cards as drafts in Income & Expense — approved there as usual.
 */
export function FinanceAiExpenseCaptureScreen() {
  const theme = useAppTheme();
  const can = useFinanceCan();
  const capture = useAiExpenseCapture();
  const heads = useLedgerHeads({ type: 'expense' });
  const headOptions = useMemo<DropdownOption[]>(
    () => (heads.data ?? []).filter((h) => h.isActive).map((h) => ({ value: h.id, label: h.name, hint: h.code })),
    [heads.data],
  );
  const headName = (id: string) => heads.data?.find((h) => h.id === id)?.name ?? null;
  const editSheet = useRef<BottomSheetModal>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const editingDraft = capture.drafts.find((d) => d.key === editing) ?? null;
  const label = (i: number) => `Expense ${String(i + 1).padStart(2, '0')}`;

  if (!can('create')) {
    return (
      <Screen>
        <AppHeader title="AI Expense Capture" actions={[{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]} />
        <EmptyState title="Not Available" message="Your role cannot raise entries, so it cannot use AI Expense Capture." />
      </Screen>
    );
  }

  const openEdit = (key: string) => {
    setEditing(key);
    editSheet.current?.present();
  };

  const confirmDelete = (d: AiDraft, i: number) =>
    Alert.alert(`Delete ${label(i)}?`, 'It is removed from this screen only; nothing has been saved for it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => capture.remove(d.key) },
    ]);
  const confirmSplit = (d: AiDraft) =>
    Alert.alert('Split this bill?', 'Both expenses keep the same receipt. The new one starts with no amount — enter each part so they add up to the bill.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Split', onPress: () => capture.split(d.key) },
    ]);
  const chooseCombine = (d: AiDraft, i: number) => {
    const others = capture.drafts.map((o, j) => ({ o, j })).filter(({ o }) => canCombine(d, o));
    if (others.length === 0) {
      Alert.alert('Nothing to combine', 'There is no other unsaved expense that fits on one entry with this one.');
      return;
    }
    Alert.alert(`Combine ${label(i)} with…`, 'Their photos and items go together and the amounts are added. Check the result before approving it.', [
      ...others.slice(0, 3).map(({ o, j }) => ({ text: label(j), onPress: () => capture.combine(d.key, o.key) })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  return (
    <Screen>
      <AppHeader title="AI Expense Capture" subtitle="Receipts read into expenses" actions={[{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 120, gap: theme.spacing.md }}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
          Photograph or pick receipts; the AI reads each bill into an expense for you to check. Saved expenses are drafts in Income & Expense, approved as usual.
        </Text>

        <View style={styles.grid}>
          {[
            ['Receipts', String(capture.summary.receipts)],
            ['Expenses', String(capture.summary.expenses)],
            ['Total', formatCurrency(capture.summary.totalAmount)],
            ['To verify', String(capture.summary.needingReview)],
          ].map(([k, v]) => (
            <View key={k} style={[styles.stat, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{k}</Text>
              <Text style={[theme.typography.cardTitle, { color: k === 'To verify' && capture.summary.needingReview > 0 ? theme.colors.warning : theme.colors.text }]} numberOfLines={1}>{v}</Text>
            </View>
          ))}
        </View>

        <View style={styles.row}>
          {(['camera', 'gallery'] as const).map((source) => (
            <Pressable
              key={source}
              accessibilityRole="button"
              disabled={capture.busy || capture.room <= 0}
              onPress={() => void capture.pick(source)}
              style={[styles.bigButton, { borderColor: theme.colors.border, backgroundColor: source === 'camera' ? theme.colors.primary : theme.colors.surface, borderRadius: theme.radii.md, opacity: capture.busy || capture.room <= 0 ? 0.5 : 1 }]}>
              <Icon name={source === 'camera' ? 'camera' : 'image'} size={20} color={source === 'camera' ? theme.colors.primaryText : theme.colors.text} />
              <Text style={[theme.typography.body, { fontWeight: '700', color: source === 'camera' ? theme.colors.primaryText : theme.colors.text }]}>
                {source === 'camera' ? 'Take Photo' : 'Upload Receipts'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>Up to {AI_CAPTURE_MAX_PHOTOS} at a time · one receipt per photo works best.</Text>

        {capture.photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {capture.photos.map((p, i) => (
              <Pressable key={p.localId} onPress={() => setViewer(p.uri)} accessibilityLabel={`Receipt ${i + 1}`} style={[styles.thumb, { borderColor: theme.colors.cardBorder, borderRadius: theme.radii.sm }]}>
                <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <View style={[styles.thumbBar, { backgroundColor: theme.colors.surface }]}>
                  {p.status === 'uploading' ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
                  <Text style={[theme.typography.label, { color: p.status === 'error' || p.readable === false ? theme.colors.danger : theme.colors.textSecondary }]} numberOfLines={1}>
                    {p.saved ? 'Saved' : p.status === 'error' ? 'Failed' : p.status === 'uploading' ? 'Uploading' : p.readable === false ? 'Unreadable' : p.analyzed ? 'Read' : 'Ready'}
                  </Text>
                </View>
                {!p.saved ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={p.status === 'error' ? `Retry receipt ${i + 1}` : `Remove receipt ${i + 1}`}
                    onPress={() => (p.status === 'error' ? capture.retryUpload(p.localId) : capture.removePhoto(p.localId))}
                    style={[styles.thumbRemove, { backgroundColor: theme.colors.background }]}>
                    <Icon name={p.status === 'error' ? 'refresh' : 'close'} size={12} color={theme.colors.text} />
                  </Pressable>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {capture.notice ? <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{capture.notice}</Text> : null}

        {capture.isReading ? (
          <Card>
            <View style={styles.row}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]}>Reading the receipts line by line, separating the bills and checking the totals… this can take up to a minute.</Text>
            </View>
          </Card>
        ) : null}

        {capture.drafts.length === 0 && !capture.isReading ? (
          <EmptyState icon="sparkle" title="No Expenses Yet" message="Add receipt photos, then tap Generate. Nothing is saved until you approve and save it." />
        ) : null}

        {capture.drafts.map((d, i) => {
          const missing = missingFields(d);
          const saved = d.status === 'saved';
          const first = d.photoIds[0] ? capture.uriOf(d.photoIds[0]) : null;
          const locked = saved || d.status === 'saving' || capture.busy;
          return (
            <Card key={d.key}>
              <View style={styles.row}>
                <Pressable onPress={() => first && setViewer(first)} style={[styles.cardThumb, { borderColor: theme.colors.cardBorder, borderRadius: theme.radii.sm }]}>
                  {first ? <Image source={{ uri: first }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowWrap}>
                    <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label(i)}</Text>
                    <StatusBadge
                      label={saved ? `Saved · ${d.savedTxnNo}` : d.status === 'saving' ? 'Saving…' : d.status === 'approved' ? 'Approved' : d.needsReview || missing.length > 0 ? 'Needs review' : 'AI extracted'}
                      variant={saved ? 'success' : d.status === 'approved' ? 'info' : d.needsReview || missing.length > 0 ? 'warning' : 'neutral'}
                    />
                  </View>
                  <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={2}>{d.description || 'No description'}</Text>
                  {d.descriptionOriginal ? <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]} numberOfLines={1}>{d.descriptionOriginal}</Text> : null}
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                    {d.businessDate ? formatDisplayDate(d.businessDate) : 'No date'} · {d.amount.trim() ? formatCurrency(Number(d.amount)) : 'No amount'} · {FINANCE_PAYMENT_METHOD_LABELS[d.paymentMethod]}
                    {headName(d.ledgerHeadId) ? ` · ${headName(d.ledgerHeadId)}` : ''}
                  </Text>
                </View>
              </View>

              {!saved ? (
                <View style={{ marginTop: theme.spacing.sm, gap: 4 }}>
                  {d.error ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger }]}>{d.error}</Text> : null}
                  {d.issues.map((issue) => (
                    <Text key={issue} style={[theme.typography.label, { color: theme.colors.warning }]}>⚠ {AI_EXPENSE_ISSUE_LABELS[issue]}</Text>
                  ))}
                  {d.aiNotes ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>AI note: {d.aiNotes}</Text> : null}
                  {d.duplicates.length > 0 ? (
                    <View style={[styles.duplicate, { borderColor: theme.colors.warning, borderRadius: theme.radii.sm }]}>
                      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>Possible duplicate</Text>
                      {d.duplicates.map((x, k) => <Text key={k} style={[theme.typography.label, { color: theme.colors.textSecondary }]}>• {x.message}</Text>)}
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: d.duplicateAcknowledged }}
                        disabled={locked}
                        onPress={() => capture.edit(d.key, { duplicateAcknowledged: !d.duplicateAcknowledged })}
                        style={[styles.row, { marginTop: 4 }]}>
                        <View style={[styles.check, { borderColor: theme.colors.border, backgroundColor: d.duplicateAcknowledged ? theme.colors.primary : 'transparent' }]}>
                          {d.duplicateAcknowledged ? <Icon name="check" size={12} color={theme.colors.primaryText} /> : null}
                        </View>
                        <Text style={[theme.typography.label, { color: theme.colors.text, flex: 1 }]}>I have checked: this is a different expense</Text>
                      </Pressable>
                    </View>
                  ) : null}
                  {missing.length > 0 && d.status !== 'saving' ? (
                    <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>Still needed: {missing.join(', ')}</Text>
                  ) : null}
                  <View style={styles.rowWrap}>
                    {[
                      ['Edit', () => openEdit(d.key)],
                      ['Receipt', () => first && setViewer(first)],
                      ['Regenerate', () => void capture.regenerate(d.key)],
                      ['Split', () => confirmSplit(d)],
                      ['Combine', () => chooseCombine(d, i)],
                      ['Delete', () => confirmDelete(d, i)],
                    ].map(([t, onPress]) => (
                      <Pressable
                        key={t as string}
                        accessibilityRole="button"
                        disabled={t !== 'Receipt' && t !== 'Edit' && locked}
                        onPress={onPress as () => void}
                        style={[styles.chip, { borderColor: theme.colors.border, opacity: t !== 'Receipt' && t !== 'Edit' && locked ? 0.5 : 1 }]}>
                        <Text style={[theme.typography.label, { color: t === 'Delete' ? theme.colors.danger : theme.colors.text, fontWeight: '700' }]}>{t as string}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {d.status === 'approved' ? (
                    <SecondaryButton label="Undo Approve" onPress={() => capture.approve(d.key, false)} disabled={locked} />
                  ) : (
                    <PrimaryButton label="Approve" onPress={() => capture.approve(d.key, true)} disabled={locked || missing.length > 0} />
                  )}
                </View>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
        <View style={{ flex: 1 }}>
          <SecondaryButton
            label={capture.isReading ? 'Reading…' : `Generate${capture.pendingCount > 0 ? ` (${capture.pendingCount})` : ''}`}
            onPress={() => void capture.generate()}
            loading={capture.isReading}
            disabled={capture.busy || capture.uploading || capture.pendingCount === 0}
          />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            label={capture.saving ? 'Saving…' : `Save Approved${capture.approvedCount > 0 ? ` (${capture.approvedCount})` : ''}`}
            onPress={() => void capture.saveApproved()}
            loading={capture.saving}
            disabled={capture.busy || capture.approvedCount === 0}
          />
        </View>
      </View>

      <FormBottomSheet ref={editSheet} title={editingDraft ? 'Edit Expense' : 'Expense'} onRequestClose={() => editSheet.current?.dismiss()} onDismiss={() => setEditing(null)}>
        {editingDraft ? <EditFields draft={editingDraft} headOptions={headOptions} headsLoading={heads.isLoading} onChange={(patch) => capture.edit(editingDraft.key, patch)} onDone={() => editSheet.current?.dismiss()} /> : null}
      </FormBottomSheet>

      <PhotoViewer visible={viewer !== null} uri={viewer} accessibilityLabel="Receipt" onClose={() => setViewer(null)} />
    </Screen>
  );
}

function EditFields({
  draft,
  headOptions,
  headsLoading,
  onChange,
  onDone,
}: {
  draft: AiDraft;
  headOptions: DropdownOption[];
  headsLoading: boolean;
  onChange: (patch: Partial<AiDraft>) => void;
  onDone: () => void;
}) {
  const theme = useAppTheme();
  const locked = draft.status === 'saved' || draft.status === 'saving';
  return (
    <View style={{ gap: theme.spacing.md }}>
      <View>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 6 }]}>LEDGER HEAD</Text>
        <Dropdown options={headOptions} value={draft.ledgerHeadId || null} onChange={(v) => onChange({ ledgerHeadId: v })} placeholder="Select an expense head" loading={headsLoading} emptyLabel="No expense heads configured yet" />
      </View>
      <DateField label="Business date" required value={draft.businessDate} onChange={(v) => onChange({ businessDate: v })} />
      <TextField label="Amount" required editable={!locked} keyboardType="decimal-pad" placeholder="0.00" value={draft.amount} onChangeText={(v) => onChange({ amount: v })} />
      {draft.billTotal !== null && Number(draft.amount) !== draft.billTotal ? (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>The bill total read was {formatCurrency(draft.billTotal)}.</Text>
      ) : null}
      <TextField label="Description" required editable={!locked} maxLength={300} value={draft.description} onChangeText={(v) => onChange({ description: v })} />
      <View>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 6 }]}>PAYMENT METHOD</Text>
        <Dropdown options={FINANCE_PAYMENT_METHOD_OPTIONS} value={draft.paymentMethod} onChange={(v) => onChange({ paymentMethod: v })} placeholder="Select a payment method" />
      </View>
      <View>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 6 }]}>ACCOUNT</Text>
        <View style={styles.row}>
          {(['cash', 'bank'] as FinanceAccount[]).map((a) => {
            const active = a === draft.account;
            return (
              <Pressable key={a} onPress={() => onChange({ account: a })} style={[styles.toggle, { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[theme.typography.body, { fontWeight: '600', color: active ? theme.colors.primaryText : theme.colors.text }]}>{a === 'cash' ? 'Cash in Hand' : 'Bank'}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <TextField label="Reference" editable={!locked} maxLength={80} placeholder="Invoice no." value={draft.referenceNo} onChangeText={(v) => onChange({ referenceNo: v })} />
      <TextField label="Notes" editable={!locked} maxLength={500} multiline value={draft.notes} onChangeText={(v) => onChange({ notes: v })} />
      {draft.lineItems.length > 0 ? (
        <View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 6 }]}>BILL ITEMS — KEPT AS DETAIL</Text>
          {draft.lineItems.map((l, i) => (
            <View key={i} style={[styles.itemRow, { borderColor: theme.colors.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>{l.description}</Text>
                {l.descriptionEnglish ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{l.descriptionEnglish}</Text> : null}
              </View>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>{l.amount !== null ? formatCurrency(l.amount) : '—'}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <PrimaryButton label="Done" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  bigButton: { flex: 1, minHeight: 56, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  thumb: { width: 84, height: 112, borderWidth: 1, overflow: 'hidden' },
  thumbBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4, paddingVertical: 2 },
  thumbRemove: { position: 'absolute', top: 4, right: 4, borderRadius: 999, padding: 4 },
  cardThumb: { width: 56, height: 56, borderWidth: 1, overflow: 'hidden' },
  duplicate: { borderWidth: 1, padding: 8, gap: 2 },
  check: { width: 18, height: 18, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  toggle: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 6 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
