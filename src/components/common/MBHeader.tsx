import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MBOfflineBanner } from '@/components/feedback/MBOfflineBanner';
import { useTheme } from '@/theme/ThemeProvider';
import { MBIcon } from './MBIcon';
import { MBPressable } from './MBPressable';
import { MBSearchBar } from './MBSearchBar';
import { space } from '@/theme/spacing';

/**
 * Collapsing search, declared by a screen that has something to search.
 *
 * The screen still owns the query — this is a controlled field, so debouncing,
 * the request and the empty state all stay where the data is.
 */
export interface MBHeaderSearch {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Shown while a debounced query is in flight. */
  searching?: boolean;
  testID?: string;
}

export interface MBHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /**
   * Leading slot, used when there is no back affordance — the account avatar
   * that opens the drawer on a tab root. Ignored when `onBack` is set: a screen
   * shows a way back or a way to the account panel, never both, or the top-left
   * corner stops meaning one thing.
   */
  leading?: React.ReactNode;
  /**
   * Trailing slot. **At most two controls**, counting the search button this
   * header adds for itself — the title is what has to survive a narrow phone at
   * a large font size, and it is the first thing squeezed out by a third icon.
   * A screen that needs more actions than that puts them in a sheet opened from
   * one trailing button, not in the header row.
   */
  right?: React.ReactNode;
  /**
   * When set, the header carries a search button that expands **in place**.
   *
   * Search collapses into the header rather than pushing a screen: a search
   * screen would take the list away at the moment the user is trying to look at
   * it, and coming back would have to restore scroll position and filters to
   * avoid losing their place.
   */
  search?: MBHeaderSearch;
  /**
   * "09:14" — when the data on this screen last came from the server.
   *
   * Only shown while offline, as a second line under the offline strip. It is
   * the difference between "this shop sold nothing today" and "I have not been
   * able to ask since 09:14", which is the misreading that gets a sale entered
   * twice or a stock count trusted when it is six hours stale.
   *
   * Pass `dataAsOfFrom(query.dataUpdatedAt)`. Omit on screens with nothing
   * cached to be stale about — a form, or a list that is local-only.
   */
  dataAsOf?: string;
}

export function MBHeader({
  title,
  subtitle,
  onBack,
  leading,
  right,
  search,
  dataAsOf,
}: MBHeaderProps): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [searchOpen, setSearchOpen] = useState(false);

  /**
   * Collapsing clears the query.
   *
   * A filter that survives out of sight is how a list ends up looking empty for
   * no visible reason — the user searched for something, collapsed the field,
   * and now the screen shows nothing with no control on it to explain why.
   */
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    if (search && search.value.length > 0) search.onChangeText('');
  }, [search]);

  const expanded = searchOpen && search;

  return (
    <>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            minHeight: theme.layout.headerH + insets.top,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
            paddingHorizontal: theme.layout.screenPad,
          },
        ]}>
        {expanded ? (
          // The whole row becomes the field. Keeping the title beside it would
          // leave the input too narrow to read a product name back in.
          <>
            <View style={styles.titles}>
              <MBSearchBar
                value={search.value}
                onChangeText={search.onChangeText}
                placeholder={search.placeholder}
                searching={search.searching}
                testID={search.testID}
                autoFocus
              />
            </View>
            <MBPressable
              onPress={closeSearch}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close search"
              style={[styles.back, { minWidth: theme.layout.tapMin }]}>
              <MBIcon name="close" size="header" color={theme.colors.accent} />
            </MBPressable>
          </>
        ) : (
          <>
            {onBack ? (
              <MBPressable
                onPress={onBack}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={[styles.back, { minWidth: theme.layout.tapMin }]}>
                <MBIcon name="back" size="header" color={theme.colors.accent} />
              </MBPressable>
            ) : (
              leading ?? null
            )}

            <View style={styles.titles}>
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                style={[theme.type.h2, { color: theme.colors.text }]}>
                {title}
              </Text>
              {subtitle ? (
                <Text
                  numberOfLines={1}
                  style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>

            {search || right ? (
              <View style={styles.right}>
                {search ? (
                  <MBPressable
                    onPress={() => setSearchOpen(true)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={search.placeholder ?? 'Search'}
                    testID={search.testID ? `${search.testID}-open` : undefined}>
                    <MBIcon name="search" size="header" color={theme.colors.accent} />
                  </MBPressable>
                ) : null}
                {right}
              </View>
            ) : null}
          </>
        )}
      </View>

      {/* Under the header, never above it: a connectivity blip must not shove
          the whole app down by the height of a strip. */}
      <MBOfflineBanner dataAsOf={dataAsOf} />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderBottomWidth: 1,
    paddingBottom: space.sm,
  },
  back: { justifyContent: 'center' },
  titles: { flex: 1, justifyContent: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
