import { Bell, LogOut, Settings, Gift, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopBarProps { pageTitle: string; }

export default function TopBar({ pageTitle }: TopBarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number | null>(null);
  const [referralEarnings, setReferralEarnings] = useState(0);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setBalance(data?.balance ?? 0));

    const channel = supabase.channel(`topbar_wallet_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const next = (payload.new as { balance?: number } | null)?.balance;
          if (typeof next === 'number') setBalance(next);
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Referral earnings — fails soft until that table exists
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    supabase
      .from('referral_earnings')
      .select('amount')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) { setReferralEarnings(0); return; }
        setReferralEarnings((data ?? []).reduce((sum, row: { amount: number }) => sum + (row.amount ?? 0), 0));
      });
  }, [user]);

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="hidden lg:flex bg-[#0f1117]/95 backdrop-blur-xl border-b border-[#1e2030] px-8 py-4 items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="font-poppins text-xl font-bold text-white capitalize">{pageTitle}</h1>
        <p className="text-sm text-gray-500">Welcome back, {displayName}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="bg-indigo-500/10 border border-indigo-500/30 px-4 py-2 rounded-full">
          <span className="text-indigo-300 font-semibold">
            {balance === null ? '...' : `₦ ${balance.toLocaleString()}`}
          </span>
        </div>
        <button className="relative p-2 rounded-lg hover:bg-[#1a1d27]">
          <Bell className="w-6 h-6 text-gray-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 pl-4 border-l border-[#1e2030] focus:outline-none">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">{displayName}</p>
                <p className="text-xs text-gray-500">{user?.email ?? ''}</p>
              </div>
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
                  <Wallet className="w-3.5 h-3.5" /> Wallet balance
                </span>
                <span className="font-semibold">₦{(balance ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5" /> Referral earnings
                </span>
                <span className="font-semibold">₦{referralEarnings.toLocaleString()}</span>
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
    </div>
  );
}
