'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Building2, FileText, Users, Mail, Wand2 } from 'lucide-react';
import { Topbar } from '@/components/app/Topbar';
import { SectionHead } from '@/components/product/SectionHead';
import { InlineNote } from '@/components/product/InlineNote';
import { Toggle } from '@/components/product/Toggle';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  canManageOrg,
  problemDetail,
  type OrgOut,
  type OrgSettings,
  type Sector,
} from '@/lib/api/org';
import {
  useMe,
  useOrg,
  useUpdateMe,
  useUpdateOrg,
  useUpdateOrgSettings,
} from '@/lib/query/use-org';

type TabId = 'org' | 'profil' | 'audit' | 'rapports';

const NAV_ITEMS: { id: TabId; label: string; Icon: React.ElementType }[] = [
  { id: 'org', label: 'Entreprise', Icon: Building2 },
  { id: 'profil', label: 'Profil', Icon: Users },
  { id: 'audit', label: 'Audit & seuils', Icon: Wand2 },
  { id: 'rapports', label: 'Rapports', Icon: FileText },
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

const INPUT_CLASS =
  'w-full rounded-md border border-border-default bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow disabled:opacity-60 disabled:cursor-not-allowed';
const SELECT_CLASS =
  'w-full rounded-md border border-border-default bg-surface-2 px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-60 disabled:cursor-not-allowed';

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

function LoadingCard() {
  return (
    <Card>
      <div role="status" className="py-6 text-center text-sm text-fg-secondary">
        Chargement…
      </div>
    </Card>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card>
      <div className="py-6 text-center text-sm text-status-fail">{message}</div>
    </Card>
  );
}

const SECTORS: { value: Sector; label: string }[] = [
  { value: 'credit', label: 'Banque & crédit' },
  { value: 'insurance', label: 'Assurance' },
  { value: 'hr', label: 'Ressources humaines' },
  { value: 'other', label: 'Autre' },
];

const COUNTRIES = [
  { value: 'FR', label: 'France' },
  { value: 'BE', label: 'Belgique' },
  { value: 'LU', label: 'Luxembourg' },
  { value: 'CH', label: 'Suisse' },
];

const COMPANY_SIZES = [
  { value: 'tpe', label: 'TPE (< 10 salariés)' },
  { value: 'pme', label: 'PME (10–250)' },
  { value: 'eti', label: 'ETI (250–5000)' },
  { value: 'ge', label: 'Grande entreprise' },
];

/* ── Entreprise ── */
function TabOrg({ org, canEdit }: { org: OrgOut; canEdit: boolean }) {
  const updateOrg = useUpdateOrg();
  const [form, setForm] = React.useState({
    name: org.name ?? '',
    siren: org.siren ?? '',
    sector: (org.sector ?? 'other') as Sector,
    country: org.country ?? 'FR',
    company_size: org.company_size ?? 'pme',
    dpo_name: org.dpo_name ?? '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateOrg.mutateAsync({
        name: form.name,
        siren: form.siren,
        sector: form.sector,
        country: form.country,
        company_size: form.company_size,
        dpo_name: form.dpo_name,
      });
      toast.success('Informations de l’organisation enregistrées.');
    } catch (err) {
      toast.error(problemDetail(err, 'Échec de l’enregistrement.'));
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionHead eyebrow="Entreprise" title="Informations de l'organisation" />
      <Card>
        <fieldset disabled={!canEdit} className="flex flex-col gap-4 border-0 p-0 m-0">
          <Field label="Raison sociale">
            <input
              aria-label="Raison sociale"
              className={INPUT_CLASS}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SIREN">
              <input
                aria-label="SIREN"
                className={`${INPUT_CLASS} font-mono`}
                value={form.siren}
                onChange={(e) => setForm((f) => ({ ...f, siren: e.target.value }))}
              />
            </Field>
            <Field label="Secteur">
              <select
                aria-label="Secteur"
                className={SELECT_CLASS}
                value={form.sector}
                onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value as Sector }))}
              >
                {SECTORS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pays">
              <select
                aria-label="Pays"
                className={SELECT_CLASS}
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Taille">
              <select
                aria-label="Taille"
                className={SELECT_CLASS}
                value={form.company_size}
                onChange={(e) => setForm((f) => ({ ...f, company_size: e.target.value }))}
              >
                {COMPANY_SIZES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            label="DPO ou référent conformité"
            hint="Apparaîtra sur les rapports générés et dans les exports."
          >
            <input
              aria-label="DPO ou référent conformité"
              className={INPUT_CLASS}
              value={form.dpo_name}
              onChange={(e) => setForm((f) => ({ ...f, dpo_name: e.target.value }))}
            />
          </Field>
        </fieldset>
        {canEdit ? (
          <div className="mt-5 flex justify-end">
            <Button type="submit" variant="primary" disabled={updateOrg.isPending}>
              {updateOrg.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        ) : (
          <InlineNote className="mt-5">
            Seuls les administrateurs peuvent modifier les informations de
            l&apos;organisation.
          </InlineNote>
        )}
      </Card>
    </form>
  );
}

/* ── Profil ── */
function TabProfil() {
  const me = useMe();
  if (me.isLoading) return <LoadingCard />;
  if (me.isError || !me.data)
    return <ErrorCard message="Impossible de charger votre profil." />;
  // `key` garantit un état réinitialisé si l'identité change.
  return <ProfilForm key={me.data.id} email={me.data.email} initialFirstName={me.data.first_name ?? ''} />;
}

function ProfilForm({
  email,
  initialFirstName,
}: {
  email: string;
  initialFirstName: string;
}) {
  const updateMe = useUpdateMe();
  const [firstName, setFirstName] = React.useState(initialFirstName);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateMe.mutateAsync({ first_name: firstName });
      toast.success('Profil mis à jour.');
    } catch (err) {
      toast.error(problemDetail(err, 'Échec de l’enregistrement du profil.'));
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionHead eyebrow="PROFIL" title="Votre compte" />
      <Card>
        <div className="flex flex-col gap-5">
          <Field label="Prénom">
            <input
              aria-label="Prénom"
              className={INPUT_CLASS}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </Field>
          <Field label="E-mail" hint="L'adresse e-mail ne peut pas être modifiée ici.">
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-fg-muted">
                <Mail size={14} />
              </span>
              <input
                aria-label="E-mail"
                readOnly
                className={`${INPUT_CLASS} pl-8 opacity-70`}
                value={email}
              />
            </div>
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <Button type="submit" variant="primary" disabled={updateMe.isPending}>
            {updateMe.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </Card>
    </form>
  );
}

/* ── Audit & seuils ── */
const DI_PRESETS = [
  { value: '0.8', label: '0,80 — règle des 4/5 (standard)' },
  { value: '0.85', label: '0,85 — exigeant' },
  { value: '0.9', label: '0,90 — strict' },
];

const RETENTION_PRESETS = [
  { value: '30', label: '30 jours' },
  { value: '90', label: '90 jours' },
  { value: '365', label: '1 an' },
  { value: '3650', label: '10 ans (maximum)' },
];

function TabAudit({ org, canEdit }: { org: OrgOut; canEdit: boolean }) {
  const updateSettings = useUpdateOrgSettings();
  const settings = org.settings ?? {};
  const [diThreshold, setDiThreshold] = React.useState(
    settings.di_threshold != null ? String(settings.di_threshold) : '0.8',
  );
  const [retentionDays, setRetentionDays] = React.useState(
    settings.retention_days != null ? String(settings.retention_days) : '30',
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync({
        di_threshold: Number(diThreshold),
        retention_days: Number(retentionDays),
      });
      toast.success('Paramètres d’audit enregistrés.');
    } catch (err) {
      toast.error(problemDetail(err, 'Échec de l’enregistrement.'));
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionHead
        eyebrow="Audit & seuils"
        title="Paramètres d'audit"
        sub="Valeurs appliquées par défaut à chaque nouvel audit de l'organisation."
      />
      <Card>
        <fieldset disabled={!canEdit} className="border-0 p-0 m-0">
          <PrefRow
            label="Seuil de disparate impact"
            desc="En-dessous de ce ratio, un groupe est signalé « risque élevé ». La règle des 4/5 correspond à 0,80."
          >
            <select
              aria-label="Seuil de disparate impact"
              className={SELECT_CLASS}
              style={{ maxWidth: 260 }}
              value={diThreshold}
              onChange={(e) => setDiThreshold(e.target.value)}
            >
              {DI_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </PrefRow>
          <PrefRow
            label="Rétention des datasets (jours)"
            desc="Au-delà de cette durée, les fichiers source sont supprimés (les rapports restent)."
          >
            <select
              aria-label="Rétention des datasets (jours)"
              className={SELECT_CLASS}
              style={{ maxWidth: 200 }}
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
            >
              {RETENTION_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </PrefRow>
        </fieldset>
        {canEdit ? (
          <div className="mt-5 flex justify-end">
            <Button type="submit" variant="primary" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        ) : (
          <InlineNote className="mt-5">
            Seuls les administrateurs peuvent modifier les paramètres d&apos;audit.
          </InlineNote>
        )}
      </Card>
      <InlineNote>
        Modifier ces seuils n&apos;altère pas les audits déjà réalisés — seuls les
        prochains audits utiliseront les nouvelles valeurs.
      </InlineNote>
    </form>
  );
}

/* ── Rapports ── */
type ReportOptionKey = 'executive_summary' | 'technical_annex' | 'confidential_watermark';

const REPORT_OPTIONS: { key: ReportOptionKey; label: string; defaultOn: boolean }[] = [
  { key: 'executive_summary', label: 'Inclure la synthèse dirigeants dans tous les rapports', defaultOn: true },
  { key: 'technical_annex', label: 'Inclure le détail technique en annexe', defaultOn: true },
  { key: 'confidential_watermark', label: 'Filigrane « Confidentiel » sur les rapports', defaultOn: false },
];

function readReportOption(
  settings: OrgSettings,
  key: ReportOptionKey,
  fallback: boolean,
): boolean {
  const opts = settings.report_options;
  if (opts && typeof opts === 'object' && key in opts) {
    return Boolean((opts as Record<string, unknown>)[key]);
  }
  return fallback;
}

function TabRapports({ org, canEdit }: { org: OrgOut; canEdit: boolean }) {
  const updateSettings = useUpdateOrgSettings();
  const settings = org.settings ?? {};
  const [opts, setOpts] = React.useState<Record<ReportOptionKey, boolean>>(() =>
    Object.fromEntries(
      REPORT_OPTIONS.map((o) => [o.key, readReportOption(settings, o.key, o.defaultOn)]),
    ) as Record<ReportOptionKey, boolean>,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync({ report_options: opts });
      toast.success('Préférences de rapport enregistrées.');
    } catch (err) {
      toast.error(problemDetail(err, 'Échec de l’enregistrement.'));
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionHead
        eyebrow="Rapports"
        title="Préférences rapports"
        sub="Personnalisez le contenu des rapports générés par AuditIQ."
      />
      <Card>
        {REPORT_OPTIONS.map((o) => (
          <PrefRow key={o.key} label={o.label}>
            <Toggle
              checked={opts[o.key]}
              onChange={(v) => setOpts((prev) => ({ ...prev, [o.key]: v }))}
              ariaLabel={o.label}
              disabled={!canEdit}
            />
          </PrefRow>
        ))}
        {canEdit ? (
          <div className="mt-5 flex justify-end">
            <Button type="submit" variant="primary" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        ) : (
          <InlineNote className="mt-5">
            Seuls les administrateurs peuvent modifier les préférences de rapport.
          </InlineNote>
        )}
      </Card>
    </form>
  );
}

/* ── main page ── */
export default function ParametresPage() {
  const [tab, setTab] = React.useState<TabId>('org');
  const me = useMe();
  const org = useOrg();
  const canEdit = canManageOrg(me.data?.role);

  return (
    <>
      <Topbar
        title="Paramètres"
        crumbs={[{ label: 'AuditIQ' }, { label: 'Paramètres' }]}
      />
      <main className="page flex-1">
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
          <div className="flex max-w-[680px] min-w-0 flex-col gap-4">
            {tab === 'profil' ? (
              <TabProfil />
            ) : org.isLoading ? (
              <LoadingCard />
            ) : org.isError || !org.data ? (
              <ErrorCard message="Impossible de charger les paramètres de l'organisation." />
            ) : tab === 'org' ? (
              <TabOrg org={org.data} canEdit={canEdit} />
            ) : tab === 'audit' ? (
              <TabAudit org={org.data} canEdit={canEdit} />
            ) : (
              <TabRapports org={org.data} canEdit={canEdit} />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
