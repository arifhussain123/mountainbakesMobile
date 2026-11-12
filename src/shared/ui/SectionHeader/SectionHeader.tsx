import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface SectionHeaderProps {
  title: string;
  /** A small orange text link on the right ("Reports", "Open stock"). */
  linkLabel?: string;
  onLinkPress?: () => void;
  /** Any other right-hand content (a small segmented control, a pill). */
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** The redesign's `section()`: an h2 heading with an optional link or control on the right. */
export function SectionHeader({ title, linkLabel, onLinkPress, right, style }: SectionHeaderProps) {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.h2, { color: theme.colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      {right}
      {linkLabel ? (
        <Pressable accessibilityRole="link" onPress={onLinkPress} hitSlop={10}>
          <Text style={[styles.link, { color: theme.colors.primary }]}>{linkLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 },
  h2: { flexShrink: 1, fontSize: 21, lineHeight: 27, fontWeight: '600', letterSpacing: -0.4 },
  link: { fontSize: 13, fontWeight: '600' },
});
