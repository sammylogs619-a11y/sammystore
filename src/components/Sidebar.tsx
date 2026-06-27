import { useState } from 'react';
import { Menu, X, ChevronDown, ChevronRight, LogOut, Settings, Gift, Wallet as WalletIcon } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCountries } from '@/hooks/useForeignNumbers';
import { useAuth } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function ForeignNumbersNavItem({ onNavigate }: { onNavigate: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const { countries, loading } = useCountries();
  const location = useLocation();
  const navigate = useNavigate();
  const isForeignRoute = location.pathname.startsWith('/foreign-numbers');

  return (
    <div className="mt-1">
      <button
        onClick={() => setIsOpen(p => !p)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
          isForeignRoute
            ? 'bg-gradient-to-r from-indigo-500/20 to-transparent border-r-4 border-indigo-500 text-indigo-300'
            : 'text-gray-300 hover:text-gray-200 hover:bg-[#1a1d27]'
        }`}
      >
        <span className="flex items-center gap-3">
          <span className="text-lg">🌍</span>
          <span>Shop Foreign Numbers</span>
        </span>
        {isOpen ? <ChevronDown className="w-4 h-4 opacity-60" /> : <ChevronRight className="w-4 h-4 opacity-60" />}
      </button>

      {isOpen && (
        <div className="mt-1 ml-4 pl-3 border-l border-[#1e2030] space-y-0.5 max-h-56 overflow-y-auto">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-7 rounded bg-[#1a1d27] animate-pulse my-1" />)
            : countries.map(country => {
                const slug = country.name.toLowerCase().replace(/\s+/g, '-');
                const isActive = location.pathname === `/foreign-numbers/${slug}`;
                return (
                  <button
                    key={country.code}
                    onClick={() => { navigate(`/foreign-numbers/${slug}`); onNavigate(); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left ${
                      isActive ? 'text-indigo-300 bg-indigo-500/10 font-semibold' : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1d27]'
                    }`}
                  >
                    <span>{country.flag_emoji}</span>
                    <span className="truncate">{country.name}</span>
                  </button>
                );
              })}
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  currentSection: string;
  onSectionChange: (section: any) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { divider: 'Services' },
  { id: 'accounts', label: 'Buy Account (Logs)', icon: '📋' },
  { id: 'numbers', label: 'Buy USA Numbers', icon: '📱' },
  { id: 'allnumbers', label: 'Buy All Countries Numbers', icon: '🌐' },
  { id: 'pricing', label: 'USA Services & Pricing', icon: '💰' },
  { id: 'fund', label: 'Fund Wallet', icon: '💳' },
  { id: 'refer', label: 'Refer & Earn', icon: '🤝' },
  { divider: 'History' },
  { id: 'accounthistory', label: 'Account Logs History', icon: '📑' },
  { id: 'numbershistory', label: 'Numbers History', icon: '📞' },
  { id: 'txhistory', label: 'Transaction History', icon: '💸' },
  { divider: 'Developer' },
  { id: 'api', label: 'Api Tools', icon: '⚙️' },
];

export default function Sidebar({ currentSection, onSectionChange, isOpen, onToggle }: SidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setBalance(data?.balance ?? 0));

    const channel = supabase.channel(`sidebar_wallet_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const next = (payload.new as { balance?: number } | null)?.balance;
          if (typeof next === 'number') setBalance(next);
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Account';
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out');
    navigate('/');
    onToggle();
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[#1e2030] flex items-center justify-between shrink-0">
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

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map((item, idx) => {
          if ('divider' in item) {
            return (
              <div key={`d-${idx}`} className="mt-4 mb-1 px-4">
                <span className="font-poppins text-xs font-bold text-gray-500 uppercase tracking-wider">{item.divider}</span>
              </div>
            );
          }
          return (
            <button
              key={item.id}
              onClick={() => { onSectionChange(item.id); onToggle(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                currentSection === item.id
                  ? 'bg-gradient-to-r from-indigo-500/20 to-transparent border-r-4 border-indigo-500 text-indigo-300'
                  : 'text-gray-300 hover:text-gray-200 hover:bg-[#1a1d27]'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Foreign Numbers section */}
        <div className="mt-3">
          <div className="mt-2 mb-1 px-4">
            <span className="font-poppins text-xs font-bold text-gray-500 uppercase tracking-wider">Foreign Numbers</span>
          </div>
          <ForeignNumbersNavItem onNavigate={onToggle} />
          <Link
            to="/my-numbers"
            onClick={onToggle}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all mt-0.5 ${
              location.pathname === '/my-numbers'
                ? 'bg-gradient-to-r from-indigo-500/20 to-transparent border-r-4 border-indigo-500 text-indigo-300'
                : 'text-gray-300 hover:text-gray-200 hover:bg-[#1a1d27]'
            }`}
          >
            <span className="text-lg">📲</span>
            <span>My Numbers</span>
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-[#1e2030] pt-3 space-y-2 shrink-0">
        <a
          href="https://wa.me/message"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition"
        >
          <span>💬</span>
          WhatsApp Us
        </a>
        {user && (
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 text-sm font-medium hover:text-red-300 hover:bg-red-500/10 transition"
          >
            <span>🚪</span>
            Sign Out
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={onToggle} />}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 bg-[#0f1117] border-r border-[#1e2030] h-full flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-[#0f1117] border-r border-[#1e2030] z-50 transform transition-transform duration-300 lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-[#13151c]/95 backdrop-blur-xl border-b border-[#252836] z-40 px-4 py-3 flex items-center justify-between">
        <button onClick={onToggle} className="p-2 rounded-lg hover:bg-[#1a1d27]">
          <Menu className="w-6 h-6 text-gray-300" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SS</span>
          </div>
          <span className="font-poppins font-bold text-lg text-white">SammyStore</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus:outline-none">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-indigo-500/20 text-indigo-300 font-semibold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-semibold leading-none">{displayName}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <WalletIcon className="w-3.5 h-3.5" /> Wallet balance
                </span>
                <span className="font-semibold">₦{(balance ?? 0).toLocaleString()}</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/dashboard/settings')} className="cursor-pointer">
              <Settings className="w-4 h-4 mr-2" /> Profile settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-500 focus:text-red-500">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
