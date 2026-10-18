import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { PrimaryButton, QtyStepper, SecondaryButton } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { emptyNoteCounterState, noteCounterTotal, PKR_NOTE_DENOMINATIONS, type NoteCounterState } from '../calculations/noteCounter';

export interface NoteCounterProps {
  onUseTotal: (total: number) => void;
  onClose: () => void;
}

/** "Count notes" — a PKR denomination breakdown for the Cash field. Kept local only; the breakdown itself is never sent to the server, only the resulting total. */
export function NoteCounter({ onUseTotal, onClose }: NoteCounterProps) {
  const theme = useAppTheme();
  const [state, setState] = useState<NoteCounterState>(emptyNoteCounterState());

  const setQty = (denom: (typeof PKR_NOTE_DENOMINATIONS)[number], qty: number | null) => {
    setState((prev) => ({ ...prev, quantities: { ...prev.quantities, [denom]: qty ?? 0 } }));
  };

  const total = noteCounterTotal(state);

  return (
    <View>
      {PKR_NOTE_DENOMINATIONS.map((denom) => {
        const qty = state.quantities[denom] ?? 0;
        return (
          <View key={denom} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <Text
              accessibilityLabel={`Rs. ${denom} notes`}
              style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', width: 72 }]}>
              Rs. {denom}
            </Text>
            <QtyStepper value={qty === 0 ? null : qty} onChange={(v) => setQty(denom, v)} accessibilityLabel={`Rs. ${denom} note count`} />
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary, width: 90, textAlign: 'right' }]}>
              {formatCurrency(denom * qty)}
            </Text>
          </View>
        );
      })}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>Coins</Text>
        <TextInput
          value={state.coinsAmount === 0 ? '' : String(state.coinsAmount)}
          onChangeText={(v) => setState((prev) => ({ ...prev, coinsAmount: Math.max(0, parseFloat(v) || 0) }))}
          placeholder="0"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="decimal-pad"
          accessibilityLabel="Coins amount"
          style={{
            width: 110,
            height: 40,
            borderWidth: 1.5,
            borderRadius: 10,
            borderColor: theme.colors.border,
            color: theme.colors.text,
            textAlign: 'right',
            paddingHorizontal: 10,
            fontWeight: '700',
          }}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: theme.spacing.md,
          paddingTop: theme.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}>
        <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>Total</Text>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.primary }]}>{formatCurrency(total)}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing.lg }}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Cancel" onPress={onClose} />
        </View>
        <View style={{ flex: 1.4 }}>
          <PrimaryButton label="Use this total" onPress={() => onUseTotal(total)} />
        </View>
      </View>
    </View>
  );
}
