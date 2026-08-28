import React from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { useMutation } from '@tanstack/react-query';

import { renderScreen } from '@/common/test-utils/render';

/**
 * The screen-test harness leaves nothing pending.
 *
 * This exists because it did not. `renderScreen` set `gcTime: 0` on queries and
 * not on mutations, and query-core defaults an unset mutation `gcTime` to **five
 * minutes** — `scheduleGc()` is `setTimeout(remove, gcTime)`, so every screen
 * test that ran a mutation to completion left a five-minute timer alive in the
 * Jest worker. The whole suite passed and then printed
 *
 *   A worker process has failed to exit gracefully
 *
 * which is the kind of standing noise a real leak hides inside.
 *
 * The assertion is on the cache rather than on the config value on purpose: it
 * fails if the option is dropped, and it also fails if a future version changes
 * what `gcTime: 0` means. `--forceExit` would have silenced the warning while
 * leaving the handle, and nothing here would have noticed.
 */

function Mutator(): React.ReactElement {
  const mutation = useMutation({ mutationFn: async () => 'ok' });
  return (
    <Pressable testID="go" onPress={() => mutation.mutate()}>
      <Text>{mutation.isSuccess ? 'done' : 'idle'}</Text>
    </Pressable>
  );
}

/** One macrotask — long enough for a zero-delay timer, not for a real one. */
const nextTick = () => new Promise<void>(resolve => setTimeout(() => resolve(), 0));

it('drops a settled mutation from the cache instead of holding it for five minutes', async () => {
  const screen = await renderScreen(<Mutator />);

  await fireEvent.press(screen.getByTestId('go'));
  await waitFor(() => expect(screen.getByText('done')).toBeTruthy());

  await screen.unmount();
  await nextTick();

  // With the library's default gcTime this is still 1, and the timer holding it
  // is what stops the Jest worker exiting.
  expect(screen.queryClient.getMutationCache().getAll()).toHaveLength(0);
});
