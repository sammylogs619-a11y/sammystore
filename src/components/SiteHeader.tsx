import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Wallet, User as UserIcon, LogOut, Settings, Gift } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NAV_LINKS = [
  { to: '/products', label: 'Buy Logs/Numbers' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/refer', label: 'Refer & Earn' },
  { to: '/contact', label: 'Contact' },
];

function initialsFrom(label: string) {
  return label.trim().slice(0, 2).toUpperCase();
}

export function SiteHeader() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [referralEarnings, setReferralEarnings] = useState<number>(0);

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Account';

  // Live wallet balance via Supabase Realtime
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) {
      setBalance(null);
      return;
    }

    let active = true;

    supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setBalance(data?.balance ?? 0);
      });

    const channel = supabase
      .channel(`wallet-balance-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const next = (payload.new as { balance?: number } | null)?.balance;
          if (typeof next === 'number') setBalance(next);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Referral earnings summary for the dropdown.
  // Table is created in the referral-system fix; until then this fails soft.
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) {
      setReferralEarnings(0);
      return;
    }
    supabase
      .from('referral_earnings')
      .select('amount')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) {
          setReferralEarnings(0);
          return;
        }
        const total = (data ?? []).reduce((sum, row: { amount: number }) => sum + (row.amount ?? 0), 0);
        setReferralEarnings(total);
      });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">SS</span>
          </div>
          <span className="font-bold text-lg">SammyStore</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {!loading && user && balance !== null && (
            <Link
              to="/wallet"
              className="hidden sm:flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 text-sm font-semibold text-indigo-400 hover:bg-indigo-500/20 transition-colors"
            >
              <Wallet className="w-3.5 h-3.5" />
              ₦{balance.toLocaleString()}
            </Link>
          )}

          {!loading && !user && (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth?mode=signup">Sign up</Link>
              </Button>
            </div>
          )}

          {!loading && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-indigo-500/20 text-indigo-300 font-semibold">
                      {initialsFrom(displayName)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-semibold leading-none">{displayName}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{user.email}</p>
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
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="cursor-pointer">
                    <UserIcon className="w-4 h-4 mr-2" /> Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/settings" className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" /> Profile settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-500 focus:text-red-500">
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted"
            onClick={() => setMobileOpen((p) => !p)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="lg:hidden border-t border-border px-4 py-3 space-y-2 bg-background">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {!loading && !user && (
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" size="sm" className="flex-1" asChild>
                <Link to="/auth" onClick={() => setMobileOpen(false)}>Log in</Link>
              </Button>
              <Button size="sm" className="flex-1" asChild>
                <Link to="/auth?mode=signup" onClick={() => setMobileOpen(false)}>Sign up</Link>
              </Button>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
