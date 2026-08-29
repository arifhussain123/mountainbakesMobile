import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MBOfflineBanner } from '@/common/ui/feedback/MBOfflineBanner';
import { useTheme } from '@/common/theme/ThemeProvider';
import { MBIcon } from './MBIcon';
import { MBPressable } from './MBPressable';
import { MBSearchBar } from './MBSearchBar';
import { MBWave, WAVE_TAIL } from './MBWave';
import { space } from '@/common/theme/spacing';

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
  /**
   * A short line ABOVE the title — v5's "Good Morning" over the branch name.
   *
   * Distinct from `subtitle`, which renders under it. Use for context that
   * introduces the title rather than qualifying it; it is not announced as a
   * heading, so the screen keeps exactly one.
   */
  overline?: string;
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
  /**
   * Corrects the offline strip's sentence for a screen whose writes do **not**
   * queue. Passed straight through to `MBOfflineBanner`, whose `note` prop
   * carries the full reasoning; the short version is that the default promises
   * a sale is saved, and on the production counter it would not be.
   */
  offlineNote?: string;
  /**
   * Which of v4's two header treatments this screen wears.
   *
   * `field` — the default, and what every list and dashboard uses. The header
   * sits on the page colour with **no divider under it**: the cards below are
   * white on cream and already draw their own edges, so a rule between the
   * title and the first card is a second boundary describing the same gap.
   *
   * `brand` — the **purple wave**: two overlapping plum shapes whose mirrored
   * curves cross under the title. See `MBWave`. Two kinds of screen wear it: one
   * that has taken over the device (New Order, a full-screen form, anything
   * reached modally), and a **dashboard**, which v6 puts on the wave with a
   * greeting over the branch name.
   *
   * v5 drew this as a flat brown block and v4 reserved it for the modal case, on
   * the reasoning that the colour signals "back is the only way out". v5 spent
   * that signal deliberately and v6 keeps the spending: the masthead is on every
   * screen in the spec, so the colour no longer means "you are in a modal" and
   * the back arrow, not the header, is what carries that.
   *
   * **`brand` is the default as of v6, and that is the design rather than a
   * convenience.** v6 draws twenty-one screens and every one of them wears the
   * wave — 21 front layers and 21 back layers, counted in the file, with no
   * exceptions for lists, forms, or the two auth screens. v4 made the masthead
   * the exception and v5 made it the common case; v6 finishes the move.
   *
   * `field` therefore no longer means "an ordinary screen". It means a screen
   * deliberately held off the masthead, and there is currently no such screen —
   * the tone is kept because a sheet or an embedded view may yet need it, not
   * because anything uses it today.
   */
  tone?: 'field' | 'brand';
}

export function MBHeader({
  title,
  subtitle,
  overline,
  onBack,
  leading,
  right,
  search,
  dataAsOf,
  offlineNote,
  tone = 'brand',
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

  const brand = tone === 'brand';

  /**
   * The wave is drawn to the header's MEASURED height, not a computed one.
   *
   * The header grows with its content — an overline and a subtitle together add
   * two lines — and a wave sized from `insets.top + headerH` would leave a band
   * of page colour above the curve on exactly the screens that wear it most (a
   * dashboard has both). Measuring is the only way to track that without
   * duplicating the row's layout arithmetic here.
   *
   * The initial value is the no-extras height, so the first paint is already
   * correct on a plain title and `onLayout` only ever corrects it upward. A zero
   * initial would flash a header with no masthead for one frame.
   */
  const [waveH, setWaveH] = useState(
    insets.top + theme.layout.headerH + WAVE_TAIL,
  );
  /* The wave is `secondary`/`secondaryWave`, not `primary`.
     v6 paints a taken-over screen — New Order, Stock Detail, Branch Stock
     History — in the plums and writes on it in white. An ember masthead would be
     a header shouting louder than the button inside it, and `onPrimary` is
     itself the ink, so an ember block with an ink title is a header you cannot
     read. The subtitle takes the block's own muted level rather than the
     field's, which is a lilac and vanishes on plum.

     Both plums are behind the same text, so the muted level is the one checked
     against the LIGHTER of the two — see `heroMutedFg` in `colors.ts`, which is
     lifted off its flattened value for exactly this reason. */
  const fg = brand ? theme.colors.onSecondary : theme.colors.text;
  const glyph = brand ? theme.colors.onSecondary : theme.colors.accent;
  const subFg = brand ? theme.colors.onSecondaryMuted : theme.colors.textMuted;

  return (
    <>
      <View
        onLayout={
          brand
            ? event => setWaveH(event.nativeEvent.layout.height)
            : undefined
        }
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            minHeight: theme.layout.headerH + insets.top,
            /* The wave paints the background in brand tone, so the View itself
               must not — a `secondary` fill behind it would square off the
               curve with the deep plum and erase the whole shape. */
            backgroundColor: brand ? theme.colors.transparent : theme.colors.bg,
            paddingHorizontal: theme.layout.screenPad,
          },
          /* The tail hangs below the row. Adding it to the padding rather than
             to `minHeight` keeps the content box — and so the title's baseline —
             exactly where it sits in `field` tone; growing the height alone
             would re-centre the row half a tail lower. */
          brand ? { paddingBottom: space.md + WAVE_TAIL } : null,
        ]}>
        {brand ? <MBWave height={waveH} /> : null}
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
              <MBIcon name="close" size="header" color={glyph} />
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
                <MBIcon name="back" size="header" color={glyph} />
              </MBPressable>
            ) : (
              leading ?? null
            )}

            <View style={styles.titles}>
              {overline ? (
                /* v5 puts a greeting ABOVE the branch name, so this cannot be
                   `subtitle` — that renders under the title. It is not a second
                   heading either: the screen has exactly one `accessibilityRole
                   ="header"` below, and a reader that announced both would say
                   the branch name twice on every tab root. */
                <Text numberOfLines={1} style={[theme.type.caption, { color: subFg }]}>
                  {overline}
                </Text>
              ) : null}
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                /* A screen title is `h1` on the field and `h2` inside the brown
                   block: the block is a narrower space and already announces
                   itself with colour, so the type does not have to. */
                style={[brand ? theme.type.h2 : theme.type.h1, { color: fg }]}>
                {title}
              </Text>
              {subtitle ? (
                <Text
                  numberOfLines={1}
                  style={[theme.type.caption, { color: subFg }]}>
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
                    <MBIcon name="search" size="header" color={glyph} />
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
      <MBOfflineBanner dataAsOf={dataAsOf} note={offlineNote} />
    </>
  );
}

const styles = StyleSheet.create({
  /**
   * No bottom border in either tone. v6 draws none: on the field the cards below
   * supply the edge, and on the wave the curve is the edge — a rule under it
   * would cut the shape off flat. It was a 1px line under a white header, which
   * is the treatment that made every screen read as a settings page.
   */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingBottom: space.md,
  },
  back: { justifyContent: 'center' },
  titles: { flex: 1, justifyContent: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
