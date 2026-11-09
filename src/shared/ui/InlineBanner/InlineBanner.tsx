import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '../Icon';

export interface InlineBannerProps {
  message: string;
  tone?: 'error' | 'info';
  /** Shows a close button; the banner itself never hides on its own. */
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A dismissable message placed inline in a form (above its submit button) —
 * the alternative to a native alert, which would steal focus and hide the
 * fields the user needs to correct. Announced assertively when it appears.
 */
export function InlineBanner({
  message,
  tone = 'error',
  onDismiss,
  style,
  testID,
}: InlineBannerProps) {
  const { colors, typography, radii, withAlpha } = useAppTheme();
  const color = tone === 'error' ? colors.danger : colors.info;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      testID={testID}
      style={[
        styles.banner,
        {
          backgroundColor: withAlpha(color, 0.12),
          borderColor: withAlpha(color, 0.4),
          borderRadius: radii.card,
        },
        style,
      ]}
    >
      <Icon name="warning" size={18} color={color} />
      <Text
        style={[typography.brandBody, styles.message, { color: colors.text }]}
      >
        {message}
      </Text>
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
          onPress={onDismiss}
          hitSlop={8}
          style={styles.close}
          testID={testID ? `${testID}-dismiss` : undefined}
        >
          <Icon name="close" size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 6,
    gap: 10,
  },
  message: {
    flex: 1,
    paddingVertical: 6,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
