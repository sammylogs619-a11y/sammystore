import { ShoppingBag, Smartphone, Users, Wallet } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    {
      title: 'Total Orders',
      value: '142',
      change: '+12% from last month',
      icon: ShoppingBag,
      gradient: 'from-indigo-500 to-purple-600',
    },
    {
      title: 'Active Numbers',
      value: '28',
      change: '8 expiring soon',
      icon: Smartphone,
      gradient: 'from-pink-500 to-red-600',
    },
    {
      title: 'Accounts Bought',
      value: '87',
      change: '+5 this week',
      icon: Users,
      gradient: 'from-cyan-500 to-blue-600',
    },
    {
      title: 'Wallet Balance',
      value: '₦10.5k',
      change: 'Last funded: 2 days ago',
      icon: Wallet,
      gradient: 'from-green-500 to-teal-600',
    },
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
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-white/70 text-xs mt-1">{stat.change}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="font-poppins text-lg font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Buy Account', icon: '📋' },
            { label: 'Buy Number', icon: '📱' },
            { label: 'Fund Wallet', icon: '💳' },
            { label: 'View History', icon: '📊' },
          ].map((action, idx) => (
            <button
              key={idx}
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
        <div className="space-y-3">
          {[
            { name: 'Aged Instagram Account', time: 'Today, 2:30 PM', amount: '₦2,500', type: 'debit', icon: '📷' },
            { name: 'Wallet Funding', time: 'Yesterday, 10:15 AM', amount: '₦5,000', type: 'credit', icon: '💳' },
            { name: 'USA Number Purchase', time: 'Jun 23, 2026', amount: '₦500', type: 'debit', icon: '📱' },
          ].map((tx, idx) => (
            <div key={idx} className={`flex items-center justify-between py-3 ${idx < 2 ? 'border-b border-[#1e2030]' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg">{tx.icon}</div>
                <div>
                  <p className="text-sm font-medium text-white">{tx.name}</p>
                  <p className="text-xs text-gray-500">{tx.time}</p>
                </div>
              </div>
              <span className={tx.type === 'debit' ? 'text-red-400' : 'text-green-400'}>
                {tx.type === 'debit' ? '-' : '+'}{tx.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
