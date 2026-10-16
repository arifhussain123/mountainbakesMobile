import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import {
  FOOTER_AVATAR_SIZE,
  FOOTER_EMAIL_FONT_SIZE,
  FOOTER_NAME_FONT_SIZE,
  FOOTER_PADDING_BOTTOM,
  FOOTER_PADDING_TOP,
  FOOTER_ROW_HEIGHT,
  FOOTER_ROW_TO_SYNC_GAP,
  FOOTER_SYNC_FONT_SIZE,
} from './drawerLayout';

const appVersion = (require('../../../package.json') as { version: string }).version;

export interface DrawerFooterProps {
  name: string;
  email: string;
  pendingSyncCount: number;
  onSignOut: () => void;
  /** Home-indicator/3-button-nav safe-area inset, added BELOW the footer's own padding — see `drawerLayout.ts#FOOTER_HEIGHT`, which deliberately excludes this. */
  insetBottom: number;
}

/** First letters of up to the first two words, uppercased — "Muhammad Hussain" → "MH". */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

/**
 * Compact single block: avatar + name/email + Sign Out icon button on one
 * row, then one muted sync-status line — replacing the old two-line-plus-
 * button layout so the footer costs less of the drawer's fixed height
 * budget (see `drawerLayout.ts#FOOTER_HEIGHT`).
 */
export function DrawerFooter({ name, email, pendingSyncCount, onSignOut, insetBottom }: DrawerFooterProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: FOOTER_PADDING_TOP,
          paddingBottom: FOOTER_PADDING_BOTTOM + insetBottom,
          paddingHorizontal: theme.spacing.lg,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        },
      ]}>
      <View style={[styles.row, { height: FOOTER_ROW_HEIGHT }]}>
        <View
          style={[
            styles.avatar,
            { width: FOOTER_AVATAR_SIZE, height: FOOTER_AVATAR_SIZE, borderRadius: FOOTER_AVATAR_SIZE / 2, backgroundColor: theme.colors.primary },
          ]}>
          <Text style={{ color: theme.colors.primaryText, fontSize: 13, fontWeight: '700' }}>{initialsOf(name)}</Text>
        </View>
        <View style={{ marginLeft: 10, flex: 1, minWidth: 0 }}>
          <Text style={{ color: theme.colors.text, fontSize: FOOTER_NAME_FONT_SIZE, fontWeight: '700' }} numberOfLines={1}>
            {name}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: FOOTER_EMAIL_FONT_SIZE, marginTop: 1 }} numberOfLines={1}>
            {email}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          hitSlop={8}
          onPress={onSignOut}
          style={[styles.signOutButton, { backgroundColor: theme.colors.cardFill }]}>
          <Icon name="logout" size={18} color={theme.colors.text} />
        </Pressable>
      </View>

      <Text style={{ color: theme.colors.textMuted, fontSize: FOOTER_SYNC_FONT_SIZE, marginTop: FOOTER_ROW_TO_SYNC_GAP }}>
        {pendingSyncCount > 0 ? `${pendingSyncCount} change${pendingSyncCount === 1 ? '' : 's'} waiting to sync` : 'All changes synced'} · v
        {appVersion}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  signOutButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
