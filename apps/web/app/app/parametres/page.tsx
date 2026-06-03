'use client';

import * as React from 'react';
import {
  Building2,
  Users,
  Bell,
  SlidersHorizontal,
  Link2,
  Lock,
  KeyRound,
  Mail,
  Upload,
  Eye,
  Layers,
  ExternalLink,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import { Topbar } from '@/components/app/Topbar';
import { SectionHead } from '@/components/product/SectionHead';
import { InlineNote } from '@/components/product/InlineNote';
import { Toggle } from '@/components/product/Toggle';
import { Avatar } from '@/components/product/Avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type TabId = 'org' | 'profile' | 'notif' | 'thresholds' | 'api' | 'security';

const NAV_ITEMS: { id: TabId; label: string; Icon: React.ElementType }[] = [
  { id: 'org', label: 'Entreprise', Icon: Building2 },
  { id: 'profile', label: 'Profil', Icon: Users },
  { id: 'notif', label: 'Notifications', Icon: Bell },
  { id: 'thresholds', label: 'Seuils & règles', Icon: SlidersHorizontal },
  { id: 'api', label: 'API & intégrations', Icon: Link2 },
  { id: 'security', label: 'Sécurité', Icon: Lock },
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

/* ── tabs ── */
function TabOrg() {
  return (
    <>
      <SectionHead eyebrow="Entreprise" title="Informations de l'organisation" />
      <Card>
        <div className="flex flex-col gap-4">
          <Field label="Raison sociale">
            <TextInput defaultValue="Banque Mériterre SA" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Secteur">
              <select
                defaultValue="bank"
                className="w-full rounded-md border border-border-default bg-surface-2 px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="bank">Banque & finance</option>
                <option value="insurance">Assurance</option>
                <option value="hr">RH & recrutement</option>
                <option value="other">Autre</option>
              </select>
            </Field>
            <Field label="SIREN">
              <TextInput mono defaultValue="552 100 554" />
            </Field>
          </div>
          <Field
            label="Référent conformité"
            hint="Recevra les alertes réglementaires."
          >
            <TextInput icon={Users} defaultValue="Léa Moreau" />
          </Field>
        </div>
      </Card>
    </>
  );
}

function TabProfile() {
  return (
    <>
      <SectionHead eyebrow="Profil" title="Votre compte" />
      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar name="Léa Moreau" size={56} />
            <Button variant="outline" size="sm">
              <Upload size={14} />
              Changer la photo
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
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

const NOTIF_ITEMS = [
  {
    key: 'nonconforme',
    title: 'Audit non conforme',
    desc: 'Alerte immédiate par e-mail',
    defaultOn: true,
  },
  {
    key: 'fin-exec',
    title: "Fin d'exécution d'un audit",
    desc: "Notification dans l'app",
    defaultOn: true,
  },
  {
    key: 'hebdo',
    title: 'Synthèse hebdomadaire',
    desc: 'Récapitulatif chaque lundi',
    defaultOn: true,
  },
  {
    key: 'expiration',
    title: "Expiration d'un accès externe",
    desc: '7 jours avant échéance',
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
                <div className="mt-0.5 text-[12.5px] text-fg-muted">{item.desc}</div>
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

const THRESHOLD_ITEMS = [
  { key: 'fourfifths', title: 'Règle des 4/5', desc: 'Seuil minimal du ratio de sélection', defaultValue: '80 %' },
  { key: 'parity', title: 'Parité démographique', desc: 'Écart maximal toléré', defaultValue: '0,10' },
  { key: 'egalite', title: 'Égalité des chances', desc: 'Seuil minimal', defaultValue: '80 %' },
] as const;

function TabThresholds() {
  return (
    <>
      <SectionHead
        eyebrow="Seuils & règles"
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

type Integration = { key: string; name: string; Icon: React.ElementType; defaultConnected: boolean };
const INTEGRATIONS: Integration[] = [
  { key: 'mlflow', name: 'MLflow', Icon: Layers, defaultConnected: true },
  { key: 'github', name: 'GitHub Actions', Icon: ExternalLink, defaultConnected: true },
  { key: 'datadog', name: 'Datadog', Icon: TrendingUp, defaultConnected: false },
  { key: 'slack', name: 'Slack', Icon: MessageSquare, defaultConnected: true },
];

function TabApi() {
  const [integStates, setIntegStates] = React.useState<Record<string, boolean>>(
    Object.fromEntries(INTEGRATIONS.map((i) => [i.key, i.defaultConnected])),
  );

  return (
    <>
      <SectionHead
        eyebrow="API & intégrations"
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

function TabSecurity() {
  const [twoFa, setTwoFa] = React.useState(true);
  return (
    <>
      <SectionHead eyebrow="Sécurité" title="Sécurité du compte" />
      <Card>
        <div className="flex flex-col gap-4">
          <Field label="Mot de passe">
            <TextInput type="password" icon={Lock} defaultValue="motdepasse" />
          </Field>
          <div className="flex items-center gap-4 border-t border-border-subtle pt-4">
            <div className="flex-1">
              <div className="text-sm font-medium text-fg">Double authentification (2FA)</div>
              <div className="mt-0.5 text-[12.5px] text-fg-muted">
                Recommandé pour les comptes administrateur
              </div>
            </div>
            <Toggle
              checked={twoFa}
              onChange={setTwoFa}
              ariaLabel="Double authentification"
            />
          </div>
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
            {tab === 'profile' && <TabProfile />}
            {tab === 'notif' && <TabNotifications />}
            {tab === 'thresholds' && <TabThresholds />}
            {tab === 'api' && <TabApi />}
            {tab === 'security' && <TabSecurity />}
          </div>
        </div>
      </main>
    </>
  );
}
