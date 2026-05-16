import { AppShell } from '@/components/app/AppShell';
import { QueryProvider } from '@/lib/query/provider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}
