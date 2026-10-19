import { useState } from 'react';
import { LayoutAnimation, ScrollView, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAppTheme } from '@/shared/theme';
import { SearchBar } from '@/shared/ui';
import type { DrawerMenuRow } from './DrawerMenu';
import { DrawerItem } from './DrawerItem';
import { DrawerSectionHeader } from './DrawerSectionHeader';
import {
  ROW_HORIZONTAL_PADDING,
  SEARCH_FIELD_HEIGHT,
  SEARCH_MIN_ITEMS,
  computeCollapsibleRowMetrics,
  fitsAtMinimum,
} from './drawerLayout';
import {
  collapseSection,
  effectiveExpanded,
  expandSection,
  filterRows,
  initialExpanded,
  pinnedSections,
  sectionOrder,
  summarizeSection,
} from './drawerSections';
import { useDrawerSectionsStore } from './drawerSectionsStore';

export interface CollapsibleDrawerListProps {
  rows: DrawerMenuRow[];
  /** Height of the whole list area (search field included), as `DrawerMenu` measured it. */
  available: number;
  /** Whose open sections to remember. */
  userId: string;
}

/**
 * `DrawerMenu`'s list for a menu too long to fit (Super Admin): sections fold
 * to their header, Overview and the active screen's section stay open, and
 * opening another folds the least recently used one while the list would no
 * longer fit at 40dp rows. A "Go to…" field filters every row across sections.
 * Only this list scrolls; the header, context strip and footer stay put.
 */
export function CollapsibleDrawerList({ rows, available, userId }: CollapsibleDrawerListProps) {
  const theme = useAppTheme();
  const [query, setQuery] = useState('');
  const remembered = useDrawerSectionsStore((s) => s.expandedByUser[userId]);
  const setExpanded = useDrawerSectionsStore((s) => s.setExpanded);

  const searchable = rows.length > SEARCH_MIN_ITEMS;
  const listHeight = searchable ? available - SEARCH_FIELD_HEIGHT : available;
  const sections = sectionOrder(rows);
  const pinned = pinnedSections(rows);
  const expanded = effectiveExpanded(rows, remembered ?? initialExpanded(rows, null));
  const searching = query.trim().length > 0;
  const matches = filterRows(rows, query);

  const isOpen = (section: string) => searching || expanded.includes(section);
  const visibleRows = searching ? matches : rows.filter((r) => r.section !== null && expanded.includes(r.section));
  const visibleSections = searching ? sectionOrder(matches) : sections;
  const metrics = computeCollapsibleRowMetrics(listHeight, visibleRows.length, visibleSections.length);

  const rowCountWhenOpen = (open: readonly string[]) => rows.filter((r) => r.section !== null && open.includes(r.section)).length;
  const toggle = (section: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = expanded.includes(section)
      ? collapseSection(expanded, section, pinned)
      : expandSection(expanded, section, pinned, (open) => fitsAtMinimum(listHeight, rowCountWhenOpen(open), sections.length));
    setExpanded(userId, next);
  };

  return (
    <View style={styles.fill}>
      {searchable ? (
        <View style={[styles.search, { height: SEARCH_FIELD_HEIGHT, paddingHorizontal: ROW_HORIZONTAL_PADDING }]}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Go to…" />
        </View>
      ) : null}
      <View style={styles.fill}>
        <ScrollView
          style={styles.fill}
          scrollEnabled={metrics.needsScroll}
          showsVerticalScrollIndicator={metrics.needsScroll}
          keyboardShouldPersistTaps="handled">
          {visibleSections.map((section) => {
            const sectionRows = (searching ? matches : rows).filter((r) => r.section === section);
            const open = isOpen(section);
            return (
              <View key={section}>
                <DrawerSectionHeader
                  label={section}
                  expanded={open}
                  pinned={searching || pinned.includes(section)}
                  summary={summarizeSection(rows, section)}
                  height={metrics.headerHeight}
                  onToggle={() => toggle(section)}
                />
                {open
                  ? sectionRows.map((row, index) => (
                      <DrawerItem
                        key={row.key}
                        label={row.label}
                        icon={row.icon}
                        active={row.active}
                        badgeCount={row.badgeCount}
                        badgeDot={row.badgeDot}
                        badgeTone={row.badgeTone}
                        onPress={() => {
                          setQuery('');
                          row.onPress();
                        }}
                        rowHeight={metrics.rowHeight}
                        iconSize={metrics.iconSize}
                        fontSize={metrics.fontSize}
                        lineHeight={metrics.lineHeight}
                        showDividerBelow={index < sectionRows.length - 1}
                      />
                    ))
                  : null}
              </View>
            );
          })}
          {searching && matches.length === 0 ? (
            <Text style={[styles.empty, { color: theme.colors.textMuted, paddingHorizontal: ROW_HORIZONTAL_PADDING }]}>
              No screen matches “{query.trim()}”.
            </Text>
          ) : null}
        </ScrollView>
        {metrics.needsScroll ? (
          <LinearGradient colors={[`${theme.colors.background}00`, theme.colors.background]} pointerEvents="none" style={styles.scrollFade} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  search: { paddingBottom: 4, justifyContent: 'center' },
  empty: { fontSize: 14, paddingVertical: 16 },
  scrollFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 24 },
});
