import { FileText } from 'lucide-react';
import { Topbar } from '@/components/app/Topbar';
import { ComingSoonPanel } from '@/components/app/ComingSoonPanel';

export default function RapportsPage() {
  return (
    <>
      <Topbar crumbs={[{ label: 'Rapports' }]} />
      <ComingSoonPanel
        icon={FileText}
        title="Bibliothèque de rapports"
        description="Une vue centralisée de tous vos rapports Excel et PDF générés, avec recherche, filtrage par date et tag, et partage via lien signé."
        bullets={[
          "Aujourd'hui : chaque rapport se télécharge depuis la page de son audit (Excel + PDF, boutons en bas).",
          'Phase 2 : recherche full-text, filtres avancés, partage public temporaire, comparaison de rapports.',
        ]}
        cta={{ label: 'Voir mes audits', href: '/app/audits' }}
      />
    </>
  );
}
