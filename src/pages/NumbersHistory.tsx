import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface FnOrder {
  id: string;
  country_code: string;
  service_slug: string;
  phone_number: string | null;
  otp_code: string | null;
  status: string;
  amount_ngn: number;
  created_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-yellow-400', active: 'text-blue-400',
  otp_received: 'text-green-400', completed: 'text-green-400',
  expired: 'text-gray-500', cancelled: 'text-gray-500',
  refunded: 'text-blue-400', failed: 'text-red-400',
};

export default function NumbersHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<FnOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('fn_orders')
      .select('id, country_code, service_slug, phone_number, otp_code, status, amount_ngn, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setOrders((data as FnOrder[]) ?? []); setLoading(false); });
  }, [user]);

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-poppins text-2xl font-bold text-white">Numbers History</h2>
        <p className="text-gray-500 text-sm mt-1">Your virtual number purchase history</p>
      </div>

      <div className="bg-[#13151c] rounded-2xl border border-[#252836] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-[#1a1d27] animate-pulse rounded-lg" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">📱</p>
            <p className="text-white font-semibold">No number purchases yet</p>
            <p className="text-gray-500 text-sm mt-1">Buy a virtual number to see history here</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1e2030]">
            {orders.map(order => (
              <div key={order.id} className="p-4 hover:bg-[#1a1d27] transition space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-medium text-sm capitalize">{order.service_slug}</span>
                    <span className="text-gray-500 text-xs ml-2">· {order.country_code.toUpperCase()}</span>
                  </div>
                  <span className={`text-xs font-semibold capitalize ${STATUS_COLOR[order.status] ?? 'text-gray-400'}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
                {order.phone_number && (
                  <div className="flex items-center justify-between bg-[#0f1117] rounded-lg px-3 py-2">
                    <span className="font-mono text-sm text-white">{order.phone_number}</span>
                    <button onClick={() => copy(order.phone_number!, `ph-${order.id}`)}>
                      {copied === `ph-${order.id}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                )}
                {order.otp_code && (
                  <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2">
                    <span className="font-mono font-bold text-xl text-indigo-300 tracking-widest">{order.otp_code}</span>
                    <button onClick={() => copy(order.otp_code!, `otp-${order.id}`)}>
                      {copied === `otp-${order.id}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
                    </button>
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formatDate(order.created_at)}</span>
                  <span>₦{order.amount_ngn.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
