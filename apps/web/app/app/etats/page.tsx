'use client';

/**
 * /app/etats — Template gallery (dev-only)
 * Visual reference for all UX state patterns used in AuditIQ.
 * No real data — purely static demo for QA / design review.
 */

import * as React from 'react';
import Link from 'next/link';
import { AlertCircle, Lock, CheckCircle, RefreshCw, Bell, Trash2 } from 'lucide-react';

import { Topbar } from '@/components/app/Topbar';
import { Modal, ModalActions } from '@/components/product/Modal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InlineNote } from '@/components/product/InlineNote';
import { StatusBadge } from '@/components/product/StatusBadge';
import { SectionHead } from '@/components/product/SectionHead';

/* ─── Section wrapper ────────────────────────────────────────────────── */

function StateSection({
  num,
  title,
  description,
  children,
}: {
  num: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="border-t border-border-subtle pt-8 first:border-t-0 first:pt-0"
    >
      <SectionHead eyebrow={num} title={title} sub={description} />
      <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-border-subtle bg-surface-2 p-6">
        {children}
      </div>
    </section>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────── */

export default function EtatsPage() {
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Aide & support', href: '/app/support' },
          { label: 'États UX' },
        ]}
      />

      <main className="flex-1 px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="mb-2 inline-flex items-center rounded-full border border-status-warn-border bg-status-warn-bg px-2.5 py-1 text-[11px] font-medium text-status-warn">
            Dev-only · non visible en production
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Bibliothèque d&apos;états UX
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-secondary">
            Référence visuelle des états essentiels d&apos;AuditIQ : empty, chargement, succès, erreur, accès restreint, suppression, notifications, modal confirm. Page de documentation pour l&apos;équipe design / produit.
          </p>
        </div>

        <div className="flex flex-col gap-12">

          {/* 01 — First-use */}
          <StateSection
            num="01"
            title="First-use · pas encore d'audit"
            description="Premier écran après l'inscription, avant tout audit."
          >
            <div className="flex max-w-[540px] flex-col items-center gap-5 px-12 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden><path d="M12 3v18M3 12h18"/></svg>
              </span>
              <div>
                <h4 className="mb-2 text-[17px] font-semibold text-fg">
                  Lancez votre premier audit
                </h4>
                <p className="text-[13px] leading-relaxed text-fg-secondary">
                  AuditIQ n&apos;a encore traité aucun audit dans votre espace. Importez un dataset ou connectez votre chatbot pour commencer — comptez environ 25 min pour un premier passage complet.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" asChild>
                  <Link href="/app/audits/nouveau">Lancer mon premier audit</Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href="/app/audits">Voir les modules</Link>
                </Button>
              </div>
            </div>
          </StateSection>

          {/* 02 — Loading skeleton */}
          <StateSection
            num="02"
            title="Loading · skeleton card"
            description="État pendant le chargement des données — skeleton animé."
          >
            <div className="w-full max-w-[640px]">
              <Card className="animate-pulse">
                <div className="mb-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-surface-3" />
                  <div className="flex-1">
                    <div className="mb-2 h-3.5 w-48 rounded-full bg-surface-3" />
                    <div className="h-3 w-32 rounded-full bg-surface-3" />
                  </div>
                  <div className="h-6 w-20 rounded-full bg-surface-3" />
                </div>
                <div className="mb-2 h-2.5 w-full rounded-full bg-surface-3" />
                <div className="mb-2 h-2.5 w-5/6 rounded-full bg-surface-3" />
                <div className="h-2.5 w-3/4 rounded-full bg-surface-3" />
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-16 rounded-lg bg-surface-3" />
                  ))}
                </div>
              </Card>
            </div>
          </StateSection>

          {/* 03 — Error / network */}
          <StateSection
            num="03"
            title="Error · erreur réseau avec retry"
            description="Erreur bloquante avec action corrective (retry)."
          >
            <div className="w-full max-w-[640px]">
              <div
                role="alert"
                className="rounded-xl border border-status-fail-border bg-status-fail-bg p-5"
              >
                <div className="flex gap-3">
                  <AlertCircle size={20} aria-hidden className="mt-0.5 shrink-0 text-status-fail" />
                  <div className="flex-1">
                    <div className="mb-1 text-[14px] font-medium text-status-fail">
                      Impossible de charger les audits
                    </div>
                    <p className="mb-4 text-[13px] leading-relaxed text-fg-secondary">
                      Une erreur réseau s&apos;est produite. Vérifiez votre connexion et réessayez. Si le problème persiste, contactez le support.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" className="gap-1.5">
                        <RefreshCw size={14} aria-hidden />
                        Réessayer
                      </Button>
                      <Button variant="secondary" size="sm" asChild>
                        <Link href="/app/support">Contacter le support</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </StateSection>

          {/* 04 — Permission denied */}
          <StateSection
            num="04"
            title="Permission denied · accès restreint"
            description="L'utilisateur n'a pas les droits nécessaires."
          >
            <div className="flex max-w-[480px] flex-col items-center gap-4 py-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-status-info-border bg-status-info-bg text-status-info">
                <Lock size={20} aria-hidden />
              </span>
              <div>
                <h4 className="mb-2 text-[16px] font-semibold text-fg">
                  Vous n&apos;avez pas accès
                </h4>
                <p className="text-[13px] leading-relaxed text-fg-secondary">
                  Votre rôle actuel (Spectateur) ne vous permet pas de lancer un audit ni de modifier les seuils. Demandez à un Admin ou Owner de modifier vos droits.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/app/equipe">Voir mon rôle</Link>
                </Button>
                <Button variant="primary" size="sm" asChild>
                  <Link href="/app/support">Contacter un admin</Link>
                </Button>
              </div>
            </div>
          </StateSection>

          {/* 05 — Success */}
          <StateSection
            num="05"
            title="Success · rapport généré"
            description="Confirmation après la génération réussie d'un rapport."
          >
            <Card
              className="max-w-[480px] w-full text-center"
              style={{
                borderColor: 'var(--accent-border)',
                background: 'linear-gradient(180deg, var(--accent-soft), transparent 70%), var(--surface)',
              }}
            >
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-[#0b1410] mx-auto">
                <CheckCircle size={28} aria-hidden />
              </span>
              <h3 className="mb-2 text-[20px] font-semibold text-fg">
                Rapport généré et signé avec succès
              </h3>
              <p className="mb-5 text-[13px] leading-relaxed text-fg-secondary">
                Votre rapport <code className="font-mono text-[12px]">RPT-2026-014</code> a été signé eIDAS et est prêt à être partagé.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="primary" size="sm" asChild>
                  <Link href="/app/rapports">Voir le rapport</Link>
                </Button>
                <Button variant="secondary" size="sm">Télécharger PDF</Button>
              </div>
            </Card>
          </StateSection>

          {/* 06 — Toast cluster */}
          <StateSection
            num="06"
            title="Toast cluster · notifications éphémères"
            description="Toasts success, warn et info rendus côte à côte (normalement bottom-right)."
          >
            <div className="flex flex-col items-end gap-2 w-full max-w-[480px]">
              {/* Success toast */}
              <div
                role="status"
                aria-live="polite"
                className="flex w-full max-w-[360px] items-start gap-3 rounded-xl border border-status-pass-border bg-surface p-4 shadow-lg"
              >
                <CheckCircle size={16} aria-hidden className="mt-0.5 shrink-0 text-status-pass" />
                <div>
                  <div className="text-[13px] font-medium text-fg">Audit AUD-2026-014 terminé</div>
                  <div className="text-[12px] text-fg-muted">Verdict : risque critique · DP 0.72 — voir le rapport</div>
                </div>
                <StatusBadge tone="pass" noDot className="ml-auto shrink-0">OK</StatusBadge>
              </div>
              {/* Warn toast */}
              <div
                role="status"
                aria-live="polite"
                className="flex w-full max-w-[360px] items-start gap-3 rounded-xl border border-status-warn-border bg-surface p-4 shadow-lg"
              >
                <AlertCircle size={16} aria-hidden className="mt-0.5 shrink-0 text-status-warn" />
                <div>
                  <div className="text-[13px] font-medium text-fg">3 recommandations P1 ouvertes</div>
                  <div className="text-[12px] text-fg-muted">À traiter sous 30 jours · cliquez pour voir</div>
                </div>
                <StatusBadge tone="warn" noDot className="ml-auto shrink-0">Alerte</StatusBadge>
              </div>
              {/* Info toast */}
              <div
                role="status"
                aria-live="polite"
                className="flex w-full max-w-[360px] items-start gap-3 rounded-xl border border-status-info-border bg-surface p-4 shadow-lg"
              >
                <Bell size={16} aria-hidden className="mt-0.5 shrink-0 text-status-info" />
                <div>
                  <div className="text-[13px] font-medium text-fg">L&apos;art. 10 AI Act entre en vigueur le 02/08/2026</div>
                  <div className="text-[12px] text-fg-muted">Votre couverture actuelle : 76 %. Voir le guide.</div>
                </div>
                <StatusBadge tone="info" noDot className="ml-auto shrink-0">Info</StatusBadge>
              </div>
            </div>
          </StateSection>

          {/* 07 — Modal demo */}
          <StateSection
            num="07"
            title="Modal · confirmation avec saisie"
            description="Modale de confirmation avant une action destructrice. Tapez le nom pour débloquer."
          >
            <div className="flex flex-col items-center gap-4">
              <InlineNote>
                Cliquez sur le bouton ci-dessous pour ouvrir la modale de confirmation.
              </InlineNote>
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 border-status-fail-border text-status-fail hover:bg-status-fail-bg"
                onClick={() => setModalOpen(true)}
              >
                <Trash2 size={14} aria-hidden />
                Supprimer l&apos;audit AUD-2026-014
              </Button>
            </div>
          </StateSection>

        </div>
      </main>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Supprimer définitivement l'audit AUD-2026-014 ?"
        description="Cette action est irréversible. Le rapport associé RPT-2026-014 sera également supprimé."
        confirmTyping="Recrutement Q2 2026"
      >
        <ModalActions>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Annuler
          </Button>
          <Button
            variant="primary"
            className="bg-status-fail border-status-fail text-white hover:bg-status-fail/90"
            onClick={() => setModalOpen(false)}
          >
            Supprimer définitivement
          </Button>
        </ModalActions>
      </Modal>
    </>
  );
}
