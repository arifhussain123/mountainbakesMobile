import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MBAccountButton, MBHeader, MBIcon } from '@/components';
import { MBBadge } from '@/components/feedback/MBBadge';
import {
  moreSectionsFor,
  NAV_LABELS,
  type AccessProfile,
  type BadgeSource,
  type MoreItem,
} from '@/navigation/roleConfig';
import { useSyncStore } from '@/store/syncStore';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The More tab: everything that is not a daily operation.
 *
 * A real screen, not a menu sheet — it scrolls, it groups, and every row is a
 * navigation target with a stable address. The alternative the brief rules out
 * is scattering these across a drawer as well: two routes to Users means two
 * menus to keep in sync and a user who cannot form a mental model of where
 * anything lives. See `docs/navigation.md`.
 *
 * Sections and rows come from `roleConfig`. This screen renders whatever it is
 * handed and decides nothing about who sees what.
 */
export function MoreScreen({ profile }: { profile: AccessProfile }): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const sections = useMemo(() => moreSectionsFor(profile), [profile]);

  const pending = useSyncStore(s => s.pending);
  const needsAttention = useSyncStore(s => s.needsAttention);

  const badgeFor = useCallback(
    (source: BadgeSource | undefined): { count: number; tone: 'accent' | 'danger' } | null => {
      if (source !== 'syncAttention') return null;
      // Failures outrank a queue: a parked row needs a person, a pending row
      // only needs a network.
      if (needsAttention > 0) return { count: needsAttention, tone: 'danger' };
      if (pending > 0) return { count: pending, tone: 'accent' };
      return null;
    },
    [needsAttention, pending],
  );

  const go = useCallback(
    (item: MoreItem) => {
      // Typed against MoreStackParamList at the config layer; the navigator here
      // is the generic one, so this is the single untyped hop.
      (navigation.navigate as (name: string) => void)(item.route);
    },
    [navigation],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader title={NAV_LABELS.more} leading={<MBAccountButton />} />
      <ScrollView
        contentContainerStyle={{
          padding: theme.layout.screenPad,
          paddingBottom: insets.bottom + theme.space.xxl,
          gap: theme.space.xxl,
        }}>
        {sections.map(section => (
          <View key={section.title ?? 'top'} style={{ gap: theme.space.sm }}>
            {section.title ? (
              <Text
                accessibilityRole="header"
                style={[theme.type.label, { color: theme.colors.textMuted }]}>
                {section.title}
              </Text>
            ) : null}

            <View
              style={[
                styles.group,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.lg,
                },
              ]}>
              {section.items.map((item, i) => {
                const badge = badgeFor(item.badge);
                const label = NAV_LABELS[item.label];
                return (
                  <Pressable
                    key={item.route}
                    onPress={() => go(item)}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        minHeight: theme.layout.rowMinH,
                        paddingHorizontal: theme.layout.cardPad,
                        gap: theme.space.md,
                        backgroundColor: pressed ? theme.colors.surfaceSunken : theme.colors.surface,
                        borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                        borderTopColor: theme.colors.border,
                      },
                    ]}>
                    <MBIcon name={item.icon} size="drawer" color={theme.colors.accent} />
                    <Text style={[theme.type.body, styles.rowLabel, { color: theme.colors.text }]}>
                      {label}
                    </Text>
                    {badge ? (
                      <MBBadge
                        count={badge.count}
                        tone={badge.tone}
                        label={`${badge.count} ${badge.tone === 'danger' ? 'need attention' : 'waiting to sync'}`}
                      />
                    ) : null}
                    <MBIcon name="chevron" size="action" color={theme.colors.textMuted} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { flex: 1 },
});
