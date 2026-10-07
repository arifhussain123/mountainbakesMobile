import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { MBIcon } from './MBIcon';
import { MBPressable } from './MBPressable';
import { forgetAttachmentUri, stableAttachmentUri } from './attachmentUriCache';
import { useTheme } from '@/common/theme/ThemeProvider';

/**
 * A photo attachment in a list row.
 *
 * ---------------------------------------------------------------------------
 * Keyed on the attachment, not on its URL
 * ---------------------------------------------------------------------------
 * `url` is re-signed on every fetch, so it changes on every pull-to-refresh
 * while the picture does not. The source handed to `<Image>` comes from
 * `stableAttachmentUri(id, url)`, which keeps the first URL it saw for an id —
 * a refetch therefore re-renders this component with an identical source and
 * the image neither reloads nor flickers.
 *
 * ---------------------------------------------------------------------------
 * Three states, three pictures
 * ---------------------------------------------------------------------------
 * A placeholder glyph while it loads, the photo once it has, and a broken-image
 * glyph when it cannot. A failed load is retried once with the newest URL
 * before giving up: the usual cause is a kept URL that expired, and the row
 * already holds a fresh one.
 *
 * `resizeMethod="resize"` decodes at the size drawn. Without it a list of
 * 1280px photos holds every one of them at full size to paint 56px squares.
 */

export interface MBAttachmentThumbProps {
  /** The attachment's id — the cache key. */
  id: string;
  /** Its signed URL as the latest fetch returned it. */
  url: string;
  /** Edge length in px. Defaults to 56. */
  size?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export const MBAttachmentThumb = React.memo(function MBAttachmentThumbView({
  id,
  url,
  size = 56,
  onPress,
  accessibilityLabel = 'Photo',
  testID,
}: MBAttachmentThumbProps): React.ReactElement {
  const theme = useTheme();
  const [uri, setUri] = useState(() => stableAttachmentUri(id, url));
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // A recycled row (FlashList reuses cells) now describes another photo.
  useEffect(() => {
    setUri(stableAttachmentUri(id, url));
    setLoaded(false);
    setFailed(false);
    // `url` is left out on purpose: it changes on every refetch and must not
    // reset a thumbnail that is already showing the right picture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onError = useCallback(() => {
    forgetAttachmentUri(id);
    const fresh = stableAttachmentUri(id, url);
    if (fresh !== uri) {
      setUri(fresh);
      return;
    }
    setFailed(true);
  }, [id, url, uri]);

  const onLoad = useCallback(() => setLoaded(true), []);

  const frame = [
    styles.frame,
    {
      width: size,
      height: size,
      borderRadius: theme.radius.sm,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSunken,
    },
  ];

  const content = (
    <>
      {!loaded || failed ? (
        <MBIcon
          name={failed ? 'imageBroken' : 'image'}
          size="action"
          color={theme.colors.textMuted}
        />
      ) : null}
      {failed ? null : (
        <Image
          source={{ uri }}
          resizeMethod="resize"
          resizeMode="cover"
          onLoad={onLoad}
          onError={onError}
          style={StyleSheet.absoluteFill}
          testID={testID ? `${testID}-image` : undefined}
        />
      )}
    </>
  );

  if (!onPress) {
    return (
      <View
        style={frame}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <MBPressable
      onPress={onPress}
      accessibilityRole="imagebutton"
      accessibilityLabel={accessibilityLabel}
      hitSlop={theme.space.xs}
      style={frame}
      testID={testID}>
      {content}
    </MBPressable>
  );
});

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1 },
});
