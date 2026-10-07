import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MBIcon } from '../common/MBIcon';
import { MBPressable } from '../common/MBPressable';
import { useTheme } from '@/common/theme/ThemeProvider';

/**
 * One photo, full screen, with what it is a photo OF.
 *
 * A thumbnail answers "is there a picture"; this answers "what does it show".
 * The caption lines travel with it because the picture alone is not evidence —
 * a tray of pastries is only proof of a return once it sits beside which
 * return, which branch and which day.
 *
 * Drawn on the `secondary` block with the `onSecondary` family, the one pairing
 * that is the same deep plum in both schemes, so a photo is viewed on a dark
 * ground whichever theme the app is in. No accent fill appears here: the theme
 * rules do not hold `primary` to any contrast bar on this surface.
 *
 * No zoom and no swipe-to-dismiss. Both are gesture work that would need its
 * own reduced-motion story; Close and the hardware back button are enough for a
 * photo whose longest edge is 1280px.
 */

export interface MBImageViewerProps {
  visible: boolean;
  /** Null renders nothing — the viewer can stay mounted with no photo chosen. */
  uri: string | null;
  onClose: () => void;
  title?: string;
  /** Shown under the image, one line each. Empty and blank lines are skipped. */
  captions?: readonly (string | null | undefined)[];
  testID?: string;
}

export function MBImageViewer({
  visible,
  uri,
  onClose,
  title,
  captions = [],
  testID,
}: MBImageViewerProps): React.ReactElement | null {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
  }, [uri, visible]);

  if (!uri) return null;

  const lines = captions.filter((line): line is string => !!line && line.trim().length > 0);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      testID={testID}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: theme.colors.secondary,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}>
        <View style={[styles.bar, { paddingHorizontal: theme.layout.screenPad }]}>
          <Text
            numberOfLines={1}
            style={[theme.type.bodyStrong, styles.fill, { color: theme.colors.onSecondary }]}>
            {title ?? ''}
          </Text>
          <MBPressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
            hitSlop={theme.space.md}
            style={[styles.close, { gap: theme.space.tight, minHeight: theme.layout.tapMin }]}
            testID={testID ? `${testID}-close` : undefined}>
            <MBIcon name="close" size="action" color={theme.colors.onSecondary} />
            <Text style={[theme.type.label, { color: theme.colors.onSecondary }]}>Close</Text>
          </MBPressable>
        </View>

        <View style={[styles.fill, styles.stage]}>
          {failed ? (
            <View style={[styles.stage, { gap: theme.space.sm }]}>
              <MBIcon name="imageBroken" size="header" color={theme.colors.onSecondaryMuted} />
              <Text style={[theme.type.body, { color: theme.colors.onSecondaryMuted }]}>
                This photo could not be loaded.
              </Text>
            </View>
          ) : (
            <>
              <Image
                source={{ uri }}
                resizeMode="contain"
                // Decode to the screen, not to the file: the stored frame can
                // be wider than the phone it is being viewed on.
                resizeMethod="resize"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setFailed(true);
                }}
                accessibilityRole="image"
                accessibilityLabel={title ? `Photo, ${title}` : 'Photo'}
                style={StyleSheet.absoluteFill}
                testID={testID ? `${testID}-image` : undefined}
              />
              {loading ? (
                <ActivityIndicator size="large" color={theme.colors.onSecondary} />
              ) : null}
            </>
          )}
        </View>

        {lines.length > 0 ? (
          <View
            style={{
              paddingHorizontal: theme.layout.screenPad,
              paddingVertical: theme.space.md,
              gap: theme.space.hair,
            }}>
            {lines.map((line, index) => (
              <Text
                // Caption lines are positional and never reorder within one
                // open viewer; two can legitimately read the same.
                key={`${index}-${line}`}
                style={[
                  index === 0 ? theme.type.bodyStrong : theme.type.caption,
                  { color: index === 0 ? theme.colors.onSecondary : theme.colors.onSecondaryMuted },
                ]}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center' },
  close: { flexDirection: 'row', alignItems: 'center' },
  stage: { alignItems: 'center', justifyContent: 'center' },
});
