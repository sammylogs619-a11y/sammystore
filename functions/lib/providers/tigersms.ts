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

export class TigerSMSProvider implements IProvider {
  slug = 'tigersms';
  name = 'Tiger SMS';
  private apiKey: string;
  private baseUrl = 'https://tiger-sms.com/stubs/handler_api.php';

  constructor(apiKey: string) { this.apiKey = apiKey; }

  private async call(params: Record<string, string>) {
    const url = new URL(this.baseUrl);
    url.searchParams.set('api_key', this.apiKey);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return (await fetch(url.toString())).text();
  }

  async getPrices(countryCode: string, serviceSlug: string): Promise<ProviderPrice[]> {
    const country = COUNTRY_MAP[countryCode];
    const service = SERVICE_MAP[serviceSlug];
    if (!country || !service) return [];
    try {
      const res = await fetch(
        `${this.baseUrl}?api_key=${this.apiKey}&action=getPrices&service=${service}&country=${country}`
      );
      const data = await res.json() as Record<string, Record<string, { cost: number; count: number }>>;
      const results: ProviderPrice[] = [];
      for (const [, services] of Object.entries(data))
        for (const [svc, info] of Object.entries(services))
          if (svc === service) results.push({ countryCode, serviceSlug, priceUsd: info.cost, stock: info.count });
      return results;
    } catch { return []; }
  }

  async buyNumber(countryCode: string, serviceSlug: string): Promise<NumberOrder> {
    const country = COUNTRY_MAP[countryCode];
    const service = SERVICE_MAP[serviceSlug];
    if (!country || !service) throw new Error('Unsupported');
    const res = await this.call({ action: 'getNumber', service, country });
    const parts = res.split(':');
    if (parts[0] !== 'ACCESS_NUMBER') throw new Error(`TigerSMS: ${res}`);
    return { providerOrderId: parts[1], phoneNumber: parts[2] };
  }

  async checkSms(providerOrderId: string): Promise<SmsMessage | null> {
    const res = await this.call({ action: 'getStatus', id: providerOrderId });
    if (res.startsWith('STATUS_OK')) {
      const text = res.replace('STATUS_OK:', '');
      return { text, otpCode: extractOtp(text), receivedAt: new Date().toISOString() };
    }
    if (res === 'STATUS_CANCEL') throw new Error('Cancelled by provider');
    return null;
  }

  async cancelOrder(providerOrderId: string): Promise<void> {
    await this.call({ action: 'setStatus', id: providerOrderId, status: '8' });
  }

  async getBalance(): Promise<number> {
    const res = await this.call({ action: 'getBalance' });
    return parseFloat(res.split(':')[1] ?? '0');
  }
}
