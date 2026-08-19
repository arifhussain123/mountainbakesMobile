import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';

import { useNetworkStore } from '@/store/networkStore';
import { useTheme } from '@/theme/ThemeProvider';
import { MBIcon } from './MBIcon';
import { MBPressable } from './MBPressable';

/**
 * The avatar that opens the account panel, for `MBHeader`'s `leading` slot.
 *
 * The panel holds identity, connection, appearance and sign-out. Before this,
 * the only way to sign out was a button on `PlaceholderScreen` — so it worked
 * only for roles that happened to have an unbuilt tab, and would have vanished
 * as screens landed. This is the deliberate entry point.
 *
 * The connection dot rides on the avatar rather than getting its own header slot
 * so that offline state is visible from the tab root without spending one of the
 * two trailing action slots on it. The full explanation is one tap away, inside
 * the panel; the persistent banner below the header is what actually explains
 * offline mode.
 */
export function MBAccountButton(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation();
  const isOnline = useNetworkStore(s => s.isOnline);

  const open = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);

  return (
    <MBPressable
      onPress={open}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Account and settings. ${isOnline ? 'Online' : 'Offline'}.`}
      style={[styles.wrap, { minWidth: theme.layout.tapMin, minHeight: theme.layout.tapMin }]}>
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radius.pill,
          },
        ]}>
        <MBIcon name="profile" size="action" color={theme.colors.onPrimary} />
      </View>
      <View
        style={[
          styles.dot,
          {
            backgroundColor: isOnline ? theme.colors.success : theme.colors.offline,
            borderColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
          },
        ]}
      />
    </MBPressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 10,
    height: 10,
    borderWidth: 2,
  },
});
