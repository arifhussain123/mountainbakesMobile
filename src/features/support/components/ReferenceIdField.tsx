import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { DARK_SURFACES, useAppTheme } from '@/shared/theme';
import { Icon, TextField } from '@/shared/ui';
import { SUPPORTED_REFERENCE_PREFIXES } from '../schemas';

export interface ReferenceIdFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  onFind: () => void;
  onOpenRecent: () => void;
  isLookingUp: boolean;
  error?: string;
}

/** Reference ID input + Find + "Pick from recent" — auto-uppercase/trim happens on submit (`schemas.ts#normalizeReferenceId`), not as-you-type, so a branch manager can still see exactly what they typed while typing it. */
export function ReferenceIdField({ value, onChangeText, onFind, onOpenRecent, isLookingUp, error }: ReferenceIdFieldProps) {
  const theme = useAppTheme();
  const findInk = '#FFFFFF';

  return (
    // TextField brings its own 16pt top margin; New Query lays its sections out with a gap instead.
    <View style={styles.wrap}>
      <TextField
        label="Reference ID"
        required
        value={value}
        onChangeText={onChangeText}
        placeholder="e.g. EXP-000012"
        autoCapitalize="characters"
        autoCorrect={false}
        error={error}
        onSubmitEditing={onFind}
        rightAccessory={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Find record"
            onPress={onFind}
            disabled={isLookingUp || !value.trim()}
            style={[
              styles.find,
              // 2026 redesign B25: a midnight "Find" pill (light); dark keeps the accent fill.
              { backgroundColor: theme.isDark ? DARK_SURFACES.darkButton[0] : DARK_BTN, opacity: isLookingUp || !value.trim() ? 0.5 : 1 },
            ]}>
            {isLookingUp ? (
              <ActivityIndicator size="small" color={findInk} />
            ) : (
              <>
                <Icon name="search" size={16} color={findInk} />
                <Text style={[styles.findText, { color: findInk }]}>Find</Text>
              </>
            )}
          </Pressable>
        }
      />
      <Text style={[styles.help, { color: theme.colors.textFaint }]}>
        Supported: {SUPPORTED_REFERENCE_PREFIXES.map((p) => `${p}-`).join(', ')}
      </Text>
      <Pressable accessibilityRole="button" onPress={onOpenRecent} style={styles.recent}>
        <Icon name="history-clock" size={16} color={theme.colors.primary} />
        <Text style={[styles.recentText, { color: theme.colors.primary }]}>
          Pick from recent
        </Text>
      </Pressable>
    </View>
  );
}

/** The redesign's `btn dark` fill (midnight navy). */
const DARK_BTN = '#1E1B4B';

const styles = StyleSheet.create({
  wrap: { marginTop: -16 },
  find: { height: 40, paddingHorizontal: 14, marginRight: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  findText: { fontSize: 13, fontWeight: '700' },
  help: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  recent: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start' },
  recentText: { fontSize: 13, fontWeight: '700' },
});
