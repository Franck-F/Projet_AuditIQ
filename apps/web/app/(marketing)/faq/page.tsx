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
              31 questions regroupées par thème. Vous ne trouvez pas votre réponse ? Posez-la
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
                    jeux de données sans cible explicite (Module 2), assistants LLM et chatbots
                    (Module 3). L&apos;audit se fait à partir d&apos;un export CSV de vos données et
                    décisions — quel que soit l&apos;outil qui les a produites.
                  </p>
                </FaqItem>
                <FaqItem question="Faut-il avoir une équipe data interne ?">
                  <p>
                    Non. AuditIQ est conçu pour être utilisable sans bagage statistique : chaque
                    métrique est expliquée en langage clair, et les paramètres avancés restent
                    accessibles aux équipes data qui veulent les ajuster.
                  </p>
                </FaqItem>
                <FaqItem question="Quelle quantité de données puis-je analyser ?">
                  <p>
                    Jusqu&apos;à 5 000 lignes sur le palier Découverte et 1 million de lignes sur
                    le palier PME. Au-delà, voir les paliers Entreprise et Souverain sur{' '}
                    <Link href="/tarifs" className="text-accent hover:underline">
                      la page tarifs
                    </Link>
                    .
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
                    Interface, documentation et rapports sont en français. La banque de prompts du
                    module LLM est disponible en français et en anglais. Une version anglaise de la
                    plateforme est en feuille de route.
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
                    documentée des écarts mesurés et un rapport documenté et traçable. La qualification
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
                <FaqItem question="Le rapport AuditIQ peut-il servir en cas de contrôle ?">
                  <p>
                    Le rapport est documenté et traçable : identifiant d&apos;audit, horodatage,
                    méthodes et seuils explicités, données d&apos;entrée décrites. C&apos;est une
                    pièce utile pour documenter votre démarche auprès d&apos;un auditeur. La
                    signature électronique qualifiée est en feuille de route. Le rapport ne se
                    substitue pas à l&apos;expertise d&apos;un cabinet d&apos;avocats spécialisé en
                    cas de contentieux.
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
                    En Union européenne (Francfort · Paris). L&apos;interprétation en langage clair
                    s&apos;appuie sur le modèle Gemini par défaut, avec une option souveraine
                    Mistral.
                  </p>
                </FaqItem>
                <FaqItem question="Comment sont chiffrées les données ?">
                  <p>
                    Chiffrement en transit (TLS) et au repos, assuré par nos hébergeurs européens.
                    Cloisonnement strict des données entre organisations.
                  </p>
                </FaqItem>
                <FaqItem question="Combien de temps conservez-vous mes données ?">
                  <p>
                    Données sources (fichiers CSV importés) : supprimées automatiquement 30 jours
                    après l&apos;import. Résultats d&apos;audit et rapports : conservés dans votre
                    espace tant que votre compte est actif, et supprimés sur demande.
                  </p>
                </FaqItem>
                <FaqItem question="Êtes-vous certifiés ISO 27001 ?">
                  <p>
                    Pas encore : la démarche ISO 27001 est en cours. Aucune certification
                    n&apos;est revendiquée tant qu&apos;elle n&apos;est pas obtenue.
                  </p>
                </FaqItem>
                <FaqItem question="Comment se passe une demande de suppression ?">
                  <p>
                    Demande à formuler par email à dpo@auditiq.fr. Nous confirmons la prise en
                    compte puis la suppression effective de vos données.
                  </p>
                </FaqItem>
                <FaqItem question="Mes données servent-elles à entraîner vos modèles ?">
                  <p>
                    Non. Aucune donnée client n&apos;est utilisée pour entraîner ou améliorer des
                    modèles. La banque de prompts LLM est maintenue manuellement et versionnée,
                    sans réutilisation de prompts client.
                  </p>
                </FaqItem>
              </FaqCategory>

              <FaqCategory id="tarification" title="Tarification">
                <FaqItem question="Existe-t-il un essai gratuit ?">
                  <p>
                    Oui. Le palier Découverte est gratuit et permanent (1 audit Module 1/mois,
                    dataset ≤ 5 000 lignes), sans carte bancaire. Voir{' '}
                    <Link href="/tarifs" className="text-accent hover:underline">
                      la page tarifs
                    </Link>
                    .
                  </p>
                </FaqItem>
                <FaqItem question="Y a-t-il un engagement minimum ?">
                  <p>
                    Non. Les paliers payants sont facturés au mois, sans durée minimale.
                    L&apos;annulation prend effet à la fin de la période en cours.
                  </p>
                </FaqItem>
                <FaqItem question="Acceptez-vous les marchés publics ?">
                  <p>
                    Oui, sur devis, pour les paliers Entreprise et Souverain. Contactez-nous pour
                    les modalités.
                  </p>
                </FaqItem>
              </FaqCategory>

              <FaqCategory id="integration" title="Intégration">
                <FaqItem question="Comment importer mes données ?">
                  <p>
                    Par fichier CSV (UTF-8) — c&apos;est le seul format pris en charge
                    aujourd&apos;hui. La validation du fichier (taille, encodage, colonnes, valeurs
                    manquantes) est automatique. D&apos;autres formats et des connecteurs sont en
                    feuille de route.
                  </p>
                </FaqItem>
                <FaqItem question="Comment fonctionne l'audit LLM (Module 3) ?">
                  <p>
                    Le module s&apos;appuie sur une banque versionnée de paires de prompts
                    contrefactuels (français et anglais) couvrant six axes de discrimination. Les
                    réponses sont comparées sur la longueur, la polarité (analyse par lexique
                    bilingue, déterministe et documentée) et le taux de refus.
                  </p>
                </FaqItem>
                <FaqItem question="SSO et authentification ?">
                  <p>
                    L&apos;authentification se fait par e-mail/mot de passe ou via Google. SSO
                    (SAML / OIDC) et MFA sont en feuille de route.
                  </p>
                </FaqItem>
                <FaqItem question="Existe-t-il une API publique ?">
                  <p>
                    Pas encore. Une API REST publique (lancer un audit, récupérer les résultats,
                    télécharger les rapports) est en feuille de route.
                  </p>
                </FaqItem>
              </FaqCategory>

              <FaqCategory id="support" title="Support">
                <FaqItem question="Comment se passe l'onboarding ?">
                  <p>
                    Palier Découverte : en autonomie, via la documentation. Paliers payants : un
                    accompagnement à la prise en main est inclus, en visio, sur vos propres
                    données.
                  </p>
                </FaqItem>
                <FaqItem question="Délais de réponse du support ?">
                  <p>
                    Découverte : par e-mail, sans engagement de délai. PME : sous 24h ouvrées.
                    Entreprise et Souverain : support prioritaire, modalités définies au devis.
                  </p>
                </FaqItem>
                <FaqItem question="Existe-t-il une documentation publique ?">
                  <p>
                    Oui —{' '}
                    <Link href="/ressources" className="text-accent hover:underline">
                      documentation et ressources
                    </Link>{' '}
                    accessibles sans compte : guides AI Act, fiches méthodologiques et articles.
                  </p>
                </FaqItem>
              </FaqCategory>

              <FaqCategory id="commercial" title="Commercial">
                <FaqItem question="Comment se passe une démo ?">
                  <p>
                    30 minutes en visio. Vous apportez un cas d&apos;usage et idéalement un dataset
                    anonymisé ; nous lançons l&apos;audit en direct. À l&apos;issue : un rapport
                    pilote utilisable pour votre comité.
                  </p>
                </FaqItem>
                <FaqItem question="Proposez-vous un programme partenaires ?">
                  <p>
                    Nous échangeons volontiers avec les cabinets de conseil, intégrateurs et
                    cabinets d&apos;avocats intéressés par le sujet. Écrivez-nous à
                    contact@auditiq.fr.
                  </p>
                </FaqItem>
                <FaqItem question="Êtes-vous référencés UGAP ?">
                  <p>
                    Non, pas à ce jour. Les marchés publics restent traitables en gré à gré selon
                    les seuils en vigueur.
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
