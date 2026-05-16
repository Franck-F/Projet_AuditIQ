import { useQuery } from '@tanstack/react-query';

import { type AuditOut, fetchAudit } from '@/lib/api/audits';

export function useAudit(id: string) {
  return useQuery<AuditOut>({
    queryKey: ['audit', id],
    queryFn: () => fetchAudit(id),
    enabled: id.length > 0,
  });
}
