import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Controller } from 'react-hook-form';
import { useBranchDiscounts } from '@/api';
import { designType, FLAT_CARD, useAppTheme } from '@/shared/theme';
import { Card, Eyebrow, Icon, InfoBanner, PrimaryButton, TextField } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import type { BranchDiscount, ProductionOrder } from '@/api';
import { DemandPickerModal, DiscountCard } from '../../components';
import { useDiscountForm } from '../../hooks';
import { styles } from './styles';

export interface RequestDiscountSheetContentProps {
  /** A claim to Change/Correct instead of creating a new one. Omit for create mode (the Orders "Discount" quick action always creates). */
  editItem?: BranchDiscount | null;
  /** Called once the submit actually succeeds (synced, or queued offline for a revise/withdraw). */
  onDone?: (result: { queued?: boolean }) => void;
}

/**
 * Redesign `07 Request Discount` — presented as a bottom sheet.
 * Also the Change/Correct form (`editItem` set) — one form, not a duplicate
 * (brief: "do not build a second discount form"). Orders' CreateOrderScreen
 * imports this component by name for its "Discount" quick action — the
 * no-props create-mode call there keeps working unchanged.
 */
export function RequestDiscountSheetContent({ editItem, onDone }: RequestDiscountSheetContentProps) {
  const theme = useAppTheme();
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data } = useBranchDiscounts();
  const existingClaims = useMemo(() => data?.discounts ?? [], [data]);
  const recent = useMemo(() => existingClaims.slice(0, 5), [existingClaims]);

  const form = useDiscountForm({ editItem, existingClaims });

  const handleSelectDemand = (demand: ProductionOrder) => {
    form.setDemand(demand);
    setPickerOpen(false);
  };

  const handleSubmit = async () => {
    const ok = await form.submit();
    if (ok) onDone?.({ queued: form.wasQueuedOffline });
  };

  return (
    <View style={styles.body}>
      <View>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          Demand{form.mode === 'create' ? <Text style={{ color: theme.colors.primary }}> *</Text> : null}
        </Text>
        {form.mode === 'edit' ? (
          <View style={[styles.select, { borderColor: theme.colors.border, backgroundColor: theme.colors.cardFill }]}>
            <Text style={[styles.selectText, { color: theme.colors.text }]}>{form.demand}</Text>
            <Icon name="lock" size={16} color={theme.colors.textFaint} />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={form.demand ? `Demand ${form.demand}, change` : 'Select demand'}
            onPress={() => setPickerOpen(true)}
            style={[styles.select, { borderColor: theme.colors.border, backgroundColor: theme.colors.cardFill }]}>
            <Text style={[styles.selectText, { color: form.demand ? theme.colors.text : theme.colors.textFaint }]} numberOfLines={1}>
              {form.demand ?? 'Search demand…'}
            </Text>
            <Icon name="chevron-down" size={20} color={theme.colors.textFaint} />
          </Pressable>
        )}
      </View>
      {form.duplicateClaim ? (
        <InfoBanner kind="warn" style={styles.banner}>
          {`${form.duplicateClaim.demandNumber} already has a ${formatCurrency(form.duplicateClaim.amount)} claim. Add another?`}
        </InfoBanner>
      ) : null}

      <Controller
        control={form.control}
        name="amount"
        render={({ field }) => (
          <TextField
            label="Amount (Rs.)"
            required
            value={field.value ? String(field.value) : ''}
            onChangeText={(text) => field.onChange(parseFloat(text) || 0)}
            onBlur={field.onBlur}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={form.errors.amount?.message}
          />
        )}
      />

      <Controller
        control={form.control}
        name="reason"
        render={({ field }) => (
          <TextField
            label="Reason"
            required
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="What is the discount for? Production reads this to decide."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            height={96}
            error={form.errors.reason?.message}
          />
        )}
      />

      {form.submitError ? <InfoBanner kind="bad" style={styles.banner}>{form.submitError}</InfoBanner> : null}

      <View style={styles.submit}>
        <PrimaryButton
          label={form.mode === 'edit' ? 'Save change' : 'Send request'}
          onPress={() => void handleSubmit()}
          loading={form.isSubmitting}
          disabled={!form.canSubmit}
        />
      </View>

      {form.mode === 'create' ? (
        <View>
          <View style={styles.recentHead}>
            <Eyebrow>Your recent requests</Eyebrow>
            <Text style={[designType.xs, { color: theme.colors.textFaint }]}>Last 90 days</Text>
          </View>
          {recent.length === 0 ? (
            <Text style={[designType.sm, { color: theme.colors.textSecondary }]}>No discount claims yet.</Text>
          ) : (
            <Card style={[FLAT_CARD, styles.recentCard]}>
              {recent.map((item, index) => (
                <DiscountCard key={item.id} item={item} readOnly divided={index > 0} />
              ))}
            </Card>
          )}
        </View>
      ) : null}

      <DemandPickerModal visible={pickerOpen} demands={form.demands} onSelect={handleSelectDemand} onClose={() => setPickerOpen(false)} />
    </View>
  );
}
