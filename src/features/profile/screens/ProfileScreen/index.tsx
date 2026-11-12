import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '@/state';
import { HERO_CHIP, useAppTheme } from '@/shared/theme';
import { AppHeader, Card, HeroSurface, ListThumb, Screen, SectionHeader, type IconName } from '@/shared/ui';
import { branchScopeLabel, roleLabel } from '@/shared/utils';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`).toUpperCase();
}

/** branchApp.md screen 26 (Account section) — Profile, in the 2026 redesign's hero + list-card style. */
export function ProfileScreen() {
  const theme = useAppTheme();
  const user = useAuthStore((state) => state.user);

  const name = user?.displayName ?? user?.username ?? '—';
  const role = user ? roleLabel(user.role) : '—';
  const onHero = theme.isDark ? theme.colors.primaryText : '#FFFFFF';
  const muted = theme.isDark ? theme.colors.primaryText : HERO_CHIP.textMuted;

  const rows: { label: string; value: string; icon: IconName }[] = [
    { label: 'Email', value: user?.email ?? '—', icon: 'send' },
    { label: 'Role', value: role, icon: 'shield-check' },
    { label: 'Branch', value: user ? branchScopeLabel(user) : '—', icon: 'store' },
  ];

  return (
    <Screen>
      <AppHeader title="Profile" />
      <ScrollView contentContainerStyle={styles.body}>
        <HeroSurface style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: HERO_CHIP.fill, borderColor: HERO_CHIP.border }]}>
            <Text style={[styles.avatarText, { color: onHero }]}>{user ? initialsOf(name) : '—'}</Text>
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.name, { color: onHero }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.sm, { color: muted }]} numberOfLines={1}>
              {role}
            </Text>
          </View>
        </HeroSurface>

        <SectionHeader title="Account details" />
        <Card style={styles.card}>
          {rows.map((row, index) => (
            <View key={row.label} style={[styles.li, index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
              <ListThumb icon={row.icon} index={index} />
              <View style={styles.grow}>
                <Text style={[styles.xs, { color: theme.colors.textFaint }]}>{row.label}</Text>
                <Text style={[styles.value, { color: theme.colors.text }]} numberOfLines={2}>
                  {row.value}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32, gap: 16 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  heroText: { flex: 1, minWidth: 0, gap: 2, paddingRight: 48 },
  name: { fontSize: 21, lineHeight: 27, fontWeight: '600' },
  sm: { fontSize: 13, lineHeight: 18 },
  card: { paddingVertical: 4 },
  li: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  grow: { flex: 1, minWidth: 0, gap: 2 },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  value: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
});
