import type {
  CatalogProduct,
  ChangeProductPriceInput,
  ChangeProductPriceResult,
  CreatePackingMaterialInput,
  CreateProductInput,
  PackingMaterial,
  UpdateProductInput,
} from '@/api';

/**
 * Pure rules behind Super Admin → Products' actions — the web `ProductsPage`
 * row buttons, `ProductForm` (zod `CreateProductSchema`), `ChangePriceDialog`
 * and `PackingMaterialsPage` / `PackingMaterialForm`, reproduced exactly.
 * Every check here is courtesy: the API re-validates each body with the same
 * schemas, and every write route is super_admin only.
 */

const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5, no DST

/**
 * Today's CALENDAR date in Asia/Karachi, 'YYYY-MM-DD' — the web dialog's
 * `karachiToday()` default for Effective Date (not the 2 AM business date).
 */
export function karachiCalendarDate(now: Date = new Date()): string {
  return new Date(now.getTime() + KARACHI_OFFSET_MS).toISOString().slice(0, 10);
}

// ─── Products ────────────────────────────────────────────────────────────────

/** Which row buttons a product shows: Deactivate while active, Activate once it is not. */
export function productRowActions(p: Pick<CatalogProduct, 'isActive'>): { changePrice: boolean; edit: boolean; deactivate: boolean; activate: boolean } {
  return { changePrice: true, edit: true, deactivate: p.isActive, activate: !p.isActive };
}

/** The web's confirm before `DELETE /products/:id` (a soft delete). */
export function removeProductPrompt(name: string): string {
  return `Remove "${name}" from the catalog?`;
}

export interface ProductFormValues {
  name: string;
  categoryId: string;
  sku: string;
  /** Typed text; only read when creating — an edit cannot change the price. */
  price: string;
  costPrice: string;
  description: string;
  isActive: boolean;
}

export type ProductFormField = 'name' | 'categoryId' | 'sku' | 'price' | 'costPrice';
export type ProductFormErrors = Partial<Record<ProductFormField, string>>;

/** The web form's defaults: the product's own values to edit, else blanks with 0 price / 0 cost. */
export function initialProductValues(product: CatalogProduct | null): ProductFormValues {
  if (!product) return { name: '', categoryId: '', sku: '', price: '0', costPrice: '0', description: '', isActive: true };
  return {
    name: product.name,
    categoryId: product.categoryId ?? '',
    sku: product.sku ?? '',
    price: String(product.price ?? ''),
    costPrice: product.costPrice === null || product.costPrice === undefined ? '' : String(product.costPrice),
    description: product.description ?? '',
    isActive: product.isActive,
  };
}

/** `Number('')` is 0, which would quietly pass an empty field as a price — empty is "no number". */
function parseNumber(text: string): number {
  const t = text.trim();
  return t === '' ? Number.NaN : Number(t);
}

/**
 * `CreateProductSchema`'s rules and messages: name and SKU 2+ characters, a
 * category, a positive price (create only) and a cost of 0 or more. Edit
 * sends no price — the server strips it there anyway; prices change only
 * through Change Price, which keeps the history.
 */
export function productFormPayload(
  values: ProductFormValues,
  mode: 'create' | 'edit',
): { create: CreateProductInput } | { update: UpdateProductInput } | { errors: ProductFormErrors } {
  const name = values.name.trim();
  const sku = values.sku.trim();
  const price = parseNumber(values.price);
  const costPrice = parseNumber(values.costPrice);
  const errors: ProductFormErrors = {};
  if (name.length < 2) errors.name = 'Product name is required';
  if (!values.categoryId) errors.categoryId = 'Category is required';
  if (sku.length < 2) errors.sku = 'SKU is required';
  if (mode === 'create' && !(Number.isFinite(price) && price > 0)) errors.price = 'Price must be positive';
  if (!(Number.isFinite(costPrice) && costPrice >= 0)) errors.costPrice = 'Cost price must be non-negative';
  if (Object.keys(errors).length > 0) return { errors };

  const description = values.description.trim();
  if (mode === 'create') return { create: { name, categoryId: values.categoryId, sku, price, costPrice, description } };
  return { update: { name, categoryId: values.categoryId, sku, costPrice, description, isActive: values.isActive } };
}

/** Change Price: a positive number and a reason, checked in that order as on the web. */
export function priceChangePayload(newPrice: string, effectiveDate: string, reason: string): { input: ChangeProductPriceInput } | { error: string } {
  const price = parseNumber(newPrice);
  if (!Number.isFinite(price) || price <= 0) return { error: 'Enter a valid positive price' };
  if (!reason.trim()) return { error: 'Please enter a reason' };
  return { input: { newPrice: price, effectiveDate, reason: reason.trim() } };
}

/** The web's three toasts for the server's answer — unchanged, scheduled for a later day, or live now. */
export function priceChangeOutcome(res: Pick<ChangeProductPriceResult, 'status' | 'effectiveDate'>, effectiveDate: string): { title: string; message: string } {
  if (res.status === 'skipped') return { title: 'No Change', message: 'Price unchanged — nothing to do' };
  if (res.status === 'scheduled') return { title: 'Price Scheduled', message: `Price scheduled for ${res.effectiveDate ?? effectiveDate}` };
  return { title: 'Price Updated', message: 'Price updated' };
}

// ─── Packing materials ───────────────────────────────────────────────────────

export interface PackingMaterialFormValues {
  materialCode: string;
  materialName: string;
  category: string;
  description: string;
}

export function initialPackingMaterialValues(m: PackingMaterial | null): PackingMaterialFormValues {
  return {
    materialCode: m?.materialCode ?? '',
    materialName: m?.materialName ?? '',
    category: m?.category ?? '',
    description: m?.description ?? '',
  };
}

/** Code and name 2+ characters each (one message for both, as on the web); every field is sent trimmed. */
export function packingMaterialPayload(values: PackingMaterialFormValues): { input: CreatePackingMaterialInput } | { error: string } {
  const materialCode = values.materialCode.trim();
  const materialName = values.materialName.trim();
  if (materialCode.length < 2 || materialName.length < 2) return { error: 'Code and name are both required' };
  return { input: { materialCode, materialName, category: values.category.trim(), description: values.description.trim() } };
}

/**
 * Disable hides a material from new demands; Enable brings it back. Both keep
 * it in the catalogue. The web disables with one click; the phone asks first
 * (a deactivate is confirmed app-wide), Enable still goes straight through.
 */
export function packingToggleCopy(m: Pick<PackingMaterial, 'isActive' | 'materialName'>): {
  label: 'Disable' | 'Enable';
  confirm: string | null;
  success: string;
  failure: string;
} {
  return m.isActive
    ? {
        label: 'Disable',
        confirm: `Disable "${m.materialName}"? It stays in the catalogue but cannot be picked on new demands.`,
        success: `${m.materialName} disabled`,
        failure: 'Could Not Disable',
      }
    : { label: 'Enable', confirm: null, success: `${m.materialName} enabled`, failure: 'Could Not Enable' };
}

/** The web's confirm before a REAL delete — past demands keep their snapshotted line. */
export function deletePackingMaterialPrompt(name: string): string {
  return `Delete "${name}" from the catalogue? Past demands keep their record.`;
}
