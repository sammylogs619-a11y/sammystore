import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

const accounts = [
  { id: '1', name: 'Aged Instagram (1 Year+)', category: 'instagram', price: 2500, badge: 'AGED 1Y+', emoji: '📷' },
  { id: '2', name: 'Aged Instagram (2 Years+)', category: 'instagram', price: 5000, badge: 'AGED 2Y+', emoji: '📷' },
  { id: '3', name: 'Aged Twitter/X (2 Years+)', category: 'twitter', price: 3000, badge: 'AGED 2Y+', emoji: '🐦' },
  { id: '4', name: 'Facebook (<50 Friends)', category: 'facebook', price: 1800, badge: '<50 FRIENDS', emoji: '👥' },
  { id: '5', name: 'TikTok Accounts', category: 'tiktok', price: 2000, badge: 'TRENDING', emoji: '🎵' },
];

export default function Accounts() {
  const [filter, setFilter] = useState('all');
  const [buying, setBuying] = useState<string | null>(null);
  const { user } = useAuth();

  const filtered = filter === 'all' ? accounts : accounts.filter(a => a.category === filter);

  const handleBuy = async (account: typeof accounts[0]) => {
    if (!user) { toast.error('Please log in to purchase'); return; }
    setBuying(account.id);
    try {
      const { data, error } = await supabase.rpc('purchase_with_wallet', {
        _product_id: account.id,
        _quantity: 1,
        _user_id: user.id,
      });
      if (error) throw error;
      toast.success(`✅ Purchase successful! Order: ${String(data).slice(0, 8)}…`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Purchase failed';
      if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('balance')) {
        toast.error('❌ Insufficient wallet balance. Please fund your wallet.');
      } else {
        toast.error(`❌ ${msg}`);
      }
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-poppins text-2xl font-bold text-white">Buy Account (Logs)</h2>
        <p className="text-gray-500 text-sm mt-1">Browse our collection of aged social media accounts</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 border-b border-[#1e2030]">
        {['all', 'instagram', 'twitter', 'facebook', 'tiktok'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
              filter === cat
                ? 'border-b-4 border-indigo-500 text-indigo-300 font-semibold'
                : 'text-gray-400 hover:text-indigo-400'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(account => (
          <div key={account.id} className="bg-[#13151c] rounded-2xl border border-[#252836] overflow-hidden card-hover">
            <div className="h-36 bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center relative">
              <span className="absolute top-3 right-3 bg-white/90 text-xs font-bold px-2 py-1 rounded-full text-gray-800">
                {account.badge}
              </span>
              <span className="text-5xl">{account.emoji}</span>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-white">{account.name}</h3>
              <div className="flex items-center justify-between mt-3">
                <span className="text-indigo-400 font-bold text-lg">₦{account.price.toLocaleString()}</span>
                <button
                  onClick={() => handleBuy(account)}
                  disabled={buying === account.id}
                  className="bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {buying === account.id ? 'Buying…' : 'Buy Now'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
