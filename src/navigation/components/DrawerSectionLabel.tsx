import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { MENU_CONTENT_HORIZONTAL_PADDING, SECTION_LABEL_FONT_SIZE } from './drawerLayout';

export interface DrawerSectionLabelProps {
  label: string;
  /** Hairline above every section except the first — sections are separated this way now, not per-item dividers. */
  showDividerAbove: boolean;
}

export function DrawerSectionLabel({ label, showDividerAbove }: DrawerSectionLabelProps) {
  const theme = useAppTheme();
  return (
    <View>
      {showDividerAbove ? (
        <View style={[styles.divider, { marginHorizontal: MENU_CONTENT_HORIZONTAL_PADDING, backgroundColor: theme.colors.border }]} />
      ) : null}
      <Text style={[styles.label, { color: theme.colors.textMuted, fontSize: SECTION_LABEL_FONT_SIZE }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { paddingHorizontal: 20, marginTop: 16, marginBottom: 6, letterSpacing: 1.2, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 8 },
});
