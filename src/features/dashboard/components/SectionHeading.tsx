import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface SectionHeadingProps {
  /** Plain-color leading word(s), e.g. "Daily". */
  text: string;
  /** Accent-colored trailing word(s), e.g. "Sales". */
  accent: string;
  /** Design line 132 — optional trailing actions (e.g. the Compare/Export pills), right-aligned next to the heading. */
  right?: ReactNode;
}

/**
 * Design lines 131/154/168/190 — a big uppercase heading per section with its
 * last word(s) in the orange accent color (e.g. "Daily <accent>Sales</accent>").
 */
export function SectionHeading({ text, accent, right }: SectionHeadingProps) {
  const theme = useAppTheme();

  return (
    <View style={{ marginTop: theme.spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={[theme.typography.screenTitle, { color: theme.colors.text, textTransform: 'uppercase', flexShrink: 1 }]}>
        {text} <Text style={{ color: theme.colors.primary }}>{accent}</Text>
      </Text>
      {right}
    </View>
  );
}
