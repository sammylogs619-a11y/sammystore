import { useState, useMemo } from 'react';
import { Phone, Copy, Check, Clock, RefreshCw } from 'lucide-react';
import { useMyOrders } from '@/hooks/useForeignNumbers';
import type { FnOrder, FnOrderStatus } from '@/types/foreignNumbers';

const STATUS_CONFIG: Record<FnOrderStatus, { label: string; color: string; dot: string }> = {
  pending:      { label: 'Pending',      color: 'text-yellow-600',       dot: 'bg-yellow-500' },
  active:       { label: 'Waiting OTP',  color: 'text-blue-600',         dot: 'bg-blue-500 animate-pulse' },
  otp_received: { label: 'OTP Received', color: 'text-green-600',        dot: 'bg-green-500' },
  completed:    { label: 'Completed',    color: 'text-green-600',        dot: 'bg-green-500' },
  expired:      { label: 'Expired',      color: 'text-muted-foreground', dot: 'bg-gray-400' },
  cancelled:    { label: 'Cancelled',    color: 'text-muted-foreground', dot: 'bg-gray-400' },
  refunded:     { label: 'Refunded',     color: 'text-blue-600',         dot: 'bg-blue-400' },
  failed:       { label: 'Failed',       color: 'text-red-600',          dot: 'bg-red-500' },
};

const TABS: { key: 'all' | FnOrderStatus; label: string }[] = [
  { key: 'all',          label: 'All' },
  { key: 'active',       label: 'Active' },
  { key: 'otp_received', label: 'OTP Received' },
  { key: 'completed',    label: 'Completed' },
  { key: 'expired',      label: 'Expired' },
  { key: 'cancelled',    label: 'Cancelled' },
];

export function MyNumbersPage() {
  const { orders, loading, refetch } = useMyOrders();
  const [activeTab, setActiveTab] = useState<'all' | FnOrderStatus>('all');
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = useMemo(
    () => activeTab === 'all' ? orders : orders.filter(o => o.status === activeTab),
    [orders, activeTab]
  );

  const tabCounts = useMemo(() => {
    const counts: Partial<Record<string, number>> = { all: orders.length };
    for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1;
    return counts;
  }, [orders]);

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-NG', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-brand-navy">
            <Phone className="w-6 h-6 text-brand-orange" />
            My Numbers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{orders.length} total purchases</p>
        </div>
        <button onClick={refetch} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'bg-brand-orange text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
            {tabCounts[tab.key] ? (
              <span className="bg-black/10 rounded-full px-1.5 py-0.5 text-[10px] leading-none">
                {tabCounts[tab.key]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <p className="text-5xl">📱</p>
          <h3 className="font-semibold text-lg text-brand-navy">No numbers yet</h3>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'all'
              ? 'Purchase a virtual number to get started.'
              : `No ${STATUS_CONFIG[activeTab as FnOrderStatus]?.label.toLowerCase()} orders.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const cfg = STATUS_CONFIG[order.status as FnOrderStatus] ?? STATUS_CONFIG.pending;
            return (
              <div key={order.id} className="rounded-xl border border-border bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm capitalize text-brand-navy">
                        {order.service_slug.replace('_', ' ')}
                      </span>
                      <span className="text-muted-foreground text-sm">·</span>
                      <span className="text-sm text-muted-foreground uppercase">{order.country_code}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                  </div>
                </div>

                {order.phone_number && (
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-mono text-sm font-medium text-brand-navy">{order.phone_number}</span>
                    </div>
                    <button onClick={() => copy(order.phone_number!, `phone-${order.id}`)} className="p-1 rounded hover:bg-muted">
                      {copied === `phone-${order.id}` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                )}

                {order.otp_code && (
                  <div className="flex items-center justify-between bg-orange-50 border border-brand-orange/20 rounded-lg px-3 py-2">
                    <span className="font-mono font-bold text-xl tracking-[0.15em] text-brand-orange">{order.otp_code}</span>
                    <button onClick={() => copy(order.otp_code!, `otp-${order.id}`)} className="p-1 rounded hover:bg-orange-100">
                      {copied === `otp-${order.id}` ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-brand-orange" />}
                    </button>
                  </div>
                )}

                {order.status === 'active' && (
                  <div className="flex items-center gap-1.5 text-xs text-blue-600">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    Waiting for OTP…
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                  <span>₦{order.amount_ngn.toLocaleString()}</span>
                  <span className="font-mono">{order.id.slice(0, 8)}…</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
