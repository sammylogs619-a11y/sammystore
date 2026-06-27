import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const location = useLocation();
  
  // Determine if we should show a full-width layout or standard layout
  const isMarketplacePage = !location.pathname.startsWith('/admin');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header/Navigation would go here if needed */}
      <main className="flex-1">
        {children}
      </main>
      {/* Footer would go here if needed */}
    </div>
  );
}
