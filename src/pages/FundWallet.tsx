import { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export default function FundWallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const bankDetails = {
    bank: 'Moniepoint',
    accountName: 'SammyStore Services',
    accountNumber: '1234567890',
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => { setBalance(data?.balance ?? 0); setLoading(false); });
  }, [user]);

  const copyAccount = async () => {
    await navigator.clipboard.writeText(bankDetails.accountNumber);
    setCopied(true);
    toast.success('Account number copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 20000];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-poppins text-2xl font-bold text-white">Fund Wallet</h2>
        <p className="text-gray-500 text-sm mt-1">Add funds via bank transfer</p>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <p className="text-white/70 text-sm">Current Balance</p>
        {loading
          ? <div className="h-10 w-40 bg-white/20 animate-pulse rounded-lg mt-2" />
          : <p className="text-4xl font-bold mt-1">₦{(balance ?? 0).toLocaleString()}</p>
        }
      </div>

      <div className="bg-[#13151c] rounded-2xl border border-[#252836] p-6 space-y-5">
        <h3 className="font-semibold text-white text-lg">Bank Transfer Details</h3>
        <p className="text-gray-400 text-sm">Transfer to the account below, then contact support with your receipt.</p>

        <div className="space-y-3">
          {[
            { label: 'Bank', value: bankDetails.bank },
            { label: 'Account Name', value: bankDetails.accountName },
          ].map(item => (
            <div key={item.label} className="flex justify-between py-2 border-b border-[#1e2030]">
              <span className="text-gray-500 text-sm">{item.label}</span>
              <span className="text-white font-medium text-sm">{item.value}</span>
            </div>
          ))}
          <div className="flex justify-between items-center py-2 border-b border-[#1e2030]">
            <span className="text-gray-500 text-sm">Account Number</span>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-lg tracking-wider">{bankDetails.accountNumber}</span>
              <button onClick={copyAccount} className="p-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 transition">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
              </button>
            </div>
          </div>
        </div>

        <div>
          <p className="text-gray-400 text-sm mb-3">Quick amounts</p>
          <div className="grid grid-cols-3 gap-2">
            {quickAmounts.map(a => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className={`py-2.5 rounded-xl text-sm font-medium transition border ${
                  amount === String(a)
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                    : 'border-[#252836] text-gray-400 hover:border-indigo-500/50 hover:text-gray-200'
                }`}
              >
                ₦{a.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-yellow-400 text-sm">
            ⚠️ After transfer, send receipt via WhatsApp to get your wallet credited within 5 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
