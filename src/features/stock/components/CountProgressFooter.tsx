import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { MiniStat, PillButton, SecondaryButton } from '@/shared/ui';
import { tintFill } from './redesign';

export interface CountProgressFooterProps {
  countedCount: number;
  heldCount: number;
  hiddenAtZero: number;
  /** Counted products whose count differs from the balance (surplus + deficit). Omit to hide the tile. */
  differenceCount?: number;
  onClear: () => void;
  onVerify: () => void;
}

/**
 * The Stock Check footer (2026 redesign B12): a lavender strip of Counted /
 * Differences / Hidden, then Clear and Verify. Same figures as the web's
 * StockCheckModal ("Counted N of M held · K at zero not listed").
 */
export function CountProgressFooter({ countedCount, heldCount, hiddenAtZero, differenceCount, onClear, onVerify }: CountProgressFooterProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.footer, { backgroundColor: theme.isDark ? theme.colors.surface : 'rgba(255, 255, 255, 0.92)' }, theme.isDark ? null : styles.lift]}>
      <View style={[styles.tint, { backgroundColor: tintFill(theme) }]}>
        <MiniStat label="Counted" value={`${countedCount} of ${heldCount}`} valueColor={countedCount > 0 ? theme.colors.primary : undefined} />
        {differenceCount !== undefined ? (
          <MiniStat label="Differences" value={String(differenceCount)} valueColor={differenceCount > 0 ? theme.colors.danger : undefined} />
        ) : null}
        <MiniStat label="Hidden" value={`${hiddenAtZero} at zero`} />
      </View>
      <View style={styles.actionsRow}>
        <View style={styles.flex1}>
          <SecondaryButton label="Clear" onPress={onClear} />
        </View>
        <View style={styles.verify}>
          <PillButton label="Verify" onPress={onVerify} disabled={countedCount === 0} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { paddingTop: 12, paddingHorizontal: 16, paddingBottom: 14, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  lift: { shadowColor: '#171A35', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 8 },
  tint: { flexDirection: 'row', gap: 8, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  flex1: { flex: 1 },
  verify: { flex: 1.4 },
});
