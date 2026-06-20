import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archiveAudit,
  deleteAudit,
  listAudits,
  type AuditListItem,
} from '@/lib/api/audits';

/** Clés de requête partagées pour les audits / le dashboard. */
export const AUDIT_KEYS = {
  /** Liste des audits filtrée par état d'archivage. */
  list: (archived: boolean) => ['audits', 'list', { archived }] as const,
  /** Résumé du dashboard (exclut déjà les archivés côté API). */
  dashboard: ['dashboard', 'summary'] as const,
};

/* ─── Lectures ───────────────────────────────────────────────────────────── */

/** Liste les audits actifs (`archived: false`) ou archivés (`true`). */
export function useAuditsList(archived: boolean) {
  return useQuery<AuditListItem[]>({
    queryKey: AUDIT_KEYS.list(archived),
    queryFn: () => listAudits(archived),
  });
}

/* ─── Invalidation partagée ──────────────────────────────────────────────── */

/**
 * Invalide tout ce qui dépend de l'état d'un audit après une mutation :
 * le dashboard (« Actifs ») et les deux listes (actifs + archivés).
 */
function invalidateAuditViews(qc: ReturnType<typeof useQueryClient>): void {
  void qc.invalidateQueries({ queryKey: AUDIT_KEYS.dashboard });
  void qc.invalidateQueries({ queryKey: AUDIT_KEYS.list(false) });
  void qc.invalidateQueries({ queryKey: AUDIT_KEYS.list(true) });
}

/* ─── Mutations ──────────────────────────────────────────────────────────── */

/** Archive ou désarchive un audit, puis rafraîchit dashboard + listes. */
export function useArchiveAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      archiveAudit(id, archived),
    onSuccess: () => invalidateAuditViews(qc),
  });
}

/** Supprime définitivement un audit, puis rafraîchit dashboard + listes. */
export function useDeleteAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAudit(id),
    onSuccess: () => invalidateAuditViews(qc),
  });
}
