'use client';

import * as React from 'react';
import {
  Cloud,
  Database,
  FileSpreadsheet,
  HardDrive,
  Layers,
  ScrollText,
  Sheet,
  Sparkles,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Source = 'file' | 'samples' | 'external';

type Module = 'M1' | 'M2';

interface SampleDescriptor {
  path: string; // relative to /public, e.g. /samples/recrutement-m1.csv
  filename: string; // value to use as File.name on upload
  title: string;
  description: string;
  module: Module;
  rows: number;
  hint: string;
  icon: LucideIcon;
}

const SAMPLES: SampleDescriptor[] = [
  {
    path: '/samples/recrutement-m1.csv',
    filename: 'recrutement-rh.csv',
    title: 'Recrutement RH',
    description:
      'Les femmes sont embauchées 2,5 fois moins souvent que les hommes (30 % contre 75 %) — bien en dessous du seuil de référence de 80 % (règle des 4/5).',
    module: 'M1',
    rows: 80,
    hint: 'Attribut protégé : genre · Décision : embauche · Valeur favorable : oui',
    icon: ScrollText,
  },
  {
    path: '/samples/credit-m1.csv',
    filename: 'credit-bancaire.csv',
    title: 'Crédit bancaire',
    description:
      'Les personnes d\'origine étrangère obtiennent un crédit presque deux fois moins souvent (37,5 % contre 67,5 %) — situation de vigilance.',
    module: 'M1',
    rows: 80,
    hint: 'Attribut protégé : origine · Décision : accord_credit · Valeur favorable : oui',
    icon: ScrollText,
  },
  {
    path: '/samples/employes-m2.csv',
    filename: 'employes-clustering.csv',
    title: 'Décisions employés',
    description:
      'Aucune donnée sensible déclarée. La détection automatique repère 4 groupes aux taux de décision très contrastés (0 % contre 100 %).',
    module: 'M2',
    rows: 48,
    hint: 'Colonne de décision : decision · Valeur favorable : oui',
    icon: Layers,
  },
  {
    path: '/samples/compensation-m2.csv',
    filename: 'compensation-equite.csv',
    title: 'Équité de rémunération',
    description:
      'Promotions selon expérience, niveau, formation et salaire. Anomalie : à expérience égale, les profils « doctorat » sont promus beaucoup plus souvent que les profils « BTS ».',
    module: 'M2',
    rows: 48,
    hint: 'Colonne de décision : promotion · Valeur favorable : oui',
    icon: Layers,
  },
];

interface ExternalConnectorDescriptor {
  name: string;
  description: string;
  icon: LucideIcon;
}

const EXTERNAL_CONNECTORS: ExternalConnectorDescriptor[] = [
  {
    name: 'PostgreSQL',
    description: 'Requête SQL directe avec chaîne de connexion sécurisée. Lecture seule.',
    icon: Database,
  },
  {
    name: 'MySQL / MariaDB',
    description: 'Compatible toutes versions ≥ 5.7. Utilisateur dédié en lecture seule recommandé.',
    icon: Database,
  },
  {
    name: 'Google Sheets',
    description: "OAuth Google + sélection d'onglet. Synchronisation manuelle par audit.",
    icon: Sheet,
  },
  {
    name: 'AWS S3 / Azure Blob',
    description: 'Bucket privé (signed URL) ou rôle IAM dédié, format CSV/Parquet.',
    icon: Cloud,
  },
  {
    name: 'Snowflake / BigQuery',
    description: 'Connexion via service account + table ou requête paramétrée.',
    icon: HardDrive,
  },
  {
    name: 'API REST personnalisée',
    description: 'GET sur une URL HTTPS, paginée. Format JSON aplati ou CSV.',
    icon: FileSpreadsheet,
  },
];

interface DatasetUploadCardProps {
  module: Module;
  busy: boolean;
  onSelected: (file: File) => Promise<void>;
}

export function DatasetUploadCard({ module, busy, onSelected }: DatasetUploadCardProps) {
  const [source, setSource] = React.useState<Source>('file');
  const [dragOver, setDragOver] = React.useState(false);
  const [filename, setFilename] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = React.useCallback(
    async (files: FileList | File[] | null) => {
      const file = files && files[0];
      if (!file) return;
      setFilename(file.name);
      await onSelected(file);
    },
    [onSelected],
  );

  const handleSampleClick = async (sample: SampleDescriptor) => {
    const r = await fetch(sample.path);
    if (!r.ok) return;
    const blob = await r.blob();
    const file = new File([blob], sample.filename, { type: 'text/csv' });
    setFilename(sample.filename);
    await onSelected(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    void handleFiles(e.dataTransfer.files);
  };

  const samplesForModule = SAMPLES.filter((s) => s.module === module);

  return (
    <div className="rounded-2xl border border-border-default bg-surface p-8">
      {/* Tabs */}
      <div className="-mt-1 mb-6 flex gap-1 border-b border-border-subtle">
        <TabBtn active={source === 'file'} onClick={() => setSource('file')}>
          <Upload size={14} strokeWidth={1.75} />
          Fichier local
        </TabBtn>
        <TabBtn active={source === 'samples'} onClick={() => setSource('samples')}>
          <Sparkles size={14} strokeWidth={1.75} />
          Échantillons
          <span className="rounded-sm border border-border-subtle bg-surface-2 px-1.5 py-px font-mono text-[10px] text-fg-muted">
            {samplesForModule.length}
          </span>
        </TabBtn>
        <TabBtn active={source === 'external'} onClick={() => setSource('external')}>
          <Database size={14} strokeWidth={1.75} />
          Sources externes
          <span className="rounded-sm border border-accent-border bg-accent-soft px-1.5 py-px font-mono text-[10px] text-accent">
            Phase 2
          </span>
        </TabBtn>
      </div>

      {/* Pane: file local */}
      {source === 'file' && (
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => !busy && inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !busy) {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
              dragOver
                ? 'border-accent bg-accent-soft'
                : 'border-border-default bg-surface-2 hover:border-border-strong',
              busy && 'cursor-not-allowed opacity-60',
            )}
            aria-label="Glisser-déposer un fichier CSV ou cliquer pour parcourir"
          >
            <div
              aria-hidden
              className="flex size-14 items-center justify-center rounded-2xl border border-accent-border bg-surface text-accent"
            >
              <Upload size={24} strokeWidth={1.6} />
            </div>
            <div>
              <p className="text-[15px] font-medium text-fg">
                {filename
                  ? `Fichier sélectionné : ${filename}`
                  : 'Glissez-déposez votre fichier CSV ici'}
              </p>
              <p className="mt-1 text-sm text-fg-secondary">
                {filename ? 'Cliquez pour en choisir un autre.' : 'ou cliquez pour parcourir'}
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" disabled={busy} asChild>
              <span>{filename ? 'Changer de fichier' : 'Parcourir…'}</span>
            </Button>
            <input
              ref={inputRef}
              id="csv"
              data-testid="csv-input"
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(e) => void handleFiles(e.target.files)}
              className="sr-only"
            />
          </div>
          <p className="mt-4 text-xs text-fg-muted">
            Format CSV (UTF-8 recommandé). Le fichier est stocké de façon chiffrée et
            supprimé automatiquement après 30 jours. Taille maximum 10 Mo.
          </p>
        </div>
      )}

      {/* Pane: samples */}
      {source === 'samples' && (
        <div>
          <p className="mb-4 text-sm text-fg-secondary">
            Démarrez rapidement avec un jeu de données pré-construit qui produit un résultat
            d&apos;audit reproductible — utile pour la prise en main et les démos.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {samplesForModule.map((sample) => {
              const Icon = sample.icon;
              return (
                <article
                  key={sample.path}
                  className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-2 p-5 transition-colors hover:border-border-strong"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center rounded-md border border-accent-border bg-accent-soft text-accent"
                    >
                      <Icon size={16} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-fg">{sample.title}</h3>
                      <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
                        {sample.module} · {sample.rows} lignes
                      </p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-fg-secondary">{sample.description}</p>
                  <p className="rounded-md border border-border-subtle bg-surface px-3 py-2 font-mono text-[11px] leading-relaxed text-fg-muted">
                    {sample.hint}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleSampleClick(sample)}
                    disabled={busy}
                  >
                    Utiliser cet échantillon
                  </Button>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Pane: external connectors */}
      {source === 'external' && (
        <div>
          <p className="mb-4 text-sm text-fg-secondary">
            Connectez AuditIQ à vos sources de données métier sans extraction manuelle de CSV.
            Six connecteurs sont planifiés pour la <strong className="text-fg">Phase 2</strong> —
            chaque connecteur ouvre une session lecture-seule scoped à l&apos;organisation.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EXTERNAL_CONNECTORS.map((c) => {
              const Icon = c.icon;
              return (
                <article
                  key={c.name}
                  className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-2 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface text-fg-muted"
                    >
                      <Icon size={16} strokeWidth={1.75} />
                    </span>
                    <span className="rounded-sm border border-accent-border bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                      Phase 2
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-fg">{c.name}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-fg-secondary">
                      {c.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="mt-5 text-xs text-fg-muted">
            En attendant, exportez vos données depuis votre source au format CSV et utilisez
            l&apos;onglet <strong className="text-fg">Fichier local</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-selected={active}
      role="tab"
      className={cn(
        'inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'border-accent text-fg'
          : 'border-transparent text-fg-muted hover:text-fg-secondary',
      )}
    >
      {children}
    </button>
  );
}
