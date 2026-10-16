import { forwardRef } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAppTheme } from '@/shared/theme';
import { FormBottomSheet, SecondaryButton } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import type { BranchDiscount } from '@/api';

export interface WithdrawConfirmSheetProps {
  item: BranchDiscount | null;
  isSubmitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onRequestClose: () => void;
}

/**
 * Withdraw is a real DELETE on the server — the row is gone for good, not
 * marked "withdrawn" (confirmed: no such status exists). The copy here says
 * so plainly rather than implying it can be undone later.
 */
export const WithdrawConfirmSheet = forwardRef<BottomSheetModal, WithdrawConfirmSheetProps>(
  ({ item, isSubmitting, error, onConfirm, onRequestClose }, ref) => {
    const theme = useAppTheme();

    return (
      <FormBottomSheet ref={ref} title="Withdraw Claim" onRequestClose={onRequestClose} snapPoints={['38%']}>
        {item ? (
          <>
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>
              Withdraw the {formatCurrency(item.amount)} claim on {item.demandNumber}? This can't be undone — the claim is removed
              permanently and will not appear in your history afterward.
            </Text>
            {error ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{error}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: theme.spacing.lg }}>
              <View style={{ flex: 1 }}>
                <SecondaryButton label="Cancel" onPress={onRequestClose} disabled={isSubmitting} />
              </View>
              <View style={{ flex: 1 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirm withdraw"
                  disabled={isSubmitting}
                  onPress={onConfirm}
                  style={{
                    height: 52,
                    borderRadius: theme.radii.pill,
                    backgroundColor: theme.colors.danger,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Withdraw</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </>
        ) : null}
      </FormBottomSheet>
    );
  },
);
