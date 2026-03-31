import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AddAssetPayload, zakatApi } from '../api/zakat';

export const zakatKeys = {
  assets: ['zakat', 'assets'] as const,
  calculation: (nisabType: string) => ['zakat', 'calculation', nisabType] as const,
  records: ['zakat', 'records'] as const,
};

export function useZakatAssets() {
  return useQuery({
    queryKey: zakatKeys.assets,
    queryFn: zakatApi.getAssets,
  });
}

export function useZakatCalculation(nisabType: 'gold' | 'silver' = 'silver') {
  return useQuery({
    queryKey: zakatKeys.calculation(nisabType),
    queryFn: () => zakatApi.calculate(nisabType),
  });
}

export function useZakatRecords() {
  return useQuery({
    queryKey: zakatKeys.records,
    queryFn: zakatApi.getRecords,
  });
}

export function useAddAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddAssetPayload) => zakatApi.addAsset(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: zakatKeys.assets });
      qc.invalidateQueries({ queryKey: ['zakat', 'calculation'] });
    },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => zakatApi.deleteAsset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: zakatKeys.assets });
      qc.invalidateQueries({ queryKey: ['zakat', 'calculation'] });
    },
  });
}

export function useFinaliseZakat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nisabType: 'gold' | 'silver') => zakatApi.finalise(nisabType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: zakatKeys.records });
    },
  });
}
