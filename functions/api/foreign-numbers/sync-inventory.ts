import { Env, buildProviders } from '../../lib/providers/registry';
import { getSupabaseAdmin, jsonResponse, errorResponse } from '../../lib/supabase';
import { resolvePricingConfig, calculateFinalPriceNgn, getExchangeRate } from '../../lib/pricing';

interface SyncEnv extends Env {
  SYNC_SECRET?: string;
}

/**
 * Pulls live prices from every configured provider (5sim, SMSHero, TigerSMS,
 * SMSPool — whichever have API keys set) for every active country x service
 * combination in fn_countries / fn_services, and upserts the cheapest-per-
 * provider rows into fn_provider_inventory — with the SAME pricing formula
 * (exchange rate + resolved markup, via functions/lib/pricing.ts) that
 * purchase.ts and inventory.ts apply live at checkout, so the price shown
 * while browsing never drifts from the price actually charged.
 *
 * This table is what the browsing pages (AllNumbers, ForeignNumbersCountryPage,
 * Numbers, Pricing) read from via Supabase directly — it exists so those pages
 * can show real prices without a live provider API round trip per page load.
 * purchase.ts and inventory.ts still call providers directly in real time via
 * findBestProvider() for the actual transaction, independent of this table.
 *
 * Protected by SYNC_SECRET so it can't be hit by arbitrary internet traffic
 * and rack up provider API usage. Call with header: x-sync-secret: <value>
 * Intended to be triggered by a Cloudflare Cron Trigger (configured in the
 * dashboard, not in code) hitting this URL on a schedule, e.g. every 15 min.
 */
export const onRequestPost: PagesFunction<SyncEnv> = async ({ request, env }) => {
  if (env.SYNC_SECRET) {
    const provided = request.headers.get('x-sync-secret');
    if (provided !== env.SYNC_SECRET) {
      return errorResponse('Forbidden', 403);
    }
  }

  const providers = buildProviders(env);
  if (providers.length === 0) {
    return errorResponse('No providers configured — set FIVE_SIM_API_KEY / SMSHERO_API_KEY / TIGERSMS_API_KEY / SMSPOOL_API_KEY', 503);
  }

  const rate = getExchangeRate(env);
  const admin = getSupabaseAdmin(env);

  const [{ data: countries }, { data: services }] = await Promise.all([
    admin.from('fn_countries').select('code').eq('is_active', true),
    admin.from('fn_services').select('slug').eq('is_active', true),
  ]);

  if (!countries?.length || !services?.length) {
    return errorResponse('No active countries or services configured in fn_countries / fn_services', 500);
  }

  let upserted = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const country of countries) {
    // Provider COUNTRY_MAP keys are lowercase (e.g. 'us', not 'US') — the
    // fn_countries.code seed data is uppercase, so this lowercase conversion
    // is required or every provider call silently returns an empty array.
    const countryCode = country.code.toLowerCase();

    for (const service of services) {
      const results = await Promise.allSettled(
        providers.map(p => p.getPrices(countryCode, service.slug))
      );

      // Collect every in-stock offer across all providers for this
      // country+service pair, keep the cheapest one per provider (matches
      // findBestProvider's own selection logic used at actual purchase time).
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const provider = providers[i];
        if (result.status !== 'fulfilled') {
          failed++;
          errors.push(`${provider.slug} ${countryCode}/${service.slug}: ${result.reason}`);
          continue;
        }

        const inStock = result.value.filter(p => p.stock > 0);
        if (inStock.length === 0) continue;
        const cheapest = inStock.reduce((a, b) => (a.priceUsd <= b.priceUsd ? a : b));

        // provider slug must match a row in fn_providers (id lookup) — find
        // or create it so the FK on fn_provider_inventory.provider_id holds.
        const { data: providerRow } = await admin
          .from('fn_providers')
          .select('id')
          .eq('slug', provider.slug)
          .maybeSingle();

        let providerId = providerRow?.id as string | undefined;
        if (!providerId) {
          const { data: created, error: createErr } = await admin
            .from('fn_providers')
            .insert({ slug: provider.slug, name: provider.name, api_base_url: '', is_active: true })
            .select('id')
            .single();
          if (createErr || !created) {
            failed++;
            errors.push(`Could not register provider ${provider.slug}: ${createErr?.message}`);
            continue;
          }
          providerId = created.id;
        }

        const config = await resolvePricingConfig(admin, country.code, service.slug);
        const finalPriceNgn = calculateFinalPriceNgn(cheapest.priceUsd, rate, config);

        const { error: upsertErr } = await admin
          .from('fn_provider_inventory')
          .upsert(
            {
              provider_id: providerId,
              country_code: country.code, // store as originally seeded (uppercase), matches fn_orders.country_code usage elsewhere
              service_slug: service.slug,
              price_usd: cheapest.priceUsd,
              // Same formula purchase.ts/inventory.ts use at request time: USD -> NGN via
              // EXCHANGE_RATE_USD_NGN, then the resolved (country/service/global) markup.
              price_ngn: finalPriceNgn,
              stock: cheapest.stock,
              is_available: true,
              synced_at: new Date().toISOString(),
            },
            { onConflict: 'provider_id,country_code,service_slug' }
          );

        if (upsertErr) {
          failed++;
          errors.push(`Upsert failed ${provider.slug} ${country.code}/${service.slug}: ${upsertErr.message}`);
        } else {
          upserted++;
        }
      }
    }
  }

  return jsonResponse({
    ok: true,
    providers_used: providers.map(p => p.slug),
    countries_checked: countries.length,
    services_checked: services.length,
    rows_upserted: upserted,
    failures: failed,
    errors: errors.slice(0, 20), // cap to avoid a huge response if something is badly broken
  });
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,x-sync-secret',
    },
  });
