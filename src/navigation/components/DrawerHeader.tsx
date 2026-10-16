import { Image, StyleSheet, Text, View } from 'react-native';
import { images } from '@/assets';
import { useAppTheme } from '@/shared/theme';

export interface DrawerHeaderProps {
  roleLabel: string;
}

/** Logo badge + "Mountain Bakes" + role, pinned at the top of the drawer. */
export function DrawerHeader({ roleLabel }: DrawerHeaderProps) {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, { padding: theme.spacing.lg }]}>
      <Image source={images.logo} style={styles.logo} />
      <View style={{ marginLeft: theme.spacing.md, flexShrink: 1 }}>
        <Text style={[theme.typography.sectionTitle, { color: theme.colors.drawer.text, fontWeight: '700' }]}>Mountain Bakes</Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.drawer.textMuted, marginTop: 2 }]} numberOfLines={1}>
          {roleLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 52, height: 52, borderRadius: 26 },
});
