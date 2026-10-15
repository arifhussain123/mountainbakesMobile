import { apiClient } from '../client';
import type { StockListResponse } from '../types';

export async function getStock(date?: string): Promise<StockListResponse> {
  return apiClient.get<StockListResponse>('/stock', date ? { date } : undefined);
}
