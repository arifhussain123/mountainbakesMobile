/**
 * @format
 *
 * How a return's photo reads on screen: an older return's one shared photo
 * carries "One photo for all items (older return)"; a Return Items line
 * names its product in the photo's label and says "Photo required" in words.
 */
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import type { BranchReturn } from '@/api';
import { ReturnDetailSheet } from '@/features/stock/components/ReturnDetailSheet';
import { ReturnLineRow } from '@/features/stock/components/ReturnLineRow';
import { LEGACY_SINGLE_PHOTO_NOTE } from '@/features/stock/returnPhotos';
import { ThemeProvider } from '@/shared/theme';

const photo = { id: 'a1', entity: 'branch_return' as const, entityId: 'r1', url: 'https://x/a1.jpg', mimeType: 'image/jpeg', sizeBytes: 1, width: 1, height: 1, uploadedBy: null, uploadedByName: null, createdAt: '' };

const item = (overrides: Partial<BranchReturn> = {}): BranchReturn => ({
  id: '11111111-2222-3333-4444-555555555555',
  branchId: 'b1',
  branchName: 'Committee Chowk',
  productId: 'p1',
  productName: 'Classic Brownie',
  qty: 3,
  reason: '',
  status: 'pending',
  source: 'branch',
  date: '2026-10-20',
  createdBy: 'u1',
  createdByName: 'Ali',
  createdAt: '2026-10-20T10:00:00.000Z',
  reviewedBy: null,
  reviewedByName: null,
  reviewedAt: null,
  photo,
  ...overrides,
});

function texts(element: React.ReactElement): string[] {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });
  return renderer.root.findAllByType(Text).map((node) => [].concat(node.props.children).join(''));
}

function labels(element: React.ReactElement): string[] {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });
  return renderer.root.findAll((node) => typeof node.props.accessibilityLabel === 'string').map((node) => node.props.accessibilityLabel as string);
}

describe('return photos on screen', () => {
  it('notes an older return whose one photo covers every product', () => {
    expect(texts(<ReturnDetailSheet item={item({ legacySinglePhoto: true })} onChange={jest.fn()} onWithdraw={jest.fn()} />)).toContain(LEGACY_SINGLE_PHOTO_NOTE);
  });

  it('shows no note on a per-product photo', () => {
    const shown = texts(<ReturnDetailSheet item={item({ legacySinglePhoto: false })} onChange={jest.fn()} onWithdraw={jest.fn()} />);
    expect(shown).not.toContain(LEGACY_SINGLE_PHOTO_NOTE);
    expect(labels(<ReturnDetailSheet item={item()} onChange={jest.fn()} onWithdraw={jest.fn()} />)).toContain('Photo of returned Classic Brownie. Open full screen');
  });

  it('a Return Items line says "Photo required" in words and labels its photo by product', () => {
    const handlers = {
      onPressSelect: jest.fn(),
      onIncrement: jest.fn(),
      onDecrement: jest.fn(),
      onRemove: jest.fn(),
      onTakePhoto: jest.fn(),
      onPickPhoto: jest.fn(),
      onOpenPhoto: jest.fn(),
      onRetakePhoto: jest.fn(),
      onRemovePhoto: jest.fn(),
      onRetryUpload: jest.fn(),
    };
    const product = { id: 'p1', name: 'Classic Brownie', categoryId: null, categoryName: null, sku: 'B1', price: 100, isActive: true };

    expect(texts(<ReturnLineRow product={product} qty={1} available={5} photo={null} showPhotoRequired {...handlers} />)).toContain('Photo required');

    const linePhoto = { captureId: 'c1', source: 'camera' as const, previewUri: 'file:///p.jpg', status: 'uploaded' as const, progress: 1, attachment: null, error: null };
    expect(labels(<ReturnLineRow product={product} qty={1} available={5} photo={linePhoto} {...handlers} />)).toContain(
      'Photo of returned Classic Brownie. Open full screen',
    );
  });
});
