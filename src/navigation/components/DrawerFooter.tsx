import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import {
  FOOTER_AVATAR_SIZE,
  FOOTER_NAME_FONT_SIZE,
  FOOTER_PADDING_VERTICAL,
  FOOTER_SUBTEXT_FONT_SIZE,
  FOOTER_SYNC_FONT_SIZE,
  MENU_CONTENT_HORIZONTAL_PADDING,
} from './drawerLayout';

const appVersion = (require('../../../package.json') as { version: string }).version;

export interface DrawerFooterProps {
  name: string;
  pendingSyncCount: number;
  onPressProfile: () => void;
  /** Home-indicator/3-button-nav safe-area inset, added below the footer's own padding. */
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

/** Profile card (avatar + name + "View profile" + chevron) and the sync-status line, pinned above `insets.bottom`. */
export function DrawerFooter({ name, pendingSyncCount, onPressProfile, insetBottom }: DrawerFooterProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: FOOTER_PADDING_VERTICAL,
          paddingBottom: FOOTER_PADDING_VERTICAL + insetBottom,
          paddingHorizontal: MENU_CONTENT_HORIZONTAL_PADDING,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
        },
      ]}>
      <Pressable accessibilityRole="button" accessibilityLabel="View profile" onPress={onPressProfile} style={styles.row}>
        <View
          style={[
            styles.avatar,
            { width: FOOTER_AVATAR_SIZE, height: FOOTER_AVATAR_SIZE, borderRadius: FOOTER_AVATAR_SIZE / 2, borderColor: theme.colors.primary },
          ]}>
          <Text style={{ color: theme.colors.primary, fontSize: 15, fontWeight: '700' }}>{initialsOf(name)}</Text>
        </View>
        <View style={{ marginLeft: 10, flex: 1, minWidth: 0 }}>
          <Text style={{ color: theme.colors.text, fontSize: FOOTER_NAME_FONT_SIZE, fontWeight: '600' }} numberOfLines={1}>
            {name}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: FOOTER_SUBTEXT_FONT_SIZE, marginTop: 1 }}>View profile</Text>
        </View>
        <Icon name="chevron-right" size={18} color={theme.colors.textMuted} />
      </Pressable>

      <Text style={[styles.sync, { color: theme.colors.textMuted, fontSize: FOOTER_SYNC_FONT_SIZE }]}>
        {pendingSyncCount > 0 ? `${pendingSyncCount} change${pendingSyncCount === 1 ? '' : 's'} waiting to sync` : 'All changes synced'} · v
        {appVersion}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  sync: { textAlign: 'center', marginTop: 10 },
});
