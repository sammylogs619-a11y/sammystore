import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Single source of truth for turning a live provider USD price into the
 * final NGN price shown to / charged to the user.
 *
 * Formula (matches the spec exactly):
 *   1. price_usd            (live from provider)
 *   2. * EXCHANGE_RATE_USD_NGN   (env var, global)
 *   3. + markup (global margin_percent / fixed_markup_ngn,
 *                optionally overridden per-country and/or per-service)
 *   4. = final NGN price shown/charged
 *
 * This module is the ONLY place that formula should live. sync-inventory.ts,
 * inventory.ts and purchase.ts all call into it so the "from ₦X" price shown
 * while browsing can never drift from the price actually charged at checkout.
 */

export interface ResolvedPricing {
  marginPercent: number;
  fixedMarkupNgn: number;
  overridePriceNgn: number | null;
  /** id of the fn_pricing_config row that was applied, for auditing/debugging */
  sourceConfigId: string | null;
  scope: 'country+service' | 'country' | 'service' | 'global' | 'fallback';
}

interface PricingConfigRow {
  id: string;
  country_code: string | null;
  service_slug: string | null;
  margin_percent: number | null;
  fixed_markup_ngn: number | null;
  override_price_ngn: number | null;
}

// Only used if the owner hasn't created ANY fn_pricing_config row yet
// (e.g. brand-new install before the admin has visited Settings).
const HARD_FALLBACK_MARGIN_PERCENT = 25;
const HARD_FALLBACK_FIXED_MARKUP_NGN = 0;

/**
 * Looks up the most specific active pricing rule for a country+service pair.
 * Priority: (country AND service) > (country only) > (service only) > (global) > hard fallback.
 */
export async function resolvePricingConfig(
  admin: SupabaseClient,
  countryCode: string,
  serviceSlug: string
): Promise<ResolvedPricing> {
  const { data: rows } = await admin
    .from('fn_pricing_config')
    .select('id,country_code,service_slug,margin_percent,fixed_markup_ngn,override_price_ngn')
    .eq('is_active', true)
    .or(`country_code.eq.${countryCode},country_code.is.null`)
    .or(`service_slug.eq.${serviceSlug},service_slug.is.null`);

  const candidates = (rows ?? []) as PricingConfigRow[];

  const exact = candidates.find(r => r.country_code === countryCode && r.service_slug === serviceSlug);
  const countryOnly = candidates.find(r => r.country_code === countryCode && r.service_slug === null);
  const serviceOnly = candidates.find(r => r.country_code === null && r.service_slug === serviceSlug);
  const global = candidates.find(r => r.country_code === null && r.service_slug === null);

  const match = exact ?? countryOnly ?? serviceOnly ?? global;
  const scope: ResolvedPricing['scope'] = exact
    ? 'country+service'
    : countryOnly
    ? 'country'
    : serviceOnly
    ? 'service'
    : global
    ? 'global'
    : 'fallback';

  return {
    marginPercent: match?.margin_percent ?? HARD_FALLBACK_MARGIN_PERCENT,
    fixedMarkupNgn: match?.fixed_markup_ngn ?? HARD_FALLBACK_FIXED_MARKUP_NGN,
    overridePriceNgn: match?.override_price_ngn ?? null,
    sourceConfigId: match?.id ?? null,
    scope,
  };
}

/** Reads and validates the global exchange rate from environment variables. */
export function getExchangeRate(env: { EXCHANGE_RATE_USD_NGN?: string }): number {
  const rate = parseFloat(env.EXCHANGE_RATE_USD_NGN ?? '');
  if (!rate || Number.isNaN(rate) || rate <= 0) {
    // Safety net only — production installs should always set this env var.
    return 1650;
  }
  return rate;
}

/** Applies exchange rate + markup to a live provider USD price. */
export function calculateFinalPriceNgn(
  priceUsd: number,
  exchangeRate: number,
  config: ResolvedPricing
): number {
  if (config.overridePriceNgn != null) return Math.ceil(config.overridePriceNgn);
  const converted = priceUsd * exchangeRate;
  const withMargin = converted * (1 + config.marginPercent / 100);
  return Math.ceil(withMargin + config.fixedMarkupNgn);
}
