import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Zap, Package } from 'lucide-react';
import { useCountries, useCountryServices } from '@/hooks/useForeignNumbers';
import { ServiceCard } from '@/components/foreign-numbers/ServiceCard';
import { PurchaseModal } from '@/components/foreign-numbers/PurchaseModal';
import type { FnService, FnServiceAvailability } from '@/types/foreignNumbers';

export function ForeignNumbersCountryPage() {
  const { country: countrySlug } = useParams<{ country: string }>();
  const navigate = useNavigate();
  const { countries } = useCountries();

  const country = useMemo(
    () => countries.find(c => c.name.toLowerCase().replace(/\s+/g, '-') === countrySlug),
    [countries, countrySlug]
  );

  const { services, availability, loading } = useCountryServices(country?.code);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<FnService | null>(null);
  const [purchaseData, setPurchaseData] = useState<FnServiceAvailability | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(services.map(s => s.category).filter((cat): cat is string => Boolean(cat)));
    return ['all', ...Array.from(cats)];
  }, [services]);

  const filtered = useMemo(() => {
    return services.filter(svc => {
      const matchesSearch = svc.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || svc.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [services, search, categoryFilter]);

  const handleBuyNow = (service: FnService) => {
    const avail = availability[service.slug];
    if (!avail) return;
    setSelectedService(service);
    setPurchaseData(avail);
  };

  if (!loading && !country) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-4xl">🌍</p>
        <h2 className="text-xl font-semibold text-brand-navy">Country not found</h2>
        <button onClick={() => navigate(-1)} className="text-brand-orange hover:underline text-sm">
          ← Go back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          {country ? (
            <h1 className="text-2xl font-bold flex items-center gap-2 text-brand-navy">
              <span className="text-3xl">{country.flag_emoji}</span>
              {country.name}
            </h1>
          ) : (
            <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
          )}
          <p className="text-sm text-muted-foreground mt-0.5">
            Virtual numbers for SMS verification
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search services..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 transition-shadow"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-colors duration-150 ${
                categoryFilter === cat
                  ? 'bg-brand-orange text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {!loading && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Package className="w-4 h-4" />
            {Object.keys(availability).length} services available
          </span>
          {(() => {
            const times = Object.values(availability)
              .map(a => a.estimated_wait_seconds)
              .filter((s): s is number => s != null);
            if (times.length === 0) return null;
            const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
            return (
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                OTP in ~{Math.max(1, Math.ceil(avg / 60))} min
              </span>
            );
          })()}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <p className="text-5xl">📭</p>
          <h3 className="font-semibold text-lg text-brand-navy">No services found</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {search ? `No results for "${search}".` : 'No services available for this country yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              availability={availability[service.slug]}
              onBuyNow={() => handleBuyNow(service)}
            />
          ))}
        </div>
      )}

      {selectedService && purchaseData && country && (
        <PurchaseModal
          country={country}
          service={selectedService}
          availability={purchaseData}
          onClose={() => { setSelectedService(null); setPurchaseData(null); }}
        />
      )}
    </div>
  );
}
