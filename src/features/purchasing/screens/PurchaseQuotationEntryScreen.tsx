import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PURCHASE_UNITS, getBusinessDate, useEnterPurchaseQuotation, usePurchaseDemand, type PurchaseUnit, type QuotationAvailability } from '@/api';
import { Routes, type ProductionWhatsAppStackParamList } from '@/navigation';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, DateField, Dropdown, EmptyState, ErrorState, LoadingSkeleton, PrimaryButton, Screen } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { ChoiceChips, FieldError, FieldLabel, Input, LinkButton, Notice, Section } from '../components';
import { useSubmission } from '../hooks';
import {
  formatQty,
  quotationFormFromDemand,
  quotationTotalPreview,
  substituteLine,
  toQuotationInput,
  validateQuotationForm,
  withAvailability,
  type QuotationFormState,
  type QuotationLineForm,
} from '../utils';

type Nav = NativeStackNavigationProp<ProductionWhatsAppStackParamList>;
type EntryRoute = RouteProp<ProductionWhatsAppStackParamList, typeof Routes.PRODUCTION_WHATSAPP_QUOTATION_ENTRY>;

const AVAILABILITY_OPTIONS: { value: QuotationAvailability; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'partial', label: 'Partial' },
  { value: 'unavailable', label: 'Unavailable' },
];
const UNIT_OPTIONS = PURCHASE_UNITS.map((u) => ({ value: u, label: u }));

/**
 * A quotation the supplier sent as a plain WhatsApp message, keyed in by
 * Production on their behalf (`POST /demands/:id/quotations`). One line per
 * requested item, plus any substitutes the supplier offered. The server
 * computes every total; the figure here is an estimate.
 */
export function PurchaseQuotationEntryScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<Nav>();
  const { demandId } = useRoute<EntryRoute>().params;
  const demandQ = usePurchaseDemand(demandId);
  const enter = useEnterPurchaseQuotation();
  const sub = useSubmission('purchase_quotation_enter');
  const [form, setForm] = useState<QuotationFormState | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (demandQ.data && !form) setForm(quotationFormFromDemand(demandQ.data));
  }, [demandQ.data, form]);

  const errors = useMemo(() => (form ? validateQuotationForm(form) : {}), [form]);
  const err = (k: string) => (showErrors ? errors[k] : undefined);
  const back = { icon: 'chevron-left' as const, onPress: () => navigation.goBack(), accessibilityLabel: 'Back' };

  if (!demandQ.data || !form) {
    return (
      <Screen>
        <AppHeader title="Enter Quotation" actions={[back]} />
        <View style={{ padding: theme.spacing.lg }}>
          {demandQ.error ? <ErrorState message={mapErrorToMessage(demandQ.error)} onRetry={() => void demandQ.refetch()} /> : <LoadingSkeleton height={200} />}
        </View>
      </Screen>
    );
  }
  const d = demandQ.data;
  if (!d.actions.enterQuotation) {
    return (
      <Screen>
        <AppHeader title="Enter Quotation" subtitle={d.demandNo} actions={[back]} />
        <EmptyState title="Not Possible Now" message="This demand is not waiting for a quotation any more." actionLabel="Back to demand" onAction={() => navigation.goBack()} />
      </Screen>
    );
  }

  const setLine = (key: string, fn: (l: QuotationLineForm) => QuotationLineForm) =>
    setForm((f) => (f ? { ...f, lines: f.lines.map((l) => (l.key === key ? fn(l) : l)) } : f));
  const set = <K extends keyof QuotationFormState>(k: K, v: QuotationFormState[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const preview = quotationTotalPreview(form);

  const submit = () => {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    const input = toQuotationInput(form);
    Alert.alert('Save quotation?', `${preview !== null ? `About ${formatCurrency(preview)} in total. ` : ''}It is recorded as entered by you on the supplier's behalf, and waits for approval.`, [
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
    ]);
  };

  const requestedName = (id: string | null) => d.items.find((i) => i.id === id)?.itemName ?? '';

  return (
    <Screen>
      <AppHeader title="Enter Quotation" subtitle={`${d.demandNo} · ${d.supplierName}`} actions={[back]} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }} keyboardShouldPersistTaps="handled">
          <Notice text="Use this when the supplier quoted by message instead of through their link. Enter exactly what they offered." />
          <View style={{ height: theme.spacing.md }} />
          {form.lines.map((line) => {
            const k = `line.${line.key}`;
            const substitute = line.availability === 'substitute';
            return (
              <Section
                key={line.key}
                title={substitute ? `Substitute for ${requestedName(line.substituteForDemandItemId)}` : line.itemName}
                subtitle={line.requestedQty !== null ? `Requested ${formatQty(line.requestedQty, line.unit)}` : null}
                action={
                  substitute ? (
                    <LinkButton label="Remove" tone="danger" icon="trash" onPress={() => setForm((f) => (f ? { ...f, lines: f.lines.filter((l) => l.key !== line.key) } : f))} />
                  ) : (
                    <LinkButton
                      label="Offer substitute"
                      icon="plus"
                      tone="text"
                      onPress={() =>
                        setForm((f) => {
                          if (!f) return f;
                          const at = f.lines.findIndex((l) => l.key === line.key);
                          const lines = [...f.lines];
                          lines.splice(at + 1, 0, substituteLine(line));
                          return { ...f, lines };
                        })
                      }
                    />
                  )
                }>
                {substitute ? (
                  <>
                    <FieldLabel required style={{ marginTop: 0 }}>
                      Item offered
                    </FieldLabel>
                    <Input value={line.itemName} onChangeText={(v) => setLine(line.key, (l) => ({ ...l, itemName: v }))} maxLength={120} error={err(`${k}.itemName`)} />
                    <FieldError message={err(`${k}.itemName`)} />
                    <FieldLabel required>Unit</FieldLabel>
                    <Dropdown<PurchaseUnit> options={UNIT_OPTIONS} value={line.unit} onChange={(u) => setLine(line.key, (l) => ({ ...l, unit: u }))} placeholder="Unit" />
                    <FieldError message={err(`${k}.unit`)} />
                  </>
                ) : (
                  <ChoiceChips options={AVAILABILITY_OPTIONS} value={line.availability} onChange={(v) => setLine(line.key, (l) => withAvailability(l, v))} />
                )}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <FieldLabel required>{`Quantity${line.unit ? ` (${line.unit})` : ''}`}</FieldLabel>
                    <Input
                      value={line.availableQty}
                      onChangeText={(v) => setLine(line.key, (l) => ({ ...l, availableQty: v }))}
                      keyboardType="decimal-pad"
                      editable={line.availability !== 'unavailable'}
                      error={err(`${k}.availableQty`)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FieldLabel required>Rate (Rs.)</FieldLabel>
                    <Input
                      value={line.unitRate}
                      onChangeText={(v) => setLine(line.key, (l) => ({ ...l, unitRate: v }))}
                      keyboardType="decimal-pad"
                      editable={line.availability !== 'unavailable'}
                      error={err(`${k}.unitRate`)}
                    />
                  </View>
                </View>
                <FieldError message={err(`${k}.availableQty`) ?? err(`${k}.unitRate`) ?? err(`${k}.itemName`)} />
                <View style={{ marginTop: 8 }}>
                  <Input value={line.note} onChangeText={(v) => setLine(line.key, (l) => ({ ...l, note: v }))} placeholder="Note (optional)" maxLength={300} compact />
                </View>
              </Section>
            );
          })}

          <Section title="Delivery & notes">
            <FieldLabel style={{ marginTop: 0 }}>Delivery charge (Rs.)</FieldLabel>
            <Input value={form.deliveryCharge} onChangeText={(v) => set('deliveryCharge', v)} keyboardType="decimal-pad" error={err('deliveryCharge')} />
            <FieldError message={err('deliveryCharge')} />
            <FieldLabel>Estimated delivery date</FieldLabel>
            <DateField value={form.estimatedDeliveryDate} onChange={(v) => set('estimatedDeliveryDate', v)} minimumDate={getBusinessDate()} onClear={() => set('estimatedDeliveryDate', '')} placeholder="Not given" />
            <FieldLabel>Delivery notes</FieldLabel>
            <Input value={form.deliveryNotes} onChangeText={(v) => set('deliveryNotes', v)} multiline maxLength={500} />
            <FieldLabel>Notes</FieldLabel>
            <Input value={form.notes} onChangeText={(v) => set('notes', v)} multiline maxLength={1000} />
          </Section>
        </ScrollView>
        <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, padding: theme.spacing.lg, backgroundColor: theme.colors.surface }}>
          {error ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginBottom: 10 }]}>{error}</Text> : null}
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginBottom: 10 }]}>
            Estimated total: {preview === null ? '—' : formatCurrency(preview)} (the server calculates the saved total)
          </Text>
          <PrimaryButton label="Save Quotation" onPress={submit} loading={sub.pending} inactive={showErrors && Object.keys(errors).length > 0} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
