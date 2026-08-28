import React from 'react';
import { ILLUSTRATIONS, MBIllustration, type IllustrationKey } from '@/assets/illustrations';
import { ProductPlaceholder } from '@/assets/images';
import { renderScreen } from '@/common/test-utils/render';

/**
 * These drawings are hand-written SVG path data, which typechecks whatever it
 * says — a malformed `d` attribute is a string like any other. Rendering each one
 * in both schemes is the only thing that catches a bad path, a token that does
 * not exist on the theme, or a key added to the registry without a drawing
 * behind it.
 */

const KEYS = Object.keys(ILLUSTRATIONS) as IllustrationKey[];

const placeholderId = 'product-placeholder';
const illustrationId = (key: IllustrationKey) => `illustration-${key}`;

/**
 * The drawing's own SVG node.
 *
 * Three things about this helper are load-bearing, and each one was a failing
 * test first:
 *
 *  - `renderScreen` is **awaited**. `render` is async in
 *    @testing-library/react-native v14, and without the await the tree is empty
 *    and every assertion below passes for the wrong reason. `unmount` is async
 *    for the same reason and must be awaited too: un-awaited, it tears its tree
 *    down partway through the *next* render, and every case after the first
 *    finds nothing.
 *  - The node is found **by testID**, not by type or from `toJSON()`. v14 has no
 *    `UNSAFE_getByType`, and `toJSON()` returns the provider wrapper
 *    `renderScreen` mounts around the drawing rather than the drawing itself.
 *  - `includeHiddenElements` is **required**, and its being required is the
 *    proof that the decorative accessibility treatment works: these set
 *    `accessibilityElementsHidden` / `importantForAccessibility`, and RTL
 *    excludes accessibility-hidden elements from queries by default. If this
 *    option ever stops being necessary, the illustrations have become
 *    screen-reader noise read out above text that already says the same thing.
 */
async function renderSvg(
  ui: React.ReactElement,
  testID: string,
  scheme: 'light' | 'dark' = 'light',
) {
  const screen = await renderScreen(ui, { scheme });
  return {
    svg: screen.getByTestId(testID, { includeHiddenElements: true }),
    unmount: screen.unmount,
  };
}

describe('illustration set', () => {
  it('covers exactly the five states the asset layout calls for', () => {
    expect([...KEYS].sort()).toEqual([
      'empty-orders',
      'empty-sales',
      'empty-stock',
      'error',
      'offline',
    ]);
  });

  it.each(KEYS)('renders %s in both schemes', async key => {
    for (const scheme of ['light', 'dark'] as const) {
      const { svg, unmount } = await renderSvg(
        <MBIllustration name={key} />,
        illustrationId(key),
        scheme,
      );
      expect({ key, scheme, rendered: Boolean(svg) }).toEqual({ key, scheme, rendered: true });
      await unmount();
    }
  });

  /**
   * The frame is the style guide. A drawing that picks its own aspect ratio
   * breaks the "one set, no mismatched styles" rule the moment two of them
   * appear on one screen.
   */
  it('honours an explicit size and keeps every drawing on the 4:3 frame', async () => {
    for (const key of KEYS) {
      const { svg, unmount } = await renderSvg(
        <MBIllustration name={key} size={80} />,
        illustrationId(key),
      );
      expect({ key, w: svg.props.width, h: svg.props.height }).toEqual({ key, w: 80, h: 60 });
      await unmount();
    }
  });
});

describe('product placeholder', () => {
  it.each(['light', 'dark'] as const)('renders on %s', async scheme => {
    const { svg, unmount } = await renderSvg(<ProductPlaceholder />, placeholderId, scheme);
    expect(svg).toBeTruthy();
    await unmount();
  });

  /**
   * Square, unlike the 4:3 illustrations: it stands in for a product photo, and
   * a placeholder of a different shape makes the row jump when the real image
   * loads.
   */
  it('is square', async () => {
    const { svg, unmount } = await renderSvg(<ProductPlaceholder size={48} />, placeholderId);
    expect({ w: svg.props.width, h: svg.props.height }).toEqual({ w: 48, h: 48 });
    await unmount();
  });
});
