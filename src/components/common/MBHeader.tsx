import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { MBIcon } from './MBIcon';

export interface MBHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /**
   * Leading slot, used when there is no back affordance — the account avatar
   * that opens the drawer on a tab root. Ignored when `onBack` is set: a screen
   * shows a way back or a way to the account panel, never both, or the top-left
   * corner stops meaning one thing.
   */
  leading?: React.ReactNode;
  right?: React.ReactNode;
}

export function MBHeader({
  title,
  subtitle,
  onBack,
  leading,
  right,
}: MBHeaderProps): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top,
          minHeight: theme.layout.headerH + insets.top,
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
          paddingHorizontal: theme.layout.screenPad,
        },
      ]}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.back, { minWidth: theme.layout.tapMin }]}>
          <MBIcon name="back" size="header" color={theme.colors.accent} />
        </Pressable>
      ) : (
        leading ?? null
      )}

      <View style={styles.titles}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[theme.type.h2, { color: theme.colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  back: { justifyContent: 'center' },
  titles: { flex: 1, justifyContent: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
