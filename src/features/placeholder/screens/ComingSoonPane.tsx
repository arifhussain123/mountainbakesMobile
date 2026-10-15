import { StyleSheet, View } from 'react-native';
import { AppHeader, EmptyState, Screen } from '@/shared/ui';

/**
 * Like `ComingSoonScreen`, but takes its title as a prop instead of a route
 * param — for wiring a not-yet-built screen directly into a typed stack
 * (Production/Finance scaffolding) without a `{ title: string }` param.
 */
export function comingSoonPane(title: string) {
  return function ComingSoonPane() {
    return (
      <Screen>
        <AppHeader title={title} />
        <View style={styles.body}>
          <EmptyState title="Coming soon" message={`${title} isn't built yet.`} />
        </View>
      </Screen>
    );
  };
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center' },
});
