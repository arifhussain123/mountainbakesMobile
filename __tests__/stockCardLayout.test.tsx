/**
 * @format
 */
import { Image, ImageBackground, PixelRatio, ScrollView, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import type { StockRow } from '@/api';
import { withExpectedBalance } from '@/features/stock/calculations';
import { StockCard } from '@/features/stock/components/StockCard';
import { ThemeProvider } from '@/shared/theme';

jest.mock('@/navigation', () => ({ openNewQuery: jest.fn() }));

const ROW: StockRow = {
  productId: 'p1',
  stockCode: 'STK-000042',
  productName: 'Chocolate Fudge Cake',
  isActive: true,
  opening: 20,
  newQty: 10,
  sold: 6,
  returned: 1,
  adjustment: 2,
  balance: 25,
};

/**
 * Grid width the card actually gets on a phone of `screenWidth`: the list's
 * 16px side gutters, the card's 10px side padding and its 1px border.
 */
const gridWidthFor = (screenWidth: number) => screenWidth - 32 - 20 - 2;

function renderAt(gridWidth: number) {
  const [row] = withExpectedBalance([ROW], new Map([['p1', 4]]));
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <StockCard row={row} showDemand />
      </ThemeProvider>,
    );
  });
  const frame = tree.root.find((node) => typeof node.props.onLayout === 'function');
  ReactTestRenderer.act(() => {
    frame.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: gridWidth, height: 60 } } });
  });
  return tree;
}

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll((node) => node.type === Text).map((node) => [node.props.children].flat().join(''));

describe('StockCard layout', () => {
  // Jest's mocked window reports fontScale 2; a phone at default text size is 1.
  beforeEach(() => jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(1));
  afterEach(() => jest.restoreAllMocks());

  it.each([360, 375, 390, 430, 600, 768, 1024])('fits all seven columns without scrolling at %ipx', (screenWidth) => {
    const tree = renderAt(gridWidthFor(screenWidth));
    expect(tree.root.findAllByType(ScrollView)).toHaveLength(0);
    const shown = texts(tree);
    for (const label of ['Opening Stock', 'New Stock', 'Sold', 'Return', 'Adjust', 'Waiting', 'Expected', 'Stock']) {
      expect(shown).toContain(label);
    }
    expect(shown).toEqual(expect.arrayContaining(['Chocolate Fudge Cake', 'STK-000042', '20', '+10', '-6', '-1', '+2', '4', '29', '25']));
  });

  it('scrolls the columns sideways (rather than squeezing them) when large system text needs it', () => {
    jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(1.3);
    expect(renderAt(gridWidthFor(360)).root.findAllByType(ScrollView)).toHaveLength(1);
    expect(renderAt(gridWidthFor(768)).root.findAllByType(ScrollView)).toHaveLength(0);
  });

  it('renders no images', () => {
    const tree = renderAt(gridWidthFor(390));
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    expect(tree.root.findAllByType(ImageBackground)).toHaveLength(0);
  });
});
