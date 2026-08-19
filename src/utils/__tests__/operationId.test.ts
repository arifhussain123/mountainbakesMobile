import { isOperationId, newOperationId, uuidVersion } from '../operationId';

describe('newOperationId', () => {
  it('mints a well-formed UUID', () => {
    expect(isOperationId(newOperationId())).toBe(true);
  });

  it('mints version 7, not 4 — the queue relies on time ordering', () => {
    expect(uuidVersion(newOperationId())).toBe(7);
  });

  it('never collides across a burst of creations', () => {
    const ids = Array.from({ length: 2000 }, newOperationId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sorts lexicographically in creation order', () => {
    // UUIDv7 is time-ordered, which is what lets the sync queue drain in the
    // order transactions were rung up using a plain ORDER BY.
    const ids: string[] = [];
    for (let i = 0; i < 50; i++) ids.push(newOperationId());
    expect(ids.slice().sort()).toEqual(ids);
  });
});

describe('isOperationId', () => {
  it('rejects malformed values', () => {
    expect(isOperationId('')).toBe(false);
    expect(isOperationId('not-a-uuid')).toBe(false);
    expect(isOperationId(undefined)).toBe(false);
    expect(isOperationId(123)).toBe(false);
    // Wrong variant nibble.
    expect(isOperationId('01a0116b-61c6-71ee-0038-5ce7ed3fd39a')).toBe(false);
  });
});
