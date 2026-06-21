'use client';

import * as React from 'react';
import {
  Boxes,
  Building2,
  Cloud,
  Database,
  Sheet,
  Upload,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Source = 'file' | 'external';

interface ConnectorCategory {
  key: string;
  label: string;
  blurb: string;
  icon: LucideIcon;
  connectors: string[];
}

/**
 * Connecteurs de la feuille de route (Phase 2). Rien ici n'est encore
 * fonctionnel : la section est purement informative et clairement étiquetée
 * « Bientôt ». L'import réel se fait via l'onglet « Fichier local » (CSV ou Excel).
 */
const CONNECTOR_CATEGORIES: ConnectorCategory[] = [
  {
    key: 'databases',
    label: 'Bases de données',
    blurb: 'Requête en lecture seule sur une table ou une vue, via un utilisateur dédié.',
    icon: Database,
    connectors: ['PostgreSQL', 'MySQL / MariaDB', 'SQL Server', 'Oracle Database'],
  },
  {
    key: 'warehouses',
    label: 'Entrepôts de données',
    blurb: 'Connexion par compte de service, table ou requête paramétrée.',
    icon: Boxes,
    connectors: ['Snowflake', 'Google BigQuery', 'Amazon Redshift', 'Databricks'],
  },
  {
    key: 'cloud-storage',
    label: 'Stockage cloud',
    blurb: 'Fichier CSV ou Parquet depuis un espace privé (URL signée ou rôle dédié).',
    icon: Cloud,
    connectors: ['Amazon S3', 'Azure Blob Storage', 'Google Cloud Storage'],
  },
  {
    key: 'spreadsheets',
    label: 'Tableurs & no-code',
    blurb: 'Sélection d’un onglet ou d’une base, synchronisation manuelle par audit.',
    icon: Sheet,
    connectors: ['Google Sheets', 'Microsoft Excel Online', 'Airtable'],
  },
  {
    key: 'business-tools',
    label: 'Outils métier (RH · ATS · CRM)',
    blurb: 'Extraction des décisions depuis vos logiciels métier, sans export manuel.',
    icon: Building2,
    connectors: ['Workday', 'BambooHR', 'Salesforce', 'HubSpot'],
  },
  {
    key: 'api',
    label: 'API & flux personnalisés',
    blurb: 'Récupération sur une URL HTTPS paginée ou réception par webhook.',
    icon: Webhook,
    connectors: ['API REST (HTTPS)', 'Webhooks entrants'],
  },
];

interface DatasetUploadCardProps {
  busy: boolean;
  onSelected: (file: File) => Promise<void>;
}

export function DatasetUploadCard({ busy, onSelected }: DatasetUploadCardProps) {
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

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    void handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="rounded-2xl border border-border-default bg-surface p-8">
      {/* Tabs */}
      <div className="-mt-1 mb-6 flex gap-1 border-b border-border-subtle">
        <TabBtn active={source === 'file'} onClick={() => setSource('file')}>
          <Upload size={14} strokeWidth={1.75} />
          Fichier local
        </TabBtn>
        <TabBtn active={source === 'external'} onClick={() => setSource('external')}>
          <Database size={14} strokeWidth={1.75} />
          Sources externes
          <span className="rounded-sm border border-accent-border bg-accent-soft px-1.5 py-px font-mono text-[10px] text-accent">
            Bientôt
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
            aria-label="Glisser-déposer un fichier CSV ou Excel ou cliquer pour parcourir"
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
                  : 'Glissez-déposez votre fichier CSV ou Excel ici'}
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
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={busy}
              onChange={(e) => void handleFiles(e.target.files)}
              className="sr-only"
            />
          </div>
          <p className="mt-4 text-xs text-fg-muted">
            Format CSV ou Excel (.xlsx). Le fichier est stocké de façon chiffrée et
            supprimé automatiquement après 30 jours. Taille maximum 10 Mo.
          </p>
        </div>
      )}

      {/* Pane: external connectors (roadmap) */}
      {source === 'external' && (
        <div>
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-accent-border bg-accent-soft px-4 py-3">
            <span aria-hidden className="mt-0.5 text-accent">
              <Database size={16} strokeWidth={1.75} />
            </span>
            <p className="text-sm leading-relaxed text-fg-secondary">
              <strong className="text-fg">Connexion directe à vos sources de données — bientôt.</strong>{' '}
              Ces intégrations sont en cours de développement et ne sont pas encore
              actives. Chacune ouvrira une session en lecture seule, limitée à votre
              organisation. En attendant, exportez vos données au format CSV et utilisez
              l&apos;onglet <strong className="text-fg">Fichier local</strong>.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {CONNECTOR_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <section key={cat.key} className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-2 text-fg-secondary"
                    >
                      <Icon size={16} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-fg">{cat.label}</h3>
                        <span className="rounded-sm border border-border-subtle bg-surface-2 px-1.5 py-px font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                          Bientôt
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-fg-secondary">
                        {cat.blurb}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-12">
                    {cat.connectors.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center rounded-md border border-border-default bg-surface-2 px-2.5 py-1 text-xs text-fg-secondary"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <p className="mt-6 text-xs text-fg-muted">
            Un connecteur vous manque ?{' '}
            <a href="/app/support" className="text-accent hover:underline">
              Dites-nous lequel
            </a>{' '}
            — la feuille de route est priorisée selon vos demandes.
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
