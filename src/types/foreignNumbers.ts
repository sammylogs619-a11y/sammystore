export interface FnCountry {
  id: string;
  code: string;
  name: string;
  flag_emoji: string;
  dial_code: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface FnService {
  id: string;
  slug: string;
  name: string;
  icon_url: string | null;
  category: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface FnProvider {
  id: string;
  slug: string;
  name: string;
  api_base_url: string;
  is_active: boolean;
  priority: number;
  balance_usd: number | null;
  last_synced: string | null;
}

export interface FnProviderInventory {
  id: string;
  provider_id: string;
  country_code: string;
  service_slug: string;
  price_usd: number;
  price_ngn: number | null;
  stock: number;
  is_available: boolean;
  synced_at: string;
  provider?: FnProvider;
}

export type FnOrderStatus =
  | 'pending'
  | 'active'
  | 'otp_received'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'failed';

export interface FnOrder {
  id: string;
  user_id: string;
  provider_id: string | null;
  country_code: string;
  service_slug: string;
  phone_number: string | null;
  provider_order_id: string | null;
  amount_ngn: number;
  status: FnOrderStatus;
  otp_code: string | null;
  otp_received_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface FnOrderEnriched extends FnOrder {
  country?: FnCountry;
  service?: FnService;
}

export interface FnServiceAvailability {
  service: FnService;
  best_price_ngn: number;
  total_stock: number;
  /** Real measured average from completed orders (fn_delivery_stats). Null = not enough history yet. */
  estimated_wait_seconds: number | null;
  delivery_sample_size?: number;
  providers: FnProviderInventory[];
}

export interface FnSetting {
  key: string;
  value: unknown;
}

export interface FnPricingConfig {
  id: string;
  is_active: boolean;
  /** NULL = applies to all countries */
  country_code: string | null;
  /** NULL = applies to all services */
  service_slug: string | null;
  margin_percent: number | null;
  fixed_markup_ngn: number | null;
  override_price_ngn: number | null;
  created_at: string;
  updated_at: string;
}

export interface FnDeliveryStat {
  country_code: string;
  service_slug: string;
  avg_delivery_seconds: number;
  sample_size: number;
}

export interface ProviderPriceData {
  country_code: string;
  service_slug: string;
  price_usd: number;
  stock: number;
}
