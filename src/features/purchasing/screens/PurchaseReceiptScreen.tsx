import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRecordPurchaseReceipt, usePurchaseDemand, type PurchaseItem } from '@/api';
import { Routes, type ProductionWhatsAppStackParamList } from '@/navigation';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Checkbox, EmptyState, ErrorState, LoadingSkeleton, PrimaryButton, Screen } from '@/shared/ui';
import { FieldError, FieldLabel, Input, ItemPickerModal, Notice, PickerField, Section } from '../components';
import { useSubmission } from '../hooks';
import { asPurchaseUnit, formatQty, receiptFormFromDetail, toReceiptInput, validateReceiptForm, type ReceiptFormState, type ReceiptLineForm } from '../utils';

type Nav = NativeStackNavigationProp<ProductionWhatsAppStackParamList>;
type ReceiptRoute = RouteProp<ProductionWhatsAppStackParamList, typeof Routes.PRODUCTION_WHATSAPP_RECEIPT>;

/**
 * Goods received against the approved bill (`POST /demands/:id/receipts`).
 * Each line adds its accepted quantity (received − damaged) to ingredient
 * stock once; a retried save is the same receipt, never a second one.
 *
 * The stock item must be an active catalog item in the bill line's unit — and
 * the demand's own catalog item when the demand named one — so the picker
 * offers only those (the API refuses anything else).
 */
export function PurchaseReceiptScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<Nav>();
  const { demandId } = useRoute<ReceiptRoute>().params;
  const demandQ = usePurchaseDemand(demandId);
  const record = useRecordPurchaseReceipt();
  const sub = useSubmission('purchase_receipt');
  const [form, setForm] = useState<ReceiptFormState | null>(null);
  const [pickerFor, setPickerFor] = useState<ReceiptLineForm | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (demandQ.data && !form) setForm(receiptFormFromDetail(demandQ.data));
  }, [demandQ.data, form]);
  const errors = useMemo(() => (form ? validateReceiptForm(form) : {}), [form]);
  const err = (k: string) => (showErrors ? errors[k] : undefined);
  const back = { icon: 'chevron-left' as const, onPress: () => navigation.goBack(), accessibilityLabel: 'Back' };

  if (!demandQ.data || !form) {
    return (
      <Screen>
        <AppHeader title="Goods Receipt" actions={[back]} />
        <View style={{ padding: theme.spacing.lg }}>
          {demandQ.error ? <ErrorState message={mapErrorToMessage(demandQ.error)} onRetry={() => void demandQ.refetch()} /> : <LoadingSkeleton height={200} />}
        </View>
      </Screen>
    );
  }
  const d = demandQ.data;
  if (!d.actions.receive) {
    return (
      <Screen>
        <AppHeader title="Goods Receipt" subtitle={d.demandNo} actions={[back]} />
        <EmptyState title="Nothing to Receive" message="Goods can be received once the bill is approved, until everything billed has arrived." actionLabel="Back to demand" onAction={() => navigation.goBack()} />
      </Screen>
    );
  }

  const setLine = (billItemId: string, patch: Partial<ReceiptLineForm>) =>
    setForm((f) => (f ? { ...f, lines: f.lines.map((l) => (l.billItemId === billItemId ? { ...l, ...patch } : l)) } : f));

  const pick = (item: PurchaseItem) => {
    if (pickerFor) setLine(pickerFor.billItemId, { itemId: item.id, itemLabel: `${item.name} (${item.unit})` });
    setPickerFor(null);
  };

  const submit = () => {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    const input = toReceiptInput(form);
    const lines = input.items.length;
    Alert.alert(
      form.final ? 'Save and close receipt?' : 'Save receipt?',
      `${lines} line${lines === 1 ? '' : 's'} go into ingredient stock.${form.final ? ' Anything still owed is recorded as short, and no more can be received.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            setError(null);
            const outcome = await sub.run(input, (key) => record.mutateAsync({ id: d.id, input: { ...input, clientRequestId: key }, idempotencyKey: key }));
            if (outcome.kind === 'done') {
              const short = outcome.value.shortages ?? [];
              if (short.length) {
                Alert.alert(`${outcome.value.receiptNo} saved`, `Short: ${short.map((s) => `${s.item} ${s.short}`).join(', ')}`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
              } else navigation.goBack();
            } else if (outcome.kind === 'failed') setError(outcome.message);
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <AppHeader title="Goods Receipt" subtitle={`${d.demandNo} · ${d.supplierName}`} actions={[back]} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }} keyboardShouldPersistTaps="handled">
          <Notice text="Enter what actually arrived. Damaged goods are recorded but not added to stock." />
          <View style={{ height: theme.spacing.md }} />
          {form.lines.map((line) => {
            const k = `line.${line.billItemId}`;
            return (
              <Section key={line.billItemId} title={line.itemName} subtitle={`Still owed ${formatQty(line.outstanding, line.unit)}`}>
                <FieldLabel required style={{ marginTop: 0 }}>
                  Stock item
                </FieldLabel>
                {line.itemFixed ? (
                  <Text style={[theme.typography.body, { color: theme.colors.text }]}>{line.itemLabel} · the demand's catalog item</Text>
                ) : (
                  <PickerField label={line.itemLabel} placeholder={`Choose a ${line.unit} item…`} onPress={() => setPickerFor(line)} error={err(`${k}.itemId`)} icon="search" />
                )}
                <FieldError message={err(`${k}.itemId`)} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <FieldLabel>{`Received (${line.unit})`}</FieldLabel>
                    <Input value={line.received} onChangeText={(v) => setLine(line.billItemId, { received: v })} keyboardType="decimal-pad" error={err(`${k}.received`)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FieldLabel>{`Damaged (${line.unit})`}</FieldLabel>
                    <Input value={line.damaged} onChangeText={(v) => setLine(line.billItemId, { damaged: v })} keyboardType="decimal-pad" placeholder="0" error={err(`${k}.damaged`)} />
                  </View>
                </View>
                <FieldError message={err(`${k}.received`) ?? err(`${k}.damaged`)} />
                <View style={{ marginTop: 8 }}>
                  <Input value={line.note} onChangeText={(v) => setLine(line.billItemId, { note: v })} placeholder="Note (optional)" maxLength={300} compact />
                </View>
              </Section>
            );
          })}

          <Section title="Close out">
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: form.final }}
              onPress={() => setForm((f) => (f ? { ...f, final: !f.final } : f))}
              style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Checkbox checked={form.final} onChange={(v) => setForm((f) => (f ? { ...f, final: v } : f))} accessibilityLabel="Nothing more is coming" />
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]}>
                Nothing more is coming — close the receipt even if some billed quantity never arrived.
              </Text>
            </Pressable>
            <FieldError message={err('lines')} />
            <FieldLabel>Notes</FieldLabel>
            <Input value={form.notes} onChangeText={(v) => setForm((f) => (f ? { ...f, notes: v } : f))} multiline maxLength={1000} />
          </Section>
        </ScrollView>
        <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, padding: theme.spacing.lg, backgroundColor: theme.colors.surface }}>
          {error ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginBottom: 10 }]}>{error}</Text> : null}
          <PrimaryButton label={form.final ? 'Save & Close Receipt' : 'Save Receipt'} onPress={submit} loading={sub.pending} inactive={showErrors && Object.keys(errors).length > 0} />
        </View>
      </KeyboardAvoidingView>

      <ItemPickerModal
        visible={pickerFor !== null}
        title="Stock Item"
        initialSearch={pickerFor?.itemName ?? ''}
        lockUnit={asPurchaseUnit(pickerFor?.unit)}
        hint={pickerFor ? `Only active items stocked in ${pickerFor.unit} can take this line.` : undefined}
        onSelect={pick}
        onClose={() => setPickerFor(null)}
      />
    </Screen>
  );
}
