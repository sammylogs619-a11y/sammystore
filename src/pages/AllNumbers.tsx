import { useNavigate } from 'react-router-dom';

const countries = [
  { code: 'us', name: 'United States', emoji: '🇺🇸', price: 500 },
  { code: 'gb', name: 'United Kingdom', emoji: '🇬🇧', price: 600 },
  { code: 'ca', name: 'Canada', emoji: '🇨🇦', price: 550 },
  { code: 'au', name: 'Australia', emoji: '🇦🇺', price: 650 },
  { code: 'de', name: 'Germany', emoji: '🇩🇪', price: 700 },
  { code: 'fr', name: 'France', emoji: '🇫🇷', price: 650 },
  { code: 'it', name: 'Italy', emoji: '🇮🇹', price: 620 },
  { code: 'es', name: 'Spain', emoji: '🇪🇸', price: 600 },
  { code: 'nl', name: 'Netherlands', emoji: '🇳🇱', price: 680 },
  { code: 'se', name: 'Sweden', emoji: '🇸🇪', price: 650 },
  { code: 'no', name: 'Norway', emoji: '🇳🇴', price: 700 },
  { code: 'ch', name: 'Switzerland', emoji: '🇨🇭', price: 750 },
  { code: 'be', name: 'Belgium', emoji: '🇧🇪', price: 650 },
  { code: 'pl', name: 'Poland', emoji: '🇵🇱', price: 450 },
  { code: 'tr', name: 'Turkey', emoji: '🇹🇷', price: 400 },
  { code: 'in', name: 'India', emoji: '🇮🇳', price: 400 },
  { code: 'pk', name: 'Pakistan', emoji: '🇵🇰', price: 380 },
  { code: 'bd', name: 'Bangladesh', emoji: '🇧🇩', price: 370 },
  { code: 'id', name: 'Indonesia', emoji: '🇮🇩', price: 420 },
  { code: 'my', name: 'Malaysia', emoji: '🇲🇾', price: 480 },
  { code: 'sg', name: 'Singapore', emoji: '🇸🇬', price: 600 },
  { code: 'jp', name: 'Japan', emoji: '🇯🇵', price: 750 },
  { code: 'kr', name: 'South Korea', emoji: '🇰🇷', price: 700 },
  { code: 'th', name: 'Thailand', emoji: '🇹🇭', price: 450 },
  { code: 'vn', name: 'Vietnam', emoji: '🇻🇳', price: 400 },
  { code: 'br', name: 'Brazil', emoji: '🇧🇷', price: 500 },
  { code: 'mx', name: 'Mexico', emoji: '🇲🇽', price: 480 },
  { code: 'za', name: 'South Africa', emoji: '🇿🇦', price: 450 },
  { code: 'ng', name: 'Nigeria', emoji: '🇳🇬', price: 380 },
  { code: 'gh', name: 'Ghana', emoji: '🇬🇭', price: 380 },
  { code: 'ke', name: 'Kenya', emoji: '🇰🇪', price: 400 },
  { code: 'eg', name: 'Egypt', emoji: '🇪🇬', price: 420 },
  { code: 'ae', name: 'UAE', emoji: '🇦🇪', price: 600 },
  { code: 'sa', name: 'Saudi Arabia', emoji: '🇸🇦', price: 580 },
  { code: 'ua', name: 'Ukraine', emoji: '🇺🇦', price: 400 },
  { code: 'ru', name: 'Russia', emoji: '🇷🇺', price: 420 },
  { code: 'ph', name: 'Philippines', emoji: '🇵🇭', price: 430 },
  { code: 'ar', name: 'Argentina', emoji: '🇦🇷', price: 450 },
  { code: 'co', name: 'Colombia', emoji: '🇨🇴', price: 430 },
  { code: 'cl', name: 'Chile', emoji: '🇨🇱', price: 460 },
];

export default function AllNumbers() {
  const navigate = useNavigate();

  const handleCountryClick = (country: typeof countries[0]) => {
    const slug = country.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/foreign-numbers/${slug}`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-poppins text-2xl font-bold text-white">Buy All Countries Numbers</h2>
        <p className="text-gray-500 text-sm mt-1">Tap a country to see available services</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {countries.map(country => (
          <button
            key={country.code}
            onClick={() => handleCountryClick(country)}
            className="bg-[#13151c] rounded-xl border border-[#252836] p-4 card-hover text-center hover:border-indigo-500/50 transition-all active:scale-95"
          >
            <span className="text-4xl block mb-2">{country.emoji}</span>
            <p className="font-medium text-white text-sm">{country.name}</p>
            <p className="text-indigo-400 font-bold text-xs mt-2">From ₦{country.price}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
