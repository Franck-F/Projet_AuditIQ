import { HelpCircle } from 'lucide-react';
import { Topbar } from '@/components/app/Topbar';
import { ComingSoonPanel } from '@/components/app/ComingSoonPanel';

export default function SupportPage() {
  return (
    <>
      <Topbar crumbs={[{ label: 'Aide & support' }]} />
      <ComingSoonPanel
        icon={HelpCircle}
        title="Centre d'aide"
        description="Documentation, FAQ, tutoriels vidéo et chat support pour vous accompagner dans vos audits AuditIQ."
        bullets={[
          "Aujourd'hui : la page marketing /faq couvre les questions fréquentes ; le formulaire /contact route vers l'équipe.",
          'Phase 2 : base de connaissances intégrée, recherche sémantique, support chat dans l\'app, tickets liés à un audit spécifique.',
        ]}
        cta={{ label: 'FAQ publique', href: '/faq' }}
      />
    </>
  );
}
