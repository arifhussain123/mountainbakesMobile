import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCreatePurchaseSupplier, usePurchaseSuppliers, type Supplier } from '@/api';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { Checkbox, EmptyState, ErrorState, Icon, PrimaryButton, SearchBar } from '@/shared/ui';
import { useSubmission } from '../hooks';
import { emptySupplierForm, toSupplierInput, validateSupplierForm, type SupplierFormState } from '../utils/moneyForms';
import { FieldError, FieldLabel, Input, Notice } from './FormParts';

export interface SupplierPickerModalProps {
  visible: boolean;
  onSelect: (supplier: Supplier) => void;
  onClose: () => void;
}

/**
 * Search the supplier list (server-side, debounced), or register a new one.
 * Registering asks for the supplier's WhatsApp consent — the API refuses a
 * supplier without it, and WhatsApp forbids messaging one.
 */
export function SupplierPickerModal({ visible, onSelect, onClose }: SupplierPickerModalProps) {
  const theme = useAppTheme();
  const [mode, setMode] = useState<'pick' | 'register'>('pick');
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search).trim();
  const suppliers = usePurchaseSuppliers(term, { enabled: visible });

  const create = useCreatePurchaseSupplier();
  const submission = useSubmission('purchase_supplier_create');
  const [form, setForm] = useState<SupplierFormState>(emptySupplierForm);
  const [showErrors, setShowErrors] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const errors = validateSupplierForm(form);
  const set = <K extends keyof SupplierFormState>(key: K, value: SupplierFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!visible) {
      setMode('pick');
      setSearch('');
      setForm(emptySupplierForm());
      setShowErrors(false);
      setSubmitError(null);
    }
  }, [visible]);

  const register = async () => {
    setShowErrors(true);
    if (Object.keys(errors).length > 0) return;
    const input = toSupplierInput(form);
    setSubmitError(null);
    const outcome = await submission.run(input, () => create.mutateAsync(input));
    if (outcome.kind === 'done') onSelect(outcome.value);
    else if (outcome.kind === 'failed') setSubmitError(outcome.message);
  };

  const close = () => {
    if (!submission.pending) onClose();
  };
  const err = (key: keyof SupplierFormState) => (showErrors ? errors[key] : undefined);
  const rows = suppliers.data?.suppliers ?? [];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={mode === 'register' ? () => setMode('pick') : close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.lg }}>
          {mode === 'register' ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Back to supplier list" onPress={() => setMode('pick')} hitSlop={10}>
              <Icon name="chevron-left" color={theme.colors.text} />
            </Pressable>
          ) : null}
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text, flex: 1, marginLeft: mode === 'register' ? 8 : 0 }]}>
            {mode === 'register' ? 'Register Supplier' : 'Select Supplier'}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} hitSlop={10}>
            <Icon name="close" color={theme.colors.text} />
          </Pressable>
        </View>

        {mode === 'pick' ? (
          <>
            <View style={{ paddingHorizontal: theme.spacing.lg, gap: 10 }}>
              <SearchBar value={search} onChangeText={setSearch} placeholder="Name, code, phone or category…" />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setForm({ ...emptySupplierForm(), name: /\d{4}/.test(search) ? '' : search.trim(), whatsappNumber: /\d{4}/.test(search) ? search.trim() : '' });
                  setMode('register');
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                <Icon name="plus" size={16} color={theme.colors.primary} />
                <Text style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '700' }]}>Register a new supplier</Text>
              </Pressable>
            </View>
            {suppliers.isLoading ? <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} /> : null}
            {suppliers.error ? (
              <View style={{ padding: theme.spacing.lg }}>
                <ErrorState message={mapErrorToMessage(suppliers.error)} onRetry={() => void suppliers.refetch()} />
              </View>
            ) : null}
            <FlatList
              data={rows}
              keyExtractor={(s) => s.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: theme.spacing.lg }}
              ListEmptyComponent={
                !suppliers.isLoading && !suppliers.error ? (
                  <EmptyState title="No Suppliers" message={term ? `Nobody matches “${term}”.` : 'Register your first supplier to send a demand.'} />
                ) : undefined
              }
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}, ${item.whatsappNumber}`}
                  onPress={() => onSelect(item)}
                  style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                  <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                    {[item.supplierCode, item.whatsappNumber, item.category].filter(Boolean).join(' · ')}
                  </Text>
                  {!item.whatsappOptInAt ? (
                    <Text style={[theme.typography.label, { color: theme.colors.warning, marginTop: 2 }]}>No WhatsApp consent recorded</Text>
                  ) : null}
                </Pressable>
              )}
            />
          </>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl }} keyboardShouldPersistTaps="handled">
              <FieldLabel required style={{ marginTop: 0 }}>
                Supplier name
              </FieldLabel>
              <Input value={form.name} onChangeText={(v) => set('name', v)} placeholder="e.g. Punjab Flour & Dairy" maxLength={120} error={err('name')} />
              <FieldError message={err('name')} />

              <FieldLabel required>WhatsApp number</FieldLabel>
              <Input value={form.whatsappNumber} onChangeText={(v) => set('whatsappNumber', v)} placeholder="0300 1234567" keyboardType="phone-pad" maxLength={30} error={err('whatsappNumber')} />
              <FieldError message={err('whatsappNumber')} />

              <FieldLabel>Contact person</FieldLabel>
              <Input value={form.contactPerson} onChangeText={(v) => set('contactPerson', v)} maxLength={120} />

              <FieldLabel>Other phone</FieldLabel>
              <Input value={form.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" maxLength={30} />

              <FieldLabel>Category</FieldLabel>
              <Input value={form.category} onChangeText={(v) => set('category', v)} placeholder="Dairy, flour, packaging…" maxLength={60} />

              <FieldLabel>Address</FieldLabel>
              <Input value={form.address} onChangeText={(v) => set('address', v)} multiline maxLength={300} />

              <FieldLabel>Payment terms</FieldLabel>
              <Input value={form.paymentTerms} onChangeText={(v) => set('paymentTerms', v)} placeholder="e.g. Cash on delivery" maxLength={200} />

              <FieldLabel>Notes</FieldLabel>
              <Input value={form.notes} onChangeText={(v) => set('notes', v)} multiline maxLength={500} />

              <FieldLabel required>WhatsApp consent</FieldLabel>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: form.optIn }}
                onPress={() => set('optIn', !form.optIn)}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Checkbox checked={form.optIn} onChange={(v) => set('optIn', v)} accessibilityLabel="Supplier agreed to WhatsApp messages" />
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]}>
                  This supplier has agreed to receive purchase demands and updates from Mountain Bakes on WhatsApp.
                </Text>
              </Pressable>
              <FieldError message={err('optIn')} />
              <FieldLabel>How they agreed</FieldLabel>
              <Input value={form.optInSource} onChangeText={(v) => set('optInSource', v)} placeholder="e.g. Asked in person, 20 Oct" maxLength={200} />
              <Notice text="Only suppliers who agreed may be messaged. Their number is stored in international format." />
            </ScrollView>
            <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, padding: theme.spacing.lg, backgroundColor: theme.colors.surface }}>
              {submitError ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginBottom: 10 }]}>{submitError}</Text> : null}
              <PrimaryButton label="Register Supplier" onPress={() => void register()} loading={submission.pending} inactive={showErrors && Object.keys(errors).length > 0} />
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
