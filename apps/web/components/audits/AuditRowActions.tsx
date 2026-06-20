'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, MoreHorizontal, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Modal, ModalActions } from '@/components/product/Modal';
import { canManageOrg, problemDetail, type Role } from '@/lib/api/org';
import { useArchiveAudit, useDeleteAudit } from '@/lib/query/use-audits';

export interface AuditRowActionsProps {
  /** Identifiant de l'audit/rapport ciblé. */
  auditId: string;
  /** Titre, pour des messages explicites. */
  auditTitle: string;
  /** `true` si l'audit est déjà archivé (affiche « Désarchiver »). */
  archived: boolean;
  /** Rôle de l'utilisateur courant (via `useMe`). */
  role: Role | undefined;
  /** Mot utilisé dans les libellés (« rapport » sur la page Rapports). */
  noun?: 'rapport' | 'audit';
  /** Appelé après une suppression réussie (ex. redirection). */
  onDeleted?: () => void;
}

/**
 * Menu d'actions par ligne : Archiver / Désarchiver + Supprimer.
 *
 * - Archiver/Désarchiver : appel `PATCH /audits/{id}` (non destructif).
 * - Supprimer : visible uniquement pour owner/admin (`canManageOrg`), ouvre une
 *   confirmation explicite listant ce qui sera supprimé avant `DELETE`.
 * - Toasts succès/erreur (`problemDetail`) ; l'invalidation des requêtes
 *   (dashboard + listes) est gérée par les hooks.
 */
export function AuditRowActions({
  auditId,
  auditTitle,
  archived,
  role,
  noun = 'rapport',
  onDeleted,
}: AuditRowActionsProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const canDelete = canManageOrg(role);
  const archiveMut = useArchiveAudit();
  const deleteMut = useDeleteAudit();
  const Noun = noun === 'rapport' ? 'Rapport' : 'Audit';

  // Ferme le menu au clic extérieur.
  React.useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  const handleArchive = () => {
    setMenuOpen(false);
    archiveMut.mutate(
      { id: auditId, archived: !archived },
      {
        onSuccess: () =>
          toast.success(
            archived
              ? `${Noun} désarchivé.`
              : `${Noun} archivé. Vous le retrouverez dans « Archivés ».`,
          ),
        onError: (err) =>
          toast.error(
            problemDetail(
              err,
              archived
                ? "Le désarchivage a échoué."
                : "L'archivage a échoué.",
            ),
          ),
      },
    );
  };

  const handleDelete = () => {
    deleteMut.mutate(auditId, {
      onSuccess: () => {
        setConfirmOpen(false);
        toast.success(`${Noun} supprimé définitivement.`);
        onDeleted?.();
      },
      onError: (err) =>
        toast.error(problemDetail(err, 'La suppression a échoué.')),
    });
  };

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <Button
        variant="ghost"
        size="sm"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((o) => !o);
        }}
        className="px-2"
      >
        <MoreHorizontal size={16} />
      </Button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-52 overflow-hidden rounded-[var(--r-md)] border border-border-default bg-surface py-1 shadow-[0_12px_32px_rgba(0,0,0,0.32)]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            disabled={archiveMut.isPending}
            onClick={handleArchive}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-fg transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            {archived ? (
              <>
                <ArchiveRestore size={15} className="text-fg-muted" />
                Désarchiver
              </>
            ) : (
              <>
                <Archive size={15} className="text-fg-muted" />
                Archiver
              </>
            )}
          </button>

          {canDelete ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setConfirmOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-status-fail transition-colors hover:bg-status-fail-bg"
            >
              <Trash2 size={15} />
              Supprimer
            </button>
          ) : (
            <div className="px-3 py-2 text-xs leading-snug text-fg-muted">
              La suppression est réservée aux administrateurs.
            </div>
          )}
        </div>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`Supprimer ce ${noun} ?`}
        description={`Cette action est définitive et irréversible. La suppression de « ${auditTitle} » retirera en cascade :`}
      >
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-fg-secondary">
          <li>le rapport généré (PDF / Excel) ;</li>
          <li>le résultat de l&apos;audit et ses métriques ;</li>
          <li>le jeu de données associé.</li>
        </ul>
        <p className="mt-3 text-sm text-fg-muted">
          Pour conserver le rapport sans l&apos;afficher, préférez
          l&apos;archivage.
        </p>
        <ModalActions>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmOpen(false)}
            disabled={deleteMut.isPending}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMut.isPending}
          >
            {deleteMut.isPending ? 'Suppression…' : 'Supprimer définitivement'}
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}
