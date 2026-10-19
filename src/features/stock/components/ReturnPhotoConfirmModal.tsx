import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/shared/theme';
import { PrimaryButton, SecondaryButton } from '@/shared/ui';

export interface ReturnPhotoConfirmModalProps {
  /** The just-taken photo, or null when nothing is waiting for confirmation. */
  uri: string | null;
  productName: string;
  onUse: () => void;
  onRetake: () => void;
  onCancel: () => void;
}

/** The quick check after the camera or gallery: is this the right photo for this product? Nothing is attached or uploaded until "Use photo". */
export function ReturnPhotoConfirmModal({ uri, productName, onUse, onRetake, onCancel }: ReturnPhotoConfirmModalProps) {
  const theme = useAppTheme();

  return (
    <Modal visible={uri !== null} animationType="fade" onRequestClose={onCancel}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <Text style={[theme.typography.sectionTitle, styles.title, { color: theme.colors.text }]} accessibilityRole="header">
          Photo of returned {productName}
        </Text>
        <View style={styles.imageWrap}>
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.image}
              resizeMode="contain"
              accessibilityLabel={`New photo of returned ${productName}`}
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>
        <View style={[styles.actions, { padding: theme.spacing.lg }]}>
          <View style={styles.flex1}>
            <SecondaryButton label="Retake" onPress={onRetake} />
          </View>
          <View style={styles.flex1}>
            <PrimaryButton label="Use photo" onPress={onUse} />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { textAlign: 'center', paddingHorizontal: 16, paddingTop: 12 },
  imageWrap: { flex: 1, marginVertical: 12 },
  image: { width: '100%', height: '100%' },
  actions: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
});
