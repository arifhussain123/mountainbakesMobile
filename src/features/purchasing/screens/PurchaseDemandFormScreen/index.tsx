import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  PURCHASE_PAYMENT_PREFERENCES,
  PURCHASE_PAYMENT_PREFERENCE_LABEL,
  PURCHASE_UNITS,
  generateIdempotencyKey,
  getBusinessDate,
  useCreatePurchaseDemand,
  usePurchaseDemand,
  usePurchaseSupplierBalance,
  usePurchasingStatus,
  useSendPurchaseDemand,
  useUpdatePurchaseDemand,
  useVerifyPurchaseDemand,
  type PurchaseDemand,
  type PurchaseItem,
  type PurchaseUnit,
  type Supplier,
  type VerificationResult,
} from '@/api';
import { Routes, type ProductionWhatsAppStackParamList } from '@/navigation';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, DateField, Dropdown, EmptyState, ErrorState, Icon, LoadingSkeleton, PrimaryButton, Screen, SecondaryButton } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { ChoiceChips, FieldError, FieldLabel, Input, ItemPickerModal, LinkButton, Notice, PickerField, Row, Section, SupplierPickerModal } from '../../components';
import { useSubmission } from '../../hooks';
import {
  MAX_DEMAND_LINES,
  connectionInfo,
  demandFormFromDemand,
  emptyDemandForm,
  emptyDemandLine,
  toDemandInput,
  validateDemandForm,
  type DemandFormState,
  type DemandLineForm,
} from '../../utils';
import { styles } from './styles';

type Nav = NativeStackNavigationProp<ProductionWhatsAppStackParamList>;
type FormRoute = RouteProp<ProductionWhatsAppStackParamList, typeof Routes.PRODUCTION_WHATSAPP_DEMAND_FORM>;

const PRIORITY_OPTIONS = [
  { value: 'urgent' as const, label: 'Urgent' },
  { value: 'normal' as const, label: 'Normal' },
];
const PAYMENT_OPTIONS = PURCHASE_PAYMENT_PREFERENCES.map((p) => ({ value: p, label: PURCHASE_PAYMENT_PREFERENCE_LABEL[p] }));
const UNIT_OPTIONS = PURCHASE_UNITS.map((u) => ({ value: u, label: u }));

/**
 * New Demand / edit draft — then Verify and Send, all from this one form.
 *
 *   SAVE DRAFT  creates the demand once (`clientRequestId` minted once per
 *               form, so a retried create returns the same demand), then
 *               updates it with its `revision`.
 *   VERIFY      runs the server's checks on the saved revision and shows each;
 *               a failed check blocks, a warning does not.
 *   SEND        only for the revision that verified, unchanged since; one
 *               idempotency key per send, reused on its retries.
 */
export function PurchaseDemandFormScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const editId = route.params?.demandId;
  const today = getBusinessDate();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const existing = usePurchaseDemand(editId);
  const statusQ = usePurchasingStatus();
  const createDemand = useCreatePurchaseDemand();
  const updateDemand = useUpdatePurchaseDemand();
  const verifyDemand = useVerifyPurchaseDemand();
  const sendDemand = useSendPurchaseDemand();

  const createSub = useSubmission('purchase_demand_create');
  const saveSub = useSubmission('purchase_demand_update');
  const verifySub = useSubmission('purchase_demand_verify');
  const sendSub = useSubmission('purchase_demand_send');
  // One per form: a retried create, even after an edit, comes back as the same demand.
  const clientRequestId = useRef(generateIdempotencyKey('purchase_demand')).current;

  const [form, setForm] = useState<DemandFormState>(() => emptyDemandForm(today));
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);
  const [saved, setSaved] = useState<PurchaseDemand | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [message, setMessage] = useState<{ tone: 'danger' | 'success' | 'warning'; text: string } | null>(null);
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [itemPickerFor, setItemPickerFor] = useState<DemandLineForm | null>(null);

  // Edit: fill the form from the saved draft, once.
  useEffect(() => {
    if (existing.data && loadedFrom !== existing.data.id) {
      setForm(demandFormFromDemand(existing.data));
      setSaved(existing.data);
      setLoadedFrom(existing.data.id);
    }
  }, [existing.data, loadedFrom]);

  const balanceQ = usePurchaseSupplierBalance(form.supplier?.id);
  const errors = useMemo(() => validateDemandForm(form), [form]);
  const hasErrors = Object.keys(errors).length > 0;
  const err = (key: string) => (showErrors ? errors[key] : undefined);

  const busy = createSub.pending || saveSub.pending || verifySub.pending || sendSub.pending;
  const canSend = !!saved && !dirty && saved.status === 'verified' && saved.verifiedRevision === saved.revision && verification?.ok === true;

  // Leaving with unsaved edits asks first.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (!dirty || busy) return;
        e.preventDefault();
        Alert.alert('Discard changes?', saved ? 'Your edits since the last save will be lost.' : 'This demand has not been saved.', [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]);
      }),
    [navigation, dirty, busy, saved],
  );

  const update = (fn: (f: DemandFormState) => DemandFormState) => {
    setForm(fn);
    setDirty(true);
    setMessage(null);
  };
  const set = <K extends keyof DemandFormState>(key: K, value: DemandFormState[K]) => update((f) => ({ ...f, [key]: value }));
  const setLine = (key: string, patch: Partial<DemandLineForm>) =>
    update((f) => ({ ...f, lines: f.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }));

  /** Saves the form; returns the saved demand, or null (and says why). */
  const saveDraft = async (): Promise<PurchaseDemand | null> => {
    setShowErrors(true);
    if (hasErrors) {
      setMessage({ tone: 'danger', text: 'Fix the highlighted fields first.' });
      return null;
    }
    const input = toDemandInput(form);
    if (!saved) {
      const body = { ...input, clientRequestId };
      const outcome = await createSub.run(body, (key) => createDemand.mutateAsync({ input: body, idempotencyKey: key }));
      if (outcome.kind === 'busy') return null;
      if (outcome.kind === 'failed') {
        setMessage({ tone: 'danger', text: outcome.message });
        return null;
      }
      let demand: PurchaseDemand = outcome.value;
      // A replay returns the first save; bring it up to what is on screen now.
      if (outcome.value.replayed) {
        const again = await saveSub.run({ id: demand.id, input }, () => updateDemand.mutateAsync({ id: demand.id, input: { ...input, revision: demand.revision } }));
        if (again.kind === 'done') demand = again.value;
      }
      setSaved(demand);
      setDirty(false);
      setVerification(null);
      return demand;
    }
    if (!dirty) return saved;
    const outcome = await saveSub.run({ id: saved.id, input, revision: saved.revision }, () =>
      updateDemand.mutateAsync({ id: saved.id, input: { ...input, revision: saved.revision } }),
    );
    if (outcome.kind === 'busy') return null;
    if (outcome.kind === 'failed') {
      setMessage({ tone: 'danger', text: outcome.conflict ? `${outcome.message}\nReopen the demand to see its latest version.` : outcome.message });
      return null;
    }
    setSaved(outcome.value);
    setDirty(false);
    setVerification(null);
    return outcome.value;
  };

  const handleSave = async () => {
    const demand = await saveDraft();
    if (demand) setMessage({ tone: 'success', text: `Saved as ${demand.demandNo} (draft). Verify it before sending.` });
  };

  const handleVerify = async () => {
    const demand = await saveDraft();
    if (!demand) return;
    const outcome = await verifySub.run({ id: demand.id, revision: demand.revision }, () => verifyDemand.mutateAsync({ id: demand.id, revision: demand.revision }));
    if (outcome.kind === 'failed') {
      setMessage({ tone: 'danger', text: outcome.message });
      return;
    }
    if (outcome.kind !== 'done') return;
    setVerification(outcome.value);
    setSaved(outcome.value.demand);
    setMessage(
      outcome.value.ok
        ? { tone: 'success', text: 'Verified. Review the checks, then Send to the supplier.' }
        : { tone: 'danger', text: 'Verification found problems. Fix them, then verify again.' },
    );
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const handleSend = () => {
    if (!saved || !canSend) return;
    const testMode = statusQ.data ? connectionInfo(statusQ.data).isTestMode : false;
    Alert.alert(
      'Send to supplier?',
      `${saved.demandNo} goes to ${saved.supplierName} on WhatsApp with a private link to quote.${testMode ? '\n\nTest mode, no real WhatsApp messages are sent.' : ''}\n\nOnce sent it can no longer be edited.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            const body = { id: saved.id, revision: saved.revision };
            const outcome = await sendSub.run(body, (key) => sendDemand.mutateAsync({ ...body, idempotencyKey: key }));
            if (outcome.kind === 'done') {
              setDirty(false);
              navigation.replace(Routes.PRODUCTION_WHATSAPP_DEMAND_DETAIL, { demandId: saved.id });
            } else if (outcome.kind === 'failed') {
              setMessage({ tone: 'danger', text: outcome.conflict ? `${outcome.message}\nVerify again before sending.` : outcome.message });
              if (outcome.conflict) setVerification(null);
            }
          },
        },
      ],
    );
  };

  const pickSupplier = (s: Supplier) => {
    set('supplier', { id: s.id, name: s.name, whatsappNumber: s.whatsappNumber });
    setSupplierPickerOpen(false);
  };

  const pickItem = (item: PurchaseItem) => {
    if (itemPickerFor) setLine(itemPickerFor.key, { itemId: item.id, itemCode: item.itemCode, itemName: item.name, unit: item.unit });
    setItemPickerFor(null);
  };

  // ── Edit mode: loading / not editable ────────────────────────────────────
  if (editId && !existing.data) {
    return (
      <Screen>
        <AppHeader title="Edit Demand" actions={[{ icon: 'chevron-left', onPress: () => navigation.goBack(), accessibilityLabel: 'Back' }]} />
        <View style={{ padding: theme.spacing.lg, gap: 10 }}>
          {existing.error ? <ErrorState message={mapErrorToMessage(existing.error)} onRetry={() => void existing.refetch()} /> : <LoadingSkeleton height={200} />}
        </View>
      </Screen>
    );
  }
  if (editId && existing.data && !existing.data.actions.edit && !saved) {
    return (
      <Screen>
        <AppHeader title={existing.data.demandNo} actions={[{ icon: 'chevron-left', onPress: () => navigation.goBack(), accessibilityLabel: 'Back' }]} />
        <EmptyState title="Not Editable" message="This demand has been sent, so it can no longer be changed here." actionLabel="Open demand" onAction={() => navigation.replace(Routes.PRODUCTION_WHATSAPP_DEMAND_DETAIL, { demandId: editId })} />
      </Screen>
    );
  }

  const balance = balanceQ.data;
  const stateLine = saved
    ? `${saved.demandNo} · ${dirty ? 'unsaved changes' : saved.status === 'verified' && saved.verifiedRevision === saved.revision ? 'verified' : 'draft saved'}`
    : 'Not saved yet';

  return (
    <Screen>
      <AppHeader title={saved ? 'Edit Demand' : 'New Demand'} subtitle={stateLine} actions={[{ icon: 'chevron-left', onPress: () => navigation.goBack(), accessibilityLabel: 'Back' }]} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }} keyboardShouldPersistTaps="handled">
          <Section title="Supplier & timing">
            <FieldLabel required style={{ marginTop: 0 }}>
              Supplier
            </FieldLabel>
            <PickerField
              label={form.supplier ? `${form.supplier.name} · ${form.supplier.whatsappNumber}` : null}
              placeholder="Choose or register a supplier…"
              onPress={() => setSupplierPickerOpen(true)}
              error={err('supplier')}
            />
            <FieldError message={err('supplier')} />
            {balance ? (
              <View style={{ marginTop: 8 }}>
                <Row label="Outstanding with this supplier" value={formatCurrency(balance.outstanding)} tone={balance.outstanding > 0 ? 'warning' : undefined} />
                {balance.creditOutstanding > 0 ? <Row label="Credit outstanding" value={formatCurrency(balance.creditOutstanding)} /> : null}
                {balance.pendingPayments > 0 ? <Row label="Payments waiting for Finance" value={formatCurrency(balance.pendingPayments)} /> : null}
              </View>
            ) : null}

            <FieldLabel required>Required by</FieldLabel>
            <DateField value={form.requiredDate} onChange={(v) => set('requiredDate', v)} minimumDate={today} error={err('requiredDate')} required />

            <FieldLabel required>Priority</FieldLabel>
            <ChoiceChips options={PRIORITY_OPTIONS} value={form.priority} onChange={(v) => set('priority', v)} />
          </Section>

          <Section title="Items" subtitle={`${form.lines.length} of ${MAX_DEMAND_LINES} max`}>
            {form.lines.map((line, index) => (
              <View key={line.key} style={[styles.line, { borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
                <View style={styles.lineHead}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700', flex: 1 }]}>ITEM {index + 1}</Text>
                  <LinkButton label={line.itemId ? 'Change' : 'From catalog'} icon="search" onPress={() => setItemPickerFor(line)} />
                  {form.lines.length > 1 ? (
                    <LinkButton label="Remove" tone="danger" icon="trash" onPress={() => update((f) => ({ ...f, lines: f.lines.filter((l) => l.key !== line.key) }))} />
                  ) : null}
                </View>
                <Input
                  value={line.itemName}
                  onChangeText={(v) => setLine(line.key, { itemName: v, ...(line.itemId ? { itemId: null, itemCode: null } : {}) })}
                  placeholder="Item name (or pick from catalog)"
                  maxLength={120}
                  error={err(`line.${line.key}.itemName`)}
                />
                {line.itemId ? (
                  <View style={styles.catalogTag}>
                    <Icon name="check" size={12} color={theme.colors.success} />
                    <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Catalog item{line.itemCode ? ` · ${line.itemCode}` : ''}</Text>
                  </View>
                ) : null}
                <FieldError message={err(`line.${line.key}.itemName`)} />
                <View style={[styles.qtyRow, { marginTop: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <Input value={line.qty} onChangeText={(v) => setLine(line.key, { qty: v })} placeholder="Qty" keyboardType="decimal-pad" error={err(`line.${line.key}.qty`)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Dropdown<PurchaseUnit> options={UNIT_OPTIONS} value={line.unit} onChange={(u) => setLine(line.key, { unit: u })} placeholder="Unit" />
                  </View>
                </View>
                <FieldError message={err(`line.${line.key}.qty`) ?? err(`line.${line.key}.unit`)} />
                <View style={{ marginTop: 8 }}>
                  <Input value={line.note} onChangeText={(v) => setLine(line.key, { note: v })} placeholder="Note for the supplier (optional)" maxLength={300} compact />
                </View>
              </View>
            ))}
            <FieldError message={err('lines')} />
            {form.lines.length < MAX_DEMAND_LINES ? (
              <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                <LinkButton label="Add item" icon="plus" onPress={() => update((f) => ({ ...f, lines: [...f.lines, emptyDemandLine()] }))} />
              </View>
            ) : null}
          </Section>

          <Section title="Delivery & notes">
            <FieldLabel style={{ marginTop: 0 }}>Delivery instructions</FieldLabel>
            <Input value={form.deliveryInstructions} onChangeText={(v) => set('deliveryInstructions', v)} placeholder="Where and when to deliver" multiline maxLength={1000} />
            <FieldLabel>Notes for the supplier</FieldLabel>
            <Input value={form.notes} onChangeText={(v) => set('notes', v)} placeholder="Anything else they should know" multiline maxLength={1000} />
          </Section>

          <Section title="Payment">
            <FieldLabel required style={{ marginTop: 0 }}>
              Payment preference
            </FieldLabel>
            <ChoiceChips options={PAYMENT_OPTIONS} value={form.paymentPreference} onChange={(v) => set('paymentPreference', v)} />
            {form.paymentPreference === 'credit' ? (
              <View>
                <FieldLabel required>Credit amount requested</FieldLabel>
                <Input value={form.creditAmount} onChangeText={(v) => set('creditAmount', v)} placeholder="Rs." keyboardType="decimal-pad" error={err('creditAmount')} />
                <FieldError message={err('creditAmount')} />
                <FieldLabel>Credit terms</FieldLabel>
                <Input value={form.creditTerms} onChangeText={(v) => set('creditTerms', v)} placeholder="e.g. 30 days" maxLength={300} />
                <FieldLabel>Due date</FieldLabel>
                <DateField value={form.creditDueDate} onChange={(v) => set('creditDueDate', v)} minimumDate={today} onClear={() => set('creditDueDate', '')} placeholder="No due date" />
                <FieldLabel>Reference</FieldLabel>
                <Input value={form.creditReference} onChangeText={(v) => set('creditReference', v)} maxLength={100} />
                <FieldLabel>Credit notes</FieldLabel>
                <Input value={form.creditNotes} onChangeText={(v) => set('creditNotes', v)} multiline maxLength={500} />
                <Notice text="Credit is only a request here. It becomes a liability when Finance approves it, after the bill." />
                {balance ? (
                  <View style={{ marginTop: 8 }}>
                    <Row label="Supplier's current balance" value={formatCurrency(balance.outstanding)} strong />
                    <Row label="Credit approved so far" value={formatCurrency(balance.creditApproved)} />
                    <Row label="Credit still owed" value={formatCurrency(balance.creditOutstanding)} />
                  </View>
                ) : balanceQ.isLoading && form.supplier ? (
                  <View style={{ marginTop: 8 }}>
                    <LoadingSkeleton height={50} />
                  </View>
                ) : null}
              </View>
            ) : null}
          </Section>

          {verification ? (
            <Section title={verification.ok ? 'Verification passed' : 'Verification failed'} subtitle={dirty ? 'You changed the demand since — verify again before sending.' : `Revision ${verification.demand.revision}`}>
              {verification.checks.map((c) => {
                const color = c.ok ? theme.colors.success : c.severity === 'error' ? theme.colors.danger : theme.colors.warning;
                return (
                  <View key={c.key} style={styles.check} accessibilityLabel={`${c.label}: ${c.ok ? 'passed' : c.severity === 'error' ? 'failed' : 'warning'}${c.message ? `, ${c.message}` : ''}`}>
                    <Icon name={c.ok ? 'check' : c.severity === 'error' ? 'close' : 'warning'} size={14} color={color} />
                    <View style={{ flex: 1 }}>
                      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>{c.label}</Text>
                      {c.message ? <Text style={[theme.typography.label, { color: c.ok ? theme.colors.textSecondary : color }]}>{c.message}</Text> : null}
                    </View>
                    <Text style={[theme.typography.label, { color, fontWeight: '700' }]}>{c.ok ? 'OK' : c.severity === 'error' ? 'Blocks' : 'Warning'}</Text>
                  </View>
                );
              })}
            </Section>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          {message ? (
            <Text accessibilityLiveRegion="polite" style={[theme.typography.bodySmall, { color: theme.colors[message.tone], marginBottom: 10 }]}>
              {message.text}
            </Text>
          ) : null}
          <View style={styles.footerRow}>
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Save Draft" onPress={() => void handleSave()} loading={createSub.pending || saveSub.pending} disabled={busy || (!!saved && !dirty)} />
            </View>
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Verify" onPress={() => void handleVerify()} loading={verifySub.pending} disabled={busy} />
            </View>
          </View>
          <View style={{ marginTop: 10 }}>
            <PrimaryButton label="Send to Supplier" onPress={handleSend} loading={sendSub.pending} disabled={busy || !canSend} />
          </View>
          {!canSend && !busy ? (
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>
              {verification && !verification.ok ? 'Fix the failed checks and verify again.' : 'Send unlocks once this exact version is verified.'}
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <SupplierPickerModal visible={supplierPickerOpen} onSelect={pickSupplier} onClose={() => setSupplierPickerOpen(false)} />
      <ItemPickerModal
        visible={itemPickerFor !== null}
        title="Choose Catalog Item"
        initialSearch={itemPickerFor?.itemName ?? ''}
        initialUnit={itemPickerFor?.unit ?? null}
        onSelect={pickItem}
        onClose={() => setItemPickerFor(null)}
      />
    </Screen>
  );
}
