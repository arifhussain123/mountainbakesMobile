import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { useTheme } from '@/common/theme/ThemeProvider';

/**
 * The two modal presentations this app uses, behind one component.
 *
 * ---------------------------------------------------------------------------
 * Two presentations, not one with options
 * ---------------------------------------------------------------------------
 * `full` is a screen that happens to arrive over another — checkout, the
 * expense form, the production review. It owns the whole viewport and brings
 * its own header, because at that size a floating panel is just a screen with
 * wasted edges.
 *
 * `sheet` rises from the bottom over a dimmed backdrop and is for a decision,
 * not a task: it is short, it is about the thing underneath it, and that thing
 * staying visible is the point.
 *
 * Anything that needs a third presentation probably wants `@gorhom/bottom-sheet`
 * (already a dependency, used where a sheet must be draggable) rather than a
 * third branch here.
 *
 * ---------------------------------------------------------------------------
 * onRequestClose is not optional
 * ---------------------------------------------------------------------------
 * It is what Android's back gesture calls. A modal without it traps the user
 * on a phone whose primary way out of anything is Back — so it is a required
 * prop rather than one that can be forgotten, which is the state four
 * hand-rolled `<Modal>` call sites were one edit away from.
 *
 * The backdrop is deliberately **not** tappable-to-dismiss. Every sheet here
 * carries a real decision, and dismissing one by a stray tap beside it is how
 * a half-typed reason is lost.
 */

export interface MBModalProps {
  visible: boolean;
  /** Android Back, and the iOS swipe where the platform offers it. */
  onRequestClose: () => void;
  /** `full` takes the viewport; `sheet` rises over a dimmed backdrop. */
  presentation?: 'full' | 'sheet';
  children: React.ReactNode;
  testID?: string;
}

export function MBModal({
  visible,
  onRequestClose,
  presentation = 'full',
  children,
  testID,
}: MBModalProps): React.ReactElement {
  const theme = useTheme();

  if (presentation === 'full') {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={onRequestClose}
        testID={testID}>
        {children}
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onRequestClose}
      testID={testID}>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radius.lg,
              borderTopRightRadius: theme.radius.lg,
              padding: theme.layout.screenPad,
              gap: theme.space.md,
            },
          ]}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%' },
});
