import './vitrine.css';
import { MarketingHeader } from '@/components/layout/MarketingHeader';
import { MarketingFooter } from '@/components/layout/MarketingFooter';
import { RevealObserver } from '@/components/marketing/RevealObserver';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RevealObserver />
      <MarketingHeader />
      <main id="top">{children}</main>
      <MarketingFooter />
    </>
  );
}
