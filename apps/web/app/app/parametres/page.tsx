'use client';

import * as React from 'react';
import {
  Building2,
  Bell,
  SlidersHorizontal,
  Link2,
  Lock,
  KeyRound,
  Eye,
  Layers,
  ExternalLink,
  TrendingUp,
  MessageSquare,
  Wand2,
  FileText,
  CreditCard,
  Users,
  Mail,
  Upload,
} from 'lucide-react';
import { Topbar } from '@/components/app/Topbar';
import { SectionHead } from '@/components/product/SectionHead';
import { InlineNote } from '@/components/product/InlineNote';
import { Toggle } from '@/components/product/Toggle';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type TabId =
  | 'org'
  | 'profil'
  | 'audit'
  | 'seuils'
  | 'rapports'
  | 'integrations'
  | 'securite'
  | 'facturation'
  | 'notifications';

const NAV_ITEMS: { id: TabId; label: string; Icon: React.ElementType }[] = [
  { id: 'org', label: 'Entreprise', Icon: Building2 },
  { id: 'profil', label: 'Profil', Icon: Users },
  { id: 'audit', label: 'Audit', Icon: Wand2 },
  { id: 'seuils', label: 'Seuils', Icon: SlidersHorizontal },
  { id: 'rapports', label: 'Rapports', Icon: FileText },
  { id: 'integrations', label: 'Intégrations', Icon: Link2 },
  { id: 'securite', label: 'Sécurité', Icon: Lock },
  { id: 'facturation', label: 'Facturation', Icon: CreditCard },
  { id: 'notifications', label: 'Notifications', Icon: Bell },
];

/* ── helpers ── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[12.5px] font-medium text-fg-secondary mb-1.5">
      {children}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11.5px] text-fg-muted">{children}</p>;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {hint && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}

function TextInput({
  mono,
  icon: Icon,
  trail,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  mono?: boolean;
  icon?: React.ElementType;
  trail?: React.ReactNode;
}) {
  const base =
    'w-full rounded-md border border-border-default bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow';
  if (Icon || trail) {
    return (
      <div className="relative flex items-center">
        {Icon && (
          <span className="pointer-events-none absolute left-3 text-fg-muted">
            <Icon size={14} />
          </span>
        )}
        <input
          className={`${base} ${Icon ? 'pl-8' : ''} ${trail ? 'pr-9' : ''} ${mono ? 'font-mono' : ''}`}
          {...props}
        />
        {trail && (
          <span className="absolute right-3 text-fg-muted cursor-pointer">{trail}</span>
        )}
      </div>
    );
  }
  return (
    <input className={`${base} ${mono ? 'font-mono' : ''}`} {...props} />
  );
}

function SelectInput({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      className="w-full rounded-md border border-border-default bg-surface-2 px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
      {...props}
    >
      {children}
    </select>
  );
}

function PrefRow({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-border-subtle last:border-0">
      <div className="flex-1">
        <div className="text-sm font-medium text-fg">{label}</div>
        {desc && <div className="mt-0.5 text-[12.5px] text-fg-muted">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ── tabs ── */
function TabOrg() {
  return (
    <>
      <SectionHead eyebrow="Entreprise" title="Informations de l'organisation" />
      <Card>
        <div className="flex flex-col gap-4">
          <Field label="Raison sociale">
            <TextInput defaultValue="Cabinet Tessier & Associés" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SIREN">
              <TextInput mono defaultValue="824 561 832" />
            </Field>
            <Field label="Secteur">
              <SelectInput aria-label="Secteur" defaultValue="hr">
                <option value="bank">Banque & finance</option>
                <option value="insurance">Assurance</option>
                <option value="hr">Conseil RH</option>
                <option value="other">Autre</option>
              </SelectInput>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pays">
              <SelectInput aria-label="Pays" defaultValue="fr">
                <option value="fr">France</option>
                <option value="be">Belgique</option>
              </SelectInput>
            </Field>
            <Field label="Taille">
              <SelectInput aria-label="Taille" defaultValue="pme">
                <option value="pme">PME (10–250 salariés)</option>
                <option value="eti">ETI (250–5000)</option>
                <option value="ge">Grande entreprise</option>
              </SelectInput>
            </Field>
          </div>
          <Field
            label="DPO ou référent conformité"
            hint="Apparaîtra sur les rapports signés et dans les exports réglementaires."
          >
            <TextInput icon={Users} defaultValue="Claire Tessier" />
          </Field>
        </div>
      </Card>
    </>
  );
}

function TabProfil() {
  return (
    <>
      <SectionHead eyebrow="PROFIL" title="Votre compte" />
      <Card>
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div
              aria-hidden
              className="grid size-16 place-items-center rounded-lg bg-surface-2 font-mono text-base font-medium text-fg-secondary"
              style={{ border: '1px solid var(--border-subtle)' }}
            >
              LM
            </div>
            <Button variant="secondary" size="sm">
              <Upload size={14} /> Changer la photo
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom complet">
              <TextInput defaultValue="Léa Moreau" />
            </Field>
            <Field label="Fonction">
              <TextInput defaultValue="Responsable conformité" />
            </Field>
          </div>
          <Field label="E-mail">
            <TextInput icon={Mail} defaultValue="lea.moreau@exemple.fr" />
          </Field>
        </div>
      </Card>
    </>
  );
}

function TabAudit() {
  const [emailNotif, setEmailNotif] = React.useState(true);
  const [autoReport, setAutoReport] = React.useState(true);

  return (
    <>
      <SectionHead
        eyebrow="Audit"
        title="Paramètres d'audit"
        sub="Configurez les valeurs par défaut appliquées à chaque nouvel audit."
      />
      <Card>
        <PrefRow
          label="Notification par email à la fin d'un audit"
          desc="Vous recevrez un email récapitulatif avec le verdict global et le lien vers le rapport."
        >
          <Toggle
            checked={emailNotif}
            onChange={setEmailNotif}
            ariaLabel="Notification email fin audit"
          />
        </PrefRow>
        <PrefRow
          label="Lancer automatiquement la génération du rapport"
          desc="À la fin d'un audit, AuditIQ génère automatiquement le PDF executive + PDF réglementaire."
        >
          <Toggle
            checked={autoReport}
            onChange={setAutoReport}
            ariaLabel="Génération automatique rapport"
          />
        </PrefRow>
        <PrefRow
          label="Audit par défaut"
          desc="Type de module lancé par défaut lors de la création d'un audit."
        >
          <SelectInput aria-label="Audit par défaut" defaultValue="M1" style={{ maxWidth: 200 }}>
            <option value="M1">M1 — Supervisé</option>
            <option value="M2">M2 — Non supervisé</option>
            <option value="M3">M3 — LLM</option>
          </SelectInput>
        </PrefRow>
        <PrefRow
          label="Rétention dataset (jours)"
          desc="Au-delà de cette durée, les fichiers source sont supprimés (les rapports restent)."
        >
          <SelectInput aria-label="Rétention dataset (jours)" defaultValue="30" style={{ maxWidth: 200 }}>
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
            <option value="365">1 an</option>
            <option value="0">Permanent</option>
          </SelectInput>
        </PrefRow>
        <PrefRow
          label="Langue interprétation"
          desc="Langue utilisée pour les textes d'interprétation générés par le moteur."
        >
          <SelectInput aria-label="Langue interprétation" defaultValue="fr" style={{ maxWidth: 200 }}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </SelectInput>
        </PrefRow>
      </Card>
    </>
  );
}

const THRESHOLD_ITEMS = [
  { key: 'fourfifths', title: 'Règle des 4/5', desc: 'Seuil minimal du ratio de sélection', defaultValue: '80 %' },
  { key: 'parity', title: 'Parité démographique', desc: 'Écart maximal toléré', defaultValue: '0,10' },
  { key: 'egalite', title: 'Égalité des chances', desc: 'Seuil minimal', defaultValue: '80 %' },
] as const;

function TabSeuils() {
  return (
    <>
      <SectionHead
        eyebrow="Seuils"
        title="Critères de conformité"
        sub="Ajustez les seuils déclenchant un verdict « non conforme ». Valeurs par défaut alignées sur la réglementation."
      />
      <Card className="p-0">
        <div>
          {THRESHOLD_ITEMS.map((item, i) => (
            <div
              key={item.key}
              className={`flex items-center gap-4 px-6 py-4 ${i < THRESHOLD_ITEMS.length - 1 ? 'border-b border-border-subtle' : ''}`}
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-fg">{item.title}</div>
                <div className="mt-0.5 text-[12.5px] text-fg-muted">{item.desc}</div>
              </div>
              <input
                className="w-24 rounded-md border border-border-default bg-surface-2 px-3 py-1.5 text-center font-mono text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
                defaultValue={item.defaultValue}
              />
            </div>
          ))}
        </div>
      </Card>
      <InlineNote>
        Modifier ces seuils n&apos;altère pas les audits déjà signés — seuls les prochains audits
        utiliseront les nouvelles valeurs.
      </InlineNote>
    </>
  );
}

function TabRapports() {
  const [eidas, setEidas] = React.useState(true);
  const [executive, setExecutive] = React.useState(true);
  const [annexe, setAnnexe] = React.useState(true);
  const [confidentiel, setConfidentiel] = React.useState(false);

  return (
    <>
      <SectionHead
        eyebrow="Rapports"
        title="Préférences rapports"
        sub="Personnalisez le format et les options des rapports PDF générés par AuditIQ."
      />
      <Card>
        <PrefRow label="Template PDF">
          <SelectInput aria-label="Template PDF" defaultValue="sobre" style={{ maxWidth: 200 }}>
            <option value="sobre">Sobre</option>
            <option value="detaille">Détaillé</option>
            <option value="reglementaire">Réglementaire</option>
          </SelectInput>
        </PrefRow>
        <PrefRow
          label="Signature électronique eIDAS"
          desc="Tous les PDF finaux sont signés via DocuSign EU (certificat qualifié)."
        >
          <Toggle checked={eidas} onChange={setEidas} ariaLabel="Signature eIDAS activée" />
        </PrefRow>
        <PrefRow label="Inclure la vue executive dans tous les rapports">
          <Toggle checked={executive} onChange={setExecutive} ariaLabel="Vue executive" />
        </PrefRow>
        <PrefRow label="Inclure le détail technique en annexe">
          <Toggle checked={annexe} onChange={setAnnexe} ariaLabel="Détail technique annexe" />
        </PrefRow>
        <PrefRow label='Filigrane "Confidentiel" sur les rapports'>
          <Toggle checked={confidentiel} onChange={setConfidentiel} ariaLabel="Filigrane confidentiel" />
        </PrefRow>
        <PrefRow label="Langue par défaut">
          <SelectInput aria-label="Langue par défaut" defaultValue="fr" style={{ maxWidth: 160 }}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </SelectInput>
        </PrefRow>
      </Card>
      <InlineNote>
        La signature eIDAS est fournie via DocuSign EU. Un certificat qualifié est requis — contactez
        le support pour l&apos;activer sur votre compte.
      </InlineNote>
    </>
  );
}

type Integration = { key: string; name: string; Icon: React.ElementType; defaultConnected: boolean };
const INTEGRATIONS: Integration[] = [
  { key: 'mlflow', name: 'MLflow', Icon: Layers, defaultConnected: true },
  { key: 'github', name: 'GitHub Actions', Icon: ExternalLink, defaultConnected: true },
  { key: 'datadog', name: 'Datadog', Icon: TrendingUp, defaultConnected: false },
  { key: 'slack', name: 'Slack', Icon: MessageSquare, defaultConnected: true },
];

function TabIntegrations() {
  const [integStates, setIntegStates] = React.useState<Record<string, boolean>>(
    Object.fromEntries(INTEGRATIONS.map((i) => [i.key, i.defaultConnected])),
  );

  return (
    <>
      <SectionHead
        eyebrow="Intégrations"
        title="Connexion à votre pipeline"
        sub="Déclenchez des audits automatiquement depuis votre CI/CD ou votre plateforme MLOps."
      />
      <Card>
        <Field label="Clé API de production" hint="Ne la partagez jamais publiquement.">
          <TextInput
            mono
            icon={KeyRound}
            trail={<Eye size={15} />}
            defaultValue="aiq_live_••••••••••••••••••3f9a"
            readOnly
          />
        </Field>
      </Card>
      <div className="grid grid-cols-2 gap-4">
        {INTEGRATIONS.map((integ) => {
          const connected = integStates[integ.key] ?? false;
          return (
            <Card key={integ.key} className="flex items-center gap-3 p-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border-default bg-surface-2">
                <integ.Icon size={17} className="text-fg-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium text-fg">{integ.name}</div>
                <div
                  className={`text-xs ${connected ? 'text-[color:var(--status-pass,#22c55e)]' : 'text-fg-muted'}`}
                >
                  {connected ? 'Connecté' : 'Non connecté'}
                </div>
              </div>
              <Toggle
                checked={connected}
                onChange={(v) => setIntegStates((prev) => ({ ...prev, [integ.key]: v }))}
                ariaLabel={integ.name}
              />
            </Card>
          );
        })}
      </div>
    </>
  );
}

function TabSecurite() {
  const [twoFa, setTwoFa] = React.useState(true);
  return (
    <>
      <SectionHead eyebrow="Sécurité" title="Sécurité du compte" />
      <Card>
        <div className="flex flex-col gap-4">
          <PrefRow
            label="Authentification à deux facteurs obligatoire"
            desc="Tous les membres doivent activer la 2FA pour se connecter."
          >
            <Toggle
              checked={twoFa}
              onChange={setTwoFa}
              ariaLabel="Double authentification"
            />
          </PrefRow>
          <div className="flex flex-col gap-4 pt-2">
            <Field label="Durée de session">
              <SelectInput aria-label="Durée de session" defaultValue="4h">
                <option value="4h">4 heures</option>
                <option value="1h">1 heure</option>
                <option value="30m">30 min</option>
              </SelectInput>
            </Field>
            <div className="flex items-center justify-between py-2 border-t border-border-subtle">
              <div>
                <div className="text-sm font-medium text-fg">Hébergement & résidence des données</div>
                <div className="mt-0.5 text-[12.5px] text-fg-muted">
                  Toutes vos données sont stockées en France (OVH Roubaix · ISO 27001 · SecNumCloud).
                </div>
              </div>
              <span className="text-xs font-medium text-fg-secondary ml-4 shrink-0">UE · France</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border-subtle">
              <div>
                <div className="text-sm font-medium text-fg">Exporter mes données (RGPD · portabilité)</div>
                <div className="mt-0.5 text-[12.5px] text-fg-muted">
                  Téléchargez l&apos;intégralité des données de votre espace dans une archive ZIP.
                </div>
              </div>
              <Button variant="outline" size="sm" className="ml-4 shrink-0">
                Demander l&apos;export
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}

const MOCK_INVOICES = [
  { date: '1 mai 2026', num: 'INV-2026-05', amount: '898,80 €' },
  { date: '1 avr. 2026', num: 'INV-2026-04', amount: '898,80 €' },
  { date: '1 mars 2026', num: 'INV-2026-03', amount: '898,80 €' },
];

function TabFacturation() {
  return (
    <>
      <SectionHead
        eyebrow="Facturation"
        title="Plan & abonnement"
      />
      <Card>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h4 className="text-lg font-semibold text-fg">Plan Équipe · 749 € / mois</h4>
            <p className="mt-1 text-[13px] text-fg-secondary">
              Renouvellement automatique le 1er juin 2026 · 25 sièges inclus · 24 audits / mois
            </p>
          </div>
          <Button variant="outline" size="sm">
            Comparer les plans
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg border border-border-default bg-surface-2 p-4">
            <div className="text-[11px] text-fg-muted uppercase tracking-wider mb-1">Sièges utilisés</div>
            <div className="text-2xl font-bold text-fg">
              12 <span className="text-sm font-normal text-fg-muted">/ 25</span>
            </div>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-2 p-4">
            <div className="text-[11px] text-fg-muted uppercase tracking-wider mb-1">Audits ce mois</div>
            <div className="text-2xl font-bold text-fg">
              14 <span className="text-sm font-normal text-fg-muted">/ 24</span>
            </div>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-2 p-4">
            <div className="text-[11px] text-fg-muted uppercase tracking-wider mb-1">Stockage</div>
            <div className="text-2xl font-bold text-fg">
              2,4 <span className="text-sm font-normal text-fg-muted">/ 50 Go</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <Button className="w-full sm:w-auto">
            Gérer la facturation
          </Button>
          <p className="mt-2 text-[11.5px] text-fg-muted">
            Redirige vers le portail Stripe — modifier la carte, changer de plan ou annuler.
          </p>
        </div>

        <h4 className="text-[13.5px] font-medium text-fg mb-3">Factures récentes</h4>
        <div className="rounded-lg border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 border-b border-border-subtle">
              <tr>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-fg-secondary">Date</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-fg-secondary">Numéro</th>
                <th className="px-4 py-2.5 text-right text-[12px] font-medium text-fg-secondary">Montant TTC</th>
                <th className="px-4 py-2.5 text-right text-[12px] font-medium text-fg-secondary">PDF</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_INVOICES.map((inv, i) => (
                <tr key={inv.num} className={i < MOCK_INVOICES.length - 1 ? 'border-b border-border-subtle' : ''}>
                  <td className="px-4 py-3 text-fg">{inv.date}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-fg-secondary">{inv.num}</td>
                  <td className="px-4 py-3 text-right text-fg">{inv.amount}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm">↓</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

const NOTIF_ITEMS = [
  {
    key: 'audit-termine',
    title: 'Audit terminé',
    desc: 'Email avec verdict et lien rapport',
    defaultOn: true,
  },
  {
    key: 'audit-critique',
    title: 'Audit critique détecté',
    desc: 'Email instantané + résumé',
    defaultOn: true,
  },
  {
    key: 'reco-prioritaire',
    title: 'Recommandation prioritaire ajoutée',
    defaultOn: true,
  },
  {
    key: 'membre-invite',
    title: 'Membre invité ou rejoint',
    defaultOn: true,
  },
  {
    key: 'hebdo',
    title: 'Résumé hebdo des activités',
    desc: 'Tous les lundis à 8h',
    defaultOn: true,
  },
  {
    key: 'nouveautes',
    title: 'Nouveautés produit AuditIQ',
    defaultOn: false,
  },
] as const;

function TabNotifications() {
  const [states, setStates] = React.useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_ITEMS.map((n) => [n.key, n.defaultOn])),
  );

  return (
    <>
      <SectionHead eyebrow="Notifications" title="Préférences d'alerte" />
      <Card className="p-0">
        <div>
          {NOTIF_ITEMS.map((item, i) => (
            <div
              key={item.key}
              className={`flex items-center gap-4 px-6 py-4 ${i < NOTIF_ITEMS.length - 1 ? 'border-b border-border-subtle' : ''}`}
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-fg">{item.title}</div>
                {'desc' in item && item.desc && (
                  <div className="mt-0.5 text-[12.5px] text-fg-muted">{item.desc}</div>
                )}
              </div>
              <Toggle
                checked={states[item.key] ?? false}
                onChange={(v) => setStates((prev) => ({ ...prev, [item.key]: v }))}
                ariaLabel={item.title}
              />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

/* ── main page ── */
export default function ParametresPage() {
  const [tab, setTab] = React.useState<TabId>('org');

  return (
    <>
      <Topbar
        title="Paramètres"
        crumbs={[
          { label: 'AuditIQ' },
          { label: 'Paramètres' },
        ]}
      />
      <main className="flex-1 px-8 py-8">
        <div
          className="grid items-start gap-7"
          style={{ gridTemplateColumns: '200px 1fr' }}
        >
          {/* Sidenav */}
          <aside className="sticky top-24">
            <nav className="flex flex-col gap-0.5" aria-label="Navigation paramètres">
              {NAV_ITEMS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={[
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors text-left w-full',
                    tab === id
                      ? 'bg-surface-2 text-fg font-medium border border-border-default'
                      : 'text-fg-secondary hover:bg-surface-2 hover:text-fg',
                  ].join(' ')}
                >
                  <Icon size={15} className="shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex max-w-[680px] flex-col gap-4">
            {tab === 'org' && <TabOrg />}
            {tab === 'profil' && <TabProfil />}
            {tab === 'audit' && <TabAudit />}
            {tab === 'seuils' && <TabSeuils />}
            {tab === 'rapports' && <TabRapports />}
            {tab === 'integrations' && <TabIntegrations />}
            {tab === 'securite' && <TabSecurite />}
            {tab === 'facturation' && <TabFacturation />}
            {tab === 'notifications' && <TabNotifications />}
          </div>
        </div>
      </main>
    </>
  );
}
