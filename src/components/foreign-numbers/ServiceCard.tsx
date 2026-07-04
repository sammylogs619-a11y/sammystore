import { ShoppingCart, Clock, Package } from 'lucide-react';
import type { FnService, FnServiceAvailability } from '@/types/foreignNumbers';

interface Props {
  service: FnService;
  availability: FnServiceAvailability | undefined;
  onBuyNow: () => void;
}

export function ServiceCard({ service, availability, onBuyNow }: Props) {
  const isAvailable = !!availability && availability.total_stock > 0;
  const canBuy = isAvailable && availability?.best_price_ngn != null;

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 transition-all duration-200 ${
      isAvailable
        ? 'border-border bg-white hover:border-brand-orange/40 hover:shadow-md'
        : 'border-border/50 bg-muted/30 opacity-60'
    }`}>
      <div className="flex items-center gap-3">
        {service.icon_url ? (
          <img
            src={service.icon_url}
            alt={service.name}
            className="w-10 h-10 rounded-lg object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">📱</div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-brand-navy truncate">{service.name}</h3>
          {service.category && (
            <span className="text-xs text-muted-foreground capitalize">{service.category}</span>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          isAvailable ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
        }`}>
          {isAvailable ? 'Available' : 'Out of stock'}
        </span>
      </div>

      {isAvailable && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5" />
            {availability!.total_stock.toLocaleString()} in stock
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {availability!.estimated_wait_seconds != null
              ? `~${Math.ceil(availability!.estimated_wait_seconds / 60)} min`
              : 'Varies'}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <div>
          {isAvailable ? (
            <>
              <p className="text-lg font-bold text-brand-navy">
                ₦{availability!.best_price_ngn.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">per number</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Unavailable</p>
          )}
        </div>
        <button
          type="button"
          onClick={canBuy ? onBuyNow : undefined}
          disabled={!canBuy}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            canBuy
              ? 'bg-brand-orange text-white hover:bg-brand-orange-hover active:scale-95'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Buy Now
        </button>
      </div>
    </div>
  );
}
