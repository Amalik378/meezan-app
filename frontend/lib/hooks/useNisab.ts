import { useQuery } from '@tanstack/react-query';
import { nisabApi } from '../api/nisab';

export function useNisab() {
  return useQuery({
    queryKey: ['nisab', 'current'],
    queryFn: nisabApi.getCurrent,
    staleTime: 60 * 60 * 1000, // 1 hour — prices don't change that often
  });
}
