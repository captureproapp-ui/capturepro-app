import { ReactNode } from 'react';
import { AppShell } from '../shell/AppShell';

type MainLayoutProps = {
  children: ReactNode;
  onNavigate: (view: string) => void;
};

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
