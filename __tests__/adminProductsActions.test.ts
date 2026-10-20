/**
 * @format
 */
import type { CatalogProduct, PackingMaterial } from '@/api/types';
import {
  deletePackingMaterialPrompt,
  initialPackingMaterialValues,
  initialProductValues,
  karachiCalendarDate,
  packingMaterialPayload,
  packingToggleCopy,
  priceChangeOutcome,
  priceChangePayload,
  productFormPayload,
  productRowActions,
  removeProductPrompt,
} from '@/features/admin/utils/productsActions';

const product = (over: Partial<CatalogProduct> = {}) =>
  ({
    id: 'p1',
    name: 'Cream Puff',
    categoryId: 'c1',
    categoryName: 'Pastry',
    sku: 'CP-001',
    stockCode: 'S1',
    price: 120,
    costPrice: 80,
    description: '',
    isActive: true,
    isSpecial: false,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...over,
  }) as CatalogProduct;

describe('karachiCalendarDate', () => {
  it('is the Karachi calendar day, not the UTC one (and not the 2 AM business day)', () => {
    expect(karachiCalendarDate(new Date('2026-10-20T18:59:00Z'))).toBe('2026-10-20');
    expect(karachiCalendarDate(new Date('2026-10-20T19:00:00Z'))).toBe('2026-10-21'); // 00:00 Karachi
  });
});

describe('product row actions', () => {
  it('offers Deactivate while active and Activate once inactive', () => {
    expect(productRowActions({ isActive: true })).toEqual({ changePrice: true, edit: true, deactivate: true, activate: false });
    expect(productRowActions({ isActive: false })).toEqual({ changePrice: true, edit: true, deactivate: false, activate: true });
  });

  it('uses the web confirm wording', () => {
    expect(removeProductPrompt('Cream Puff')).toBe('Remove "Cream Puff" from the catalog?');
  });
});

describe('product form', () => {
  it('starts a new product blank with 0 price and 0 cost', () => {
    expect(initialProductValues(null)).toEqual({ name: '', categoryId: '', sku: '', price: '0', costPrice: '0', description: '', isActive: true });
  });

  it('seeds an edit from the product, nulls as blanks', () => {
    expect(initialProductValues(product({ sku: null, costPrice: null, description: null, isActive: false }))).toEqual({
      name: 'Cream Puff',
      categoryId: 'c1',
      sku: '',
      price: '120',
      costPrice: '',
      description: '',
      isActive: false,
    });
  });

  it('reports every CreateProductSchema problem with its message', () => {
    const r = productFormPayload({ name: 'A', categoryId: '', sku: ' ', price: '0', costPrice: '-1', description: '', isActive: true }, 'create');
    expect(r).toEqual({
      errors: {
        name: 'Product name is required',
        categoryId: 'Category is required',
        sku: 'SKU is required',
        price: 'Price must be positive',
        costPrice: 'Cost price must be non-negative',
      },
    });
  });

  it('treats an empty cost as missing, not as 0', () => {
    const r = productFormPayload({ name: 'Cake', categoryId: 'c1', sku: 'CK', price: '10', costPrice: '', description: '', isActive: true }, 'create');
    expect(r).toEqual({ errors: { costPrice: 'Cost price must be non-negative' } });
  });

  it('builds the POST body, trimmed', () => {
    const r = productFormPayload({ name: ' Cake ', categoryId: 'c1', sku: ' CK-1 ', price: '2500', costPrice: '1800', description: ' x ', isActive: true }, 'create');
    expect(r).toEqual({ create: { name: 'Cake', categoryId: 'c1', sku: 'CK-1', price: 2500, costPrice: 1800, description: 'x' } });
  });

  it('builds the PUT body with isActive and never a price — even an invalid one is ignored on edit', () => {
    const r = productFormPayload({ name: 'Cake', categoryId: 'c1', sku: 'CK', price: '', costPrice: '0', description: '', isActive: false }, 'edit');
    expect(r).toEqual({ update: { name: 'Cake', categoryId: 'c1', sku: 'CK', costPrice: 0, description: '', isActive: false } });
  });
});

describe('change price', () => {
  it('needs a positive price, then a reason', () => {
    expect(priceChangePayload('', '2026-10-20', 'x')).toEqual({ error: 'Enter a valid positive price' });
    expect(priceChangePayload('0', '2026-10-20', 'x')).toEqual({ error: 'Enter a valid positive price' });
    expect(priceChangePayload('abc', '2026-10-20', '')).toEqual({ error: 'Enter a valid positive price' });
    expect(priceChangePayload('150', '2026-10-20', '   ')).toEqual({ error: 'Please enter a reason' });
  });

  it('builds the body with the reason trimmed', () => {
    expect(priceChangePayload('150.5', '2026-10-25', ' Supplier increase ')).toEqual({
      input: { newPrice: 150.5, effectiveDate: '2026-10-25', reason: 'Supplier increase' },
    });
  });

  it('words the three server answers as the web toasts do', () => {
    expect(priceChangeOutcome({ status: 'skipped' }, '2026-10-20').message).toBe('Price unchanged — nothing to do');
    expect(priceChangeOutcome({ status: 'scheduled', effectiveDate: '25-10-2026' }, '2026-10-25').message).toBe('Price scheduled for 25-10-2026');
    expect(priceChangeOutcome({ status: 'scheduled' }, '2026-10-25').message).toBe('Price scheduled for 2026-10-25');
    expect(priceChangeOutcome({ status: 'active' }, '2026-10-20').message).toBe('Price updated');
  });
});

describe('packing materials', () => {
  const material = (over: Partial<PackingMaterial> = {}) =>
    ({ id: 'm1', materialCode: 'PACK-001', materialName: 'Cake Box', isActive: true, category: null, description: null, ...over }) as PackingMaterial;

  it('seeds the form, nulls as blanks', () => {
    expect(initialPackingMaterialValues(null)).toEqual({ materialCode: '', materialName: '', category: '', description: '' });
    expect(initialPackingMaterialValues(material({ category: 'Boxes' }))).toEqual({
      materialCode: 'PACK-001',
      materialName: 'Cake Box',
      category: 'Boxes',
      description: '',
    });
  });

  it('needs a 2+ character code and name, with one message', () => {
    expect(packingMaterialPayload({ materialCode: 'P', materialName: 'Box', category: '', description: '' })).toEqual({
      error: 'Code and name are both required',
    });
    expect(packingMaterialPayload({ materialCode: 'PACK', materialName: ' B ', category: '', description: '' })).toEqual({
      error: 'Code and name are both required',
    });
  });

  it('sends every field trimmed and no price or cost', () => {
    expect(packingMaterialPayload({ materialCode: ' PACK-016 ', materialName: ' 1 Pound Box ', category: ' Boxes ', description: ' n ' })).toEqual({
      input: { materialCode: 'PACK-016', materialName: '1 Pound Box', category: 'Boxes', description: 'n' },
    });
  });

  it('confirms Disable but not Enable, with the web toasts', () => {
    expect(packingToggleCopy(material())).toMatchObject({ label: 'Disable', success: 'Cake Box disabled', failure: 'Could Not Disable' });
    expect(packingToggleCopy(material()).confirm).toContain('Disable "Cake Box"?');
    expect(packingToggleCopy(material({ isActive: false }))).toEqual({ label: 'Enable', confirm: null, success: 'Cake Box enabled', failure: 'Could Not Enable' });
  });

  it('uses the web delete confirm', () => {
    expect(deletePackingMaterialPrompt('Cake Box')).toBe('Delete "Cake Box" from the catalogue? Past demands keep their record.');
  });
});
