import { apiClient } from '../client';
import type { ProductListResponse } from '../types';

/** `sellable=true` adds this branch's currently-held special-order items to the catalogue. */
export async function listProducts(): Promise<ProductListResponse> {
  return apiClient.get<ProductListResponse>('/products', { sellable: 'true' });
}
