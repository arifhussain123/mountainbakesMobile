import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { QtyStepper } from '@/shared/ui';
import { parseCountInput } from '../calculations';

export interface CountRowProps {
  productName: string;
  balance: number;
  /** Hidden (shown as "•••") in blind-count mode until Verify. */
  blindMode: boolean;
  countInput: string;
  onChangeCount: (text: string) => void;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  /** Passed straight through to the inner `QtyStepper`/`TextInput` — see `QtyStepper`'s own doc comment on why this is a plain ref object, not `forwardRef`. */
  inputRef?: React.RefObject<any>;
}

/** One product's row in the counting list — balance (read-only, muted) + a `QtyStepper` count field. */
export function CountRow({ productName, balance, blindMode, countInput, onChangeCount, returnKeyType, onSubmitEditing, inputRef }: CountRowProps) {
  const theme = useAppTheme();
  const counted = parseCountInput(countInput);
  const accessibilityLabel = blindMode ? `Count for ${productName}` : `Count for ${productName}, balance ${balance}`;

  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[theme.typography.body, { color: theme.colors.text }]} numberOfLines={1}>
          {productName}
        </Text>
      </View>
      <View style={[styles.balanceBox, { backgroundColor: theme.colors.surface }]}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{blindMode ? '•••' : balance}</Text>
      </View>
      <QtyStepper
        inputRef={inputRef}
        value={counted}
        onChange={(value) => onChangeCount(value === null ? '' : String(value))}
        accessibilityLabel={accessibilityLabel}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1 },
  balanceBox: { width: 56, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
