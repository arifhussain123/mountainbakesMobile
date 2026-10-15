import { Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface SectionHeadingProps {
  /** Plain-color leading word(s), e.g. "Daily". */
  text: string;
  /** Accent-colored trailing word(s), e.g. "Sales". */
  accent: string;
}

/**
 * Design lines 131/154/168/190 — a big uppercase heading per section with its
 * last word(s) in the orange accent color (e.g. "Daily <accent>Sales</accent>").
 */
export function SectionHeading({ text, accent }: SectionHeadingProps) {
  const theme = useAppTheme();

  return (
    <View style={{ marginTop: theme.spacing.xl }}>
      <Text style={[theme.typography.screenTitle, { color: theme.colors.text, textTransform: 'uppercase' }]}>
        {text} <Text style={{ color: theme.colors.primary }}>{accent}</Text>
      </Text>
    </View>
  );
}
