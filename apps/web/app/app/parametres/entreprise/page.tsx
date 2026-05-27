import { Settings } from 'lucide-react';
import { Topbar } from '@/components/app/Topbar';
import { ComingSoonPanel } from '@/components/app/ComingSoonPanel';

export default function ParametresEntreprisePage() {
  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Paramètres', href: '/app/parametres/entreprise' },
          { label: 'Entreprise' },
        ]}
      />
      <ComingSoonPanel
        icon={Settings}
        title="Paramètres de l'entreprise"
        description="Réglages organisation : raison sociale, secteur, durée de rétention des données, choix du LLM par défaut (Gemini / Mistral), et personnalisation des seuils fairness."
        bullets={[
          "Aujourd'hui : tout est figé sur les valeurs par défaut (rétention 30 j, LLM = Gemini, seuils règle des 4/5).",
          'Phase 2 : surcharge par organisation, sélection du provider LLM par audit, et import/export des configurations.',
        ]}
      />
    </>
  );
}
