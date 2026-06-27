import { useState } from 'react';
import { Copy, Check, Gift, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export default function ReferEarn() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const referralCode = user ? `SAMMY-${user.id.slice(0, 6).toUpperCase()}` : 'SAMMY-XXXXXX';
  const referralLink = `https://sammystorelogs.com/?ref=${referralCode}`;

  const copy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-poppins text-2xl font-bold text-white">Refer & Earn</h2>
        <p className="text-gray-500 text-sm mt-1">Earn commissions by referring friends</p>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white text-center">
        <Gift className="w-12 h-12 mx-auto mb-3 opacity-80" />
        <h3 className="text-2xl font-bold">Earn ₦500 per referral</h3>
        <p className="text-white/70 text-sm mt-2">Share your link. When a friend signs up and purchases, you both earn a bonus!</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, label: 'Total Referrals', value: '0' },
          { icon: TrendingUp, label: 'Pending Earnings', value: '₦0' },
          { icon: Gift, label: 'Total Earned', value: '₦0' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#13151c] rounded-xl border border-[#252836] p-4 text-center">
            <stat.icon className="w-5 h-5 mx-auto text-indigo-400 mb-2" />
            <p className="text-white font-bold">{stat.value}</p>
            <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#13151c] rounded-2xl border border-[#252836] p-6 space-y-4">
        <h3 className="font-semibold text-white">Your Referral Link</h3>
        <div className="flex items-center gap-3 bg-[#0f1117] rounded-xl px-4 py-3 border border-[#252836]">
          <span className="text-indigo-300 text-sm font-mono flex-1 truncate">{referralLink}</span>
          <button onClick={copy} className="p-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 transition shrink-0">
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>
        <div className="bg-[#1a1d27] rounded-xl p-4 space-y-2">
          <p className="text-gray-400 text-sm font-medium">How it works:</p>
          <ol className="text-gray-500 text-xs space-y-1.5 list-decimal list-inside">
            <li>Share your unique referral link</li>
            <li>Friend signs up using your link</li>
            <li>Friend makes their first purchase</li>
            <li>You both receive ₦500 bonus credit!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
