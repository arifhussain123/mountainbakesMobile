import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import {
  FOOTER_AVATAR_SIZE,
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
  const buttonStyle = [
    styles.button,
    { height: FOOTER_BUTTON_SIZE, minWidth: FOOTER_BUTTON_SIZE, borderRadius: FOOTER_BUTTON_SIZE / 2, backgroundColor: theme.colors.surface },
    theme.isDark ? null : styles.lift,
  ];
  const initials = initialsOf(name);

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
          {initials ? <FooterAvatar initials={initials} /> : null}
          <View style={styles.identityText}>
            <Text style={{ color: theme.colors.text, fontSize: FOOTER_NAME_FONT_SIZE, fontWeight: '600' }} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {name}
            </Text>
            {email ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: FOOTER_EMAIL_FONT_SIZE, marginTop: 1 }} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {email}
              </Text>
            ) : null}
          </View>
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

/** The signed-in user's initials in a violet circle (light) or a flat surface circle (dark). */
function FooterAvatar({ initials }: { initials: string }) {
  const theme = useAppTheme();
  if (theme.isDark) {
    return (
      <View style={[styles.avatar, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.avatarText, { color: theme.colors.primary }]} maxFontSizeMultiplier={1.2}>{initials}</Text>
      </View>
    );
  }
  return (
    <LinearGradient colors={['#8B7CF6', '#6C5CE7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
      <Text style={[styles.avatarText, { color: '#FFFFFF' }]} maxFontSizeMultiplier={1.2}>{initials}</Text>
    </LinearGradient>
  );
}

/** "Muhammad Hussain" → "MH"; one word → its first two letters. */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  identityText: { flex: 1, minWidth: 0, justifyContent: 'center' },
  avatar: { width: FOOTER_AVATAR_SIZE, height: FOOTER_AVATAR_SIZE, borderRadius: FOOTER_AVATAR_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '600' },
  lift: { shadowColor: '#4C3CAA', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonWithLabel: { paddingHorizontal: 12, gap: 6 },
});
