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
  /** First row of the table draws no divider above itself. */
  first?: boolean;
}

/** Column widths shared with the table header in `StockCheckScreen`. */
export const COUNT_TABLE = { balanceWidth: 44, countWidth: 140 } as const;

/**
 * One product's row in the Stock Check table (2026 redesign B12 `.tr`):
 * product name, its balance, and the count stepper. Once a count is entered
 * the difference shows as a small pill under the name (red when it differs,
 * green when it matches) — display only, nothing is saved.
 */
export function CountRow({ productName, balance, countInput, onChangeCount, returnKeyType, onSubmitEditing, inputRef, first }: CountRowProps) {
  const theme = useAppTheme();
  const counted = parseCountInput(countInput);
  const diff = counted === null ? null : counted - balance;
  const diffColor = diff === 0 ? theme.colors.success : theme.colors.danger;
  const accessibilityLabel = `Count for ${productName}, balance ${balance}`;

  return (
    <View style={[styles.row, first ? null : [styles.divider, { borderTopColor: theme.colors.border }]]}>
      <View style={styles.nameBox}>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
          {productName}
        </Text>
        {diff !== null ? (
          <View style={[styles.pill, { backgroundColor: `${diffColor}1A` }]}>
            <Text style={[styles.pillText, { color: diffColor }]}>{diff > 0 ? `+${diff}` : String(diff)}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.balance, { color: theme.colors.text }]}>{balance}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  nameBox: { flex: 1, minWidth: 0, justifyContent: 'center', alignItems: 'flex-start', gap: 4 },
  name: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  balance: { width: COUNT_TABLE.balanceWidth, textAlign: 'right', fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  pill: { minHeight: 20, borderRadius: 10, paddingHorizontal: 8, justifyContent: 'center' },
  pillText: { fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
  divider: { borderTopWidth: 1 },
});
