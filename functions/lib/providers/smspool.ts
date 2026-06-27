import { IProvider, NumberOrder, ProviderPrice, SmsMessage, extractOtp } from './base';

const COUNTRY_MAP: Record<string, string> = {
  us:'1',gb:'44',ca:'1',au:'61',de:'49',fr:'33',it:'39',es:'34',
  nl:'31',se:'46',no:'47',ch:'41',be:'32',pl:'48',cz:'420',tr:'90',
  in:'91',pk:'92',bd:'880',id:'62',my:'60',sg:'65',jp:'81',kr:'82',
  th:'66',vn:'84',br:'55',mx:'52',za:'27',ua:'380',ru:'7',ph:'63',
  ng:'234',gh:'233',ke:'254',eg:'20',ae:'971',sa:'966',
};

const SERVICE_MAP: Record<string, string> = {
  whatsapp:'1',telegram:'2',instagram:'3',facebook:'4',tiktok:'5',
  google:'6',gmail:'6',discord:'7',amazon:'8',netflix:'9',paypal:'10',
  binance:'11',twitter:'12',linkedin:'13',snapchat:'14',steam:'15',
  uber:'16',microsoft:'17',apple:'18',yahoo:'19',coinbase:'20',spotify:'21',
};

export class SMSPoolProvider implements IProvider {
  slug = 'smspool';
  name = 'SMSPool';
  private apiKey: string;
  private baseUrl = 'https://www.smspool.net/api';

  constructor(apiKey: string) { this.apiKey = apiKey; }

  async getPrices(countryCode: string, serviceSlug: string): Promise<ProviderPrice[]> {
    const country = COUNTRY_MAP[countryCode];
    const service = SERVICE_MAP[serviceSlug];
    if (!country || !service) return [];
    try {
      const res = await fetch(`${this.baseUrl}/prices?key=${this.apiKey}&country=${country}&service=${service}`);
      const data = await res.json() as { price?: number; stock?: number };
      if (!data.price) return [];
      return [{ countryCode, serviceSlug, priceUsd: data.price, stock: data.stock ?? 0 }];
    } catch { return []; }
  }

  async buyNumber(countryCode: string, serviceSlug: string): Promise<NumberOrder> {
    const country = COUNTRY_MAP[countryCode];
    const service = SERVICE_MAP[serviceSlug];
    if (!country || !service) throw new Error('Unsupported');
    const res = await fetch(`${this.baseUrl}/purchase?key=${this.apiKey}&country=${country}&service=${service}`);
    const data = await res.json() as { success?: number; number?: string; order_id?: string; message?: string };
    if (!data.success || !data.number) throw new Error(data.message ?? 'SMSPool failed');
    return { providerOrderId: data.order_id!, phoneNumber: data.number };
  }

  async checkSms(providerOrderId: string): Promise<SmsMessage | null> {
    const res = await fetch(`${this.baseUrl}/sms?key=${this.apiKey}&orderid=${providerOrderId}`);
    const data = await res.json() as { sms?: string };
    if (data.sms) return { text: data.sms, otpCode: extractOtp(data.sms), receivedAt: new Date().toISOString() };
    return null;
  }

  async cancelOrder(providerOrderId: string): Promise<void> {
    await fetch(`${this.baseUrl}/cancel?key=${this.apiKey}&orderid=${providerOrderId}`);
  }

  async getBalance(): Promise<number> {
    const res = await fetch(`${this.baseUrl}/balance?key=${this.apiKey}`);
    const data = await res.json() as { balance?: number };
    return data.balance ?? 0;
  }
}
