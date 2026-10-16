import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { PillButton, SecondaryButton } from '@/shared/ui';
import type { StockCheckClassification, StockCheckSummary } from '../calculations';

export interface StockCheckResultProps {
  summary: StockCheckSummary;
  classifications: StockCheckClassification[];
  onBackToCounting: () => void;
  onShare: () => void;
  onDone: () => void;
}

function diffLabel(diff: number): string {
  return diff > 0 ? `+${diff}` : String(diff);
}

function diffAnnouncement(diff: number): string {
  return diff > 0 ? `${diff} over` : `${Math.abs(diff)} short`;
}

function ResultRow({ c }: { c: StockCheckClassification }) {
  const theme = useAppTheme();
  const color = c.verdict === 'short' ? theme.colors.danger : theme.colors.success;
  return (
    <View
      style={[styles.row, { borderBottomColor: theme.colors.border }]}
      accessible
      accessibilityLabel={`${c.productName}, balance ${c.balance}, counted ${c.counted}, ${diffAnnouncement(c.diff ?? 0)}`}>
      <Text style={[theme.typography.body, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
        {c.productName}
      </Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, width: 70, textAlign: 'center' }]}>Bal {c.balance}</Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, width: 70, textAlign: 'center' }]}>Cnt {c.counted}</Text>
      <Text style={[theme.typography.body, { color, fontWeight: '700', width: 50, textAlign: 'right' }]}>{diffLabel(c.diff ?? 0)}</Text>
    </View>
  );
}

/**
 * Replaces the counting list after Verify — Short/Over sections first (what
 * needs attention), then a collapsed Matched count. Never calls an API: a
 * future "submit stock count" endpoint would hang its button here (see the
 * TODO below), not as a stub elsewhere.
 */
export function StockCheckResult({ summary, classifications, onBackToCounting, onShare, onDone }: StockCheckResultProps) {
  const theme = useAppTheme();
  const short = classifications.filter((c) => c.verdict === 'short');
  const over = classifications.filter((c) => c.verdict === 'over');
  const allMatch = summary.short === 0 && summary.over === 0 && summary.matched > 0;

  return (
    <View>
      <View style={[styles.summaryRow]}>
        <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>
          Matched {summary.matched} · Short {summary.short} · Over {summary.over} · Not counted {summary.notCounted}
        </Text>
      </View>

      {allMatch ? (
        <Text style={[theme.typography.body, { color: theme.colors.success, marginTop: 12, fontWeight: '700' }]}>
          All counted stock agrees with the balance.
        </Text>
      ) : (
        <>
          {short.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <Text style={[theme.typography.label, { color: theme.colors.danger, fontWeight: '700' }]}>SHORT</Text>
              {short.map((c) => (
                <ResultRow key={c.productId} c={c} />
              ))}
            </View>
          ) : null}
          {over.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <Text style={[theme.typography.label, { color: theme.colors.success, fontWeight: '700' }]}>OVER</Text>
              {over.map((c) => (
                <ResultRow key={c.productId} c={c} />
              ))}
            </View>
          ) : null}
          {summary.matched > 0 ? (
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>{summary.matched} matched (not listed)</Text>
          ) : null}
        </>
      )}

      {/* TODO: if a "submit stock count" API endpoint is ever added, its button goes here — this result view, not a stub elsewhere. Nothing on this screen calls an API today. */}

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onBackToCounting} style={styles.linkButton}>
          <Text style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '700' }]}>Back to counting</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Share result" onPress={onShare} />
          </View>
          <View style={{ flex: 1 }}>
            <PillButton label="Done" onPress={onDone} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: { marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  actions: { marginTop: 24 },
  linkButton: { height: 44, alignItems: 'center', justifyContent: 'center' },
});
