import { StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import {
  ROW_HORIZONTAL_PADDING,
  SECTION_LABEL_FONT_SIZE,
  SECTION_LABEL_LINE_HEIGHT,
  SECTION_LABEL_MARGIN_BOTTOM,
  SECTION_LABEL_MARGIN_TOP,
} from './drawerLayout';

/** Muted, uppercased group heading — its height is `drawerLayout.ts#SECTION_LABEL_HEIGHT`. */
export function DrawerSectionLabel({ label }: { label: string }) {
  const theme = useAppTheme();
  return (
    <Text style={[styles.label, { color: theme.colors.textMuted }]} numberOfLines={1} maxFontSizeMultiplier={1}>
      {label.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    paddingHorizontal: ROW_HORIZONTAL_PADDING,
    marginTop: SECTION_LABEL_MARGIN_TOP,
    marginBottom: SECTION_LABEL_MARGIN_BOTTOM,
    fontSize: SECTION_LABEL_FONT_SIZE,
    lineHeight: SECTION_LABEL_LINE_HEIGHT,
    letterSpacing: 1.2,
    fontWeight: '600',
  },
});
