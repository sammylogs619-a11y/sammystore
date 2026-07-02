import { useNavigate } from 'react-router-dom';
import { useCountries, useCountryLowestPrices } from '@/hooks/useForeignNumbers';

export default function AllNumbers() {
  const navigate = useNavigate();
  const { countries, loading: countriesLoading } = useCountries();
  const { lowestByCountry, loading: pricesLoading } = useCountryLowestPrices();
  const loading = countriesLoading || pricesLoading;

  const handleCountryClick = (countryName: string) => {
    const slug = countryName.toLowerCase().replace(/\s+/g, '-');
    navigate(`/foreign-numbers/${slug}`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-poppins text-2xl font-bold text-white">Buy All Countries Numbers</h2>
        <p className="text-gray-500 text-sm mt-1">Tap a country to see available services</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-[#13151c] border border-[#252836] animate-pulse" />
          ))}
        </div>
      ) : countries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <p className="text-5xl">🌍</p>
          <h3 className="font-semibold text-lg text-white">No countries configured yet</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Add countries in the admin dashboard (Foreign Numbers) to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {countries.map(country => {
            const lowest = lowestByCountry[country.code];
            return (
              <button
                key={country.code}
                onClick={() => handleCountryClick(country.name)}
                className="bg-[#13151c] rounded-xl border border-[#252836] p-4 card-hover text-center hover:border-indigo-500/50 transition-all active:scale-95"
              >
                <span className="text-4xl block mb-2">{country.flag_emoji}</span>
                <p className="font-medium text-white text-sm">{country.name}</p>
                <p className="text-indigo-400 font-bold text-xs mt-2">
                  {lowest != null ? `From ₦${lowest.toLocaleString()}` : 'Unavailable'}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
