import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { designType, useAppTheme } from '@/shared/theme';

export interface PageTitleProps {
  /** A small faint line above the title (usually the date). */
  eyebrow?: string;
  title: string;
  /** A paragraph under the title. */
  sub?: string;
  /** Something on the right, bottom-aligned with the title (an icon button, a small button). */
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** The redesign's `title()` block: optional eyebrow, the 32pt h1, an optional paragraph and a right-hand control. */
export function PageTitle({ eyebrow, title, sub, right, style }: PageTitleProps) {
  const theme = useAppTheme();
  return (
    <View style={style}>
      <View style={styles.row}>
        <View style={styles.col}>
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <Text accessibilityRole="header" style={[designType.h1, { color: theme.colors.text }]}>
            {title}
          </Text>
        </View>
        {right}
      </View>
      {sub ? <Text style={[designType.p, styles.sub, { color: theme.colors.textSecondary }]}>{sub}</Text> : null}
    </View>
  );
}

/** The redesign's `.eyebrow`: 12/15 SemiBold in the faint text colour. */
export function Eyebrow({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const theme = useAppTheme();
  return <Text style={[designType.eyebrow, { color: theme.colors.textFaint }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  col: { flex: 1, minWidth: 0, gap: 4 },
  sub: { marginTop: 6 },
});
