import { api } from '@/lib/api/client';
import type { Sector } from '@/lib/api/audits';

export type { Sector };

/* ─── Rôles & types ──────────────────────────────────────────────────────── */

/** Rôle d'un membre dans l'organisation (RBAC backend). */
export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

/** Rôles assignables lors d'une invitation (l'owner ne s'invite pas). */
export type InvitableRole = 'admin' | 'editor' | 'viewer';

/* ─── Organisation ───────────────────────────────────────────────────────── */

/** Options de rapport persistées dans `org.settings.report_options`. */
export type ReportOptions = Record<string, unknown>;

export type OrgSettings = {
  llm_provider?: string | null;
  di_threshold?: number | null;
  retention_days?: number | null;
  report_options?: ReportOptions | null;
  [key: string]: unknown;
};

export type OrgOut = {
  id: string;
  name: string;
  siren?: string | null;
  sector?: Sector | null;
  country?: string | null;
  company_size?: string | null;
  dpo_name?: string | null;
  settings: OrgSettings;
};

export type OrgUpdate = {
  name?: string;
  siren?: string;
  sector?: Sector;
  country?: string;
  company_size?: string;
  dpo_name?: string;
};

export type OrgSettingsUpdate = {
  llm_provider?: string;
  /** 0..1 */
  di_threshold?: number;
  /** 1..3650 */
  retention_days?: number;
  report_options?: ReportOptions;
};

export async function fetchOrg(): Promise<OrgOut> {
  const { data } = await api.get<OrgOut>('/org');
  return data;
}

export async function updateOrg(body: OrgUpdate): Promise<OrgOut> {
  const { data } = await api.patch<OrgOut>('/org', body);
  return data;
}

export async function updateOrgSettings(
  body: OrgSettingsUpdate,
): Promise<OrgOut> {
  const { data } = await api.patch<OrgOut>('/org/settings', body);
  return data;
}

/* ─── Compte courant ─────────────────────────────────────────────────────── */

export type MeOut = {
  id: string;
  email: string;
  first_name?: string | null;
  role: Role;
  org_id: string;
};

export type MeUpdate = {
  first_name?: string;
};

export async function fetchMe(): Promise<MeOut> {
  const { data } = await api.get<MeOut>('/me');
  return data;
}

export async function updateMe(body: MeUpdate): Promise<MeOut> {
  const { data } = await api.patch<MeOut>('/me', body);
  return data;
}

/* ─── Membres ────────────────────────────────────────────────────────────── */

export type MemberOut = {
  id: string;
  email: string;
  first_name?: string | null;
  role: Role;
  created_at: string;
};

export async function fetchMembers(): Promise<MemberOut[]> {
  const { data } = await api.get<MemberOut[]>('/org/members');
  return data;
}

export async function updateMemberRole(
  userId: string,
  role: Role,
): Promise<MemberOut> {
  const { data } = await api.patch<MemberOut>(`/org/members/${userId}`, {
    role,
  });
  return data;
}

/* ─── Invitations ────────────────────────────────────────────────────────── */

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export type InvitationOut = {
  id: string;
  email: string;
  role: InvitableRole;
  status: InvitationStatus;
  created_at: string;
  expires_at: string;
};

export type InvitationCreate = {
  email: string;
  role: InvitableRole;
};

export type InvitationCreateResult = {
  invitation: InvitationOut;
  invite_url: string;
  email_sent: boolean;
};

export async function fetchInvitations(): Promise<InvitationOut[]> {
  const { data } = await api.get<InvitationOut[]>('/org/invitations');
  return data;
}

export async function createInvitation(
  body: InvitationCreate,
): Promise<InvitationCreateResult> {
  const { data } = await api.post<InvitationCreateResult>(
    '/org/invitations',
    body,
  );
  return data;
}

export async function revokeInvitation(id: string): Promise<void> {
  await api.delete(`/org/invitations/${id}`);
}

/* ─── Helpers d'affichage / erreurs ──────────────────────────────────────── */

/** Libellé FR du rôle pour l'UI (owner et admin partagent « Administrateur »). */
export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Administrateur',
  admin: 'Administrateur',
  editor: 'Éditeur',
  viewer: 'Lecture seule',
};

/** Un utilisateur owner/admin peut administrer l'organisation. */
export function canManageOrg(role: Role | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Extrait le message d'erreur lisible d'une réponse `application/problem+json`
 * (champ `detail`), avec repli sur le message d'exception.
 */
export function problemDetail(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const resp = (err as { response?: { data?: { detail?: unknown } } }).response;
    const detail = resp?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
  }
  return fallback;
}
