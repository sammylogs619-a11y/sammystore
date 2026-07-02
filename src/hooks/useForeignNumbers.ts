import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
    if (!countryCode) return;
    setLoading(true);

    supabase
      .from('fn_services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(async ({ data: svcs }) => {
        setServices(svcs ?? []);

        const [{ data: inventory }, { data: delivery }] = await Promise.all([
          supabase
            .from('fn_provider_inventory')
            .select('*')
            .eq('country_code', countryCode)
            .eq('is_available', true)
            .gt('stock', 0),
          // Real measured OTP delivery times from completed orders — replaces
          // the old hardcoded "~1 min" constant. No row yet = "Varies" in the UI.
          supabase
            .from('fn_delivery_stats')
            .select('service_slug,avg_delivery_seconds,sample_size')
            .eq('country_code', countryCode),
        ]);

        const deliveryMap: Record<string, number> = {};
        for (const row of delivery ?? []) {
          deliveryMap[row.service_slug] = row.avg_delivery_seconds;
        }

        const availMap: Record<string, FnServiceAvailability> = {};
        for (const item of inventory ?? []) {
          if (!availMap[item.service_slug]) {
            const svc = svcs?.find(s => s.slug === item.service_slug);
            if (!svc) continue;
            availMap[item.service_slug] = {
              service: svc,
              best_price_ngn: item.price_ngn ?? 0,
              total_stock: item.stock,
              estimated_wait_seconds: deliveryMap[item.service_slug] ?? null,
              providers: [],
            };
          } else {
            const current = availMap[item.service_slug];
            current.total_stock += item.stock;
            if ((item.price_ngn ?? Infinity) < current.best_price_ngn) {
              current.best_price_ngn = item.price_ngn ?? current.best_price_ngn;
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
      .select('country_code,price_ngn')
      .eq('is_available', true)
      .gt('stock', 0)
      .then(({ data }) => {
        const lowest: Record<string, number> = {};
        for (const row of data ?? []) {
          if (row.price_ngn == null) continue;
          if (lowest[row.country_code] == null || row.price_ngn < lowest[row.country_code]) {
            lowest[row.country_code] = row.price_ngn;
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
      supabase.from('fn_provider_inventory').select('country_code,service_slug,price_ngn,stock').eq('is_available', true).gt('stock', 0),
    ]).then(([{ data: countries }, { data: services }, { data: inventory }]) => {
      const countryMap = new Map((countries ?? []).map(c => [c.code, c]));
      const serviceMap = new Map((services ?? []).map(s => [s.slug, s]));
      const best = new Map<string, PricingTableRow>();

      for (const item of inventory ?? []) {
        if (item.price_ngn == null) continue;
        const country = countryMap.get(item.country_code);
        const service = serviceMap.get(item.service_slug);
        if (!country || !service) continue;
        const key = `${item.country_code}:${item.service_slug}`;
        const existing = best.get(key);
        if (!existing || item.price_ngn < existing.price_ngn) {
          best.set(key, {
            country_code: item.country_code,
            country_name: country.name,
            flag_emoji: country.flag_emoji,
            service_slug: item.service_slug,
            service_name: service.name,
            price_ngn: item.price_ngn,
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
