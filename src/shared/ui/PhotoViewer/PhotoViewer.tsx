import { useState } from 'react';
import { Dimensions, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '../Icon';

export interface PhotoViewerProps {
  visible: boolean;
  uri: string | null;
  accessibilityLabel?: string;
  onClose: () => void;
  /** Called when the image fails to load — e.g. a signed URL that expired (1-hour TTL) — so the caller can refetch and hand back a fresh `uri`. */
  onImageError?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_SCALE = 4;
const CLOSE_PAN_THRESHOLD = 120;

/**
 * Full-screen photo viewer — pinch to zoom, double-tap to zoom, swipe down to
 * close (only while not zoomed in, so a pan to inspect a zoomed photo never
 * accidentally dismisses it). Reusable from any feature with a photo to show
 * full-screen (Cash Transfers, Returns, ...).
 */
export function PhotoViewer({ visible, uri, accessibilityLabel, onClose, onImageError }: PhotoViewerProps) {
  const theme = useAppTheme();
  const [failed, setFailed] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetTransform = () => {
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const handleClose = () => {
    resetTransform();
    onClose();
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(MAX_SCALE, Math.max(1, savedScale.value * event.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      } else {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (scale.value > 1) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
        return;
      }
      if (event.translationY > CLOSE_PAN_THRESHOLD) {
        runOnJS(handleClose)();
        return;
      }
      translateY.value = withTiming(0);
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const next = scale.value > 1 ? 1 : 2.5;
      scale.value = withTiming(next);
      savedScale.value = next;
      if (next === 1) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  const handleShare = async () => {
    if (!uri) return;
    try {
      await Share.share({ url: uri, message: uri });
    } catch {
      // The user dismissed the share sheet — nothing to do.
    }
  };

  const handleError = () => {
    setFailed(true);
    onImageError?.();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.92)' }]}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.topBar}>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={handleClose} style={styles.topBarButton}>
                <Icon name="close" size={20} color="#FFFFFF" />
              </Pressable>
              {uri && !failed ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Share photo" onPress={() => void handleShare()} style={styles.topBarButton}>
                  <Icon name="arrow-up-right" size={18} color="#FFFFFF" />
                </Pressable>
              ) : null}
            </View>

            {!uri || failed ? (
              <View style={styles.placeholder}>
                <Icon name="image" size={32} color={theme.colors.textFaint} />
                <Text style={[theme.typography.bodySmall, { color: '#FFFFFF', marginTop: 10 }]}>
                  {failed ? 'This photo could not be loaded. Pull to refresh and try again.' : 'No photo for this transfer.'}
                </Text>
              </View>
            ) : (
              <GestureDetector gesture={composedGesture}>
                <Animated.Image
                  source={{ uri }}
                  accessibilityLabel={accessibilityLabel}
                  resizeMode="contain"
                  onError={handleError}
                  style={[styles.image, animatedStyle]}
                />
              </GestureDetector>
            )}
          </SafeAreaView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  topBarButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  image: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8, alignSelf: 'center' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
});
