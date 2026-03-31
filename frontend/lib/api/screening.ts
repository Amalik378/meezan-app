import { apiClient } from './client';

export interface ScreeningResult {
  ticker: string;
  company_name: string;
  sector: string | null;
  exchange: string | null;
  compliance_score: number;
  business_screen_pass: boolean;
  debt_ratio_pass: boolean;
  interest_income_pass: boolean;  // securities-to-market-cap screen
  receivables_pass: boolean;      // revenue purity screen
  debt_to_market_cap_ratio: number | null;
  securities_to_market_cap_ratio: number | null;
  compliant_revenue_pct: number | null;
  fail_reasons: string[];
  last_updated: string;
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  company_name: string;
  added_at: string;
  screening: ScreeningResult | null;
}

export const screeningApi = {
  screen: (ticker: string) =>
    apiClient.get<ScreeningResult>(`/screening/screen/${ticker}`).then((r) => r.data),

  getWatchlist: () =>
    apiClient.get<WatchlistItem[]>('/screening/watchlist').then((r) => r.data),

  addToWatchlist: (ticker: string) =>
    apiClient.post<WatchlistItem>('/screening/watchlist', { ticker }).then((r) => r.data),

  removeFromWatchlist: (ticker: string) =>
    apiClient.delete(`/screening/watchlist/${ticker}`),
};
