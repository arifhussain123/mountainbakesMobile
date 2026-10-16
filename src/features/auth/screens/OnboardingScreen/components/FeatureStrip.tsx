import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import type { OnboardingFeature } from '../onboardingContent';

export interface FeatureStripProps {
  features: OnboardingFeature[];
}

/** mountainbakesBranch.html onboarding card: 3 equal cells, thin dividers, accent icon over a white label. */
export function FeatureStrip({ features }: FeatureStripProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.row, { borderColor: theme.colors.border, backgroundColor: theme.colors.cardFill, borderRadius: theme.radii.lg }]}>
      {features.map((feature, i) => (
        <View
          key={feature.label}
          style={[styles.cell, i > 0 ? { ...styles.cellBordered, borderColor: theme.colors.border } : null]}>
          <Icon name={feature.icon} size={20} color={theme.colors.primary} />
          <Text style={[styles.label, { color: theme.colors.text }]}>{feature.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderWidth: 1, paddingVertical: 14 },
  cell: { flex: 1, alignItems: 'center', gap: 8 },
  cellBordered: { borderLeftWidth: 1 },
  label: { fontSize: 12, fontWeight: '700' },
});
