import { createContext, forwardRef, useContext, useMemo, useRef, type ReactNode } from 'react';
import { Pressable, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, type BottomSheetModalProps, type BottomSheetScrollViewMethods } from '@gorhom/bottom-sheet';
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
  /**
   * Called once the reader has seen the end of the content — on scrolling to
   * it, or straight away when the content fits without scrolling. Used by the
   * approval sheets to unlock Approve only after the detail was read.
   */
  onScrollEnd?: () => void;
}

export interface FormBottomSheetScroll {
  /** Scrolls the sheet's content to `y` (content coordinates — the top of the sheet's children is 0). */
  scrollTo: (y: number) => void;
}

const FormBottomSheetScrollContext = createContext<FormBottomSheetScroll | null>(null);

/** For sheet content that must bring a part of itself into view (Return Items' "first line missing a photo"). Null outside a `FormBottomSheet`. */
export function useFormBottomSheetScroll(): FormBottomSheetScroll | null {
  return useContext(FormBottomSheetScrollContext);
}

/** How close to the bottom counts as "reached the end". */
const END_SLOP = 24;

/**
 * Shared chrome for every form the design spec presents as a bottom sheet
 * rather than a pushed screen (branchApp.md screens 05/06/07/08/12/17/22/25).
 * The parent list screen owns a `BottomSheetModal` ref (`useRef<BottomSheetModal>`)
 * and calls `.present()` / `.dismiss()` on it — these forms take an `onClose`
 * prop instead of route params, since they are no longer pushed stack screens.
 */
export const FormBottomSheet = forwardRef<BottomSheetModal, FormBottomSheetProps>(
  ({ title, subtitle, children, onDismiss, onRequestClose, snapPoints = ['92%'], onScrollEnd }, ref) => {
    const theme = useAppTheme();
    const viewport = useRef(0);
    const content = useRef(0);
    const scrollRef = useRef<BottomSheetScrollViewMethods>(null);
    const scroll = useMemo<FormBottomSheetScroll>(
      () => ({ scrollTo: (y) => scrollRef.current?.scrollTo({ x: 0, y: Math.max(0, y), animated: true }) }),
      [],
    );
    const checkFits = () => {
      if (onScrollEnd && viewport.current > 0 && content.current > 0 && content.current <= viewport.current + END_SLOP) onScrollEnd();
    };
    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      if (onScrollEnd && layoutMeasurement.height + contentOffset.y >= contentSize.height - END_SLOP) onScrollEnd();
    };

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
        <BottomSheetScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 0 }}
          keyboardShouldPersistTaps="handled"
          onScroll={onScrollEnd ? onScroll : undefined}
          onLayout={(e) => {
            viewport.current = e.nativeEvent.layout.height;
            checkFits();
          }}
          onContentSizeChange={(_, h) => {
            content.current = h;
            checkFits();
          }}>
          <FormBottomSheetScrollContext.Provider value={scroll}>{children}</FormBottomSheetScrollContext.Provider>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
