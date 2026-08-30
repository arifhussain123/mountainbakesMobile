import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { MBButton, MBHeader } from '@/common/ui';
import { space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';

/**
 * The receipt as it will come out of the printer, before it does.
 *
 * ---------------------------------------------------------------------------
 * Why a preview at all, when the paper is a second away
 * ---------------------------------------------------------------------------
 * Because the paper is not free and the mistakes are not visible until it is
 * cut. A wrong tenant name, a customer line that should not be on a walk-in
 * sale, a total the cashier wants to check before handing it over — all of
 * those cost a roll and a re-ring once the receipt exists. It also gives the
 * one thing the screen slip cannot: proof of **where the lines break**, which
 * is the whole reason `receipt.ts` pads columns by hand.
 *
 * ---------------------------------------------------------------------------
 * It shows the printed text, not a second design
 * ---------------------------------------------------------------------------
 * The lines handed in come from `escpos.preview` over the very blocks that are
 * about to be rendered to bytes — same wrapping, same padding, same column
 * count. This component adds no layout of its own beyond drawing them in a
 * monospace face. That is the point: a preview built from its own styling
 * would be a fourth rendering of the sale, and the first one to disagree with
 * the paper would be the one nobody could see was wrong.
 *
 * Transliteration is deliberately visible here too — an Urdu product name
 * shows as `???` in the preview because that is what will print. Showing the
 * real name and printing question marks is the specific failure this screen
 * exists to prevent.
 */

export interface ReceiptPreviewProps {
  /** Lines from `escpos.preview`, each already within `columns`. */
  lines: readonly string[];
  /** The profile's column count. Decides the type size — see [useMonoScale]. */
  columns: number;
  title?: string;
  /** Under the title: which printer and roll this is sized for. */
  subtitle?: string;
  /** Disables both actions and spins the primary one. */
  busy?: boolean;
  printLabel?: string;
  onPrint: () => void;
  onCancel: () => void;
}

/**
 * The largest type at which `columns` characters still fit the width given.
 *
 * ---------------------------------------------------------------------------
 * Measured, not assumed
 * ---------------------------------------------------------------------------
 * IBM Plex Mono advances 600 units per 1000-unit em, so the arithmetic could
 * be a constant `0.6`. It is a measurement instead, because the constant is
 * only true while the font is actually the one drawing: `ReactFontManager`
 * registers `IBMPlexMono` by a string that nothing checks at runtime, and a
 * miss falls through to `Typeface.create`, which hands back a system mono with
 * its own advance and no error. A preview scaled by a ratio the font does not
 * have is a preview that wraps where the paper will not — the exact lie this
 * component exists to prevent.
 *
 * So a single `0` is laid out off-screen at [PROBE] and its width read back.
 * One character, so it can never wrap and the measurement can never be of two
 * lines. Until that lands the scale is `null` and nothing is drawn: half a
 * frame of blank paper beats a frame at the wrong size, which reads as a
 * receipt that is genuinely laid out badly.
 */
const PROBE = 100;
/** Small enough to stay legible on a narrow phone, large enough not to alias. */
const MIN_SIZE = 7;
const MAX_SIZE = 16;

function useMonoScale(columns: number, width: number | null) {
  const [advance, setAdvance] = useState<number | null>(null);

  const onProbe = useCallback((event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.width;
    if (measured > 0) setAdvance(measured / PROBE);
  }, []);

  const fontSize =
    advance && width
      ? Math.max(MIN_SIZE, Math.min(MAX_SIZE, width / (columns * advance)))
      : null;

  return { fontSize, onProbe };
}

export function ReceiptPreview({
  lines,
  columns,
  title = 'Receipt preview',
  subtitle,
  busy = false,
  printLabel = 'Print',
  onPrint,
  onCancel,
}: ReceiptPreviewProps): React.ReactElement {
  const theme = useTheme();
  const [paperWidth, setPaperWidth] = useState<number | null>(null);
  const { fontSize, onProbe } = useMonoScale(columns, paperWidth);

  const onPaperLayout = useCallback((event: LayoutChangeEvent) => {
    setPaperWidth(event.nativeEvent.layout.width);
  }, []);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader title={title} subtitle={subtitle} onBack={onCancel} />

      <ScrollView
        contentContainerStyle={{
          padding: theme.layout.screenPad,
          paddingBottom: theme.space.xxl,
        }}>
        {/*
          A white block whatever the scheme, because that is what the roll is.
          Tinting it to `surface` in dark mode would show black-on-charcoal for
          something that prints black-on-white, and the point of the screen is
          to look like the paper.
        */}
        <View
          style={[styles.paper, { padding: theme.space.md, borderRadius: theme.radius.sm }]}
          onLayout={onPaperLayout}
          testID="receipt-paper">
          {/* The probe. `opacity: 0` rather than unmounted after measuring: the
              paper is re-measured on rotation, and a probe that had gone would
              leave the new width scaled by a stale advance. */}
          <Text
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onLayout={onProbe}
            testID="receipt-mono-probe"
            style={[
              styles.probe,
              { fontFamily: theme.fontFamily.mono, fontSize: PROBE },
            ]}>
            0
          </Text>

          {fontSize === null
            ? null
            : lines.map((line, index) => (
                <Text
                  // Index as key: these are positional lines of one document,
                  // not identified rows, and two identical blank lines are
                  // genuinely interchangeable.
                  key={index}
                  numberOfLines={1}
                  style={[
                    styles.line,
                    {
                      fontFamily: theme.fontFamily.mono,
                      fontSize,
                      lineHeight: Math.round(fontSize * 1.35),
                    },
                  ]}>
                  {/* A blank line still has to occupy one, or the receipt
                      closes up where the paper would have space. */}
                  {line === '' ? ' ' : line}
                </Text>
              ))}
        </View>

        <Text
          style={[theme.type.caption, styles.note, { color: theme.colors.textMuted }]}>
          {columns} characters to the line. Nothing here is on paper yet.
        </Text>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            padding: theme.layout.screenPad,
          },
        ]}>
        <MBButton
          label="Cancel"
          variant="secondary"
          onPress={onCancel}
          disabled={busy}
          style={styles.grow}
          testID="receipt-preview-cancel"
        />
        <MBButton
          label={printLabel}
          onPress={onPrint}
          loading={busy}
          style={styles.grow}
          testID="receipt-preview-print"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  /* The roll is white in both schemes; see the comment at the element. Two
     literals rather than tokens on purpose: this is the paper and the ink, not
     a themed surface, and a `colors.paper` token would invite being used as a
     background somewhere it would then need a dark variant. `theme:check`
     covers `src/common/ui`, which this is deliberately not part of. */
  paper: { backgroundColor: '#FFFFFF' },
  probe: { position: 'absolute', opacity: 0, top: 0, left: 0 },
  line: { color: '#000000' },
  note: { marginTop: space.sm },
  footer: { borderTopWidth: 1, flexDirection: 'row', gap: space.sm },
  grow: { flex: 1 },
});
