import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSpecialEvents } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, Icon, InfoBanner, MiniStat, PrimaryButton, Screen, SecondaryButton, TextField } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { EventsStackParamList } from '@/navigation';
import type { Product } from '@/api';
import { AddProductModal, EventDemandItemRow, Pill } from '../../components';
import { useEventDemandForm } from '../../hooks';
import { styles } from './styles';

/** "Fri 16 Oct 2026". */
function longDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(',', '');
}

/**
 * branchApp.md screen 19 — Advance Demand for one Special Event (redesign
 * B19): the event card with its due-date banner, the product rows with
 * steppers, expected customers + notes, a Products/Units/Value strip and a
 * pinned Save draft / Submit footer.
 */
export function EventDemandScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<EventsStackParamList, 'EventDemand'>>();
  const eventId = route.params.eventId;

  const { data } = useSpecialEvents();
  const event = useMemo(() => data?.events.find((e) => e.id === eventId), [data, eventId]);

  const form = useEventDemandForm(eventId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);

  const totals = useMemo(() => {
    const units = form.lines.reduce((sum, l) => sum + l.qty, 0);
    // Value only when every line has a known price — a hydrated draft line can lack one.
    const priced = form.lines.every((l) => l.product.price > 0);
    const value = priced ? form.lines.reduce((sum, l) => sum + l.qty * l.product.price, 0) : null;
    return { units, value };
  }, [form.lines]);

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

  const labelStyle = [theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700' as const }];
  const days = event?.daysRemaining;

  return (
    <Screen>
      <AppHeader title="Advance Demand" subtitle={event?.name} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {event ? (
            <Card style={styles.eventCard}>
              <View style={styles.between}>
                <View style={styles.grow}>
                  <Text style={[styles.h3, { color: theme.colors.text }]}>{event.name}</Text>
                  <Text style={[styles.xs, { color: theme.colors.textFaint }]}>
                    {event.eventDate
                      ? [longDate(event.eventDate), event.hijriLabel].filter(Boolean).join(' · ')
                      : 'Date not yet resolved'}
                  </Text>
                </View>
                {days != null && days >= 0 ? <Pill label={days === 0 ? 'today' : `in ${days} days`} kind="brand" /> : null}
              </View>
              {event.demandDueDate ? (
                <InfoBanner kind="warn" icon="clock">
                  <Text style={[styles.bannerText, { color: theme.colors.warning }]}>
                    Due by <Text style={styles.bold}>{formatDisplayDate(event.demandDueDate)}</Text>. Production plans the bake from this.
                  </Text>
                </InfoBanner>
              ) : null}
            </Card>
          ) : null}

          {form.isSubmitted ? <InfoBanner kind="ok">This demand has already been submitted and can no longer be edited.</InfoBanner> : null}

          <Text style={[styles.eyebrow, { color: theme.colors.textFaint }]}>Products</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPickerOpen(true)}
            disabled={form.isSubmitted}
            style={[
              styles.search,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.cardFill, opacity: form.isSubmitted ? 0.6 : 1 },
            ]}>
            <Icon name="search" size={20} color={theme.colors.textFaint} />
            <Text style={[styles.searchText, { color: theme.colors.textFaint }]}>Search products to add…</Text>
          </Pressable>

          {form.lines.length === 0 ? (
            <EmptyState title="No Products Added" message="Search and add products this event needs." />
          ) : (
            <Card style={styles.listCard}>
              {form.lines.map((line, index) => (
                <EventDemandItemRow
                  key={line.product.id}
                  index={index}
                  name={line.product.name}
                  qty={line.qty}
                  unitPrice={line.product.price}
                  disabled={form.isSubmitted}
                  onIncrement={() => form.updateQty(line.product.id, line.qty + 1)}
                  onDecrement={() => form.updateQty(line.product.id, line.qty - 1)}
                  onRemove={() => form.removeLine(line.product.id)}
                />
              ))}
            </Card>
          )}

          <View style={styles.noTopGap}>
            <TextField
              label="Expected customers (optional)"
              value={form.expectedCustomers}
              onChangeText={form.setExpectedCustomers}
              placeholder="Optional"
              keyboardType="numeric"
              editable={!form.isSubmitted}
            />
          </View>

          <View>
            <Text style={labelStyle}>Notes for Production</Text>
            <TextInput
              value={form.notes}
              onChangeText={form.setNotes}
              placeholder="Anything Production should know…"
              placeholderTextColor={theme.colors.textFaint}
              multiline
              editable={!form.isSubmitted}
              onFocus={() => setNotesFocused(true)}
              onBlur={() => setNotesFocused(false)}
              style={[
                styles.notesInput,
                {
                  borderRadius: theme.radii.lg,
                  backgroundColor: theme.colors.cardFill,
                  borderColor: notesFocused ? theme.colors.primary : theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
            />
          </View>

          {form.lines.length > 0 ? (
            <View style={[styles.tint, { backgroundColor: theme.isDark ? theme.colors.cardFill : '#EFEBFF' }]}>
              <MiniStat label="Products" value={String(form.lines.length)} />
              <MiniStat label="Units" value={String(totals.units)} />
              {totals.value !== null ? <MiniStat label="Value" value={formatCurrency(totals.value)} /> : null}
            </View>
          ) : null}

          {form.submitError ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger }]}>{form.submitError}</Text> : null}
        </ScrollView>

        {!form.isSubmitted ? (
          <View style={[styles.footer, { backgroundColor: theme.isDark ? theme.colors.surface : 'rgba(255,255,255,0.92)' }]}>
            <View style={styles.grow}>
              <SecondaryButton label="Save draft" onPress={() => void handleSaveDraft()} loading={form.isSavingDraft} disabled={!form.canSave} />
            </View>
            <View style={styles.wide}>
              <PrimaryButton label="Submit to Production" onPress={() => void handleSubmit()} loading={form.isSubmitting} disabled={!form.canSubmit} />
            </View>
          </View>
        ) : null}
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
