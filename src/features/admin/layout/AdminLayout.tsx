import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Admin-specific header/navigation could go here */}
      <main>
        {children}
      </main>
    </div>
  );
}
