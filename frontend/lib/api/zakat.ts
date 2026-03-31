import { apiClient } from './client';

export interface ZakatAsset {
  id: string;
  asset_type: string;
  description: string;
  value_gbp: number;
  hawl_start_date: string;
  is_active: boolean;
  created_at: string;
}

export interface AssetBreakdown {
  asset_type: string;
  total_value_gbp: number;
  is_zakatable: boolean;
  count: number;
}

export interface ZakatCalculation {
  total_assets_gbp: number;
  total_deductions_gbp: number;
  net_zakatable_gbp: number;
  nisab_value_gbp: number;
  nisab_type: string;
  meets_nisab: boolean;
  zakat_due_gbp: number;
  zakat_rate: number;
  assets_below_hawl: string[];
  breakdown: AssetBreakdown[];
}

export interface ZakatRecord {
  id: string;
  calculation_date: string;
  hijri_year: string | null;
  total_assets_gbp: number;
  total_deductions_gbp: number;
  net_zakatable_gbp: number;
  nisab_value_gbp: number;
  nisab_type_used: string;
  zakat_due_gbp: number;
  created_at: string;
}

export interface AddAssetPayload {
  asset_type: string;
  description: string;
  value_gbp: number;
  hawl_start_date: string;
}

export const zakatApi = {
  getAssets: () => apiClient.get<ZakatAsset[]>('/zakat/assets').then((r) => r.data),

  addAsset: (payload: AddAssetPayload) =>
    apiClient.post<ZakatAsset>('/zakat/assets', payload).then((r) => r.data),

  updateAsset: (id: string, payload: Partial<AddAssetPayload>) =>
    apiClient.patch<ZakatAsset>(`/zakat/assets/${id}`, payload).then((r) => r.data),

  deleteAsset: (id: string) => apiClient.delete(`/zakat/assets/${id}`),

  calculate: (nisabType: 'gold' | 'silver' = 'silver') =>
    apiClient
      .get<ZakatCalculation>('/zakat/calculate', { params: { nisab_type: nisabType } })
      .then((r) => r.data),

  finalise: (nisabType: 'gold' | 'silver' = 'silver') =>
    apiClient
      .post<ZakatRecord>('/zakat/records', null, { params: { nisab_type: nisabType } })
      .then((r) => r.data),

  getRecords: () => apiClient.get<ZakatRecord[]>('/zakat/records').then((r) => r.data),
};
