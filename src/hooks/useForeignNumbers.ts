import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeCountryCode } from '@/lib/foreignNumbersPricing';
import type { FnCountry, FnService, FnOrder, FnServiceAvailability } from '../types/foreignNumbers';

export function useCountries() {
  const [countries, setCountries] = useState<FnCountry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('fn_countries')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setCountries(data ?? []);
        setLoading(false);
      });
  }, []);

  return { countries, loading };
}

export function useCountryServices(countryCode: string | undefined) {
  const [services, setServices] = useState<FnService[]>([]);
  const [availability, setAvailability] = useState<Record<string, FnServiceAvailability>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const normalizedCountryCode = normalizeCountryCode(countryCode);
    if (!normalizedCountryCode) return;
    setLoading(true);

    supabase
      .from('fn_services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(async ({ data: svcs }) => {
        setServices(svcs ?? []);

        const [{ data: inventory }, { data: delivery }, { data: pricingConfig }, { data: settings }] = await Promise.all([
          supabase
            .from('fn_provider_inventory')
            .select('*')
            .eq('country_code', normalizedCountryCode)
            .eq('is_available', true)
            .gt('stock', 0),
          supabase
            .from('fn_delivery_stats')
            .select('service_slug,avg_delivery_seconds,sample_size')
            .eq('country_code', normalizedCountryCode),
          supabase
            .from('fn_pricing_config')
            .select('service_slug, country_code, margin_percent, override_price_ngn')
            .eq('is_active', true),
          supabase
            .from('fn_settings')
            .select('key, value')
            .in('key', ['exchange_rate_usd_ngn']),
        ]);

        const deliveryMap: Record<string, number> = {};
        for (const row of delivery ?? []) {
          deliveryMap[row.service_slug] = row.avg_delivery_seconds ?? 0;
        }

        const exchangeRate = Number((((settings ?? []) as Array<{ key: string; value: unknown }>).find((s) => s.key === 'exchange_rate_usd_ngn')?.value as string | number | null | undefined) ?? 1650);
        const pricingRules = (pricingConfig ?? []) as Array<{ service_slug: string | null; country_code: string | null; margin_percent: number | null; override_price_ngn: number | null }>;

        const availMap: Record<string, FnServiceAvailability> = {};
        for (const item of inventory ?? []) {
          if (!availMap[item.service_slug]) {
            const svc = svcs?.find(s => s.slug === item.service_slug);
            if (!svc) continue;
            const rule = pricingRules.find((row) =>
              row.country_code === normalizedCountryCode && row.service_slug === item.service_slug
            ) ?? pricingRules.find((row) => row.country_code === normalizedCountryCode && row.service_slug === null)
              ?? pricingRules.find((row) => row.country_code === null && row.service_slug === item.service_slug)
              ?? pricingRules.find((row) => row.country_code === null && row.service_slug === null);
            const finalPrice = Math.ceil((Number(item.price_usd || 0) * exchangeRate) * (1 + Number(rule?.margin_percent ?? 25) / 100));
            availMap[item.service_slug] = {
              service: svc,
              best_price_ngn: rule?.override_price_ngn ? Math.ceil(rule.override_price_ngn) : finalPrice,
              total_stock: item.stock,
              estimated_wait_seconds: deliveryMap[item.service_slug] ?? null,
              providers: [],
            };
          } else {
            const current = availMap[item.service_slug];
            current.total_stock += item.stock;
            const rule = pricingRules.find((row) =>
              row.country_code === normalizedCountryCode && row.service_slug === item.service_slug
            ) ?? pricingRules.find((row) => row.country_code === normalizedCountryCode && row.service_slug === null)
              ?? pricingRules.find((row) => row.country_code === null && row.service_slug === item.service_slug)
              ?? pricingRules.find((row) => row.country_code === null && row.service_slug === null);
            const candidatePrice = rule?.override_price_ngn ? Math.ceil(rule.override_price_ngn) : Math.ceil((Number(item.price_usd || 0) * exchangeRate) * (1 + Number(rule?.margin_percent ?? 25) / 100));
            if (candidatePrice < current.best_price_ngn) {
              current.best_price_ngn = candidatePrice;
            }
          }
          availMap[item.service_slug].providers.push(item);
        }

        setAvailability(availMap);
        setLoading(false);
      });
  }, [countryCode]);

  return { services, availability, loading };
}

/**
 * Lowest live price per country, for the "From ₦X" badge on the country list
 * page. Reads the SAME fn_provider_inventory table (and therefore the same
 * live-price + markup values sync-inventory writes) that useCountryServices
 * uses, so the country list and the country's service page can never disagree.
 */
export function useCountryLowestPrices() {
  const [lowestByCountry, setLowestByCountry] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('fn_provider_inventory')
      .select('country_code,price_usd')
      .eq('is_available', true)
      .gt('stock', 0)
      .then(async ({ data }) => {
        const { data: settings } = await supabase.from('fn_settings').select('key, value').in('key', ['exchange_rate_usd_ngn']);
        const { data: pricingConfig } = await supabase.from('fn_pricing_config').select('country_code, service_slug, margin_percent, override_price_ngn').eq('is_active', true);
        const exchangeRate = Number((((settings ?? []) as Array<{ key: string; value: unknown }>).find((s) => s.key === 'exchange_rate_usd_ngn')?.value as string | number | null | undefined) ?? 1650);
        const lowest: Record<string, number> = {};
        for (const row of data ?? []) {
          const rule = (pricingConfig ?? []).find((item: { country_code: string | null; service_slug: string | null; margin_percent: number | null; override_price_ngn: number | null }) =>
            item.country_code === row.country_code && item.service_slug === null
          ) ?? (pricingConfig ?? []).find((item: { country_code: string | null; service_slug: string | null; margin_percent: number | null; override_price_ngn: number | null }) => item.country_code === null && item.service_slug === null);
          const price = rule?.override_price_ngn ? Math.ceil(rule.override_price_ngn) : Math.ceil((Number(row.price_usd || 0) * exchangeRate) * (1 + Number(rule?.margin_percent ?? 25) / 100));
          if (lowest[row.country_code] == null || price < lowest[row.country_code]) {
            lowest[row.country_code] = price;
          }
        }
        setLowestByCountry(lowest);
        setLoading(false);
      });
  }, []);

  return { lowestByCountry, loading };
}

export interface PricingTableRow {
  country_code: string;
  country_name: string;
  flag_emoji: string;
  service_slug: string;
  service_name: string;
  price_ngn: number;
  stock: number;
}

/**
 * Live cross-country pricing table (used by the Pricing page). Cheapest
 * available offer per country+service, read straight from
 * fn_provider_inventory — same source of truth as everywhere else in the
 * module, so there's nothing here that can go stale independently.
 */
export function usePricingTable() {
  const [rows, setRows] = useState<PricingTableRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('fn_countries').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('fn_services').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('fn_provider_inventory').select('country_code,service_slug,price_usd,stock').eq('is_available', true).gt('stock', 0),
      supabase.from('fn_settings').select('key, value').in('key', ['exchange_rate_usd_ngn']),
      supabase.from('fn_pricing_config').select('country_code, service_slug, margin_percent, override_price_ngn').eq('is_active', true),
    ]).then(([{ data: countries }, { data: services }, { data: inventory }, { data: settings }, { data: pricingConfig }]) => {
      const countryMap = new Map((countries ?? []).map(c => [c.code.toUpperCase(), c]));
      const serviceMap = new Map((services ?? []).map(s => [s.slug, s]));
      const exchangeRate = Number((((settings ?? []) as Array<{ key: string; value: unknown }>).find((s) => s.key === 'exchange_rate_usd_ngn')?.value as string | number | null | undefined) ?? 1650);
      const best = new Map<string, PricingTableRow>();

      for (const item of inventory ?? []) {
        const country = countryMap.get(String(item.country_code || '').toUpperCase());
        const service = serviceMap.get(item.service_slug);
        if (!country || !service) continue;
        const rule = (pricingConfig ?? []).find((row: { country_code: string | null; service_slug: string | null; margin_percent: number | null; override_price_ngn: number | null }) =>
          row.country_code === item.country_code && row.service_slug === item.service_slug
        ) ?? (pricingConfig ?? []).find((row: { country_code: string | null; service_slug: string | null; margin_percent: number | null; override_price_ngn: number | null }) => row.country_code === item.country_code && row.service_slug === null)
          ?? (pricingConfig ?? []).find((row: { country_code: string | null; service_slug: string | null; margin_percent: number | null; override_price_ngn: number | null }) => row.country_code === null && row.service_slug === item.service_slug)
          ?? (pricingConfig ?? []).find((row: { country_code: string | null; service_slug: string | null; margin_percent: number | null; override_price_ngn: number | null }) => row.country_code === null && row.service_slug === null);
        const price = rule?.override_price_ngn ? Math.ceil(rule.override_price_ngn) : Math.ceil((Number(item.price_usd || 0) * exchangeRate) * (1 + Number(rule?.margin_percent ?? 25) / 100));
        const key = `${item.country_code}:${item.service_slug}`;
        const existing = best.get(key);
        if (!existing || price < existing.price_ngn) {
          best.set(key, {
            country_code: item.country_code,
            country_name: country.name,
            flag_emoji: country.flag_emoji,
            service_slug: item.service_slug,
            service_name: service.name,
            price_ngn: price,
            stock: item.stock,
          });
        } else if (existing) {
          existing.stock += item.stock;
        }
      }

      setRows(Array.from(best.values()).sort((a, b) => a.price_ngn - b.price_ngn));
      setLoading(false);
    });
  }, []);

  return { rows, loading };
}

export function useMyOrders() {
  const [orders, setOrders] = useState<FnOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('fn_orders')
      .select('*')
      .order('created_at', { ascending: false });
    setOrders(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('fn_orders_realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'fn_orders',
      }, (payload) => {
        setOrders(prev =>
          prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o)
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  return { orders, loading, refetch: fetchOrders };
}

export function useOtpPolling(orderId: string | null, isActive: boolean) {
  const [status, setStatus] = useState<string>('waiting');
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!orderId || !isActive) return;

    const poll = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `/api/foreign-numbers/check-otp?order_id=${orderId}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const data = await res.json() as { status: string; otp_code?: string };
      setStatus(data.status);

      if (data.otp_code) {
        setOtpCode(data.otp_code);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }

      if (['expired', 'cancelled', 'failed'].includes(data.status)) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [orderId, isActive]);

  return { status, otpCode };
}
