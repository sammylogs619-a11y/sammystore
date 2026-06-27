import { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getSectionFromPath, SectionType, getDashboardRouteBySection } from '@/features/dashboard/routes';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const [currentSection, setCurrentSection] = useState<SectionType>(() => 
    getSectionFromPath(location.pathname)
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Keep currentSection in sync with URL
  useEffect(() => {
    const section = getSectionFromPath(location.pathname);
    setCurrentSection(section);
  }, [location.pathname]);

  const pageTitle = currentSection.charAt(0).toUpperCase() + currentSection.slice(1);

  return (
    <div className="flex h-screen bg-[#0a0a0f]">
      <Sidebar
        currentSection={currentSection}
        onSectionChange={setCurrentSection}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar pageTitle={pageTitle} />

        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
