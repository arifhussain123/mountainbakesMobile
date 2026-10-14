import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppHeader, EmptyState, Screen } from '@/shared/ui';
import type { RootStackParamList } from '@/navigation/types';
import { Routes } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, typeof Routes.COMING_SOON>;

/** One reusable placeholder for every screen CLAUDE.md describes that Phase 1 doesn't build yet. */
export function ComingSoonScreen({ route }: Props) {
  return (
    <Screen>
      <AppHeader title={route.params.title} />
      <View style={styles.body}>
        <EmptyState title="Coming soon" message={`${route.params.title} isn't built yet in this phase.`} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center' },
});
