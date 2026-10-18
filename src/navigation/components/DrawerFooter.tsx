import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import {
  FOOTER_BUTTON_SIZE,
  FOOTER_EMAIL_FONT_SIZE,
  FOOTER_NAME_FONT_SIZE,
  FOOTER_PADDING_BOTTOM,
  FOOTER_PADDING_TOP,
  FOOTER_ROW_HEIGHT,
  FOOTER_ROW_TO_SYNC_GAP,
  FOOTER_SYNC_FONT_SIZE,
  FOOTER_SYNC_LINE_HEIGHT,
  ROW_HORIZONTAL_PADDING,
} from './drawerLayout';

const appVersion = (require('../../../package.json') as { version: string }).version;

export interface DrawerFooterProps {
  name: string;
  email: string;
  pendingSyncCount: number;
  /** Show "Sign out" next to its icon — only when the drawer is wide enough. */
  showSignOutLabel: boolean;
  /** Omitted for a shell without a Profile screen — the name/email are then plain text. */
  onPressProfile?: () => void;
  onPressAppearance: () => void;
  onSignOut: () => void;
  /** Home-indicator/3-button-nav safe-area inset, added BELOW the footer's own padding — `drawerLayout.ts#FOOTER_HEIGHT` deliberately excludes it. */
  insetBottom: number;
}

/**
 * Compact footer: name + email (opens Profile where the shell has one), an Appearance icon button and
 * a Sign out button on one row, then one muted sync/version line. Sits above
 * `insetBottom` so the system buttons never cover it.
 */
export function DrawerFooter({ name, email, pendingSyncCount, showSignOutLabel, onPressProfile, onPressAppearance, onSignOut, insetBottom }: DrawerFooterProps) {
  const theme = useAppTheme();
  const buttonStyle = [styles.button, { height: FOOTER_BUTTON_SIZE, minWidth: FOOTER_BUTTON_SIZE, borderRadius: FOOTER_BUTTON_SIZE / 2, backgroundColor: theme.colors.surface }];

  return (
    <View
      style={{
        paddingTop: FOOTER_PADDING_TOP,
        paddingBottom: FOOTER_PADDING_BOTTOM + insetBottom,
        paddingHorizontal: ROW_HORIZONTAL_PADDING,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border,
      }}>
      <View style={[styles.row, { height: FOOTER_ROW_HEIGHT }]}>
        <Pressable
          accessibilityRole={onPressProfile ? 'button' : undefined}
          accessibilityLabel={onPressProfile ? 'View profile' : undefined}
          disabled={!onPressProfile}
          onPress={onPressProfile}
          style={styles.identity}>
          <Text style={{ color: theme.colors.text, fontSize: FOOTER_NAME_FONT_SIZE, fontWeight: '600' }} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {name}
          </Text>
          {email ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: FOOTER_EMAIL_FONT_SIZE, marginTop: 1 }} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {email}
            </Text>
          ) : null}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Appearance" hitSlop={4} onPress={onPressAppearance} style={buttonStyle}>
          <Icon name="palette" size={18} color={theme.colors.textMuted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          hitSlop={4}
          onPress={onSignOut}
          style={[buttonStyle, showSignOutLabel ? styles.buttonWithLabel : null]}>
          <Icon name="logout" size={18} color={theme.colors.danger} />
          {showSignOutLabel ? (
            <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: '600' }} maxFontSizeMultiplier={1.2}>
              Sign out
            </Text>
          ) : null}
        </Pressable>
      </View>

      <Text
        style={{ color: theme.colors.textMuted, fontSize: FOOTER_SYNC_FONT_SIZE, lineHeight: FOOTER_SYNC_LINE_HEIGHT, marginTop: FOOTER_ROW_TO_SYNC_GAP }}
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}>
        {pendingSyncCount > 0 ? `${pendingSyncCount} change${pendingSyncCount === 1 ? '' : 's'} waiting to sync` : 'All changes synced'} · v{appVersion}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  identity: { flex: 1, minWidth: 0, justifyContent: 'center' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonWithLabel: { paddingHorizontal: 12, gap: 6 },
});
