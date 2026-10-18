/**
 * @format
 */
import { withTimeout } from '@/shared/utils/withTimeout';

describe('withTimeout', () => {
  it('resolves with the original value when the promise settles before the deadline', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000, 'test')).resolves.toBe('ok');
  });

  it('rejects with the original error when the promise rejects before the deadline', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 1000, 'test')).rejects.toThrow('boom');
  });

  it('rejects with a TimeoutError when the deadline passes first', async () => {
    jest.useFakeTimers();
    const neverSettles = new Promise(() => {});
    const result = withTimeout(neverSettles, 50, 'slowThing');
    jest.advanceTimersByTime(50);
    await expect(result).rejects.toMatchObject({ name: 'TimeoutError', message: 'slowThing timed out after 50ms' });
    jest.useRealTimers();
  });
});
