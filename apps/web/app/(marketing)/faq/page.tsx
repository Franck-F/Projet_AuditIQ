import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/marketing/Eyebrow';
import { FaqItem } from '@/components/marketing/FaqItem';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Toutes les questions fréquentes sur AuditIQ : produit, conformité, sécurité, tarification, intégration.',
};

const SECTIONS = [
  { id: 'produit', label: 'Produit' },
  { id: 'conformite', label: 'Conformité & AI Act' },
  { id: 'securite', label: 'Sécurité & données' },
  { id: 'tarification', label: 'Tarification' },
  { id: 'integration', label: 'Intégration' },
  { id: 'support', label: 'Support' },
  { id: 'commercial', label: 'Commercial' },
];

function FaqCategory({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-12 scroll-mt-32 last:mb-0">
      <h2 className="mb-6 text-h2 font-display font-medium tracking-[-0.015em] text-fg">
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export default function FaqPage() {
  return (
    <>
      <header className="border-b border-border-subtle pt-[clamp(64px,8vw,96px)] pb-12">
        <Container>
          <Reveal>
            <Eyebrow accent>FAQ</Eyebrow>
            <h1 className="mt-4 max-w-[22ch] font-display text-[clamp(36px,4vw,48px)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
              Tout ce que vous voulez savoir avant de réserver une démo.
            </h1>
            <p className="mt-5 max-w-[60ch] text-[clamp(18px,1.3vw,20px)] leading-relaxed text-fg-secondary">
              42 questions regroupées par thème. Vous ne trouvez pas votre réponse ? Posez-la
              directement à notre équipe via la{' '}
              <Link href="/contact" className="text-accent hover:underline">
                page contact
              </Link>
              .
            </p>
          </Reveal>
        </Container>
      </header>

      <section className="py-24">
        <Container>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr] lg:gap-12">
            <aside className="lg:sticky lg:top-[calc(var(--nav-h)+24px)] lg:self-start">
              <nav
                className="flex flex-wrap gap-1.5 lg:flex-col lg:flex-nowrap lg:gap-0.5"
                aria-label="Catégories FAQ"
              >
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="rounded-md px-3 py-2 text-sm text-fg-secondary transition-colors hover:bg-surface-2 hover:text-fg"
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
            </aside>

            <main>
              <FaqCategory id="produit" title="Produit">
                <FaqItem question="À qui s'adresse AuditIQ ?" defaultOpen>
                  <p>
                    Aux PME et ETI françaises et européennes qui déploient des systèmes d&apos;IA
                    dans leurs opérations (RH, crédit, scoring, chatbot, assurance, marketing) et
                    qui doivent documenter la conformité de ces systèmes au regard de l&apos;AI
                    Act.
                  </p>
                  <p>
                    Les profils utilisateurs typiques : responsable conformité, DPO, DRH,
                    responsable innovation, dirigeant, équipe data limitée (1-3 personnes).
                  </p>
                </FaqItem>
                <FaqItem question="Quels types de modèles AuditIQ peut-il auditer ?">
                  <p>
                    Trois familles : modèles supervisés de classification ou de scoring (Module 1),
                    datasets sans cible explicite (Module 2), assistants LLM et chatbots (Module
                    3). Compatible avec vos modèles internes, des APIs externes (OpenAI, Mistral,
                    Anthropic), et des modèles déployés en production.
                  </p>
                </FaqItem>
                <FaqItem question="Faut-il avoir une équipe data interne ?">
                  <p>
                    Non. AuditIQ est conçu pour être utilisable sans bagage statistique. Le mode
                    expert reste disponible pour les équipes data qui souhaitent ajuster les
                    métriques, les agrégations ou les intervalles de confiance.
                  </p>
                </FaqItem>
                <FaqItem question="Quelle quantité de données puis-je analyser ?">
                  <p>
                    Jusqu&apos;à 5 millions de lignes en standard sur les paliers PME et
                    Entreprise. Datasets plus volumineux : optimisations possibles sur le palier
                    Souverain ou en architecture dédiée.
                  </p>
                </FaqItem>
                <FaqItem question="AuditIQ corrige-t-il les biais ?">
                  <p>
                    Non. AuditIQ détecte, explique, alerte et documente. La correction d&apos;un
                    modèle relève de votre équipe data ou de votre prestataire ML. Nous proposons
                    des recommandations hiérarchisées d&apos;actions, mais nous n&apos;intervenons
                    pas dans le code du modèle.
                  </p>
                </FaqItem>
                <FaqItem question="AuditIQ est-il disponible en anglais ?">
                  <p>
                    Interface, documentation et rapports principalement en français. La banque de
                    prompts LLM est disponible en français, anglais et espagnol. Une version
                    anglaise complète de la plateforme est planifiée pour Q4 2026.
                  </p>
                </FaqItem>
              </FaqCategory>

              <FaqCategory id="conformite" title="Conformité & AI Act">
                <FaqItem question="Mon entreprise est-elle concernée par l'AI Act ?">
                  <p>
                    Probablement, si vous utilisez ou éditez une IA pour : tri de CV, scoring
                    crédit, tarification d&apos;assurance, services essentiels, biométrie, justice,
                    éducation, santé. Voir la{' '}
                    <Link href="/pme" className="text-accent hover:underline">
                      page PME : pourquoi maintenant
                    </Link>{' '}
                    pour une check-list de qualification.
                  </p>
                </FaqItem>
                <FaqItem question="AuditIQ délivre-t-il un certificat de conformité ?">
                  <p>
                    Non. Un certificat formel relève d&apos;un organisme notifié au sens de
                    l&apos;article 43 du règlement (UE) 2024/1689. AuditIQ produit une analyse
                    documentée des écarts mesurés et un rapport opposable. La qualification
                    réglementaire finale appartient à votre responsable conformité ou DPO.
                  </p>
                </FaqItem>
                <FaqItem question="Quels articles de l'AI Act sont couverts ?">
                  <p>
                    Articles 10 (gouvernance des données), 13 (transparence), 15 (exactitude et
                    robustesse), et annexe IV (documentation technique). Pour les obligations
                    spécifiques aux fournisseurs (article 16), AuditIQ produit les pièces fairness
                    ; les autres pièces (système qualité, surveillance post-marché) restent à votre
                    charge.
                  </p>
                </FaqItem>
                <FaqItem question="Le rapport AuditIQ est-il opposable en cas de contrôle ?">
                  <p>
                    Le rapport est signé numériquement, horodaté par notre tiers d&apos;horodatage
                    qualifié (CertEurope), et archivé dans un format inviolable. Il constitue une
                    pièce probante au sens du droit français. Il ne se substitue cependant pas à
                    l&apos;expertise d&apos;un cabinet d&apos;avocats spécialisé en cas de
                    contentieux.
                  </p>
                </FaqItem>
                <FaqItem question="Et le droit français ?">
                  <p>
                    AuditIQ rattache chaque écart aux textes français pertinents : article L.1132-1
                    du Code du travail (discrimination dans l&apos;emploi), article 225-1 du Code
                    pénal, RGPD article 22 (décisions automatisées). Ces rattachements sont
                    indicatifs et ne remplacent pas un avis juridique.
                  </p>
                </FaqItem>
                <FaqItem question="Comment se positionne AuditIQ par rapport à la CNIL ?">
                  <p>
                    Nous sommes en dialogue ouvert avec la CNIL, qui suit le marché des outils
                    fairness. AuditIQ n&apos;est pas labellisé par la CNIL — aucun outil ne
                    l&apos;est à ce jour. Nous appliquons les recommandations de la CNIL sur
                    l&apos;évaluation des systèmes d&apos;IA (publication d&apos;octobre 2023).
                  </p>
                </FaqItem>
              </FaqCategory>

              <FaqCategory id="securite" title="Sécurité & données">
                <FaqItem question="Où sont stockées mes données ?">
                  <p>
                    Sur OVHcloud, datacenters de Roubaix et Strasbourg. Aucun transfert hors UE, à
                    aucune étape. Pour le palier Souverain : hébergement SecNumCloud dédié sur
                    infrastructure 3DS Outscale.
                  </p>
                </FaqItem>
                <FaqItem question="Comment sont chiffrées les données ?">
                  <p>
                    Chiffrement AES-256 au repos (objet et base de données), TLS 1.3 en transit.
                    Sur le palier Souverain : option BYOK (Bring Your Own Key) avec rotation
                    hebdomadaire automatique.
                  </p>
                </FaqItem>
                <FaqItem question="Combien de temps conservez-vous mes données ?">
                  <p>
                    Données d&apos;audit (résultats, rapports) : 5 ans par défaut, configurable
                    jusqu&apos;à illimité. Données sources (datasets uploadés) : 90 jours après
                    l&apos;audit, puis suppression automatique. Suppression sur demande sous 72h.
                  </p>
                </FaqItem>
                <FaqItem question="Êtes-vous certifiés ISO 27001 ?">
                  <p>
                    Certification ISO 27001 en cours, audit en Q3 2026. Notre PSSI est aligné sur
                    les exigences. Le rapport de pré-audit (juin 2025) est disponible sur demande
                    sous NDA.
                  </p>
                </FaqItem>
                <FaqItem question="Comment se passe une demande de suppression ?">
                  <p>
                    Demande à formuler par un admin via le panel de paramètres, ou par email à
                    dpo@auditiq.fr. Confirmation sous 24h, suppression effective sous 72h,
                    certificat de suppression émis.
                  </p>
                </FaqItem>
                <FaqItem question="Mes données servent-elles à entraîner vos modèles ?">
                  <p>
                    Non. Aucune donnée client n&apos;est utilisée pour entraîner ou améliorer nos
                    modèles. La banque de prompts LLM est maintenue manuellement par notre équipe
                    linguiste, sans réutilisation de prompts client.
                  </p>
                </FaqItem>
              </FaqCategory>

              <FaqCategory id="tarification" title="Tarification">
                <FaqItem question="Existe-t-il un essai gratuit ?">
                  <p>
                    Oui. Le palier Découverte est gratuit et permanent (1 audit Module 1/mois,
                    dataset ≤ 5 000 lignes). Le palier PME est en essai 14 jours sans carte
                    bancaire. Voir{' '}
                    <Link href="/tarifs" className="text-accent hover:underline">
                      la page tarifs
                    </Link>
                    .
                  </p>
                </FaqItem>
                <FaqItem question="Y a-t-il un engagement minimum ?">
                  <p>
                    Non. Facturation mensuelle sans durée minimale. Vous pouvez annuler à tout
                    moment depuis votre panel — l&apos;annulation prend effet à la fin de la
                    période en cours.
                  </p>
                </FaqItem>
                <FaqItem question="Acceptez-vous les marchés publics ?">
                  <p>
                    Oui sur les paliers Entreprise et Souverain. Devis sur 30 ou 60 jours, bons de
                    commande publics acceptés.
                  </p>
                </FaqItem>
                <FaqItem question="Quelle remise pour le paiement annuel ?">
                  <p>
                    15 % sur tous les paliers payants. Facturation en une seule fois, en début
                    d&apos;année d&apos;abonnement. SEPA disponible.
                  </p>
                </FaqItem>
              </FaqCategory>

              <FaqCategory id="integration" title="Intégration">
                <FaqItem question="Comment importer mes données ?">
                  <p>
                    Quatre options : upload manuel (CSV, XLSX, Parquet, JSON), connecteurs natifs
                    (Workday, BambooHR, Snowflake, BigQuery, PostgreSQL), API REST, ou export
                    depuis votre solution existante. La validation de schéma est automatique.
                  </p>
                </FaqItem>
                <FaqItem question="Comment connecter mon chatbot LLM ?">
                  <p>
                    Via une clé API du fournisseur (OpenAI, Mistral, Anthropic, Cohere) ou via une
                    URL d&apos;endpoint custom. AuditIQ gère le rate limiting, retry, et budget
                    API plafonné pour éviter les coûts non maîtrisés.
                  </p>
                </FaqItem>
                <FaqItem question="SSO et authentification ?">
                  <p>
                    SSO SAML 2.0 et OIDC sur les paliers Entreprise et Souverain. Compatible Okta,
                    Azure AD, Google Workspace, OneLogin. MFA obligatoire sur tous les paliers
                    payants.
                  </p>
                </FaqItem>
                <FaqItem question="Existe-t-il une API publique ?">
                  <p>
                    Oui sur les paliers Entreprise et Souverain. API REST documentée pour : lancer
                    un audit, récupérer les résultats, télécharger les rapports, lister
                    l&apos;historique. Pas d&apos;API de modification — tout audit modifié laisse
                    trace dans le journal d&apos;activité.
                  </p>
                </FaqItem>
              </FaqCategory>

              <FaqCategory id="support" title="Support">
                <FaqItem question="Comment se passe l'onboarding ?">
                  <p>
                    Palier Découverte : autonome via documentation et chat IA. Palier PME : 4h
                    d&apos;onboarding accompagné incluses, avec un consultant en visio. Palier
                    Entreprise : 1 jour. Palier Souverain : 2 jours + formation équipe.
                  </p>
                </FaqItem>
                <FaqItem question="Délais de réponse du support ?">
                  <p>
                    Découverte : communautaire (Discord, sans SLA). PME : 24h ouvrées. Entreprise :
                    4h en jour ouvré. Souverain : SLA personnalisé jusqu&apos;à 1h.
                  </p>
                </FaqItem>
                <FaqItem question="Existe-t-il une documentation publique ?">
                  <p>
                    Oui —{' '}
                    <Link href="/ressources" className="text-accent hover:underline">
                      documentation et ressources
                    </Link>{' '}
                    accessibles sans compte. La documentation technique avancée (API, structures
                    de rapport, schémas de données) est accessible aux utilisateurs connectés.
                  </p>
                </FaqItem>
                <FaqItem question="Y a-t-il une communauté utilisateur ?">
                  <p>
                    Oui — un canal Discord modéré (1 200 membres) et un meetup trimestriel à Paris
                    (50 places). Les annonces produit y sont faites une semaine avant la
                    communication officielle.
                  </p>
                </FaqItem>
              </FaqCategory>

              <FaqCategory id="commercial" title="Commercial">
                <FaqItem question="Comment se passe une démo ?">
                  <p>
                    30 minutes en visio, avec un consultant. Vous apportez un cas d&apos;usage et
                    idéalement un dataset anonymisé ; nous lançons l&apos;audit en live. À
                    l&apos;issue : un rapport pilote utilisable pour votre comité.
                  </p>
                </FaqItem>
                <FaqItem question="Proposez-vous un programme partenaires ?">
                  <p>
                    Oui — pour les cabinets de conseil, intégrateurs, ESN et cabinets
                    d&apos;avocats. Co-vente, co-formation, marges revendeur. Contactez
                    partners@auditiq.fr.
                  </p>
                </FaqItem>
                <FaqItem question="Êtes-vous référencés UGAP ?">
                  <p>
                    Référencement UGAP en cours, attendu Q3 2026. En attendant, marchés publics
                    traitables en gré à gré sous le seuil de 40 000 €.
                  </p>
                </FaqItem>
                <FaqItem question="Avez-vous un cas client comparable au nôtre ?">
                  <p>
                    Probablement. Nous accompagnons 47 PME au moment où nous écrivons ces lignes,
                    dans 9 secteurs. Demandez-nous un cas client de votre secteur, sous NDA.
                  </p>
                </FaqItem>
              </FaqCategory>
            </main>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <Reveal>
            <div className="grid grid-cols-1 items-center gap-8 rounded-2xl border border-border-default bg-surface p-[clamp(40px,6vw,64px)] lg:grid-cols-[1fr_auto]">
              <div>
                <Eyebrow accent>Question non listée</Eyebrow>
                <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
                  On vous répond.
                </h2>
                <p className="mt-3 max-w-[56ch] text-fg-secondary">
                  Notre équipe répond en moins de 24h ouvrées, même avant la signature.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button asChild variant="primary" size="lg">
                  <Link href="/contact">Poser une question</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/contact">Réserver une démo</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
