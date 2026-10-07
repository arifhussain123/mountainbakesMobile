import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { MBButton } from './MBButton';
import { MBIcon } from './MBIcon';
import { useTheme } from '@/common/theme/ThemeProvider';

/**
 * One photo for a form: choose it, see it, change it, remove it.
 *
 * ---------------------------------------------------------------------------
 * It draws; the screen picks
 * ---------------------------------------------------------------------------
 * This component never opens a camera. It reports which source was asked for
 * and the screen runs the picker, for two reasons: the design system stays free
 * of native modules (and so renders in a test with no mock), and what counts as
 * an acceptable photo — size ceiling, compression — is a rule of the form, not
 * of the control.
 *
 * ---------------------------------------------------------------------------
 * The preview is small on purpose
 * ---------------------------------------------------------------------------
 * It is there to answer "is that the right picture, and is it in frame" — not
 * to be inspected. A compact square keeps the field one row tall, so the form
 * below it does not jump when a photo arrives.
 */

export type MBPhotoSource = 'camera' | 'gallery';

export interface MBPhotoPickerProps {
  title: string;
  helperText?: string;
  /** The chosen photo's local URI, or null when none is chosen. */
  photoUri: string | null;
  onPick: (source: MBPhotoSource) => void;
  onRemove: () => void;
  /** True while the picker or its processing is in flight. */
  busy?: boolean;
  /** Shown in the danger tone under the controls. */
  error?: string | null;
  /** A way out of `error`, when there is one — "Open settings". */
  errorActionLabel?: string;
  onErrorAction?: () => void;
  /** Marks the field as required in its title. */
  required?: boolean;
  testID?: string;
}

const PREVIEW_SIZE = 104;

export function MBPhotoPicker({
  title,
  helperText,
  photoUri,
  onPick,
  onRemove,
  busy = false,
  error,
  errorActionLabel,
  onErrorAction,
  required = false,
  testID,
}: MBPhotoPickerProps): React.ReactElement {
  const theme = useTheme();
  const id = (suffix: string) => (testID ? `${testID}-${suffix}` : undefined);

  return (
    <View style={{ gap: theme.space.sm }} testID={testID}>
      <Text style={[theme.type.label, { color: theme.colors.text }]}>
        {title}
        {required ? ' (required)' : ''}
      </Text>

      {photoUri ? (
        <View style={[styles.row, { gap: theme.space.md }]}>
          <Image
            source={{ uri: photoUri }}
            // The file is already downscaled, but the preview is ~100px: decode
            // it at that size rather than holding the whole bitmap for a thumb.
            resizeMethod="resize"
            resizeMode="cover"
            accessibilityRole="image"
            accessibilityLabel={`${title} preview`}
            testID={id('preview')}
            style={[
              styles.preview,
              {
                borderRadius: theme.radius.md,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surfaceSunken,
              },
            ]}
          />
          <View style={[styles.actions, { gap: theme.space.sm }]}>
            <View style={[styles.row, { gap: theme.space.sm }]}>
              <MBButton
                label="Retake"
                size="md"
                variant="secondary"
                disabled={busy}
                icon={<MBIcon name="camera" size="action" color={theme.colors.text} />}
                onPress={() => onPick('camera')}
                testID={id('retake')}
              />
              <MBButton
                label="Replace"
                size="md"
                variant="secondary"
                disabled={busy}
                icon={<MBIcon name="gallery" size="action" color={theme.colors.text} />}
                onPress={() => onPick('gallery')}
                testID={id('replace')}
              />
            </View>
            <View style={styles.row}>
              <MBButton
                label="Remove"
                size="md"
                variant="dangerSoft"
                disabled={busy}
                onPress={onRemove}
                testID={id('remove')}
              />
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.row, { gap: theme.space.sm }]}>
          <MBButton
            label="Camera"
            size="md"
            variant="secondary"
            disabled={busy}
            icon={<MBIcon name="camera" size="action" color={theme.colors.text} />}
            onPress={() => onPick('camera')}
            testID={id('camera')}
          />
          <MBButton
            label="Gallery"
            size="md"
            variant="secondary"
            disabled={busy}
            icon={<MBIcon name="gallery" size="action" color={theme.colors.text} />}
            onPress={() => onPick('gallery')}
            testID={id('gallery')}
          />
          {busy ? <ActivityIndicator size="small" color={theme.colors.accent} /> : null}
        </View>
      )}

      {helperText && !photoUri ? (
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{helperText}</Text>
      ) : null}

      {error ? (
        <View style={{ gap: theme.space.xs }}>
          <Text
            accessibilityRole="alert"
            testID={id('error')}
            style={[theme.type.caption, { color: theme.colors.danger }]}>
            {error}
          </Text>
          {errorActionLabel && onErrorAction ? (
            <View style={styles.row}>
              <MBButton
                label={errorActionLabel}
                size="sm"
                variant="ghost"
                onPress={onErrorAction}
                testID={id('error-action')}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  actions: { flex: 1 },
  preview: { width: PREVIEW_SIZE, height: PREVIEW_SIZE, borderWidth: 1 },
});
