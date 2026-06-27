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
import { ForeignNumbersCountryPage } from './pages/ForeignNumbersCountryPage';
import { MyNumbersPage } from './pages/MyNumbersPage';

import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Numbers from './pages/Numbers';
import AllNumbers from './pages/AllNumbers';
import Pricing from './pages/Pricing';
import FundWallet from './pages/FundWallet';
import ReferEarn from './pages/ReferEarn';
import AccountHistory from './pages/AccountHistory';
import NumbersHistory from './pages/NumbersHistory';
import TransactionHistory from './pages/TransactionHistory';
import ApiTools from './pages/ApiTools';
import ContactUs from './pages/ContactUs';

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentSection, setCurrentSection] = useState<SectionType>(() =>
    getSectionFromPath(location.pathname)
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setCurrentSection(getSectionFromPath(location.pathname));
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
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/numbers" element={<Numbers />} />
              <Route path="/allnumbers" element={<AllNumbers />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/fund" element={<FundWallet />} />
              <Route path="/refer" element={<ReferEarn />} />
              <Route path="/accounthistory" element={<AccountHistory />} />
              <Route path="/numbershistory" element={<NumbersHistory />} />
              <Route path="/txhistory" element={<TransactionHistory />} />
              <Route path="/api" element={<ApiTools />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/foreign-numbers/:country" element={<ForeignNumbersCountryPage />} />
              <Route path="/my-numbers" element={<MyNumbersPage />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
