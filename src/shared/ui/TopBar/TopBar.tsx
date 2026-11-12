import { StyleSheet, Text, View } from 'react-native';
import { designType, useAppTheme } from '@/shared/theme';
import type { AppHeaderAction } from '../AppHeader';
import { IconButton } from '../IconButton';

export interface TopBarAction extends AppHeaderAction {
  disabled?: boolean;
  loading?: boolean;
}

export interface TopBarProps {
  /** The small line under "Mountain Bakes" (e.g. "Sales on 12 Oct · 17 recorded"). */
  subtitle?: string;
  onMenu: () => void;
  actions?: TopBarAction[];
}

/** The redesign's `topbar` for a tab's main screen: menu button, "Mountain Bakes" over a context line, round actions. */
export function TopBar({ subtitle, onMenu, actions = [] }: TopBarProps) {
  const theme = useAppTheme();
  return (
    <View style={styles.bar}>
      <IconButton icon="menu" onPress={onMenu} accessibilityLabel="Open menu" />
      <View style={styles.text}>
        <Text style={[styles.brand, { color: theme.colors.text }]} numberOfLines={1}>
          Mountain Bakes
        </Text>
        {subtitle ? (
          <Text style={[designType.xs, { color: theme.colors.textFaint }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions.map((a) => (
        <IconButton
          key={a.icon}
          icon={a.icon}
          onPress={a.onPress}
          onLongPress={a.onLongPress}
          accessibilityLabel={a.accessibilityLabel}
          badgeCount={a.badgeCount}
          disabled={a.disabled}
          loading={a.loading}
        />
      ))}
    </View>
  );
}

export interface BackBarProps {
  title: string;
  subtitle?: string;
  /** Usually `navigation.goBack`. */
  onBack: () => void;
}

/** The redesign's `appbar(back=True)` for detail screens: a round back button, an h2 title and a context line. */
export function BackBar({ title, subtitle, onBack }: BackBarProps) {
  const theme = useAppTheme();
  return (
    <View style={styles.backBar}>
      <IconButton icon="chevron-left" onPress={onBack} accessibilityLabel="Back" />
      <View style={styles.text}>
        <Text accessibilityRole="header" style={[designType.h2, { color: theme.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[designType.xs, { color: theme.colors.textFaint }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56 },
  backBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8, minHeight: 56 },
  text: { flex: 1, minWidth: 0, gap: 1 },
  brand: { fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
});
