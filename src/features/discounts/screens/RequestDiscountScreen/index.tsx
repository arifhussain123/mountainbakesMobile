import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Controller } from 'react-hook-form';
import { useBranchDiscounts } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Icon, PillButton, TextField } from '@/shared/ui';
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
 * branchApp.md screen 07 — Request Discount, presented as a bottom sheet.
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
    <View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>DEMAND</Text>
      {form.mode === 'edit' ? (
        <View style={[styles.demandButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop: 6 }]}>
          <Text style={[theme.typography.body, { color: theme.colors.text }]}>{form.demand}</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => setPickerOpen(true)}
          style={[styles.demandButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop: 6 }]}>
          <Text style={[theme.typography.body, { color: form.demand ? theme.colors.text : theme.colors.textSecondary }]}>
            {form.demand ?? 'Search demand…'}
          </Text>
          <Icon name="chevron-down" size={14} color={theme.colors.textSecondary} />
        </Pressable>
      )}
      {form.duplicateClaim ? (
        <Text style={[theme.typography.label, { color: theme.colors.warning, marginTop: 6 }]}>
          {form.duplicateClaim.demandNumber} already has a {formatCurrency(form.duplicateClaim.amount)} claim. Add another?
        </Text>
      ) : null}

      <Controller
        control={form.control}
        name="amount"
        render={({ field }) => (
          <TextField
            label="Amount"
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
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="What is the discount for? Production reads this to decide."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            error={form.errors.reason?.message}
          />
        )}
      />

      {form.submitError ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{form.submitError}</Text>
      ) : null}

      <View style={{ marginTop: theme.spacing.lg }}>
        <PillButton
          label={form.mode === 'edit' ? 'Save Change' : 'Send Request'}
          onPress={() => void handleSubmit()}
          loading={form.isSubmitting}
          disabled={!form.canSubmit}
        />
      </View>

      {form.mode === 'create' ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: theme.spacing.xl }}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>YOUR DISCOUNT REQUESTS</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Last 90 days</Text>
          </View>
          <View style={{ marginTop: 10 }}>
            {recent.length === 0 ? (
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No discount claims yet.</Text>
            ) : null}
            {recent.map((item) => (
              <DiscountCard key={item.id} item={item} readOnly />
            ))}
          </View>
        </>
      ) : null}

      <DemandPickerModal visible={pickerOpen} demands={form.demands} onSelect={handleSelectDemand} onClose={() => setPickerOpen(false)} />
    </View>
  );
}
