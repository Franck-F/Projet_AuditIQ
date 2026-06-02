'use client';

import { useRouter } from 'next/navigation';

import { Topbar } from '@/components/app/Topbar';
import { Wizard } from '@/components/audits/wizard/unified/Wizard';

export default function NouveauPage() {
  const router = useRouter();
  return (
    <>
      <Topbar crumbs={[{ label: 'Audits', href: '/app/audits' }, { label: 'Nouvel audit' }]} />
      <main className="flex-1 px-8 py-8">
        <h1 className="mb-6 text-[28px] font-semibold tracking-[-0.02em] text-fg">Nouvel audit</h1>
        <Wizard onComplete={(id) => router.push(`/app/audits/${id}`)} />
      </main>
    </>
  );
}
