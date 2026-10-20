import { useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GLOBAL_SEARCH_MIN_CHARS, useGlobalSearch, type GlobalSearchResult } from '@/api';
import { Routes } from '@/navigation/routes';
import type { RootStackParamList } from '@/navigation/types';
import { useDebouncedValue } from '@/shared/hooks';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Icon, Screen } from '@/shared/ui';
import { Pill } from '../components/AdminDetail';
import { globalSearchEmptyText, globalSearchTarget } from '../utils/globalSearch';

/** As the web's `useDebounce(search, 300)`. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Global Search — the web header's Ctrl+K dialog (`GlobalSearch.tsx`) as a
 * root modal, opened from the search icon in every Super Admin header. Same
 * request (`GET /api/search?q=`, from two characters, debounced 300 ms), same
 * groups in the server's order (Orders, Products, Packing Materials,
 * Customers), same row (label + status badge). A tap opens the phone's screen
 * for that record (`globalSearchTarget`); a result type with no phone screen
 * is listed but disabled, with the reason under it.
 */
export function GlobalSearchScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, SEARCH_DEBOUNCE_MS).trim();
  const enough = debounced.length >= GLOBAL_SEARCH_MIN_CHARS;
  const q = useGlobalSearch(debounced);

  // The web shows no results (not another term's) until this term's answer is in; a failure reads as "no results", as there.
  const loading = enough && q.isLoading;
  const groups = useMemo(() => (enough && q.data ? q.data : []), [enough, q.data]);
  const sections = useMemo(() => groups.map((g) => ({ key: g.type, title: g.type, data: g.items })), [groups]);
  const emptyText = globalSearchEmptyText(debounced, { loading, resultCount: groups.length }, GLOBAL_SEARCH_MIN_CHARS);

  const openResult = (item: GlobalSearchResult) => {
    const target = globalSearchTarget(item);
    if (target.kind !== 'screen') return;
    Keyboard.dismiss();
    // Navigating to the shell already under this modal pops the modal, then opens the drawer screen.
    navigation.navigate(Routes.SUPER_ADMIN_DRAWER, { screen: target.screen });
  };

  return (
    <Screen>
      <AppHeader title="Search" actions={[{ icon: 'close', onPress: () => navigation.goBack(), accessibilityLabel: 'Close search' }]} />
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm }}>
        <View style={[styles.inputRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
          <Icon name="search" size={16} color={theme.colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search orders, products, customers…"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { color: theme.colors.text }]}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search orders, products, customers"
            testID="global-search-input"
          />
          {search ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => setSearch('')}>
              <Icon name="close" size={16} color={theme.colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.type}:${item.id}`}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
        renderSectionHeader={({ section }) => (
          <Text style={[theme.typography.label, styles.heading, { color: theme.colors.textSecondary }]} accessibilityRole="header">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => <ResultRow item={item} onPress={() => openResult(item)} />}
        ListEmptyComponent={
          emptyText ? (
            <View style={styles.empty}>
              {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'center' }]}>{emptyText}</Text>
            </View>
          ) : undefined
        }
      />
    </Screen>
  );
}

function ResultRow({ item, onPress }: { item: GlobalSearchResult; onPress: () => void }) {
  const theme = useAppTheme();
  const target = globalSearchTarget(item);
  const disabled = target.kind !== 'screen';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={item.label}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.colors.cardBorder : theme.colors.cardFill, borderColor: theme.colors.cardBorder, opacity: disabled ? 0.6 : 1 },
      ]}>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>
          {item.label}
        </Text>
        {target.kind === 'unavailable' ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{target.note}</Text> : null}
      </View>
      {item.status ? <Pill label={capitalize(item.status)} tone="neutral" /> : null}
      {!disabled ? <Icon name="chevron-right" size={16} color={theme.colors.textSecondary} /> : null}
    </Pressable>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center', height: 46, borderWidth: 1, gap: 8, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 15, padding: 0 },
  heading: { fontWeight: '700', marginTop: 14, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 32 },
});
