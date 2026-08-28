import React, { useCallback } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { MBPressable } from './MBPressable';
import { ACCENTS, ACCENT_KEYS, type AccentKey } from '@/common/theme/accents';
import { useTheme } from '@/common/theme/ThemeProvider';

/**
 * The brand-fill swatch row — v4's "Theme colour".
 *
 * ---------------------------------------------------------------------------
 * The circle is the only thing that may carry the raw swatch
 * ---------------------------------------------------------------------------
 * Each circle is painted in the accent's `swatch`, which is v4's own hex, while
 * the fill the app actually uses is the contrast-corrected `primary` beside it
 * (see `theme/accents.ts`). That split is deliberate and it is confined to here:
 * a swatch is a 32px disc with nothing set on it and nothing depending on
 * telling it apart from its neighbours, so 1.4.11 does not apply — and showing a
 * value 6% off the one being offered would make the row disagree with itself.
 * Nowhere else in the app may reach for `swatch`.
 *
 * ---------------------------------------------------------------------------
 * Selection is a ring, not a tick
 * ---------------------------------------------------------------------------
 * v4 marks the chosen swatch with a 2.5px white inner ring and a 2.5px ink outer
 * ring. Both are needed and for different reasons: the white gap is what
 * separates the ring from the disc when the accent is dark, and the ink ring is
 * what makes the mark visible against the card. A tick drawn *on* the disc would
 * have to be legible on all five fills at once, which is the problem `onPrimary`
 * exists to solve per-accent and cannot be solved once for a 12px glyph.
 *
 * The ring is drawn as a border on a wrapper rather than as a shadow, so it is
 * laid out rather than painted over the neighbour — five discs with an overlaid
 * ring end up unevenly spaced the moment one is selected.
 */

/** Not a colour token: the absence of one. See the ring note above. */
const TRANSPARENT = 'transparent';

const SWATCH = 32;
const RING = 2.5;
/** The disc, its white gap and its outer ring — the wrapper's full width. */
const OUTER = SWATCH + RING * 4;

export interface MBAccentPickerProps {
  value: AccentKey;
  onSelect: (accent: AccentKey) => void;
  testIDPrefix?: string;
}

export function MBAccentPicker({
  value,
  onSelect,
  testIDPrefix = 'accent',
}: MBAccentPickerProps): React.ReactElement {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {ACCENT_KEYS.map(key => (
        <Swatch
          key={key}
          accentKey={key}
          selected={key === value}
          onSelect={onSelect}
          testID={`${testIDPrefix}-${key}`}
        />
      ))}
      <View style={styles.spacer} />
      <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
        {ACCENTS[value].label}
      </Text>
    </View>
  );
}

function Swatch({
  accentKey,
  selected,
  onSelect,
  testID,
}: {
  accentKey: AccentKey;
  selected: boolean;
  onSelect: (accent: AccentKey) => void;
  testID: string;
}): React.ReactElement {
  const theme = useTheme();
  const accent = ACCENTS[accentKey];

  const handlePress = useCallback(() => onSelect(accentKey), [onSelect, accentKey]);

  const target: StyleProp<ViewStyle> = [
    styles.target,
    {
      borderRadius: OUTER / 2,
      // Transparent rather than absent when unselected, so choosing one does not
      // shift the row. Same reason the drawer's rows carry a 3px transparent
      // left border.
      borderWidth: RING,
      borderColor: selected ? theme.colors.accent : TRANSPARENT,
      // The white gap between the ring and the disc.
      backgroundColor: selected ? theme.colors.surface : TRANSPARENT,
    },
  ];

  const disc: StyleProp<ViewStyle> = [
    styles.swatch,
    {
      backgroundColor: accent.swatch,
      /*
       * A hairline on the disc itself, for the one swatch that would otherwise
       * have no edge: Ink on a dark card is 1.10:1. Drawn on every disc rather
       * than only that one, because a border that appears for a single option is
       * a difference the user has to account for.
       */
      borderColor: theme.colors.border,
    },
  ];

  return (
    <MBPressable
      onPress={handlePress}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      // The colour is the entire content, so the name is the only thing a
      // screen reader has to go on — "swatch 3" would be useless.
      accessibilityLabel={`${accent.label} theme colour`}
      style={target}
    >
      <View style={disc} />
    </MBPressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  spacer: { flex: 1 },
  target: {
    width: OUTER,
    height: OUTER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
