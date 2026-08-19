/* eslint-env jest */
/**
 * Jest setup — test-runtime behaviour (runs after the test framework is installed).
 *
 * `jest.setup.js` is the other half of this pair and stays limited to native
 * module mocks, which must be registered before the framework loads. Anything
 * that needs `expect`, the fake-timer API, or a React act environment belongs
 * here instead.
 *
 * React Query schedules every store notification through `setTimeout(..., 0)`
 * (`systemSetTimeoutZero`, the default scheduler in query-core's notifyManager).
 * Under Jest that has two costs, both of which showed up in the suite:
 *
 *   1. A query that settles during a test flushes its subscribers on a *later*
 *      tick, outside whatever `act()` scope the test was in. React then logs
 *      "An update to <Screen> inside a test was not wrapped in act(...)" — a
 *      warning about the harness, not the component, which is exactly the kind
 *      of standing noise a real regression hides inside.
 *   2. The pending timer outlives the test file, so Jest reports "A worker
 *      process has failed to exit gracefully".
 *
 * Swapping the macrotask hop for a microtask fixes both. A microtask drains
 * before the `await` that a test is already sitting in resumes, so the
 * notification lands inside the `act()`/`waitFor()` scope that caused it, and
 * the queue is empty by teardown — nothing left for Jest to complain about.
 *
 * Deferral itself is kept deliberately. Calling the callback inline instead
 * (`setScheduler(cb => cb())`) also silences the warnings, but it drops the
 * hop React Query relies on to coalesce a settling query into one render pass:
 * the screen suites slowed by roughly 10x and one ExpensesScreen case stopped
 * finishing inside its 5s budget. Defer, just not as far.
 *
 * This is test-only. The app keeps the default `setTimeout` scheduler.
 */

const { notifyManager } = require('@tanstack/react-query');

notifyManager.setScheduler(callback => queueMicrotask(callback));
