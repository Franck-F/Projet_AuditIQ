import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid min-h-screen bg-bg"
      style={{ gridTemplateColumns: 'var(--sidebar-w) 1fr' }}
    >
      <Sidebar />
      <div className="flex min-w-0 flex-col">{children}</div>
    </div>
  );
}
