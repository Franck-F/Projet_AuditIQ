import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createInvitation,
  fetchInvitations,
  fetchMe,
  fetchMembers,
  fetchOrg,
  revokeInvitation,
  updateMe,
  updateMemberRole,
  updateOrg,
  updateOrgSettings,
  type InvitationCreate,
  type InvitationOut,
  type MeOut,
  type MeUpdate,
  type MemberOut,
  type OrgOut,
  type OrgSettingsUpdate,
  type OrgUpdate,
  type Role,
} from '@/lib/api/org';

const KEYS = {
  org: ['org'] as const,
  me: ['me'] as const,
  members: ['org', 'members'] as const,
  invitations: ['org', 'invitations'] as const,
};

/* ─── Lectures ───────────────────────────────────────────────────────────── */

export function useOrg() {
  return useQuery<OrgOut>({ queryKey: KEYS.org, queryFn: fetchOrg });
}

export function useMe() {
  return useQuery<MeOut>({ queryKey: KEYS.me, queryFn: fetchMe });
}

export function useMembers() {
  return useQuery<MemberOut[]>({ queryKey: KEYS.members, queryFn: fetchMembers });
}

export function useInvitations() {
  return useQuery<InvitationOut[]>({
    queryKey: KEYS.invitations,
    queryFn: fetchInvitations,
  });
}

/* ─── Mutations ──────────────────────────────────────────────────────────── */

export function useUpdateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OrgUpdate) => updateOrg(body),
    onSuccess: (data) => qc.setQueryData(KEYS.org, data),
  });
}

export function useUpdateOrgSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OrgSettingsUpdate) => updateOrgSettings(body),
    onSuccess: (data) => qc.setQueryData(KEYS.org, data),
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MeUpdate) => updateMe(body),
    onSuccess: (data) => qc.setQueryData(KEYS.me, data),
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      updateMemberRole(userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.members }),
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InvitationCreate) => createInvitation(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.invitations }),
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeInvitation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.invitations }),
  });
}
