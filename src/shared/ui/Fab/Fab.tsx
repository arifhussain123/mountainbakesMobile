import { Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { ACCENT_GLOW, AccentFill } from '../AccentFill';
import { Icon, type IconName } from '../Icon';

export interface FabProps {
  label: string;
  onPress: () => void;
  /** Distance from the bottom of the screen — above the tab bar where there is one. */
  bottom: number;
  icon?: IconName;
  accessibilityLabel?: string;
}

/** List bottom padding that keeps the last card clear of a `Fab`. */
export const FAB_CLEARANCE = 88;

/** The redesign's `.fab`: an extended saffron-gradient pill (icon + label) floating bottom-right. */
export function Fab({ label, onPress, bottom, icon = 'plus', accessibilityLabel }: FabProps) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { bottom, backgroundColor: theme.colors.primary, opacity: pressed ? 0.88 : 1 },
        theme.isDark ? styles.darkLift : ACCENT_GLOW,
      ]}>
      <AccentFill borderRadius={20} />
      <Icon name={icon} size={20} color={theme.colors.primaryText} />
      <Text style={[styles.text, { color: theme.colors.primaryText }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: { position: 'absolute', right: 20, height: 56, borderRadius: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  darkLift: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 6 },
  text: { fontSize: 15, fontWeight: '600' },
});
