import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { screeningApi } from '../api/screening';

export const screeningKeys = {
  watchlist: ['screening', 'watchlist'] as const,
  result: (ticker: string) => ['screening', 'result', ticker] as const,
};

export function useWatchlist() {
  return useQuery({
    queryKey: screeningKeys.watchlist,
    queryFn: screeningApi.getWatchlist,
  });
}

export function useScreenTicker(ticker: string, enabled: boolean) {
  return useQuery({
    queryKey: screeningKeys.result(ticker),
    queryFn: () => screeningApi.screen(ticker),
    enabled: enabled && ticker.length > 0,
  });
}

export function useAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ticker: string) => screeningApi.addToWatchlist(ticker),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: screeningKeys.watchlist });
    },
  });
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ticker: string) => screeningApi.removeFromWatchlist(ticker),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: screeningKeys.watchlist });
    },
  });
}
