import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import type { OnboardingFeature } from '../onboardingContent';

export interface FeatureStripProps {
  features: OnboardingFeature[];
}

/** Redesign B02 — the slide's features as a wrapping row of 36pt chips (icon + label). */
export function FeatureStrip({ features }: FeatureStripProps) {
  const theme = useAppTheme();
  const chip = theme.isDark
    ? { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }
    : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border };

  return (
    <View style={styles.row}>
      {features.map((feature) => (
        <View key={feature.label} style={[styles.chip, chip]}>
          <Icon name={feature.icon} size={16} color={theme.colors.primary} />
          <Text style={[styles.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {feature.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14 },
  label: { fontSize: 13, fontWeight: '600' },
});
