'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, Building2, Users, FileCheck, Sparkles } from 'lucide-react';
import { Topbar } from '@/components/app/Topbar';
import { OnboardingStepper } from '@/components/onboarding/OnboardingStepper';
import { SectionHead } from '@/components/product/SectionHead';
import { Choice } from '@/components/product/Choice';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'auditiq.onboarding';

interface OnboardingState {
  step: 1 | 2 | 3 | 4 | 5;
  profile: {
    raison_sociale: string;
    siren: string;
    secteur: string;
    pays: string;
    taille: 'tpe' | 'pme' | 'eti' | 'grande' | '';
  };
  useCases: string[];
  checklist: {
    dataset: boolean;
    modele: boolean;
    dpo: boolean;
  };
}

const DEFAULT_STATE: OnboardingState = {
  step: 1,
  profile: { raison_sociale: '', siren: '', secteur: '', pays: 'France', taille: '' },
  useCases: [],
  checklist: { dataset: false, modele: false, dpo: false },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [state, setState] = React.useState<OnboardingState>(DEFAULT_STATE);
  const [isMounted, setIsMounted] = React.useState(false);

  // Hydrate from localStorage on mount
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time hydration
    setIsMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as OnboardingState;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time hydration
        setState(parsed);
      } catch {
        // fallback to default
      }
    }
  }, []);

  // Persist to localStorage on state change (debounced)
  React.useEffect(() => {
    if (!isMounted) return;
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, 500);
    return () => clearTimeout(timer);
  }, [state, isMounted]);

  const updateProfile = (field: keyof OnboardingState['profile'], value: string) => {
    setState((prev) => ({
      ...prev,
      profile: { ...prev.profile, [field]: value },
    }));
  };

  const toggleUseCase = (uc: string) => {
    setState((prev) => ({
      ...prev,
      useCases: prev.useCases.includes(uc)
        ? prev.useCases.filter((u) => u !== uc)
        : [...prev.useCases, uc],
    }));
  };

  const toggleChecklist = (field: keyof OnboardingState['checklist'], value: boolean) => {
    setState((prev) => ({
      ...prev,
      checklist: { ...prev.checklist, [field]: value },
    }));
  };

  const goToStep = (step: OnboardingState['step']) => {
    setState((prev) => ({ ...prev, step }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleComplete = () => {
    localStorage.removeItem(STORAGE_KEY);
    router.push('/app/audits/nouveau');
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-bg">
      <Topbar crumbs={[{ label: 'Configuration' }]} />
      <OnboardingStepper currentStep={state.step} />

      <main className="mx-auto max-w-2xl px-6 py-12">
        {/* ═════════════════════════════════════════════════════════════
            STEP 1: Bienvenue
            ═════════════════════════════════════════════════════════════ */}
        {state.step === 1 && (
          <div className="space-y-8">
            <SectionHead
              eyebrow="Étape 1 · Bienvenue"
              title="Bienvenue chez AuditIQ."
              sub="Nous allons configurer votre premier audit de fairness IA en 5 étapes. Comptez environ 5 minutes pour configurer et lancer un audit ; le calcul prend ensuite 5 à 30 secondes."
            />

            <div className="space-y-6">
              <div className="flex gap-4 rounded-lg border border-accent-border bg-accent-softer p-6">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-accent text-accent-fg">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h4 className="mb-1 font-medium text-fg">
                    Vous êtes au bon endroit pour documenter vos systèmes d&apos;IA dans l&apos;esprit de l&apos;AI Act.
                  </h4>
                  <p className="text-[13px] leading-relaxed text-fg-secondary">
                    AuditIQ détecte, explique et documente les biais — sans modifier vos modèles. Vous obtiendrez un rapport documenté, exportable en PDF / Excel, aligné sur le règlement (UE) 2024/1689.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 rounded-lg border border-border-subtle bg-surface p-4">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">M1</span>
                  <h4 className="font-medium text-fg">Module 1 — Audit supervisé</h4>
                  <p className="text-[12px] leading-relaxed text-fg-muted">
                    Vous avez un jeu de données avec la décision réelle et un attribut protégé.
                  </p>
                </div>
                <div className="space-y-2 rounded-lg border border-border-subtle bg-surface p-4">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">M2</span>
                  <h4 className="font-medium text-fg">Module 2 — Détection non supervisée</h4>
                  <p className="text-[12px] leading-relaxed text-fg-muted">
                    Vous n&apos;avez pas d&apos;attribut protégé explicite — on cherche des groupes au traitement atypique.
                  </p>
                </div>
                <div className="space-y-2 rounded-lg border border-border-subtle bg-surface p-4">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">M3</span>
                  <h4 className="font-medium text-fg">Module 3 — Audit LLM &amp; chatbot</h4>
                  <p className="text-[12px] leading-relaxed text-fg-muted">
                    Vous testez un chatbot ou un assistant IA via des paires de questions quasi identiques.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between border-t border-border-subtle pt-6">
              <Button variant="secondary" asChild>
                <Link href="/connexion" className="gap-2">
                  <ArrowLeft size={16} />
                  Se déconnecter
                </Link>
              </Button>
              <Button onClick={() => goToStep(2)} className="gap-2">
                Commencer <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            STEP 2: Profil PME
            ═════════════════════════════════════════════════════════════ */}
        {state.step === 2 && (
          <div className="space-y-8">
            <SectionHead
              eyebrow="Étape 2 · Profil entreprise"
              title="Quelle est la taille de votre organisation ?"
              sub="Ces informations adaptent les exigences AI Act recommandées dans vos rapports et nous permettent d'ajuster les seuils par défaut."
            />

            <div className="grid gap-3 md:grid-cols-2">
              {[
                { id: 'tpe', label: 'TPE — moins de 10 salariés', desc: 'Pas de DPO interne. Seuils plus tolérants.', icon: Building2 },
                { id: 'pme', label: 'PME — 10 à 250 salariés', desc: 'Cible principale AuditIQ. Seuils alignés AI Act.', icon: Building2 },
                { id: 'eti', label: 'ETI — 251 à 5 000 salariés', desc: 'Plusieurs lignes métier. Gouvernance centralisée.', icon: Building2 },
                { id: 'grande', label: 'Grande entreprise — 5 000+ salariés', desc: 'Périmètre groupe, multi-pays. Contactez-nous.', icon: Building2 },
              ].map((opt) => (
                <Choice
                  key={opt.id}
                  selected={state.profile.taille === opt.id}
                  onClick={() => updateProfile('taille', opt.id)}
                  title={opt.label}
                  desc={opt.desc}
                  icon={opt.icon}
                />
              ))}
            </div>

            <div className="space-y-4 rounded-lg border border-border-subtle bg-surface p-6">
              <h4 className="font-medium text-fg">Informations entreprise</h4>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                      Raison sociale
                    </label>
                    <input
                      type="text"
                      value={state.profile.raison_sociale}
                      onChange={(e) => updateProfile('raison_sociale', e.target.value)}
                      className={cn(
                        'w-full rounded-md border border-border-default bg-surface-2 px-3 py-2 text-sm',
                        'placeholder:text-fg-muted',
                        'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
                      )}
                      placeholder="Cabinet Tessier & Associés"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                      SIREN
                    </label>
                    <input
                      type="text"
                      value={state.profile.siren}
                      onChange={(e) => updateProfile('siren', e.target.value)}
                      className={cn(
                        'w-full rounded-md border border-border-default bg-surface-2 px-3 py-2 text-sm',
                        'placeholder:text-fg-muted',
                        'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
                      )}
                      placeholder="824 561 832"
                    />
                    <p className="text-[11px] text-fg-muted">Utilisé sur les rapports générés</p>
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                      Secteur
                    </label>
                    <select
                      value={state.profile.secteur}
                      onChange={(e) => updateProfile('secteur', e.target.value)}
                      className={cn(
                        'w-full rounded-md border border-border-default bg-surface-2 px-3 py-2 text-sm',
                        'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
                      )}
                    >
                      <option value="">Choisir un secteur</option>
                      <option value="rh">Conseil en ressources humaines</option>
                      <option value="finance">Banque & finance</option>
                      <option value="industrie">Industrie / fabrication</option>
                      <option value="sante">Santé</option>
                      <option value="sav">Service client / SAV</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                      Pays
                    </label>
                    <select
                      value={state.profile.pays}
                      onChange={(e) => updateProfile('pays', e.target.value)}
                      className={cn(
                        'w-full rounded-md border border-border-default bg-surface-2 px-3 py-2 text-sm',
                        'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
                      )}
                    >
                      <option value="France">France</option>
                      <option value="Belgique">Belgique</option>
                      <option value="Luxembourg">Luxembourg</option>
                      <option value="Allemagne">Allemagne</option>
                    </select>
                    <p className="text-[11px] text-fg-muted">Influence le droit applicable cité dans les rapports</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between border-t border-border-subtle pt-6">
              <Button onClick={() => goToStep(1)} variant="secondary" className="gap-2">
                <ArrowLeft size={16} />
                Retour
              </Button>
              <Button onClick={() => goToStep(3)} className="gap-2">
                Continuer <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            STEP 3: Cas d'usage
            ═════════════════════════════════════════════════════════════ */}
        {state.step === 3 && (
          <div className="space-y-8">
            <SectionHead
              eyebrow="Étape 3 · Cas d'usage prioritaire"
              title="Quel système d'IA voulez-vous auditer en premier ?"
              sub="Choisissez le cas qui vous concerne le plus. Ce choix oriente le module recommandé."
            />

            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  id: 'rh-scoring',
                  module: 'Module 1 — supervisé',
                  title: 'Scoring de candidatures (CV / recrutement)',
                  desc: 'Détection de biais par genre, âge, origine.',
                },
                {
                  id: 'rh-promotion',
                  module: 'Module 1 — supervisé',
                  title: 'Attribution prime / promotion',
                  desc: 'Audit d\'un modèle de décision RH interne.',
                },
                {
                  id: 'credit',
                  module: 'Module 2 — non supervisé',
                  title: 'Scoring de crédit / acceptation',
                  desc: 'Détection de proxies sans accès aux attributs sensibles.',
                },
                {
                  id: 'assurance',
                  module: 'Module 2 — non supervisé',
                  title: 'Tarification assurance',
                  desc: 'Identification de clusters tarifaires déviants.',
                },
                {
                  id: 'chatbot',
                  module: 'Module 3 — LLM',
                  title: 'Chatbot SAV ou support client',
                  desc: 'Test de l\'équité des réponses selon genre, origine, handicap.',
                },
                {
                  id: 'assistant',
                  module: 'Module 3 — LLM',
                  title: 'Assistant IA interne (RH, juridique)',
                  desc: 'Audit d\'un copilote sur 6 axes sensibles.',
                },
              ].map((uc) => (
                <button
                  key={uc.id}
                  type="button"
                  onClick={() => toggleUseCase(uc.id)}
                  className={cn(
                    'flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors',
                    state.useCases.includes(uc.id)
                      ? 'border-accent bg-accent-softer'
                      : 'border-border-default bg-surface hover:border-border-strong',
                  )}
                >
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-accent">
                    {uc.module}
                  </span>
                  <span className="font-medium text-fg">{uc.title}</span>
                  <span className="text-[12px] text-fg-muted">{uc.desc}</span>
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-2 p-4">
              <p className="text-[13px] leading-relaxed text-fg-secondary">
                <strong>À noter :</strong> Le module recommandé dépend du dataset disponible. Si vous n&apos;avez pas la
                variable sensible, AuditIQ vous orientera automatiquement vers le Module 2 (non supervisé).
              </p>
            </div>

            <div className="flex justify-between border-t border-border-subtle pt-6">
              <Button onClick={() => goToStep(2)} variant="secondary" className="gap-2">
                <ArrowLeft size={16} />
                Retour
              </Button>
              <Button onClick={() => goToStep(4)} className="gap-2">
                Continuer <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            STEP 4: Préparation / Checklist
            ═════════════════════════════════════════════════════════════ */}
        {state.step === 4 && (
          <div className="space-y-8">
            <SectionHead
              eyebrow="Étape 4 · Préparation"
              title="Préparons votre premier audit."
              sub="Voici la checklist de démarrage. Vous pouvez la compléter dans l'ordre — chaque élément débloque le suivant. Comptez quelques minutes pour tout valider."
            />

            <div className="space-y-3">
              {/* Item 1: Profile (done) */}
              <div className="flex gap-4 rounded-lg border border-border-subtle bg-surface p-4">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
                  <CheckCircle2 size={20} className="text-status-pass" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-fg">Profil entreprise configuré</div>
                  <div className="mt-1 text-[13px] text-fg-muted">
                    {state.profile.taille && `${state.profile.taille.toUpperCase()} · `}
                    {state.profile.secteur || 'Secteur non sélectionné'} ·{' '}
                    {state.profile.pays}
                  </div>
                </div>
                <div className="flex items-center text-[11px] font-semibold text-status-pass">Fait</div>
              </div>

              {/* Item 2: Use cases (done) */}
              <div className="flex gap-4 rounded-lg border border-border-subtle bg-surface p-4">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
                  <CheckCircle2 size={20} className="text-status-pass" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-fg">Cas d&apos;usage choisi</div>
                  <div className="mt-1 text-[13px] text-fg-muted">
                    {state.useCases.length > 0
                      ? `${state.useCases.length} cas sélectionné(s)`
                      : 'Aucun cas sélectionné'}
                  </div>
                </div>
                <div className="flex items-center text-[11px] font-semibold text-status-pass">Fait</div>
              </div>

              {/* Item 3: Dataset (current) */}
              <div
                className={cn(
                  'flex gap-4 rounded-lg border p-4',
                  state.checklist.dataset
                    ? 'border-status-pass bg-status-pass/5'
                    : 'border-accent-border bg-accent-soft/20',
                )}
              >
                <label className="flex cursor-pointer gap-4 flex-1">
                  <input
                    type="checkbox"
                    checked={state.checklist.dataset}
                    onChange={(e) => toggleChecklist('dataset', e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border border-border-strong accent-accent"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-fg">Importer votre premier jeu de données</div>
                    <div className="mt-1 text-[13px] text-fg-muted">
                      Format CSV · jusqu&apos;à 10 Mo
                    </div>
                  </div>
                </label>
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/app/audits/nouveau" className="gap-1">
                    Importer <ArrowRight size={14} />
                  </Link>
                </Button>
              </div>

              {/* Item 4: Team (optional) */}
              <div className="flex gap-4 rounded-lg border border-border-subtle bg-surface p-4">
                <label className="flex cursor-pointer gap-4 flex-1">
                  <input
                    type="checkbox"
                    checked={state.checklist.modele}
                    onChange={(e) => toggleChecklist('modele', e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border border-border-strong accent-accent"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-fg">Inviter votre équipe (optionnel)</div>
                    <div className="mt-1 text-[13px] text-fg-muted">
                      Vous pourrez attribuer les rôles Administrateur, Éditeur ou Lecture seule ensuite
                    </div>
                  </div>
                </label>
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/app/equipe" className="gap-1">
                    Inviter
                  </Link>
                </Button>
              </div>

              {/* Item 5: Launch (locked) */}
              <div className="flex gap-4 rounded-lg border border-border-subtle bg-surface p-4 opacity-60">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center border border-border-subtle rounded-full" />
                <div className="flex-1">
                  <div className="font-medium text-fg">Lancer votre premier audit</div>
                  <div className="mt-1 text-[13px] text-fg-muted">
                    Le calcul prend 5 à 30 secondes
                  </div>
                </div>
                <div className="flex items-center text-[11px] font-mono text-fg-muted">À débloquer</div>
              </div>
            </div>

            <div className="flex justify-between border-t border-border-subtle pt-6">
              <Button onClick={() => goToStep(3)} variant="secondary" className="gap-2">
                <ArrowLeft size={16} />
                Retour
              </Button>
              <Button onClick={() => goToStep(5)} className="gap-2">
                Continuer <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            STEP 5: Tutoriel & Démarrer
            ═════════════════════════════════════════════════════════════ */}
        {state.step === 5 && (
          <div className="space-y-8">
            <SectionHead
              eyebrow="Étape 5 · Premier audit"
              title="Tout est prêt pour lancer votre premier audit."
              sub="Lancez le wizard d'audit — ou allez directement au tableau de bord."
            />

            <div className="space-y-4 rounded-lg border border-accent-border bg-accent-softer p-6">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md bg-accent text-accent-fg">
                  <Sparkles size={28} />
                </div>
                <div className="flex-1">
                  <h4 className="mb-1 font-medium text-fg">Premier audit guidé — Module 1</h4>
                  <p className="text-[13px] text-fg-secondary">
                    Le wizard (~5 min) propose un échantillon « Recrutement RH » de 80 lignes à
                    l&apos;étape 2 — idéal pour une première prise en main.
                  </p>
                </div>
                <Button asChild className="gap-2">
                  <Link href="/app/audits/nouveau" className="gap-2">
                    Démarrer <ArrowRight size={16} />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" asChild>
                <Link href="/app">Aller au tableau de bord</Link>
              </Button>
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-2 p-4">
              <p className="text-[13px] leading-relaxed text-fg-secondary">
                <strong>Confidentialité :</strong> Vos fichiers sont stockés de façon chiffrée dans
                l&apos;Union européenne et supprimés automatiquement après 30 jours.
              </p>
            </div>

            <div className="flex justify-between border-t border-border-subtle pt-6">
              <Button onClick={() => goToStep(4)} variant="secondary" className="gap-2">
                <ArrowLeft size={16} />
                Retour
              </Button>
              <Button onClick={handleComplete} className="gap-2">
                Lancer mon premier audit <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
