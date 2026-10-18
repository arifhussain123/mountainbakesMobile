import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { QtyStepper } from '@/shared/ui';
import { parseCountInput } from '../calculations';

export interface CountRowProps {
  productName: string;
  balance: number;
  countInput: string;
  onChangeCount: (text: string) => void;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  /** Passed straight through to the inner `QtyStepper`/`TextInput` — see `QtyStepper`'s own doc comment on why this is a plain ref object, not `forwardRef`. */
  inputRef?: React.RefObject<any>;
}

/** One product's row in the counting list — product name, balance pill, minus, count field, plus, all on one row, vertically centered. */
export function CountRow({ productName, balance, countInput, onChangeCount, returnKeyType, onSubmitEditing, inputRef }: CountRowProps) {
  const theme = useAppTheme();
  const counted = parseCountInput(countInput);
  const accessibilityLabel = `Count for ${productName}, balance ${balance}`;

  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.nameBox}>
        <Text
          style={[theme.typography.body, { color: theme.colors.text }]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.85}>
          {productName}
        </Text>
      </View>
      <View style={[styles.balanceBox, { backgroundColor: theme.colors.surface }]}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{balance}</Text>
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
  nameBox: { flex: 1, minWidth: 0, justifyContent: 'center' },
  balanceBox: { width: 56, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
