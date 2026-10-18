import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { PillButton, SecondaryButton } from '@/shared/ui';

export interface CountProgressFooterProps {
  countedCount: number;
  heldCount: number;
  hiddenAtZero: number;
  onClear: () => void;
  onVerify: () => void;
}

/** "Counted N of M held · K at zero not listed" + Clear/Verify actions — exact copy template ported from the web's StockCheckModal. */
export function CountProgressFooter({ countedCount, heldCount, hiddenAtZero, onClear, onVerify }: CountProgressFooterProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        Counted <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{countedCount}</Text> of {heldCount} held
        {hiddenAtZero > 0 ? ` · ${hiddenAtZero} at zero not listed` : ''}
      </Text>
      <View style={styles.actionsRow}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Clear" onPress={onClear} />
        </View>
        <View style={{ flex: 1.4 }}>
          <PillButton label="Verify" onPress={onVerify} disabled={countedCount === 0} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
});
