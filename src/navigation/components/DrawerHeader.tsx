import { Image, StyleSheet, Text, View } from 'react-native';
import { images } from '@/assets';
import { useAppTheme } from '@/shared/theme';
import { HEADER_LOGO_SIZE, HEADER_ROLE_FONT_SIZE, HEADER_TITLE_FONT_SIZE } from './drawerLayout';

export interface DrawerHeaderProps {
  roleLabel: string;
  /** Status-bar safe-area inset, added ABOVE the header's own padding. */
  insetTop: number;
}

/**
 * Logo badge + "MOUNTAIN BAKES" + role — the fixed top of the menu, above
 * the branch line and the content divider. Title wants Space Grotesk Bold
 * per the brief; no Space Grotesk font file exists anywhere in this repo
 * (same gap flagged on the Splash/Onboarding/Login task) — this renders in
 * the system font, bold + letter-spaced, until that's supplied.
 */
export function DrawerHeader({ roleLabel, insetTop }: DrawerHeaderProps) {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, { paddingTop: insetTop + theme.spacing.lg, paddingHorizontal: 20, paddingBottom: theme.spacing.md }]}>
      <View style={{ width: HEADER_LOGO_SIZE, height: HEADER_LOGO_SIZE, borderRadius: HEADER_LOGO_SIZE / 2, overflow: 'hidden' }}>
        <Image source={images.logo} style={styles.logo} resizeMode="contain" />
      </View>
      <View style={{ marginLeft: theme.spacing.md, flexShrink: 1 }}>
        <Text
          style={{ color: theme.colors.text, fontSize: HEADER_TITLE_FONT_SIZE, fontWeight: '800', letterSpacing: 2 }}
          numberOfLines={1}
          ellipsizeMode="tail">
          MOUNTAIN BAKES
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: HEADER_ROLE_FONT_SIZE, letterSpacing: 1, marginTop: 2 }} numberOfLines={1}>
          {roleLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: '100%', height: '100%' },
});
