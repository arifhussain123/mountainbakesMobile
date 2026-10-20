import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAdminHeaderActions } from '@/features/admin';
import { AppHeader, Screen } from '@/shared/ui';
import { DrawerItem } from '../components/DrawerItem';
import { DrawerSectionLabel } from '../components/DrawerSectionLabel';
import { ROW_FONT_MAX, ROW_ICON_MAX, ROW_MAX_HEIGHT } from '../components/drawerLayout';
import { GROUP_LABEL, SUPER_ADMIN_NAV_ITEMS, navItemBadge, type NavItem } from '../navItems';
import { useNavBadges } from '../useNavBadges';

type DrawerNavigation = Parameters<NavItem['navigate']>[0];

/**
 * What a Super Admin drawer group row opens (Catalog, Branches, Finance,
 * Admin): its pages as drawer rows — the same rows, badges and section labels
 * as the drawer itself, at the drawer's largest row size since there is room.
 * Tapping one goes exactly where its old drawer row did.
 */
export function SuperAdminHubScreen({ hubKey }: { hubKey: string }) {
  const navigation = useNavigation() as unknown as DrawerNavigation;
  const headerActions = useAdminHeaderActions();
  const badges = useNavBadges();
  const hub = SUPER_ADMIN_NAV_ITEMS.find((item) => item.key === hubKey);
  const pages = hub?.children ?? [];
  // Labels only where a hub spans several of the web's sections (Finance).
  const labelled = new Set(pages.map((p) => p.group)).size > 1;

  return (
    <Screen>
      <AppHeader title={hub?.label ?? ''} subtitle={`${pages.length} pages`} actions={headerActions} />
      <ScrollView contentContainerStyle={styles.list}>
        {pages.map((p, index) => {
          const next = pages[index + 1];
          const startsSection = labelled && p.group !== pages[index - 1]?.group;
          const nextStartsSection = labelled && next !== undefined && next.group !== p.group;
          return (
            <View key={p.key}>
              {startsSection ? <DrawerSectionLabel label={GROUP_LABEL[p.group]} /> : null}
              <DrawerItem
                label={p.label}
                icon={p.icon}
                active={false}
                {...navItemBadge(p, badges)}
                onPress={() => p.navigate(navigation)}
                rowHeight={ROW_MAX_HEIGHT}
                iconSize={ROW_ICON_MAX}
                fontSize={ROW_FONT_MAX}
                lineHeight={ROW_FONT_MAX * 1.2}
                showDividerBelow={next !== undefined && !nextStartsSection}
              />
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

// One per group row, so each drawer screen has a component of its own.
export const CatalogHubScreen = () => <SuperAdminHubScreen hubKey="catalogHub" />;
export const BranchesHubScreen = () => <SuperAdminHubScreen hubKey="branchesHub" />;
export const FinanceHubScreen = () => <SuperAdminHubScreen hubKey="financeHub" />;
export const AdminHubScreen = () => <SuperAdminHubScreen hubKey="adminHub" />;

const styles = StyleSheet.create({
  list: { paddingBottom: 24 },
});
