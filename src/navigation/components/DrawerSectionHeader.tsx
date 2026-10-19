import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import { NavBadge } from './NavBadge';
import { ROW_CHEVRON_SIZE, ROW_HORIZONTAL_PADDING, SECTION_LABEL_FONT_SIZE, SECTION_LABEL_LINE_HEIGHT } from './drawerLayout';
import type { SectionSummary } from './drawerSections';

export interface DrawerSectionHeaderProps {
  label: string;
  expanded: boolean;
  /** Overview and the active screen's section can't fold: no chevron, not pressable. */
  pinned: boolean;
  summary: SectionSummary;
  height: number;
  onToggle: () => void;
}

/**
 * A foldable section heading for `DrawerMenu`'s collapsible mode. Folded, it
 * carries the section's item count and the sum of its badges ("ADMIN · 4 ●")
 * so nothing that needs attention hides inside a closed section.
 */
export function DrawerSectionHeader({ label, expanded, pinned, summary, height, onToggle }: DrawerSectionHeaderProps) {
  const theme = useAppTheme();
  const showSummary = !expanded;
  const badgeWords = [
    summary.badgeTotal > 0 ? `${summary.badgeTotal} need action` : null,
    summary.dot ? 'needs attention' : null,
  ].filter(Boolean);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded, disabled: pinned }}
      accessibilityLabel={`${label}, ${summary.itemCount} items${showSummary && badgeWords.length ? `, ${badgeWords.join(', ')}` : ''}`}
      disabled={pinned}
      onPress={onToggle}
      style={[styles.row, { height, paddingHorizontal: ROW_HORIZONTAL_PADDING }]}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]} numberOfLines={1} maxFontSizeMultiplier={1}>
        {label.toUpperCase()}
        {showSummary ? ` · ${summary.itemCount}` : ''}
      </Text>
      <View style={styles.trailing}>
        {showSummary && summary.badgeTotal > 0 ? <NavBadge count={summary.badgeTotal} /> : null}
        {showSummary && summary.dot ? <NavBadge count={0} dot dotTone={summary.dot} /> : null}
        {pinned ? null : <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={ROW_CHEVRON_SIZE} color={theme.colors.textMuted} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1, fontSize: SECTION_LABEL_FONT_SIZE, lineHeight: SECTION_LABEL_LINE_HEIGHT, letterSpacing: 1.2, fontWeight: '600' },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
