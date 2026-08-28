import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';

import { useNetworkStore } from '@/state/networkStore';
import { useTheme } from '@/common/theme/ThemeProvider';
import { MBIcon } from './MBIcon';
import { MBPressable } from './MBPressable';

/**
 * The three-line button that opens the account panel, for `MBHeader`'s
 * `leading` slot.
 *
 * The panel holds identity, connection, appearance and sign-out. Before this,
 * the only way to sign out was a button on `PlaceholderScreen` — so it worked
 * only for roles that happened to have an unbuilt tab, and would have vanished
 * as screens landed. This is the deliberate entry point.
 *
 * It sits on every tab root rather than on More alone. A panel reachable from
 * one tab is a panel most people never find, and "where do I sign out" is not a
 * question worth a tab change; the drawer is global, so the button may as well
 * be.
 *
 * Drawn at `header` size in `accent`, exactly like the back arrow it stands in
 * for — the two share the top-left corner and never appear together
 * (`MBHeader` drops `leading` whenever `onBack` is set), so a corner that
 * changed weight or colour between them would read as two different controls.
 *
 * The connection dot rides on the glyph rather than getting its own header slot
 * so that offline state is visible from the tab root without spending one of the
 * two trailing action slots on it. The full explanation is one tap away, inside
 * the panel; the persistent banner below the header is what actually explains
 * offline mode.
 */
export interface MBAccountButtonProps {
  /**
   * Which header this sits in, because the glyph has to survive the background.
   *
   * The default paints the menu in `accent` — the deep ink — which is correct on
   * the cream field and **invisible** on a `brand` header, where the bar is that
   * same ink. On brown the glyph takes `onSecondary`, and the status dot's ring
   * takes the bar colour rather than `surface` so the dot still reads as
   * attached to the icon rather than punched out of a white card that is not
   * there.
   */
  tone?: 'field' | 'brand';
}

export function MBAccountButton({ tone = 'field' }: MBAccountButtonProps = {}): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation();
  const isOnline = useNetworkStore(s => s.isOnline);

  const open = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);

  return (
    <MBPressable
      onPress={open}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={`Account and settings. ${isOnline ? 'Online' : 'Offline'}.`}
      style={[styles.wrap, { minWidth: theme.layout.tapMin, minHeight: theme.layout.tapMin }]}>
      {/* The dot is positioned against the glyph, not the tap target: the tap
          target is `tapMin` square and padded well beyond the 24pt icon, so a
          dot anchored to its corner would float away from the thing it marks. */}
      <View style={styles.glyph}>
        <MBIcon
          name="menu"
          size="header"
          color={tone === 'brand' ? theme.colors.onSecondary : theme.colors.accent}
        />
        <View
          style={[
            styles.dot,
            {
              backgroundColor: isOnline ? theme.colors.success : theme.colors.offline,
              borderColor: tone === 'brand' ? theme.colors.secondary : theme.colors.surface,
              borderRadius: theme.radius.pill,
            },
          ]}
        />
      </View>
    </MBPressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glyph: { alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    width: 10,
    height: 10,
    borderWidth: 2,
  },
});
