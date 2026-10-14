import { forwardRef, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, type BottomSheetModalProps } from '@gorhom/bottom-sheet';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '../Icon';

export interface FormBottomSheetProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Called when the sheet is dismissed by any means (swipe-down, backdrop tap, or the close button). */
  onDismiss?: () => void;
  /** Also wired to the header's close button, since that press should behave exactly like swipe-to-dismiss. */
  onRequestClose: () => void;
  snapPoints?: BottomSheetModalProps['snapPoints'];
}

/**
 * Shared chrome for every form the design spec presents as a bottom sheet
 * rather than a pushed screen (branchApp.md screens 05/06/07/08/12/17/22/25).
 * The parent list screen owns a `BottomSheetModal` ref (`useRef<BottomSheetModal>`)
 * and calls `.present()` / `.dismiss()` on it — these forms take an `onClose`
 * prop instead of route params, since they are no longer pushed stack screens.
 */
export const FormBottomSheet = forwardRef<BottomSheetModal, FormBottomSheetProps>(
  ({ title, subtitle, children, onDismiss, onRequestClose, snapPoints = ['92%'] }, ref) => {
    const theme = useAppTheme();

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        index={0}
        onDismiss={onDismiss}
        enableDynamicSizing={false}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={{ backgroundColor: theme.colors.background }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.sm,
          }}>
          <View style={{ flex: 1 }}>
            <Text style={[theme.typography.screenTitle, { color: theme.colors.text }]}>{title}</Text>
            {subtitle ? (
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>{subtitle}</Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onRequestClose}
            style={{
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.border,
            }}>
            <Icon name="close" size={16} color={theme.colors.text} />
          </Pressable>
        </View>
        <BottomSheetScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 0 }} keyboardShouldPersistTaps="handled">
          {children}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
