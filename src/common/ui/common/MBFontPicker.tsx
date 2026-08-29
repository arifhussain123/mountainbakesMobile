import React, { useCallback } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { MBPressable } from './MBPressable';
import {
  TYPEFACES,
  TYPEFACE_KEYS,
  type TypefaceKey,
} from '@/common/theme/typography';
import { useTheme } from '@/common/theme/ThemeProvider';
import { space } from '@/common/theme/spacing';

/**
 * The typeface picker — v6's "Feel > typeface", offered in Settings.
 *
 * ---------------------------------------------------------------------------
 * A specimen has to be set in the face it is offering
 * ---------------------------------------------------------------------------
 * This is the one thing that makes the control work, and the one thing easy to
 * get wrong: each row draws its own name **in its own family**, so the choice is
 * made by looking rather than by reading a label. A picker whose three options
 * are all set in the current face is a radio group with three identical-looking
 * answers.
 *
 * That is also why this is a stack of full-width rows rather than three tiles
 * side by side. A specimen needs enough of a line to show a face's character —
 * the width of "Baskerville" at 20pt is roughly a third of a 360dp phone, and
 * three of those abutting is a row of cramped words nobody can compare.
 *
 * ---------------------------------------------------------------------------
 * The note under each name is not filler
 * ---------------------------------------------------------------------------
 * Two of the three faces behave differently from the default in ways a user will
 * otherwise discover as a bug: Space Grotesk has no italic, so the splash
 * tagline sits upright, and neither alternate carries an 800 so headings render
 * a step lighter. `Typeface.note` says so before the choice is made rather than
 * after. See the long note in `theme/typography.ts`.
 *
 * ---------------------------------------------------------------------------
 * The list is the source of truth
 * ---------------------------------------------------------------------------
 * Everything drawn here comes from `TYPEFACES`. Adding a face is an entry there
 * plus the font files and a registration in `MainApplication`; nothing about
 * this component needs to change, and `scripts/check-fonts.sh` is what fails if
 * the three halves disagree.
 */

/** Not a colour token: the absence of one. Keeps the row from shifting. */
const TRANSPARENT = 'transparent';

const RING = 2;

export interface MBFontPickerProps {
  value: TypefaceKey;
  onSelect: (typeface: TypefaceKey) => void;
  testIDPrefix?: string;
}

export function MBFontPicker({
  value,
  onSelect,
  testIDPrefix = 'typeface',
}: MBFontPickerProps): React.ReactElement {
  return (
    <View style={styles.list}>
      {TYPEFACE_KEYS.map(key => (
        <Specimen
          key={key}
          typefaceKey={key}
          selected={key === value}
          onSelect={onSelect}
          testID={`${testIDPrefix}-${key}`}
        />
      ))}
    </View>
  );
}

function Specimen({
  typefaceKey,
  selected,
  onSelect,
  testID,
}: {
  typefaceKey: TypefaceKey;
  selected: boolean;
  onSelect: (typeface: TypefaceKey) => void;
  testID: string;
}): React.ReactElement {
  const theme = useTheme();
  const face = TYPEFACES[typefaceKey];

  const handlePress = useCallback(
    () => onSelect(typefaceKey),
    [onSelect, typefaceKey],
  );

  const row: StyleProp<ViewStyle> = [
    styles.row,
    {
      minHeight: theme.layout.tapMin,
      padding: theme.layout.tilePad,
      borderRadius: theme.radius.md,
      // Transparent rather than absent when unselected, so choosing one does
      // not shift the stack. Same reason the accent swatches carry a ring.
      borderWidth: RING,
      borderColor: selected ? theme.colors.accent : TRANSPARENT,
      backgroundColor: selected ? theme.colors.accentSoft : theme.colors.surfaceSunken,
    },
  ];

  return (
    <MBPressable
      onPress={handlePress}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      /* The specimen is a picture of the face, so its name carries nothing to a
         reader on its own — the note is what says how this choice differs. */
      accessibilityLabel={`${face.label}. ${face.note}`}
      style={row}>
      <Text
        numberOfLines={1}
        style={[
          theme.type.h3,
          // The whole point: this line is set in the face it offers.
          { fontFamily: face.display, color: theme.colors.text },
        ]}>
        {face.label}
      </Text>
      <Text
        numberOfLines={2}
        /* The note stays in the UI face, deliberately. Setting it in the
           specimen too would double the sample and make a two-line paragraph
           the thing being compared instead of the name. */
        style={[theme.type.caption, { color: theme.colors.textMuted }]}>
        {face.note}
      </Text>
    </MBPressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  row: { gap: space.hair },
});
