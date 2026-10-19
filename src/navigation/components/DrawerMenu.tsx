import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useAppTheme } from '@/shared/theme';
import type { IconName } from '@/shared/ui';
import { useAppearanceSheetStore } from '@/features/appearance';
import { useAuthStore, useOfflineQueueStore } from '@/state';
import { BranchStrip } from './BranchStrip';
import { CollapsibleDrawerList } from './CollapsibleDrawerList';
import { DrawerFooter } from './DrawerFooter';
import { DrawerHeader } from './DrawerHeader';
import { DrawerItem } from './DrawerItem';
import { DrawerSectionLabel } from './DrawerSectionLabel';
import { SignOutSheet } from './SignOutSheet';
import { FOOTER_SIGN_OUT_LABEL_MIN_WIDTH, computeAvailableListHeight, computeDrawerRowMetrics, countSections, getDrawerWidth } from './drawerLayout';

export interface DrawerMenuRow {
  key: string;
  label: string;
  icon: IconName;
  /** Section heading this row sits under; `null` for an ungrouped list. A heading renders at each change of section. */
  section: string | null;
  active: boolean;
  badgeCount?: number;
  /** Show `badgeCount` as an amber dot instead of a number — see `DrawerItem`. */
  badgeDot?: boolean;
  /** `muted` greys a count; `danger` turns a dot red — see `NavItem.badgeTone`. */
  badgeTone?: 'muted' | 'danger';
  onPress: () => void;
}

export interface DrawerMenuProps {
  roleLabel: string;
  /** Accent strip under the header (branch name or scope); hidden when empty. */
  contextLine: string;
  rows: DrawerMenuRow[];
  closeDrawer: () => void;
  /** Footer name/email tap target; omitted for a shell without a Profile screen. */
  onPressProfile?: () => void;
  /** Fold sections to their headers (`CollapsibleDrawerList`) — the role shell's `collapsibleSections`. */
  collapsibleSections?: boolean;
}

/**
 * The drawer layout every role shares (Branch, Production and Finance, all
 * through `DrawerContent`), so they can't drift apart: charcoal
 * `colors.background`, header + context strip, rows with inset dividers and
 * chevrons, and a compact footer. Row height is
 * computed so the whole menu fits between the two safe-area insets (see
 * `drawerLayout.ts`); only when rows would drop below 40dp does
 * the row list scroll, with the header and footer staying put. A shell with
 * `collapsibleSections` (Super Admin) gets `CollapsibleDrawerList` instead of
 * the flat list.
 */
export function DrawerMenu({ roleLabel, contextLine, rows, closeDrawer, onPressProfile, collapsibleSections }: DrawerMenuProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const pendingCount = useOfflineQueueStore((s) => s.pendingCount);
  const failedCount = useOfflineQueueStore((s) => s.failedCount);
  const openAppearance = useAppearanceSheetStore((s) => s.open);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [measuredListHeight, setMeasuredListHeight] = useState(0);

  const sections = rows.map((row) => row.section);
  const sectionCount = sections.every((s) => s === null) ? 0 : countSections(sections.map((s) => s ?? ''));
  // The measured list area wins once known: on Android, whether the window
  // height already excludes the system bars depends on the edge-to-edge
  // setup, so the formula alone could subtract the bottom inset twice.
  const available = measuredListHeight > 0 ? measuredListHeight : computeAvailableListHeight(windowHeight, insets.top, insets.bottom);
  const metrics = computeDrawerRowMetrics(available, rows.length, sectionCount);

  const handleSignOut = () => {
    setSignOutOpen(false);
    closeDrawer();
    void logout();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DrawerHeader roleLabel={roleLabel} insetTop={insets.top} />
      {contextLine ? <BranchStrip branchName={contextLine} /> : null}

      <View style={styles.list} onLayout={(e) => setMeasuredListHeight(e.nativeEvent.layout.height)}>
        {collapsibleSections ? (
          <CollapsibleDrawerList rows={rows} available={available} userId={user?.id ?? ''} />
        ) : (
          <ScrollView style={styles.list} scrollEnabled={metrics.needsScroll} showsVerticalScrollIndicator={metrics.needsScroll}>
            {rows.map((row, index) => {
              const next = rows[index + 1];
              const startsSection = metrics.showSectionLabels && row.section !== null && row.section !== rows[index - 1]?.section;
              const nextStartsSection = metrics.showSectionLabels && next !== undefined && next.section !== row.section;
              return (
                <View key={row.key}>
                  {startsSection ? <DrawerSectionLabel label={row.section!} /> : null}
                  <DrawerItem
                    label={row.label}
                    icon={row.icon}
                    active={row.active}
                    badgeCount={row.badgeCount}
                    badgeDot={row.badgeDot}
                    badgeTone={row.badgeTone}
                    onPress={row.onPress}
                    rowHeight={metrics.rowHeight}
                    iconSize={metrics.iconSize}
                    fontSize={metrics.fontSize}
                    lineHeight={metrics.lineHeight}
                    showDividerBelow={next !== undefined && !nextStartsSection}
                  />
                </View>
              );
            })}
          </ScrollView>
        )}
        {/* Only the small-screen / large-font fallback scrolls; the fade hints there's more below. */}
        {!collapsibleSections && metrics.needsScroll ? (
          <LinearGradient colors={[`${theme.colors.background}00`, theme.colors.background]} pointerEvents="none" style={styles.scrollFade} />
        ) : null}
      </View>

      <DrawerFooter
        name={user?.displayName ?? roleLabel}
        email={user?.email ?? ''}
        pendingSyncCount={pendingCount + failedCount}
        showSignOutLabel={getDrawerWidth(windowWidth) >= FOOTER_SIGN_OUT_LABEL_MIN_WIDTH}
        onPressProfile={onPressProfile}
        onPressAppearance={openAppearance}
        onSignOut={() => setSignOutOpen(true)}
        insetBottom={insets.bottom}
      />

      <SignOutSheet
        visible={signOutOpen}
        pendingCount={pendingCount}
        failedCount={failedCount}
        onSignOut={handleSignOut}
        onClose={() => setSignOutOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  scrollFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 24 },
});
