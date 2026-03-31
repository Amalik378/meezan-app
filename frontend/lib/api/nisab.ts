import { apiClient } from './client';

export interface NisabPrice {
  gold_price_per_gram_gbp: number;
  silver_price_per_gram_gbp: number;
  nisab_gold_gbp: number;
  nisab_silver_gbp: number;
  fetched_at: string;
}

export const nisabApi = {
  getCurrent: () => apiClient.get<NisabPrice>('/nisab/current').then((r) => r.data),
};
