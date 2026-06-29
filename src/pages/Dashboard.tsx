import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Smartphone, Users, Wallet } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

type Tx = {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string | null;
  created_at: string;
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletUpdatedAt, setWalletUpdatedAt] = useState<string | null>(null);
  const [accountsBought, setAccountsBought] = useState<number | null>(null);
  const [activeNumbers, setActiveNumbers] = useState<number | null>(null);
  const [expiringSoon, setExpiringSoon] = useState(0);
  const [totalOrders, setTotalOrders] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) { setLoading(false); return; }

    let active = true;

    const load = async () => {
      const [walletRes, ordersRes, fnOrdersRes, fnActiveRes, txRes] = await Promise.all([
        supabase.from('wallets').select('balance,updated_at').eq('user_id', user.id).maybeSingle(),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('fn_orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('fn_orders').select('id,expires_at', { count: 'exact' }).eq('user_id', user.id).in('status', ['active', 'otp_received']),
        supabase.from('wallet_transactions').select('id,type,amount,description,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      ]);

      if (!active) return;

      setWalletBalance(walletRes.data?.balance ?? 0);
      setWalletUpdatedAt(walletRes.data?.updated_at ?? null);
      setAccountsBought(ordersRes.count ?? 0);

      const numbersOrdersCount = fnOrdersRes.count ?? 0;
      setTotalOrders((ordersRes.count ?? 0) + numbersOrdersCount);

      setActiveNumbers(fnActiveRes.count ?? 0);
      const soon = (fnActiveRes.data ?? []).filter((o: { expires_at: string | null }) => {
        if (!o.expires_at) return false;
        const hoursLeft = (new Date(o.expires_at).getTime() - Date.now()) / 36e5;
        return hoursLeft > 0 && hoursLeft < 2;
      }).length;
      setExpiringSoon(soon);

      setTransactions((txRes.data ?? []) as Tx[]);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`dashboard_wallet_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const next = payload.new as { balance?: number; updated_at?: string } | null;
          if (typeof next?.balance === 'number') setWalletBalance(next.balance);
          if (next?.updated_at) setWalletUpdatedAt(next.updated_at);
        })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [user]);

  const timeAgo = (iso: string | null) => {
    if (!iso) return '—';
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  };

  const stats = [
    {
      title: 'Total Orders',
      value: totalOrders === null ? '—' : String(totalOrders),
      change: 'All-time purchases',
      icon: ShoppingBag,
      gradient: 'from-indigo-500 to-purple-600',
    },
    {
      title: 'Active Numbers',
      value: activeNumbers === null ? '—' : String(activeNumbers),
      change: expiringSoon > 0 ? `${expiringSoon} expiring soon` : 'None expiring soon',
      icon: Smartphone,
      gradient: 'from-pink-500 to-red-600',
    },
    {
      title: 'Accounts Bought',
      value: accountsBought === null ? '—' : String(accountsBought),
      change: 'All-time logs purchased',
      icon: Users,
      gradient: 'from-cyan-500 to-blue-600',
    },
    {
      title: 'Wallet Balance',
      value: walletBalance === null ? '—' : `₦${walletBalance.toLocaleString()}`,
      change: walletUpdatedAt ? `Updated ${timeAgo(walletUpdatedAt)}` : 'No activity yet',
      icon: Wallet,
      gradient: 'from-green-500 to-teal-600',
    },
  ];

  const quickActions = [
    { label: 'Buy Account', icon: '📋', path: '/accounts' },
    { label: 'Buy Number', icon: '📱', path: '/numbers' },
    { label: 'Fund Wallet', icon: '💳', path: '/fund' },
    { label: 'View History', icon: '📊', path: '/txhistory' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-5 text-white card-hover relative overflow-hidden`}
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/80 text-sm">{stat.title}</span>
                  <Icon className="w-8 h-8 text-white/60" />
                </div>
                {loading ? (
                  <div className="h-8 w-16 bg-white/20 animate-pulse rounded-lg" />
                ) : (
                  <p className="text-3xl font-bold">{stat.value}</p>
                )}
                <p className="text-white/70 text-xs mt-1">{stat.change}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="font-poppins text-lg font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => navigate(action.path)}
              className="glass-card rounded-2xl p-4 card-hover flex flex-col items-center gap-2 hover:border-indigo-500/50"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-sm font-medium text-gray-200">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#13151c] rounded-2xl border border-[#252836] p-6 glow-indigo">
        <h2 className="font-poppins text-lg font-bold text-white mb-4">Recent Transactions</h2>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="h-12 bg-white/5 animate-pulse rounded-xl" />)}
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No transactions yet.</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx, idx) => (
              <div key={tx.id} className={`flex items-center justify-between py-3 ${idx < transactions.length - 1 ? 'border-b border-[#1e2030]' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg">
                    {tx.type === 'credit' ? '💳' : '🛒'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{tx.description ?? (tx.type === 'credit' ? 'Wallet funding' : 'Purchase')}</p>
                    <p className="text-xs text-gray-500">{timeAgo(tx.created_at)}</p>
                  </div>
                </div>
                <span className={tx.type === 'debit' ? 'text-red-400' : 'text-green-400'}>
                  {tx.type === 'debit' ? '-' : '+'}₦{Number(tx.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
         }
                           
