import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import type { Coverage } from '../utils/recipientRules';

export interface CoverageStripProps {
  coverage: Coverage;
}

/** One chip per active branch with its recipient count — a branch nobody hears about is amber, in words too. */
export function CoverageStrip({ coverage }: CoverageStripProps) {
  const theme = useAppTheme();
  const chips = [
    ...coverage.branches.map((b) => ({ key: b.branchId, label: b.branchName.replace(/ Branch$/, ''), count: b.count })),
    { key: 'company', label: 'Company-wide', count: coverage.company },
    { key: 'production', label: 'Production', count: coverage.production },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips.map((c) => {
        const empty = c.count === 0;
        const color = empty ? theme.colors.warning : theme.colors.text;
        return (
          <View
            key={c.key}
            accessible
            accessibilityLabel={empty ? `${c.label}: no recipient` : `${c.label}: ${c.count} ${c.count === 1 ? 'recipient' : 'recipients'}`}
            style={[styles.chip, { borderColor: empty ? theme.colors.warning : theme.colors.cardBorder, backgroundColor: empty ? `${theme.colors.warning}14` : theme.colors.cardFill }]}>
            <Text style={[theme.typography.label, { color, fontWeight: '700' }]}>
              {c.label}: {empty ? 'no recipient' : c.count}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  chip: { minHeight: 32, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, justifyContent: 'center' },
});
