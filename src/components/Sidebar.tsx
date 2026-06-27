import { Menu, X } from 'lucide-react';

interface SidebarProps {
  currentSection: string;
  onSectionChange: (section: any) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ currentSection, onSectionChange, isOpen, onToggle }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { label: 'Services', divider: true },
    { id: 'accounts', label: 'Buy Account (Logs)', icon: '📋' },
    { id: 'numbers', label: 'Buy USA Numbers', icon: '📱' },
    { id: 'allnumbers', label: 'Buy All Countries Numbers', icon: '🌍' },
    { id: 'pricing', label: 'USA Services & Pricing', icon: '💰' },
    { id: 'fund', label: 'Fund Wallet', icon: '💳' },
    { id: 'refer', label: 'Refer & Earn', icon: '🤝' },
    { label: 'History', divider: true },
    { id: 'accounthistory', label: 'Account Logs History', icon: '📑' },
    { id: 'numbershistory', label: 'Numbers History', icon: '📞' },
    { id: 'txhistory', label: 'Transaction History', icon: '💸' },
    { label: 'Developer', divider: true },
    { id: 'api', label: 'Api Tools', icon: '⚙️' },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={onToggle} />
      )}

      <aside className={`fixed top-0 left-0 h-full w-72 bg-[#0f1117] border-r border-[#1e2030] z-50 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto flex flex-col overflow-y-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-5 py-4 border-b border-[#1e2030] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white font-bold text-lg">SS</span>
            </div>
            <span className="font-poppins font-bold text-xl text-white">SammyStore</span>
          </div>
          <button onClick={onToggle} className="lg:hidden p-1 rounded hover:bg-[#1a1d27]">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <nav className="flex-1 py-3 px-3 space-y-1">
          {navItems.map((item, idx) => {
            if ('divider' in item) {
              return (
                <div key={`divider-${idx}`} className="mt-4 mb-2 px-4">
                  <span className="font-poppins text-xs font-bold text-gray-500 uppercase tracking-wider">{item.label}</span>
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  currentSection === item.id
                    ? 'active bg-gradient-to-r from-indigo-500/20 to-transparent border-r-4 border-indigo-500 text-indigo-300'
                    : 'text-gray-300 hover:text-gray-200'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-4 border-t border-[#1e2030] pt-3 space-y-2">
          <a
            href="https://wa.me/message"
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-btn flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium hover:opacity-90 transition shadow-lg shadow-green-500/20"
          >
            <span>💬</span>
            WhatsApp Us
          </a>
          <button
            onClick={() => onSectionChange('contact')}
            className="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 text-sm font-medium hover:text-gray-200"
          >
            <span>📧</span>
            Contact Us
          </button>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 bg-[#13151c]/95 backdrop-blur-xl border-b border-[#252836] z-40 px-4 py-3 flex items-center justify-between">
        <button onClick={onToggle} className="p-2 rounded-lg hover:bg-[#1a1d27]">
          <Menu className="w-6 h-6 text-gray-300" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white font-bold text-sm">SS</span>
          </div>
          <span className="font-poppins font-bold text-lg text-white">SammyStore</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 rounded-full">
            <span className="text-indigo-300 font-semibold text-sm">₦ 10,591</span>
          </div>
        </div>
      </div>
    </>
  );
}
