import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { SecondaryButton } from '../SecondaryButton';

export interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

/** CLAUDE.md Section 39 — consistent error UI with a recovery action, never a raw stack trace. */
export function ErrorState({ message = 'Unable to load this right now.', onRetry }: ErrorStateProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, { paddingVertical: theme.spacing.xxl, paddingHorizontal: theme.spacing.lg }]}>
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text, textAlign: 'center' }]}>Something went wrong.</Text>
      <Text style={[theme.typography.body, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.sm }]}>
        {message}
      </Text>
      <View style={{ marginTop: theme.spacing.lg, alignSelf: 'stretch' }}>
        <SecondaryButton label="Retry" onPress={onRetry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
});
