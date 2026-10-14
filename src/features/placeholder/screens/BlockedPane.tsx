import { StyleSheet, View } from 'react-native';
import { AppHeader, EmptyState, Screen } from '@/shared/ui';

/**
 * Like `comingSoonPane`, but for a screen that isn't merely unbuilt — the backend
 * explicitly refuses this role on every endpoint it would need. Says so, rather than
 * implying it just hasn't been gotten to yet, so nobody re-attempts it without first
 * reading the given reason.
 */
export function blockedPane(title: string, reason: string) {
  return function BlockedPane() {
    return (
      <Screen>
        <AppHeader title={title} />
        <View style={styles.body}>
          <EmptyState title="Not Available" message={reason} />
        </View>
      </Screen>
    );
  };
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center' },
});
