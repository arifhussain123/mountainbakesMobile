import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme, useResponsive } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import type { OnboardingFeature } from '../onboardingContent';

export interface FeatureStripProps {
  features: OnboardingFeature[];
}

/** mountainbakesBranch.html onboarding card: 3 equal cells, thin dividers, accent icon over a white label. */
export function FeatureStrip({ features }: FeatureStripProps) {
  const theme = useAppTheme();
  const { sh, clamp, size } = useResponsive();
  const cellHeight = clamp(64, sh(76), 88);
  const iconSize = size(22, 18, 26);
  const labelSize = size(12, 11, 14);

  return (
    <View style={[styles.row, { minHeight: cellHeight, borderColor: theme.colors.border, backgroundColor: theme.colors.cardFill, borderRadius: theme.radii.lg }]}>
      {features.map((feature, i) => (
        <View
          key={feature.label}
          style={[styles.cell, i > 0 ? { ...styles.cellBordered, borderColor: theme.colors.border } : null]}>
          <Icon name={feature.icon} size={iconSize} color={theme.colors.primary} />
          <Text style={[styles.label, { color: theme.colors.text, fontSize: labelSize }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {feature.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', width: '100%', borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  cell: { flex: 1, alignItems: 'center', gap: 8 },
  cellBordered: { borderLeftWidth: 1 },
  label: { fontWeight: '700' },
});
