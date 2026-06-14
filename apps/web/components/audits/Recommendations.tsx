'use client';

import type {
  RecommendationCategory,
  RecommendationHorizon,
  RecommendationOut,
  RecommendationOwner,
} from '@/lib/api/audits';
import { cn } from '@/lib/utils';

/* ─── Libellés du moteur déployeur (source unique côté web) ───────────────
 * Le contrat API expose des codes ; on les traduit ici pour l'affichage.
 * Ne pas réinventer d'autres libellés : ce mapping reflète le catalogue API. */

export const CATEGORY_LABEL: Record<RecommendationCategory, string> = {
  documentation: 'Documenter & tracer',
  supervision_humaine: 'Supervision humaine',
  relation_fournisseur: 'Relation fournisseur',
  usage_outil: "Usage de l'outil",
  correction_aval: 'Correction en aval',
  conformite: 'Conformité réglementaire',
  surveillance: 'Surveillance & re-test',
  escalade: 'Escalade',
};

export const OWNER_LABEL: Record<RecommendationOwner, string> = {
  RH: 'RH',
  DPO: 'DPO',
  Juridique: 'Juridique',
  Achats: 'Achats',
  Direction: 'Direction',
};

export const HORIZON_LABEL: Record<RecommendationHorizon, string> = {
  immediat: 'Immédiat',
  court_terme: 'Court terme',
  continu: 'En continu',
};

/** Niveau de priorité affichable (1 = haute, 2 = moyenne, 3 = basse).
 * Dérive de `priority_level` si présent, sinon du littéral legacy `priority`. */
export function priorityRank(rec: RecommendationOut): 1 | 2 | 3 {
  if (rec.priority_level === 1 || rec.priority_level === 2 || rec.priority_level === 3) {
    return rec.priority_level;
  }
  if (rec.priority === 'high') return 1;
  if (rec.priority === 'medium') return 2;
  return 3;
}

export const PRIORITY_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Priorité 1',
  2: 'Priorité 2',
  3: 'Priorité 3',
};

const PRIORITY_CLASS: Record<1 | 2 | 3, string> = {
  1: 'border-status-fail-border bg-status-fail-bg text-status-fail',
  2: 'border-status-warn-border bg-status-warn-bg text-status-warn',
  3: 'border-border-default bg-surface text-fg-muted',
};

/** Le texte du « pourquoi » : `rationale` structuré en priorité, sinon `detail`. */
export function recoRationale(rec: RecommendationOut): string {
  return rec.rationale ?? rec.detail;
}

interface RecommendationsProps {
  items: RecommendationOut[];
}

/**
 * Liste de recommandations groupées par priorité (Priorité 1 → 2 → 3).
 * Pour chaque reco : titre, rationale, étiquette de catégorie, responsable,
 * horizon, référence légale (si présente) et étapes (si non vides).
 * Registre déployeur, sobre et non alarmiste — aucune projection de score.
 */
export function Recommendations({ items }: RecommendationsProps): React.ReactElement | null {
  if (items.length === 0) return null;

  const groups: Array<{ rank: 1 | 2 | 3; recos: RecommendationOut[] }> = (
    [1, 2, 3] as const
  )
    .map((rank) => ({
      rank,
      recos: items.filter((r) => priorityRank(r) === rank),
    }))
    .filter((g) => g.recos.length > 0);

  return (
    <section className="flex flex-col gap-5">
      <h3 className="text-lg font-semibold text-fg">Recommandations</h3>
      {groups.map(({ rank, recos }) => (
        <div key={rank} className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
            {PRIORITY_LABEL[rank]}
          </h4>
          <ul className="flex flex-col gap-3">
            {recos.map((rec, idx) => (
              <RecommendationItem key={`${rank}-${idx}-${rec.title}`} rec={rec} rank={rank} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function RecommendationItem({
  rec,
  rank,
}: {
  rec: RecommendationOut;
  rank: 1 | 2 | 3;
}): React.ReactElement {
  const steps = rec.steps ?? [];
  return (
    <li className="flex flex-col gap-2.5 rounded-md border border-border-default bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-fg">{rec.title}</p>
        <span
          className={cn(
            'inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
            PRIORITY_CLASS[rank],
          )}
        >
          {PRIORITY_LABEL[rank]}
        </span>
      </div>

      <p className="text-sm text-fg-secondary">{recoRationale(rec)}</p>

      {/* Méta : catégorie · responsable · horizon */}
      <div className="flex flex-wrap items-center gap-1.5">
        {rec.category && (
          <span className="inline-block rounded-full border border-border-subtle bg-surface-2 px-2 py-0.5 text-[11px] text-fg-secondary">
            {CATEGORY_LABEL[rec.category]}
          </span>
        )}
        {rec.owner && (
          <span className="inline-block rounded-full border border-border-subtle bg-surface-2 px-2 py-0.5 text-[11px] text-fg-secondary">
            Responsable&nbsp;: {OWNER_LABEL[rec.owner]}
          </span>
        )}
        {rec.horizon && (
          <span className="inline-block rounded-full border border-border-subtle bg-surface-2 px-2 py-0.5 text-[11px] text-fg-secondary">
            {HORIZON_LABEL[rec.horizon]}
          </span>
        )}
      </div>

      {rec.legal_ref && (
        <p className="text-[12px] text-fg-muted">
          <span className="font-medium text-fg-secondary">Réf. légale&nbsp;:</span>{' '}
          {rec.legal_ref}
        </p>
      )}

      {steps.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-fg-muted">
            Étapes
          </span>
          <ol className="flex list-decimal flex-col gap-0.5 pl-5 text-[13px] text-fg-secondary">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </li>
  );
}
