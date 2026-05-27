import { Users } from 'lucide-react';
import { Topbar } from '@/components/app/Topbar';
import { ComingSoonPanel } from '@/components/app/ComingSoonPanel';

export default function EquipePage() {
  return (
    <>
      <Topbar crumbs={[{ label: 'Équipe & permissions' }]} />
      <ComingSoonPanel
        icon={Users}
        title="Équipe & permissions"
        description="Invitez vos collègues, attribuez des rôles (Owner / Auditeur / Lecteur) et gérez l'accès aux audits sensibles par organisation."
        bullets={[
          "Aujourd'hui : votre compte est le seul Owner de l'organisation (auto-provisionnée à la création).",
          'Phase 2 : invitations par email, RBAC fin (lecture audits = rôle Lecteur, lancer audit = rôle Auditeur, paramètres = rôle Owner), traçabilité des actions.',
        ]}
      />
    </>
  );
}
