import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSpecialEvents } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, Icon, PrimaryButton, Screen, SecondaryButton } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import type { EventsStackParamList } from '@/navigation';
import type { Product } from '@/api';
import { AddProductModal, EventDemandItemRow } from '../../components';
import { useEventDemandForm } from '../../hooks';
import { styles } from './styles';

/** branchApp.md screen 19 — Advance Demand for one Special Event. */
export function EventDemandScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<EventsStackParamList, 'EventDemand'>>();
  const eventId = route.params.eventId;

  const { data } = useSpecialEvents();
  const event = useMemo(() => data?.events.find((e) => e.id === eventId), [data, eventId]);

  const form = useEventDemandForm(eventId);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleAddProduct = (product: Product) => {
    form.addProduct(product);
    setPickerOpen(false);
  };

  const handleSaveDraft = async () => {
    const ok = await form.saveDraft();
    if (ok) Alert.alert('Draft Saved', 'Your advance demand has been saved as a draft.');
  };

  const handleSubmit = async () => {
    const ok = await form.submit();
    if (ok) {
      Alert.alert('Demand Submitted', 'Your advance demand has been sent to Production.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    }
  };

  return (
    <Screen>
      <AppHeader title="Advance Demand" />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }} keyboardShouldPersistTaps="handled">
          {event ? (
            <View>
              <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>{event.name}</Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                {event.eventDate ? formatDisplayDate(event.eventDate) : 'Date not yet resolved'}
                {event.demandDueDate ? ` · Due ${formatDisplayDate(event.demandDueDate)}` : ''}
              </Text>
            </View>
          ) : null}

          {form.isSubmitted ? (
            <View style={{ marginTop: theme.spacing.md, backgroundColor: `${theme.colors.success}1A`, borderRadius: theme.radii.md, padding: theme.spacing.md }}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.success, fontWeight: '700' }]}>
                This demand has already been submitted and can no longer be edited.
              </Text>
            </View>
          ) : null}

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>ADD A PRODUCT</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPickerOpen(true)}
            disabled={form.isSubmitted}
            style={[styles.addProductButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop: 6 }]}>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>Search products…</Text>
            <Icon name="chevron-down" size={14} color={theme.colors.textSecondary} />
          </Pressable>

          <View style={{ marginTop: theme.spacing.md }}>
            {form.lines.length === 0 ? (
              <EmptyState title="No Products Added" message="Search and add products this event needs." />
            ) : (
              form.lines.map((line) => (
                <EventDemandItemRow
                  key={line.product.id}
                  name={line.product.name}
                  qty={line.qty}
                  onIncrement={() => form.updateQty(line.product.id, line.qty + 1)}
                  onDecrement={() => form.updateQty(line.product.id, line.qty - 1)}
                  onRemove={() => form.removeLine(line.product.id)}
                />
              ))
            )}
          </View>

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>EXPECTED CUSTOMERS</Text>
          <TextInput
            value={form.expectedCustomers}
            onChangeText={form.setExpectedCustomers}
            placeholder="Optional"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
            editable={!form.isSubmitted}
            style={[styles.numberInput, { borderColor: theme.colors.border, color: theme.colors.text, marginTop: 6 }]}
          />

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>NOTES FOR PRODUCTION</Text>
          <TextInput
            value={form.notes}
            onChangeText={form.setNotes}
            placeholder="Anything Production should know…"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            editable={!form.isSubmitted}
            style={[styles.notesInput, { borderColor: theme.colors.border, color: theme.colors.text, marginTop: 6 }]}
          />

          {form.submitError ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{form.submitError}</Text>
          ) : null}

          {!form.isSubmitted ? (
            <View style={styles.footer}>
              <View style={{ flex: 1 }}>
                <SecondaryButton label="Save Draft" onPress={() => void handleSaveDraft()} loading={form.isSavingDraft} disabled={!form.canSave} />
              </View>
              <View style={{ flex: 1.5 }}>
                <PrimaryButton
                  label="Submit to Production"
                  onPress={() => void handleSubmit()}
                  loading={form.isSubmitting}
                  disabled={!form.canSubmit}
                />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <AddProductModal
        visible={pickerOpen}
        products={form.products}
        excludeIds={form.excludeIds}
        onSelect={handleAddProduct}
        onClose={() => setPickerOpen(false)}
      />
    </Screen>
  );
}
