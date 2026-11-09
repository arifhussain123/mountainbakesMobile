import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui/Icon';
import type { OnboardingFeature } from '../onboardingContent';

export interface FeatureStripProps {
  features: readonly OnboardingFeature[];
  testID?: string;
}

/**
 * One rounded `surface` card split into equal cells by thin dividers — an
 * orange outline icon above a small white label in each (design screen 02).
 */
export function FeatureStrip({ features, testID }: FeatureStripProps) {
  const { colors, typography, radii } = useAppTheme();

  return (
    <View
      style={[
        styles.strip,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.card,
        },
      ]}
      testID={testID}
    >
      {features.map((feature, index) => (
        <View
          key={feature.label}
          accessible
          accessibilityLabel={feature.label}
          style={[
            styles.cell,
            index > 0
              ? {
                  borderLeftWidth: StyleSheet.hairlineWidth,
                  borderLeftColor: colors.border,
                }
              : null,
          ]}
        >
          <Icon name={feature.icon} size={20} color={colors.accent} />
          <Text
            style={[typography.brandLabel, { color: colors.textPrimary }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {feature.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    borderWidth: 1,
    paddingVertical: 14,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
});
