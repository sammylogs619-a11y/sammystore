import { IProvider, ProviderPrice } from './base';
import { FiveSimProvider } from './fiveSim';
import { SMSHeroProvider } from './smshero';
import { TigerSMSProvider } from './tigersms';
import { SMSPoolProvider } from './smspool';

export interface Env {
  FIVE_SIM_API_KEY?: string;
  SMSHERO_API_KEY?: string;
  TIGERSMS_API_KEY?: string;
  SMSPOOL_API_KEY?: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  EXCHANGE_RATE_USD_NGN?: string;
}

export function buildProviders(env: Env): IProvider[] {
  const p: IProvider[] = [];
  if (env.FIVE_SIM_API_KEY) p.push(new FiveSimProvider(env.FIVE_SIM_API_KEY));
  if (env.SMSHERO_API_KEY) p.push(new SMSHeroProvider(env.SMSHERO_API_KEY));
  if (env.TIGERSMS_API_KEY) p.push(new TigerSMSProvider(env.TIGERSMS_API_KEY));
  if (env.SMSPOOL_API_KEY) p.push(new SMSPoolProvider(env.SMSPOOL_API_KEY));
  return p;
}

export interface BestProvider {
  provider: IProvider;
  priceUsd: number;
  priceNgn: number;
  stock: number;
}

export async function findBestProvider(
  providers: IProvider[],
  countryCode: string,
  serviceSlug: string,
  exchangeRate: number
): Promise<BestProvider | null> {
  const results: Array<{ provider: IProvider; price: ProviderPrice }> = [];
  await Promise.allSettled(
    providers.map(async p => {
      const prices = await p.getPrices(countryCode, serviceSlug);
      for (const price of prices) if (price.stock > 0) results.push({ provider: p, price });
    })
  );
  if (!results.length) return null;
  results.sort((a, b) => a.price.priceUsd - b.price.priceUsd);
  const best = results[0];
  return {
    provider: best.provider,
    priceUsd: best.price.priceUsd,
    priceNgn: Math.ceil(best.price.priceUsd * exchangeRate),
    stock: best.price.stock,
  };
}
