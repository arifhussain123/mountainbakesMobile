import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useBranchDiscounts, useReviseBranchDiscount, useWithdrawBranchDiscount } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Icon, PrimaryButton } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import type { BranchDiscount, ProductionOrder } from '@/api';
import { DemandPickerModal, DiscountCard, ReviseDiscountModal } from '../../components';
import { useRequestDiscountForm } from '../../hooks';
import { styles } from './styles';

/** branchApp.md screen 07 — Request Discount, with the branch's own recent claims below. Presented as a bottom sheet. */
export function RequestDiscountSheetContent() {
  const theme = useAppTheme();
  const form = useRequestDiscountForm();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<BranchDiscount | null>(null);

  const { data, isLoading } = useBranchDiscounts();
  const recent = useMemo(() => (data?.discounts ?? []).slice(0, 5), [data]);
  const revise = useReviseBranchDiscount();
  const withdraw = useWithdrawBranchDiscount();

  const handleSelectDemand = (demand: ProductionOrder) => {
    form.setDemand(demand);
    setPickerOpen(false);
  };

  const handleSubmit = async () => {
    const ok = await form.submit();
    if (ok) Alert.alert('Request Sent', 'Your discount request has been sent to Production for review.');
  };

  const handleWithdraw = (item: BranchDiscount) => {
    Alert.alert('Withdraw Claim', `Remove the ${item.amount} claim on ${item.demandNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: () => withdraw.mutate(item.id, { onError: (e) => Alert.alert('Could Not Withdraw', mapErrorToMessage(e)) }) },
    ]);
  };

  const handleReviseSubmit = (amount: number, reason: string) => {
    if (!editing) return;
    revise.mutate({ id: editing.id, input: { amount, reason } }, { onSuccess: () => setEditing(null) });
  };

  return (
    <View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>DEMAND</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setPickerOpen(true)}
        style={[styles.demandButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop: 6 }]}>
        <Text style={[theme.typography.body, { color: form.demand ? theme.colors.text : theme.colors.textSecondary }]}>
          {form.demand ? form.demand.demandNumber : 'Search demand…'}
        </Text>
        <Icon name="chevron-down" size={14} color={theme.colors.textSecondary} />
      </Pressable>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>AMOUNT</Text>
      <View style={[styles.amountRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop: 6 }]}>
        <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>Rs.</Text>
        <TextInput
          value={form.amountInput}
          onChangeText={form.setAmountInput}
          placeholder="0.00"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="decimal-pad"
          style={{ flex: 1, color: theme.colors.text, fontWeight: '600' }}
        />
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>REASON</Text>
      <TextInput
        value={form.reason}
        onChangeText={form.setReason}
        placeholder="What is the discount for? Production reads this to decide."
        placeholderTextColor={theme.colors.textSecondary}
        multiline
        style={[styles.reasonInput, { borderColor: theme.colors.border, color: theme.colors.text, marginTop: 6 }]}
      />

      {form.submitError ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{form.submitError}</Text>
      ) : null}

      <View style={{ marginTop: theme.spacing.lg }}>
        <PrimaryButton label="Send Request" onPress={() => void handleSubmit()} loading={form.isSubmitting} disabled={!form.canSubmit} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: theme.spacing.xl }}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>YOUR DISCOUNT REQUESTS</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Last 90 days</Text>
      </View>
      <View style={{ marginTop: 10 }}>
        {!isLoading && recent.length === 0 ? (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No discount claims yet.</Text>
        ) : null}
        {recent.map((item) => (
          <DiscountCard key={item.id} item={item} onChange={() => setEditing(item)} onWithdraw={() => handleWithdraw(item)} />
        ))}
      </View>

      <DemandPickerModal visible={pickerOpen} demands={form.demands} onSelect={handleSelectDemand} onClose={() => setPickerOpen(false)} />
      <ReviseDiscountModal
        visible={editing !== null}
        item={editing}
        isSubmitting={revise.isPending}
        error={revise.error ? mapErrorToMessage(revise.error) : null}
        onSubmit={handleReviseSubmit}
        onClose={() => setEditing(null)}
      />
    </View>
  );
}
