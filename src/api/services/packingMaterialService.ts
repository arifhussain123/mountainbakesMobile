import { apiClient } from '../client';
import type { PackingMaterialListResponse } from '../types';

/** `/api/packing-materials` — active materials only (the branch demand form's catalogue). */
export async function listPackingMaterials(): Promise<PackingMaterialListResponse> {
  return apiClient.get<PackingMaterialListResponse>('/packing-materials');
}
