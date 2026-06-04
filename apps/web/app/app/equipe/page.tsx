import { MoreHorizontal } from 'lucide-react';
import { Topbar } from '@/components/app/Topbar';
import { MetricCard } from '@/components/product/MetricCard';
import { SectionHead } from '@/components/product/SectionHead';
import { StatusBadge } from '@/components/product/StatusBadge';
import { Avatar } from '@/components/product/Avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';

const TEAM_DATA = [
  {
    name: 'Léa Moreau',
    email: 'lea.moreau@exemple.fr',
    role: 'Responsable conformité',
    access: 'Administrateur',
    status: 'pass' as const,
  },
  {
    name: 'Karim Belaïd',
    email: 'karim.belaid@exemple.fr',
    role: 'Data scientist',
    access: 'Éditeur',
    status: 'pass' as const,
  },
  {
    name: 'Sofia Renard',
    email: 'sofia.renard@exemple.fr',
    role: 'Juriste IA',
    access: 'Éditeur',
    status: 'pass' as const,
  },
  {
    name: 'Tom Vasseur',
    email: 'tom.vasseur@cabinet.fr',
    role: 'Auditeur externe',
    access: 'Lecture seule',
    status: 'warn' as const,
  },
];

export default function EquipePage() {
  return (
    <>
      <Topbar
        title="Équipe & accès"
        crumbs={[
          { label: 'AuditIQ' },
          { label: 'Organisation' },
          { label: 'Équipe' },
        ]}
        actions={<Button variant="primary"><Icons.plus size={16} />Inviter un membre</Button>}
      />

      <div className="space-y-8">
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Membres actifs"
            value="4"
            delta={{ direction: 'neutral', text: '2 sièges disponibles' }}
          />
          <MetricCard
            label="Administrateurs"
            value="1"
          />
          <MetricCard
            label="Accès externes"
            value="1"
            delta={{ direction: 'neutral', text: 'auditeur · expire 30 j' }}
          />
        </div>

        <div>
          <SectionHead
            eyebrow="Membres"
            title="Qui a accès à l'espace"
            sub="Gérez les rôles et permissions. Les accès externes sont limités dans le temps."
          />

          <Card className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="px-6 py-3 text-left font-medium text-fg">Membre</th>
                    <th className="px-6 py-3 text-left font-medium text-fg">Rôle</th>
                    <th className="px-6 py-3 text-left font-medium text-fg">Niveau d'accès</th>
                    <th className="px-6 py-3 text-left font-medium text-fg">Statut</th>
                    <th className="px-6 py-3 text-right font-medium text-fg" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {TEAM_DATA.map((member) => (
                    <tr key={member.email} className="hover:bg-surface-2">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={member.name} size={32} />
                          <div className="min-w-0">
                            <div className="font-medium text-fg">{member.name}</div>
                            <div className="font-mono text-xs text-fg-muted truncate">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-fg-secondary">{member.role}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {member.access === 'Administrateur' && <Icons.shield size={12} />}
                          <span className="text-fg">{member.access}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge tone={member.status}>
                          {member.status === 'warn' ? 'Temporaire' : 'Actif'}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center size-8 rounded-md hover:bg-surface-2 text-fg-muted hover:text-fg transition-colors"
                          aria-label="Actions"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
