import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  products: { name: string } | null;
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
  refunded: 'bg-blue-500/20 text-blue-400',
};

export default function AccountHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('orders')
      .select('id, status, total_amount, created_at, products(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setOrders((data as Order[]) ?? []); setLoading(false); });
  }, [user]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-poppins text-2xl font-bold text-white">Account Logs History</h2>
        <p className="text-gray-500 text-sm mt-1">Your account purchase history</p>
      </div>

      <div className="bg-[#13151c] rounded-2xl border border-[#252836] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-[#1a1d27] animate-pulse rounded-lg" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-white font-semibold">No purchases yet</p>
            <p className="text-gray-500 text-sm mt-1">Purchase an account to see history here</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1e2030]">
            {orders.map(order => (
              <div key={order.id} className="flex items-center justify-between px-5 py-4 hover:bg-[#1a1d27] transition">
                <div>
                  <p className="text-sm font-medium text-white">{order.products?.name ?? 'Account Purchase'}</p>
                  <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[order.status] ?? 'bg-gray-500/20 text-gray-400'}`}>
                    {order.status}
                  </span>
                  <span className="text-red-400 font-bold text-sm">-₦{order.total_amount?.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
