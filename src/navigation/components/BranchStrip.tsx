import { StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { DARK_SURFACES, useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import { BRANCH_STRIP_CARD_HEIGHT, BRANCH_STRIP_FONT_SIZE, BRANCH_STRIP_MARGIN_BOTTOM, ROW_HORIZONTAL_PADDING } from './drawerLayout';

export interface BranchStripProps {
  branchName: string;
}

/**
 * The role shell's context line (the branch, or "Production · All branches").
 * 2026 redesign `.card.tint`: a rounded lavender card with a home glyph
 * (light), a deep-violet gradient card with a violet hairline (dark). A label, not a picker: `SessionUser.branchId`/
 * `branchName` are singular, with no multi-branch switching in the data model.
 */
export function BranchStrip({ branchName }: BranchStripProps) {
  const theme = useAppTheme();
  const content = (
    <>
      <Icon name="home" size={18} color={theme.colors.primary} />
      <Text
        style={[styles.text, { color: theme.colors.text, fontSize: BRANCH_STRIP_FONT_SIZE }]}
        numberOfLines={1}
        ellipsizeMode="tail"
        maxFontSizeMultiplier={1.2}>
        {branchName}
      </Text>
    </>
  );
  return (
    <View style={{ paddingHorizontal: ROW_HORIZONTAL_PADDING, marginBottom: BRANCH_STRIP_MARGIN_BOTTOM }}>
      <LinearGradient
        colors={theme.isDark ? [...DARK_SURFACES.tintCard] : ['#EFEBFF', '#E2DBFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, theme.isDark ? { borderWidth: 1, borderColor: DARK_SURFACES.tintCardBorder } : null]}>
        {content}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { height: BRANCH_STRIP_CARD_HEIGHT, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { flex: 1, fontWeight: '600' },
});
