import { Lightbulb } from 'lucide-react';
import { Topbar } from '@/components/app/Topbar';
import { ComingSoonPanel } from '@/components/app/ComingSoonPanel';

export default function RecommandationsPage() {
  return (
    <>
      <Topbar crumbs={[{ label: 'Recommandations' }]} />
      <ComingSoonPanel
        icon={Lightbulb}
        title="Recommandations transversales"
        description="Suggestions cross-audits (re-weighting, pré-traitement, ajustement de seuils, modélisation alternative) priorisées par impact et alignées AI Act."
        bullets={[
          "Aujourd'hui : chaque rapport d'audit contient déjà ses propres recommandations contextualisées (panneau Interprétation).",
          'Phase 2 : agrégation cross-audits, priorisation par risque, suivi de mise en œuvre, lien direct vers les articles AI Act concernés.',
        ]}
        cta={{ label: 'Voir mes audits', href: '/app/audits' }}
      />
    </>
  );
}
