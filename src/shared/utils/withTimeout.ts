/**
 * Races a promise against a timeout so a hung network/local call can never
 * block app startup forever — the exact failure mode that left the launch
 * screen up with nothing on screen to explain why (see the bootsplash-hang
 * investigation). Rejects with an `Error` named `TimeoutError` on expiry so
 * callers can tell "the call failed" from "the call never answered".
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(Object.assign(new Error(`${label} timed out after ${ms}ms`), { name: 'TimeoutError' }));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
