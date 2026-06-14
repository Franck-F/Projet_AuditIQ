'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Topbar } from '@/components/app/Topbar';
import { MetricCard } from '@/components/product/MetricCard';
import { SectionHead } from '@/components/product/SectionHead';
import { Avatar } from '@/components/product/Avatar';
import { Modal, ModalActions } from '@/components/product/Modal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import {
  canManageOrg,
  problemDetail,
  ROLE_LABELS,
  type InvitableRole,
  type MemberOut,
  type Role,
} from '@/lib/api/org';
import {
  useCreateInvitation,
  useInvitations,
  useMe,
  useMembers,
  useRevokeInvitation,
  useUpdateMemberRole,
} from '@/lib/query/use-org';

/* ─── Rôles assignables (sélecteurs) ─────────────────────────────────────── */
const ASSIGNABLE_ROLES: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'editor', label: 'Éditeur' },
  { value: 'viewer', label: 'Lecture seule' },
];

const INVITE_ROLES: { value: InvitableRole; label: string }[] = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'editor', label: 'Éditeur' },
  { value: 'viewer', label: 'Lecture seule' },
];

/* ─── Sélecteur de rôle d'une ligne membre ───────────────────────────────── */
function RoleSelect({
  member,
  disabled,
  onChange,
}: {
  member: MemberOut;
  disabled: boolean;
  onChange: (role: Role) => void;
}) {
  // L'owner n'est pas modifiable (rôle non assignable) : on l'affiche en lecture seule.
  if (member.role === 'owner' || disabled) {
    return (
      <div className="flex items-center gap-2">
        {(member.role === 'owner' || member.role === 'admin') && (
          <Icons.shield size={12} />
        )}
        <span className="text-fg">{ROLE_LABELS[member.role]}</span>
      </div>
    );
  }
  return (
    <select
      aria-label={`Rôle de ${member.email}`}
      value={member.role}
      onChange={(e) => onChange(e.target.value as Role)}
      className="rounded-md border border-border-default bg-surface-2 px-2.5 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
    >
      {ASSIGNABLE_ROLES.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}

/* ─── Modal d'invitation ─────────────────────────────────────────────────── */
function InviteModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // `key={String(open)}` remonte le contenu à chaque ouverture → état réinitialisé
  // sans recourir à un effet de synchronisation.
  return (
    <Modal open={open} onClose={onClose} title="Inviter un membre">
      {open && <InviteModalBody onClose={onClose} />}
    </Modal>
  );
}

function InviteModalBody({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<InvitableRole>('viewer');
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const createInvitation = useCreateInvitation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await createInvitation.mutateAsync({ email: email.trim(), role });
      if (res.email_sent) {
        toast.success(`Invitation envoyée à ${res.invitation.email}`);
        onClose();
      } else {
        // Pas d'e-mail configuré : on affiche le lien à copier.
        setInviteUrl(res.invite_url);
        toast.success('Invitation créée — copiez le lien ci-dessous.');
      }
    } catch (err) {
      toast.error(problemDetail(err, "L'invitation a échoué."));
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier le lien.');
    }
  }

  return inviteUrl ? (
    <div className="mt-2 flex flex-col gap-3">
          <p className="text-sm text-fg-secondary">
            Aucune messagerie n&apos;est configurée. Partagez ce lien d&apos;invitation
            avec la personne concernée :
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              aria-label="Lien d'invitation"
              value={inviteUrl}
              className="w-full rounded-md border border-border-default bg-surface-2 px-3 py-2 font-mono text-xs text-fg focus:outline-none"
            />
            <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? 'Copié' : 'Copier le lien'}
            </Button>
          </div>
          <ModalActions>
            <Button type="button" variant="primary" onClick={onClose}>
              Terminé
            </Button>
          </ModalActions>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-email" className="text-sm font-medium text-fg-secondary">
              Adresse e-mail
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="collegue@entreprise.fr"
              className="rounded-md border border-border-default bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-role" className="text-sm font-medium text-fg-secondary">
              Rôle
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as InvitableRole)}
              className="rounded-md border border-border-default bg-surface-2 px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {INVITE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <ModalActions>
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={createInvitation.isPending}>
              {createInvitation.isPending ? 'Envoi…' : 'Envoyer l’invitation'}
            </Button>
          </ModalActions>
        </form>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function EquipePage() {
  const me = useMe();
  const members = useMembers();
  const invitations = useInvitations();
  const updateRole = useUpdateMemberRole();
  const revoke = useRevokeInvitation();
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const canManage = canManageOrg(me.data?.role);

  async function handleRoleChange(member: MemberOut, role: Role) {
    try {
      await updateRole.mutateAsync({ userId: member.id, role });
      toast.success(`Rôle de ${member.email} mis à jour.`);
    } catch (err) {
      toast.error(
        problemDetail(err, 'Impossible de modifier ce rôle.'),
      );
    }
  }

  async function handleRevoke(id: string, email: string) {
    try {
      await revoke.mutateAsync(id);
      toast.success(`Invitation de ${email} révoquée.`);
    } catch (err) {
      toast.error(problemDetail(err, "Impossible de révoquer l'invitation."));
    }
  }

  const memberList = members.data ?? [];
  const pendingInvites = (invitations.data ?? []).filter(
    (i) => i.status === 'pending',
  );
  const activeCount = memberList.length;
  const adminCount = memberList.filter(
    (m) => m.role === 'owner' || m.role === 'admin',
  ).length;

  return (
    <>
      <Topbar
        title="Équipe & accès"
        crumbs={[
          { label: 'AuditIQ' },
          { label: 'Organisation' },
          { label: 'Équipe' },
        ]}
        actions={
          <Button
            variant="primary"
            disabled={!canManage}
            onClick={() => setInviteOpen(true)}
          >
            <Icons.plus size={16} />
            Inviter un membre
          </Button>
        }
      />

      <div className="page space-y-8">
        <div className="grid grid-cols-3 gap-4">
          <MetricCard label="Membres actifs" value={String(activeCount)} />
          <MetricCard label="Administrateurs" value={String(adminCount)} />
          <MetricCard label="Invitations en attente" value={String(pendingInvites.length)} />
        </div>

        <div>
          <SectionHead
            eyebrow="Membres"
            title="Qui a accès à l'espace"
            sub="Gérez les rôles et permissions des membres de votre organisation."
          />

          <Card className="p-0">
            {members.isLoading ? (
              <div role="status" className="px-6 py-10 text-center text-sm text-fg-secondary">
                Chargement des membres…
              </div>
            ) : members.isError ? (
              <div className="px-6 py-10 text-center text-sm text-status-fail">
                Impossible de charger la liste des membres.
              </div>
            ) : memberList.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-fg-muted">
                Aucun membre pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-default">
                      <th className="px-6 py-3 text-left font-medium text-fg">Membre</th>
                      <th className="px-6 py-3 text-left font-medium text-fg">Niveau d&apos;accès</th>
                      <th className="px-6 py-3 text-right font-medium text-fg" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {memberList.map((member) => {
                      const displayName = member.first_name?.trim() || member.email;
                      return (
                        <tr key={member.id} className="hover:bg-surface-2">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={displayName} size={32} />
                              <div className="min-w-0">
                                <div className="font-medium text-fg">{displayName}</div>
                                <div className="font-mono text-xs text-fg-muted truncate">
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <RoleSelect
                              member={member}
                              disabled={!canManage}
                              onChange={(role) => handleRoleChange(member, role)}
                            />
                          </td>
                          <td className="px-6 py-4 text-right" />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div>
          <SectionHead
            eyebrow="Invitations"
            title="Invitations en attente"
            sub="Les invitations expirent automatiquement passé leur délai."
          />
          <Card className="p-0">
            {invitations.isLoading ? (
              <div role="status" className="px-6 py-8 text-center text-sm text-fg-secondary">
                Chargement des invitations…
              </div>
            ) : invitations.isError ? (
              <div className="px-6 py-8 text-center text-sm text-status-fail">
                Impossible de charger les invitations.
              </div>
            ) : pendingInvites.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-fg-muted">
                Aucune invitation en attente.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-default">
                      <th className="px-6 py-3 text-left font-medium text-fg">E-mail</th>
                      <th className="px-6 py-3 text-left font-medium text-fg">Rôle</th>
                      <th className="px-6 py-3 text-right font-medium text-fg" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {pendingInvites.map((inv) => (
                      <tr key={inv.id} className="hover:bg-surface-2">
                        <td className="px-6 py-4 font-mono text-xs text-fg-secondary">
                          {inv.email}
                        </td>
                        <td className="px-6 py-4 text-fg">{ROLE_LABELS[inv.role]}</td>
                        <td className="px-6 py-4 text-right">
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevoke(inv.id, inv.email)}
                              disabled={revoke.isPending}
                            >
                              Révoquer
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
