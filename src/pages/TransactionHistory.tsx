import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface Transaction {
  id: string;
  tx_type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
}

export default function TransactionHistory() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('wallet_transactions')
      .select('id, tx_type, amount, description, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setTransactions((data as Transaction[]) ?? []); setLoading(false); });
  }, [user]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-poppins text-2xl font-bold text-white">Transaction History</h2>
        <p className="text-gray-500 text-sm mt-1">All your wallet transactions</p>
      </div>

      <div className="bg-[#13151c] rounded-2xl border border-[#252836] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-[#1a1d27] animate-pulse rounded-lg" />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-white font-semibold">No transactions yet</p>
            <p className="text-gray-500 text-sm mt-1">Fund your wallet to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1e2030]">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-4 hover:bg-[#1a1d27] transition">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${tx.tx_type === 'credit' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {tx.tx_type === 'credit' ? '↓' : '↑'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{tx.description ?? tx.tx_type}</p>
                    <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                  </div>
                </div>
                <span className={`font-bold text-sm ${tx.tx_type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.tx_type === 'credit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
