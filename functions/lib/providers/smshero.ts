import { IProvider, NumberOrder, ProviderPrice, SmsMessage, extractOtp } from './base';

const COUNTRY_MAP: Record<string, string> = {
  us:'us',gb:'gb',ca:'ca',au:'au',de:'de',fr:'fr',it:'it',es:'es',
  nl:'nl',se:'se',no:'no',ch:'ch',be:'be',pl:'pl',cz:'cz',tr:'tr',
  in:'in',pk:'pk',bd:'bd',id:'id',my:'my',sg:'sg',jp:'jp',kr:'kr',
  th:'th',vn:'vn',br:'br',mx:'mx',za:'za',ua:'ua',ru:'ru',ph:'ph',
  ng:'ng',gh:'gh',ke:'ke',eg:'eg',ae:'ae',sa:'sa',
};

const SERVICE_MAP: Record<string, string> = {
  whatsapp:'whatsapp',telegram:'telegram',instagram:'instagram',
  facebook:'facebook',tiktok:'tiktok',google:'google',gmail:'google',
  discord:'discord',amazon:'amazon',netflix:'netflix',paypal:'paypal',
  binance:'binance',twitter:'twitter',linkedin:'linkedin',snapchat:'snapchat',
  steam:'steam',uber:'uber',microsoft:'microsoft',apple:'apple',
  yahoo:'yahoo',coinbase:'coinbase',spotify:'spotify',
};

export class SMSHeroProvider implements IProvider {
  slug = 'smshero';
  name = 'SMS Hero';
  private apiKey: string;
  private baseUrl = 'https://smshero.com/api';

  constructor(apiKey: string) { this.apiKey = apiKey; }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}&api_key=${this.apiKey}`);
    if (!res.ok) throw new Error(`SMSHero ${res.status}`);
    return res.json() as Promise<T>;
  }

  async getPrices(countryCode: string, serviceSlug: string): Promise<ProviderPrice[]> {
    const country = COUNTRY_MAP[countryCode];
    const service = SERVICE_MAP[serviceSlug];
    if (!country || !service) return [];
    try {
      const data = await this.get<{ price?: number; count?: number }>(
        `?action=getPrice&country=${country}&service=${service}`
      );
      if (!data.price) return [];
      return [{ countryCode, serviceSlug, priceUsd: data.price, stock: data.count ?? 0 }];
    } catch { return []; }
  }

  async buyNumber(countryCode: string, serviceSlug: string): Promise<NumberOrder> {
    const country = COUNTRY_MAP[countryCode];
    const service = SERVICE_MAP[serviceSlug];
    if (!country || !service) throw new Error('Unsupported');
    const data = await this.get<{ id?: string; number?: string; message?: string }>(
      `?action=getNumber&country=${country}&service=${service}`
    );
    if (!data.id || !data.number) throw new Error(data.message ?? 'SMSHero failed');
    return { providerOrderId: data.id, phoneNumber: data.number };
  }

  async checkSms(providerOrderId: string): Promise<SmsMessage | null> {
    const data = await this.get<{ status?: string; sms?: string }>(
      `?action=getStatus&id=${providerOrderId}`
    );
    if (data.sms) {
      return { text: data.sms, otpCode: extractOtp(data.sms), receivedAt: new Date().toISOString() };
    }
    return null;
  }

  async cancelOrder(providerOrderId: string): Promise<void> {
    await this.get(`?action=cancel&id=${providerOrderId}`);
  }

  async getBalance(): Promise<number> {
    const data = await this.get<{ balance?: number }>('?action=getBalance');
    return data.balance ?? 0;
  }
}
