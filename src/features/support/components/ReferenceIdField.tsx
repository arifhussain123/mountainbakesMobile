import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
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

  return (
    <View>
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
            style={{
              height: 36,
              paddingHorizontal: 14,
              marginRight: 6,
              borderRadius: theme.radii.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.primary,
              opacity: isLookingUp || !value.trim() ? 0.5 : 1,
            }}>
            {isLookingUp ? (
              <ActivityIndicator size="small" color={theme.colors.primaryText} />
            ) : (
              <Text style={[theme.typography.bodySmall, { color: theme.colors.primaryText, fontWeight: '700' }]}>Find</Text>
            )}
          </Pressable>
        }
      />
      <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 6 }]}>
        Supported: {SUPPORTED_REFERENCE_PREFIXES.map((p) => `${p}-`).join(', ')}
      </Text>
      <Pressable accessibilityRole="button" onPress={onOpenRecent} style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', minHeight: 44 }}>
        <Icon name="chevron-down" size={14} color={theme.colors.primary} />
        <Text style={[theme.typography.bodySmall, { color: theme.colors.primary, fontWeight: '700', marginLeft: 6 }]}>
          Pick from recent
        </Text>
      </Pressable>
    </View>
  );
}
