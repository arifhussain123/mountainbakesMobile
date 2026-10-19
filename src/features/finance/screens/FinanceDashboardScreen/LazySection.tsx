import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { LoadingSkeleton } from '@/shared/ui';

/**
 * Mount-on-approach for the long dashboard scroll: charts and tables render
 * only once the user scrolls within a screen of them, then stay mounted.
 *
 * The scroll position goes to subscribers through a ref, not React state, so
 * scrolling never re-renders the screen — only a section crossing the line
 * re-renders, once.
 */
type Listener = (bottom: number) => void;

const LazyContext = createContext<{ subscribe: (l: Listener) => () => void; bottom: () => number } | null>(null);

export function useLazyScroll() {
  const { height } = useWindowDimensions();
  const listeners = useRef(new Set<Listener>());
  const bottom = useRef(height);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement } = e.nativeEvent;
    bottom.current = contentOffset.y + layoutMeasurement.height;
    for (const l of listeners.current) l(bottom.current);
  }, []);
  const value = useRef({
    subscribe: (l: Listener) => {
      listeners.current.add(l);
      return () => listeners.current.delete(l);
    },
    bottom: () => bottom.current,
  }).current;
  return { onScroll, value };
}

export function LazyProvider({ value, children }: { value: NonNullable<React.ContextType<typeof LazyContext>>; children: ReactNode }) {
  return <LazyContext.Provider value={value}>{children}</LazyContext.Provider>;
}

export function LazySection({ placeholderHeight, children }: { placeholderHeight: number; children: ReactNode }) {
  const ctx = useContext(LazyContext);
  const { height } = useWindowDimensions();
  const [shown, setShown] = useState(!ctx);
  const top = useRef<number | null>(null);

  useEffect(() => {
    if (shown || !ctx) return;
    const check = (bottom: number) => {
      if (top.current !== null && top.current <= bottom + height) setShown(true);
    };
    check(ctx.bottom());
    return ctx.subscribe(check);
  }, [ctx, height, shown]);

  if (shown) return <>{children}</>;
  return (
    <View
      onLayout={(e) => {
        top.current = e.nativeEvent.layout.y;
        if (ctx && top.current <= ctx.bottom() + height) setShown(true);
      }}
      style={{ marginBottom: 12 }}>
      <LoadingSkeleton height={placeholderHeight} borderRadius={16} />
    </View>
  );
}
