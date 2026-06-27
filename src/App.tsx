import { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import {
  DASHBOARD_ROUTES,
  getSectionFromPath,
  getDashboardRouteBySection,
  SectionType
} from './features/dashboard/routes';
import { MARKETPLACE_ROUTES } from './features/marketplace/routes';
import { ADMIN_ROUTES } from './features/admin/routes';
import { ForeignNumbersCountryPage } from './pages/ForeignNumbersCountryPage';
import { MyNumbersPage } from './pages/MyNumbersPage';

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentSection, setCurrentSection] = useState<SectionType>(() =>
    getSectionFromPath(location.pathname)
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const section = getSectionFromPath(location.pathname);
    setCurrentSection(section);
  }, [location.pathname]);

  const handleSectionChange = (section: SectionType) => {
    setCurrentSection(section);
    setSidebarOpen(false);
    const route = getDashboardRouteBySection(section);
    if (route && location.pathname !== route.path) {
      navigate(route.path);
    }
  };

  const pageTitle = currentSection.charAt(0).toUpperCase() + currentSection.slice(1);

  return (
    <div className="flex h-screen bg-[#0a0a0f]">
      <Sidebar
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar pageTitle={pageTitle} />

        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-8">
            <Routes>
              {/* Dashboard routes */}
              {DASHBOARD_ROUTES.map(route => (
                <Route key={route.path} path={route.path} element={<>{route.component}</>} />
              ))}

              {/* Marketplace/public routes */}
              {MARKETPLACE_ROUTES.map(route => (
                <Route key={route.path} path={route.path} element={<>{route.component}</>} />
              ))}

              {/* Admin routes */}
              {ADMIN_ROUTES.map(route => (
                <Route key={route.path} path={route.path} element={<>{route.component}</>} />
              ))}

              {/* Foreign Numbers routes */}
              <Route path="/foreign-numbers/:country" element={<ForeignNumbersCountryPage />} />
              <Route path="/my-numbers" element={<MyNumbersPage />} />

              {/* Fallback */}
              <Route path="*" element={<>{DASHBOARD_ROUTES[0].component}</>} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
