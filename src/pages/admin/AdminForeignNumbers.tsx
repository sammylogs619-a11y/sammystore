import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Settings, RefreshCw, DollarSign, Package, AlertCircle, CheckCircle, XCircle, BarChart3, ToggleLeft, ToggleRight, Plus, Trash2 } from 'lucide-react';
import type { FnProvider, FnOrder, FnPricingConfig, FnCountry, FnService } from '@/types/foreignNumbers';

type AdminTab = 'overview' | 'providers' | 'orders' | 'settings';

export function AdminForeignNumbers() {
  const [tab, setTab] = useState<AdminTab>('overview');

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🌍</span>
        <h2 className="text-xl font-bold text-brand-navy">Foreign Numbers</h2>
      </div>
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {(['overview', 'providers', 'orders', 'settings'] as AdminTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t ? 'border-brand-orange text-brand-orange' : 'border-transparent text-muted-foreground hover:text-brand-navy'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'overview' && <AdminOverview />}
      {tab === 'providers' && <AdminProviders />}
      {tab === 'orders' && <AdminOrders />}
      {tab === 'settings' && <AdminSettings />}
    </div>
  );
}

function AdminOverview() {
  const [stats, setStats] = useState({ totalOrders: 0, activeOrders: 0, totalRevenue: 0, successRate: 0 });

  useEffect(() => {
    supabase.from('fn_orders').select('status, amount_ngn').then(({ data }) => {
      if (!data) return;
      const total = data.length;
      const active = data.filter(o => o.status === 'active').length;
      const revenue = data.filter(o => !['refunded', 'failed', 'cancelled'].includes(o.status)).reduce((s, o) => s + o.amount_ngn, 0);
      const success = data.filter(o => ['otp_received', 'completed'].includes(o.status)).length;
      setStats({ totalOrders: total, activeOrders: active, totalRevenue: revenue, successRate: total ? Math.round((success / total) * 100) : 0 });
    });
  }, []);

  const cards = [
    { label: 'Total Orders', value: stats.totalOrders, icon: Package, color: 'text-blue-600' },
    { label: 'Active Now', value: stats.activeOrders, icon: RefreshCw, color: 'text-yellow-600' },
    { label: 'Revenue', value: `₦${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-600' },
    { label: 'Success Rate', value: `${stats.successRate}%`, icon: BarChart3, color: 'text-purple-600' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.label} className="rounded-xl border border-border bg-white p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{card.label}</span>
            <card.icon className={`w-4 h-4 ${card.color}`} />
          </div>
          <p className="text-2xl font-bold text-brand-navy">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function AdminProviders() {
  const [providers, setProviders] = useState<FnProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('fn_providers').select('*').order('priority').then(({ data }) => {
      setProviders(data ?? []);
      setLoading(false);
    });
  }, []);

  const toggleProvider = async (id: string, current: boolean) => {
    await supabase.from('fn_providers').update({ is_active: !current }).eq('id', id);
    setProviders(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p));
  };

  if (loading) return <div className="h-32 bg-muted animate-pulse rounded-xl" />;

  return (
    <div className="space-y-3">
      {providers.map(provider => (
        <div key={provider.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-white">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-brand-navy">{provider.name}</p>
              <span className="text-xs text-muted-foreground">Priority: {provider.priority}</span>
            </div>
            {provider.balance_usd !== null && (
              <p className="text-xs text-muted-foreground">Balance: ${Number(provider.balance_usd).toFixed(2)}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {provider.is_active ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
            <button onClick={() => toggleProvider(provider.id, provider.is_active)}>
              {provider.is_active ? <ToggleRight className="w-7 h-7 text-brand-orange" /> : <ToggleLeft className="w-7 h-7 text-muted-foreground" />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminOrders() {
  const [orders, setOrders] = useState<FnOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('fn_orders').select('*').order('created_at', { ascending: false }).limit(100).then(({ data }) => {
      setOrders(data ?? []);
      setLoading(false);
    });
  }, []);

  const refundOrder = async (orderId: string) => {
    setRefunding(orderId);
    await supabase.rpc('fn_refund_order', { p_order_id: orderId, p_reason: 'Admin manual refund' });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'refunded' as const } : o));
    setRefunding(null);
  };

  if (loading) return <div className="h-48 bg-muted animate-pulse rounded-xl" />;

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">{orders.length} orders shown</div>
      <div className="rounded-xl border border-border overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              {['Order', 'Service', 'Number', 'Status', 'Amount', 'Actions'].map(h => (
                <th key={h} className="text-left p-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                <td className="p-3 font-mono text-xs">{order.id.slice(0, 8)}…</td>
                <td className="p-3 capitalize text-brand-navy">{order.service_slug} <span className="text-muted-foreground uppercase text-xs">({order.country_code})</span></td>
                <td className="p-3 font-mono text-xs">{order.phone_number ?? '—'}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    ['otp_received', 'completed'].includes(order.status) ? 'bg-green-100 text-green-700' :
                    order.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'
                  }`}>{order.status}</span>
                </td>
                <td className="p-3 text-brand-navy font-medium">₦{order.amount_ngn.toLocaleString()}</td>
                <td className="p-3">
                  {!['refunded', 'completed', 'cancelled'].includes(order.status) && (
                    <button
                      onClick={() => refundOrder(order.id)}
                      disabled={refunding === order.id}
                      className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {refunding === order.id ? 'Refunding…' : 'Refund'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminSettings() {
  const [configs, setConfigs] = useState<FnPricingConfig[]>([]);
  const [countries, setCountries] = useState<FnCountry[]>([]);
  const [services, setServices] = useState<FnService[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    const [{ data: cfg }, { data: c }, { data: s }] = await Promise.all([
      supabase.from('fn_pricing_config').select('*').order('created_at'),
      supabase.from('fn_countries').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('fn_services').select('*').eq('is_active', true).order('sort_order'),
    ]);
    setConfigs(cfg ?? []);
    setCountries(c ?? []);
    setServices(s ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const globalConfig = configs.find(c => !c.country_code && !c.service_slug);
  const overrides = configs.filter(c => c.country_code || c.service_slug);

  const updateField = (id: string, field: keyof FnPricingConfig, value: string) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, [field]: value === '' ? null : Number(value) } : c));
  };

  const save = async (config: FnPricingConfig) => {
    setSavingId(config.id);
    await supabase.from('fn_pricing_config').update({
      margin_percent: config.margin_percent,
      fixed_markup_ngn: config.fixed_markup_ngn,
      override_price_ngn: config.override_price_ngn,
      is_active: config.is_active,
    }).eq('id', config.id);
    setSavingId(null);
  };

  const addOverride = async (scope: 'country' | 'service') => {
    const { data } = await supabase.from('fn_pricing_config').insert({
      is_active: true,
      country_code: scope === 'country' ? (countries[0]?.code ?? null) : null,
      service_slug: scope === 'service' ? (services[0]?.slug ?? null) : null,
      margin_percent: 25,
      fixed_markup_ngn: 0,
    }).select('*').single();
    if (data) setConfigs(prev => [...prev, data]);
  };

  const removeOverride = async (id: string) => {
    await supabase.from('fn_pricing_config').delete().eq('id', id);
    setConfigs(prev => prev.filter(c => c.id !== id));
  };

  const updateScope = async (id: string, field: 'country_code' | 'service_slug', value: string) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    await supabase.from('fn_pricing_config').update({ [field]: value }).eq('id', id);
  };

  if (loading) return <div className="h-48 bg-muted animate-pulse rounded-xl" />;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            The USD → NGN exchange rate is set via the <code>EXCHANGE_RATE_USD_NGN</code> environment
            variable (Cloudflare Pages → Settings → Environment variables), not here — every price shown
            to users is computed live as <em>provider price (USD) × exchange rate × your markup below</em>.
          </p>
        </div>
      </div>

      {globalConfig && (
        <div className="space-y-3 p-4 rounded-xl border border-border bg-white">
          <h3 className="text-sm font-semibold text-brand-navy flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Global markup (applies everywhere, unless overridden below)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Margin (%)</label>
              <input type="number" value={globalConfig.margin_percent ?? ''}
                onChange={e => updateField(globalConfig.id, 'margin_percent', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Fixed markup (₦)</label>
              <input type="number" value={globalConfig.fixed_markup_ngn ?? ''}
                onChange={e => updateField(globalConfig.id, 'fixed_markup_ngn', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Fixed final price override (₦, optional — bypasses the formula entirely)</label>
            <input type="number" value={globalConfig.override_price_ngn ?? ''}
              onChange={e => updateField(globalConfig.id, 'override_price_ngn', e.target.value)}
              placeholder="Leave blank to use the formula"
              className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30" />
          </div>
          <button onClick={() => save(globalConfig)} disabled={savingId === globalConfig.id}
            className="flex items-center gap-2 px-4 py-2 bg-brand-orange text-white rounded-lg text-sm font-medium hover:bg-brand-orange-hover disabled:opacity-50 transition-all">
            <Settings className="w-4 h-4" />
            {savingId === globalConfig.id ? 'Saving…' : 'Save global markup'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-brand-navy">Per-country / per-service overrides</h3>
          <div className="flex gap-2">
            <button onClick={() => addOverride('country')} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
              <Plus className="w-3.5 h-3.5" /> Country override
            </button>
            <button onClick={() => addOverride('service')} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
              <Plus className="w-3.5 h-3.5" /> Service override
            </button>
          </div>
        </div>

        {overrides.length === 0 && (
          <p className="text-xs text-muted-foreground">No overrides yet — every country/service uses the global markup above.</p>
        )}

        {overrides.map(cfg => (
          <div key={cfg.id} className="p-4 rounded-xl border border-border bg-white space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                {cfg.country_code !== null && (
                  <select value={cfg.country_code} onChange={e => updateScope(cfg.id, 'country_code', e.target.value)}
                    className="px-2 py-1 rounded-lg border border-border bg-white text-xs">
                    {countries.map(c => <option key={c.code} value={c.code}>{c.flag_emoji} {c.name}</option>)}
                  </select>
                )}
                {cfg.service_slug !== null && (
                  <select value={cfg.service_slug} onChange={e => updateScope(cfg.id, 'service_slug', e.target.value)}
                    className="px-2 py-1 rounded-lg border border-border bg-white text-xs">
                    {services.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                  </select>
                )}
              </div>
              <button onClick={() => removeOverride(cfg.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Margin (%)</label>
                <input type="number" value={cfg.margin_percent ?? ''}
                  onChange={e => updateField(cfg.id, 'margin_percent', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Fixed markup (₦)</label>
                <input type="number" value={cfg.fixed_markup_ngn ?? ''}
                  onChange={e => updateField(cfg.id, 'fixed_markup_ngn', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30" />
              </div>
            </div>
            <button onClick={() => save(cfg)} disabled={savingId === cfg.id}
              className="text-xs px-3 py-1.5 bg-brand-orange text-white rounded-lg font-medium hover:bg-brand-orange-hover disabled:opacity-50 transition-all">
              {savingId === cfg.id ? 'Saving…' : 'Save override'}
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <div className="flex gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">
            Add provider API keys in Cloudflare Pages environment variables:<br />
            <code className="block mt-1">FIVE_SIM_API_KEY</code>
            <code className="block">SMSHERO_API_KEY</code>
            <code className="block">TIGERSMS_API_KEY</code>
            <code className="block">SMSPOOL_API_KEY</code>
          </p>
        </div>
      </div>
    </div>
  );
}
