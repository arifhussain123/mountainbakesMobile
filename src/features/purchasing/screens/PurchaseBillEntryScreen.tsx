import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getBusinessDate, useEnterPurchaseBill, usePurchaseDemand } from '@/api';
import { Routes, type ProductionWhatsAppStackParamList } from '@/navigation';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Checkbox, DateField, EmptyState, ErrorState, LoadingSkeleton, PrimaryButton, Screen } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { FieldError, FieldLabel, Input, Notice, Section } from '../components';
import { useSubmission } from '../hooks';
import { billDifferencesPreview, billFormFromQuotation, billTotalPreview, formatQty, toBillInput, validateBillForm, type BillFormState, type BillLineForm } from '../utils';

type Nav = NativeStackNavigationProp<ProductionWhatsAppStackParamList>;
type EntryRoute = RouteProp<ProductionWhatsAppStackParamList, typeof Routes.PRODUCTION_WHATSAPP_BILL_ENTRY>;

/**
 * The supplier's bill, keyed in by Production when it came as a message or on
 * paper (`POST /demands/:id/bills`). Prefilled from the approved quotation;
 * anything changed is shown as a difference before saving, because approving
 * such a bill later needs the differences accepted.
 */
export function PurchaseBillEntryScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<Nav>();
  const { demandId } = useRoute<EntryRoute>().params;
  const demandQ = usePurchaseDemand(demandId);
  const enter = useEnterPurchaseBill();
  const sub = useSubmission('purchase_bill_enter');
  const [form, setForm] = useState<BillFormState | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approved = demandQ.data?.quotations.find((q) => q.id === demandQ.data?.approvedQuotationId) ?? null;
  useEffect(() => {
    if (approved && !form) setForm(billFormFromQuotation(approved, getBusinessDate()));
  }, [approved, form]);

  const errors = useMemo(() => (form ? validateBillForm(form) : {}), [form]);
  const err = (k: string) => (showErrors ? errors[k] : undefined);
  const back = { icon: 'chevron-left' as const, onPress: () => navigation.goBack(), accessibilityLabel: 'Back' };

  if (!demandQ.data) {
    return (
      <Screen>
        <AppHeader title="Enter Bill" actions={[back]} />
        <View style={{ padding: theme.spacing.lg }}>
          {demandQ.error ? <ErrorState message={mapErrorToMessage(demandQ.error)} onRetry={() => void demandQ.refetch()} /> : <LoadingSkeleton height={200} />}
        </View>
      </Screen>
    );
  }
  const d = demandQ.data;
  if (!d.actions.enterBill || !approved || !form) {
    return (
      <Screen>
        <AppHeader title="Enter Bill" subtitle={d.demandNo} actions={[back]} />
        <EmptyState title="Not Possible Now" message="A bill can be entered only while the demand waits for one against its approved quotation." actionLabel="Back to demand" onAction={() => navigation.goBack()} />
      </Screen>
    );
  }

  const set = <K extends keyof BillFormState>(k: K, v: BillFormState[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const setLine = (key: string, patch: Partial<BillLineForm>) => setForm((f) => (f ? { ...f, lines: f.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) } : f));
  const differences = billDifferencesPreview(form);
  const preview = billTotalPreview(form);

  const submit = () => {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    const input = toBillInput(form);
    Alert.alert(
      'Save bill?',
      `${preview !== null ? `About ${formatCurrency(preview)}. ` : ''}${differences.length ? `It differs from quotation v${approved.version} in ${differences.length} place${differences.length === 1 ? '' : 's'}. ` : ''}It waits for approval before anything is payable.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            setError(null);
            const outcome = await sub.run(input, (key) => enter.mutateAsync({ id: d.id, input: { ...input, clientRequestId: key }, idempotencyKey: key }));
            if (outcome.kind === 'done') navigation.goBack();
            else if (outcome.kind === 'failed') setError(outcome.message);
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <AppHeader title="Enter Bill" subtitle={`${d.demandNo} · against quotation v${approved.version}`} actions={[back]} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }} keyboardShouldPersistTaps="handled">
          <Section title="Bill">
            <FieldLabel required style={{ marginTop: 0 }}>
              Supplier's bill number
            </FieldLabel>
            <Input value={form.supplierBillNo} onChangeText={(v) => set('supplierBillNo', v)} maxLength={60} autoCapitalize="characters" error={err('supplierBillNo')} />
            <FieldError message={err('supplierBillNo')} />
            <FieldLabel required>Invoice date</FieldLabel>
            <DateField value={form.invoiceDate} onChange={(v) => set('invoiceDate', v)} maximumDate={getBusinessDate()} error={err('invoiceDate')} required />
            <FieldLabel>Delivery date</FieldLabel>
            <DateField value={form.deliveryDate} onChange={(v) => set('deliveryDate', v)} onClear={() => set('deliveryDate', '')} placeholder="Not given" />
          </Section>

          <Section title="Lines" subtitle="Prefilled from the approved quotation">
            {form.lines.map((line) => (
              <View key={line.key} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: line.included }}
                  onPress={() => setLine(line.key, { included: !line.included })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Checkbox checked={line.included} onChange={(v) => setLine(line.key, { included: v })} accessibilityLabel={`Include ${line.itemName}`} />
                  <View style={{ flex: 1 }}>
                    <Text style={[theme.typography.body, { color: theme.colors.text }]}>{line.itemName}</Text>
                    <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                      Quoted {formatQty(line.quotedQty, line.unit)} @ {formatCurrency(line.quotedRate)}
                    </Text>
                  </View>
                </Pressable>
                {line.included ? (
                  <>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Input value={line.qty} onChangeText={(v) => setLine(line.key, { qty: v })} keyboardType="decimal-pad" placeholder={`Qty (${line.unit})`} error={err(`line.${line.key}.qty`)} compact />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input value={line.unitRate} onChangeText={(v) => setLine(line.key, { unitRate: v })} keyboardType="decimal-pad" placeholder="Rate" error={err(`line.${line.key}.unitRate`)} compact />
                      </View>
                    </View>
                    <FieldError message={err(`line.${line.key}.qty`) ?? err(`line.${line.key}.unitRate`)} />
                  </>
                ) : null}
              </View>
            ))}
            <FieldError message={err('lines')} />
          </Section>

          <Section title="Charges">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <FieldLabel style={{ marginTop: 0 }}>Delivery</FieldLabel>
                <Input value={form.deliveryCharge} onChangeText={(v) => set('deliveryCharge', v)} keyboardType="decimal-pad" error={err('deliveryCharge')} />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel style={{ marginTop: 0 }}>Discount</FieldLabel>
                <Input value={form.discount} onChangeText={(v) => set('discount', v)} keyboardType="decimal-pad" error={err('discount')} />
              </View>
            </View>
            <FieldError message={err('deliveryCharge') ?? err('discount')} />
            <FieldLabel>Other charges</FieldLabel>
            <Input value={form.otherCharges} onChangeText={(v) => set('otherCharges', v)} keyboardType="decimal-pad" error={err('otherCharges')} />
            <FieldError message={err('otherCharges')} />
            <FieldLabel>Other charges note</FieldLabel>
            <Input value={form.otherChargesNote} onChangeText={(v) => set('otherChargesNote', v)} maxLength={300} />
          </Section>

          <Section title="Supplier's own statement" subtitle="What the bill says about payment — not a payment record">
            <FieldLabel style={{ marginTop: 0 }}>Payment method on the bill</FieldLabel>
            <Input value={form.supplierPaymentMethod} onChangeText={(v) => set('supplierPaymentMethod', v)} maxLength={60} />
            <FieldLabel>Amount the bill says is paid</FieldLabel>
            <Input value={form.supplierStatedPaid} onChangeText={(v) => set('supplierStatedPaid', v)} keyboardType="decimal-pad" error={err('supplierStatedPaid')} />
            <FieldError message={err('supplierStatedPaid')} />
            <FieldLabel>Notes</FieldLabel>
            <Input value={form.notes} onChangeText={(v) => set('notes', v)} multiline maxLength={1000} />
          </Section>

          {differences.length > 0 ? (
            <Notice tone="warning" icon="warning" text={`Differs from the approved quotation — approving it will need the differences accepted:\n${differences.join('\n')}`} />
          ) : null}
        </ScrollView>
        <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, padding: theme.spacing.lg, backgroundColor: theme.colors.surface }}>
          {error ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginBottom: 10 }]}>{error}</Text> : null}
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginBottom: 10 }]}>
            Estimated grand total: {preview === null ? '—' : formatCurrency(preview)} (the server calculates the saved total)
          </Text>
          <PrimaryButton label="Save Bill" onPress={submit} loading={sub.pending} inactive={showErrors && Object.keys(errors).length > 0} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
