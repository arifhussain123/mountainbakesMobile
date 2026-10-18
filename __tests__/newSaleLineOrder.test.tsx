/**
 * @format
 *
 * The web's sale form adds a new item line at the TOP (`6eb6ab2`, `prepend`);
 * the mobile form now does the same, under the Add Item button in the header.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@/api', () => ({
  generateIdempotencyKey: () => 'sale-key',
  useCreatePosSale: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useProducts: () => ({ data: { products: [] } }),
  useStock: () => ({ data: { stock: [] } }),
}));
jest.mock('@/state', () => ({
  useAuthStore: (select: (s: { user: { branchId: string } }) => unknown) => select({ user: { branchId: 'b1' } }),
}));

import { useNewSaleForm } from '@/features/sales/hooks/useNewSaleForm';

describe('useNewSaleForm — Add Item', () => {
  it('puts each new line first, keeping the earlier ones in order below it', () => {
    const ref: { current: ReturnType<typeof useNewSaleForm> | null } = { current: null };
    function Harness() {
      ref.current = useNewSaleForm();
      return null;
    }
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<Harness />);
    });

    const first = ref.current!.lines.map((l) => l.key);
    expect(first).toHaveLength(1);

    ReactTestRenderer.act(() => ref.current!.addLine());
    const second = ref.current!.lines.map((l) => l.key);
    expect(second).toHaveLength(2);
    expect(second[1]).toBe(first[0]);

    ReactTestRenderer.act(() => ref.current!.addLine());
    const third = ref.current!.lines.map((l) => l.key);
    expect(third.slice(1)).toEqual(second);
    expect(new Set(third).size).toBe(3);

    // Removing still works on any line, and the last line is never removed.
    ReactTestRenderer.act(() => ref.current!.removeLine(third[0]!));
    expect(ref.current!.lines.map((l) => l.key)).toEqual(second);
    ReactTestRenderer.act(() => ref.current!.removeLine(second[0]!));
    ReactTestRenderer.act(() => ref.current!.removeLine(first[0]!));
    expect(ref.current!.lines.map((l) => l.key)).toEqual(first);

    ReactTestRenderer.act(() => renderer.unmount());
  });
});
