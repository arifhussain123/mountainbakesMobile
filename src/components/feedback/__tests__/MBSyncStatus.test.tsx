import React from 'react';
import { Text, View } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MBSyncStatus } from '../MBSyncStatus';
import { useNetworkStore } from '@/store/networkStore';
import { useSyncStore } from '@/store/syncStore';
import { ThemeProvider } from '@/theme/ThemeProvider';

/**
 * The sync pill, tested against a real navigator tree rather than a bare
 * container.
 *
 * That distinction is the whole point of this file. `renderScreen` wraps a
 * screen in a `NavigationContainer` with **no navigator inside it**, so a
 * `navigate()` to a route that does not exist is silently dropped and every
 * screen test still passes. The pill sits in the header of fourteen screens
 * across every tab, and the one thing it does is open the Sync Center — which
 * lives inside More's stack, not at the top level. A navigate that names the
 * screen alone can only resolve if some *ancestor* navigator has a route by that
 * name, and from the Sales tab none does.
 *
 * So the tree below mirrors the app's shape: tabs, with SyncCenter registered
 * one level down inside More.
 */

const Tab = createBottomTabNavigator();
const MoreStack = createNativeStackNavigator();

function SalesScreen(): React.ReactElement {
  return (
    <View>
      <Text>Sales</Text>
      <MBSyncStatus />
    </View>
  );
}

function MoreIndex(): React.ReactElement {
  return <Text>More index</Text>;
}

function SyncCenter(): React.ReactElement {
  return <Text>Sync Center</Text>;
}

function MoreTab(): React.ReactElement {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreIndex" component={MoreIndex} />
      <MoreStack.Screen name="SyncCenter" component={SyncCenter} />
    </MoreStack.Navigator>
  );
}

/**
 * Callers `await` this even though `render` is synchronous, and that await is
 * load-bearing: the tab navigator mounts its focused screen from an effect, so
 * the pill is not in the tree until the microtask queue drains. Drop the await
 * and every assertion below queries an empty Sales tab.
 */
function renderTabs() {
  return render(
    <ThemeProvider mode="light">
      <NavigationContainer>
        <Tab.Navigator screenOptions={{ headerShown: false }}>
          <Tab.Screen name="Sales" component={SalesScreen} />
          <Tab.Screen name="More" component={MoreTab} />
        </Tab.Navigator>
      </NavigationContainer>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  // Something to say, or the pill renders nothing at all.
  useSyncStore.setState({ phase: 'idle', pending: 2, needsAttention: 0 });
  useNetworkStore.setState({ isOnline: true });
});

describe('MBSyncStatus', () => {
  it('opens the Sync Center from a tab that does not own it', async () => {
    const screen = await renderTabs();

    await fireEvent.press(screen.getByRole('button', { name: /Sync Center/ }));

    expect(screen.queryByText('Sync Center')).not.toBeNull();
  });

  it('says nothing when there is nothing to say', async () => {
    useSyncStore.setState({ phase: 'idle', pending: 0, needsAttention: 0 });
    useNetworkStore.setState({ isOnline: true });

    const screen = await renderTabs();

    // Online, idle and empty: no pill. A permanent "all good" tick is on screen
    // so constantly that its absence stops registering too.
    expect(screen.queryByRole('button', { name: /Sync Center/ })).toBeNull();
  });

  // These two are deliberately separate tests rather than one that mounts,
  // unmounts and remounts. Two navigator trees inside a single test interleave
  // their act() scopes — React reports "overlapping act() calls" — and the
  // second tree's assertion then rests on a tree the first one is still tearing
  // down. Auto-cleanup gives each case its own mount for free.
  it('reports the queue depth while offline', async () => {
    useNetworkStore.setState({ isOnline: false });
    useSyncStore.setState({ phase: 'idle', pending: 3, needsAttention: 0 });

    const screen = await renderTabs();

    expect(screen.queryByText('3 waiting')).not.toBeNull();
  });

  it('puts failures ahead of the queue depth', async () => {
    useNetworkStore.setState({ isOnline: false });
    useSyncStore.setState({ phase: 'idle', pending: 3, needsAttention: 1 });

    const screen = await renderTabs();

    // A parked row needs a person; the queue depth behind it can wait.
    expect(screen.queryByText('1 transaction needs attention')).not.toBeNull();
  });
});

/**
 * The success confirmation.
 *
 * Mounted first and the result delivered afterwards, which is the real
 * sequence: the pill is already in the header when a drain finishes. A result
 * that was already in the store at mount is deliberately NOT announced — coming
 * back to a screen is not a sync event.
 */
describe('MBSyncStatus · synchronized', () => {
  const drained = (synced: number) => ({
    synced,
    failed: 0,
    conflicts: 0,
    remaining: 0,
    stoppedBecause: 'completed' as const,
  });

  it('confirms a drain that actually moved work', async () => {
    useSyncStore.setState({ phase: 'idle', pending: 0, needsAttention: 0, lastResult: null });
    const screen = await renderTabs();

    await act(async () => {
      useSyncStore.setState({ lastResult: drained(5) });
    });

    expect(screen.queryByText('5 transactions synchronized')).not.toBeNull();
  });

  /**
   * Reconnecting and foregrounding both drain, and most drains find an empty
   * queue. A "0 synchronized" on every connectivity blip is the notice staff
   * learn to ignore, which costs the one that mattered.
   */
  it('says nothing about a drain that moved nothing', async () => {
    useSyncStore.setState({ phase: 'idle', pending: 0, needsAttention: 0, lastResult: null });
    const screen = await renderTabs();

    await act(async () => {
      useSyncStore.setState({ lastResult: drained(0) });
    });

    expect(screen.queryByText(/synchronized/)).toBeNull();
    // Nothing to say at all — not an empty pill.
    expect(screen.queryByRole('button', { name: /Sync Center/ })).toBeNull();
  });

  it('never announces the same drain twice', async () => {
    useSyncStore.setState({ phase: 'idle', pending: 0, needsAttention: 0, lastResult: null });
    const result = drained(3);
    const screen = await renderTabs();

    await act(async () => {
      useSyncStore.setState({ lastResult: result });
    });
    expect(screen.queryByText('3 transactions synchronized')).not.toBeNull();

    // The same object again — a re-render, not a new drain.
    await act(async () => {
      useSyncStore.setState({ lastResult: result, pending: 0 });
    });
    expect(screen.queryByText('3 transactions synchronized')).not.toBeNull();
  });

  /**
   * The half of "do not repeatedly show intrusive notifications" that a
   * reference-guard cannot cover: one that never leaves is as much a fixture as
   * one that fires every time, and this pill sits in the header of fourteen
   * screens.
   */
  it('clears itself instead of becoming part of the header', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    try {
      useSyncStore.setState({ phase: 'idle', pending: 0, needsAttention: 0, lastResult: null });
      const screen = await renderTabs();

      await act(async () => {
        useSyncStore.setState({ lastResult: drained(5) });
      });
      expect(screen.queryByText('5 transactions synchronized')).not.toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(4000);
      });

      expect(screen.queryByText('5 transactions synchronized')).toBeNull();
      // Back to silence, not to an empty pill.
      expect(screen.queryByRole('button', { name: /Sync Center/ })).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  /**
   * A parked row needs a person. "5 synchronized" sitting over the top of it
   * reads as all-clear, which is the one thing it must not say.
   */
  it('lets a parked row outrank the confirmation', async () => {
    useSyncStore.setState({ phase: 'idle', pending: 0, needsAttention: 0, lastResult: null });
    const screen = await renderTabs();

    await act(async () => {
      useSyncStore.setState({ needsAttention: 2, lastResult: drained(5) });
    });

    expect(screen.queryByText('2 transactions need attention')).not.toBeNull();
    expect(screen.queryByText('5 transactions synchronized')).toBeNull();
  });
});
