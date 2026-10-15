import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import type { StockRow } from '@/api';

export interface StockCheckRowProps {
  row: StockRow;
  countInput: string;
  onChangeCount: (text: string) => void;
}

/** branchApp.md screen 12 — one product's balance vs. physical count. Nothing here is saved. */
export function StockCheckRow({ row, countInput, onChangeCount }: StockCheckRowProps) {
  const theme = useAppTheme();
  const hasCount = countInput.trim() !== '';
  const count = parseInt(countInput, 10) || 0;
  const diff = hasCount ? count - row.balance : null;

  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[theme.typography.body, { color: theme.colors.text }]} numberOfLines={1}>
          {row.productName}
        </Text>
        {diff !== null ? (
          <Text
            style={[
              theme.typography.label,
              { color: diff === 0 ? theme.colors.success : theme.colors.danger, marginTop: 2, fontWeight: '700' },
            ]}>
            {diff === 0 ? 'Matches' : diff > 0 ? `+${diff} over` : `${diff} short`}
          </Text>
        ) : null}
      </View>
      <View style={[styles.balanceBox, { backgroundColor: theme.colors.surface }]}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{row.balance}</Text>
      </View>
      <TextInput
        value={countInput}
        onChangeText={onChangeCount}
        placeholder="—"
        placeholderTextColor={theme.colors.textSecondary}
        keyboardType="numeric"
        style={[
          styles.countInput,
          { borderColor: diff !== null && diff !== 0 ? theme.colors.danger : theme.colors.border, color: theme.colors.text },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1 },
  balanceBox: { width: 56, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  countInput: { width: 76, height: 38, borderRadius: 12, borderWidth: 1.5, textAlign: 'center', fontWeight: '700' },
});
