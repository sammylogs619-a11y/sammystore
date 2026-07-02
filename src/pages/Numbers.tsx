import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCountries, useCountryServices } from '@/hooks/useForeignNumbers';
import { ServiceCard } from '@/components/foreign-numbers/ServiceCard';
import { PurchaseModal } from '@/components/foreign-numbers/PurchaseModal';
import type { FnService, FnServiceAvailability } from '@/types/foreignNumbers';

/**
 * Quick-access "Buy USA Numbers" shortcut. Renders the exact same live data
 * (fn_services + fn_provider_inventory, via useCountryServices) and the exact
 * same ServiceCard/PurchaseModal components as the full country page at
 * /foreign-numbers/united-states, filtered to the US country only — no
 * separate hardcoded price list to fall out of sync.
 */
export default function Numbers() {
  const navigate = useNavigate();
  const { countries, loading: countriesLoading } = useCountries();
  const usa = useMemo(() => countries.find(c => c.code.toUpperCase() === 'US'), [countries]);
  const { services, availability, loading: servicesLoading } = useCountryServices(usa?.code);
  const [selectedService, setSelectedService] = useState<FnService | null>(null);
  const [purchaseData, setPurchaseData] = useState<FnServiceAvailability | null>(null);

  const loading = countriesLoading || (!!usa && servicesLoading);

  const handleBuyNow = (service: FnService) => {
    const avail = availability[service.slug];
    if (!avail) return;
    setSelectedService(service);
    setPurchaseData(avail);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-poppins text-2xl font-bold text-white">Buy USA Numbers</h2>
        <p className="text-gray-500 text-sm mt-1">🇺🇸 US virtual numbers for SMS verification — live pricing & stock</p>
      </div>

      {!countriesLoading && !usa ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <p className="text-5xl">🇺🇸</p>
          <h3 className="font-semibold text-lg text-white">United States isn't configured yet</h3>
          <p className="text-sm text-gray-500 max-w-xs">Add it in the admin dashboard, or browse all countries instead.</p>
          <button
            onClick={() => navigate('/allnumbers')}
            className="text-indigo-400 hover:underline text-sm mt-1"
          >
            View all countries →
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-[#13151c] border border-[#252836] animate-pulse" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <p className="text-5xl">📭</p>
          <h3 className="font-semibold text-lg text-white">No services available right now</h3>
          <p className="text-sm text-gray-500 max-w-xs">Check back soon, or try another country.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              availability={availability[service.slug]}
              onBuyNow={() => handleBuyNow(service)}
            />
          ))}
        </div>
      )}

      {selectedService && purchaseData && usa && (
        <PurchaseModal
          country={usa}
          service={selectedService}
          availability={purchaseData}
          onClose={() => { setSelectedService(null); setPurchaseData(null); }}
        />
      )}
    </div>
  );
}
