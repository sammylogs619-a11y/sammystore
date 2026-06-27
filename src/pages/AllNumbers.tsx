export default function AllNumbers() {
  const countries = [
    { code: 'gb', name: 'United Kingdom', emoji: '🇬🇧', price: 600 },
    { code: 'ca', name: 'Canada', emoji: '🇨🇦', price: 550 },
    { code: 'de', name: 'Germany', emoji: '🇩🇪', price: 700 },
    { code: 'fr', name: 'France', emoji: '🇫🇷', price: 650 },
    { code: 'in', name: 'India', emoji: '🇮🇳', price: 400 },
    { code: 'br', name: 'Brazil', emoji: '🇧🇷', price: 500 },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-poppins text-2xl font-bold text-white">Buy All Countries Numbers</h2>
        <p className="text-gray-500 text-sm mt-1">Virtual numbers from 100+ countries worldwide</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {countries.map(country => (
          <button
            key={country.code}
            className="bg-[#13151c] rounded-xl border border-[#252836] p-4 card-hover text-center hover:border-indigo-500/50"
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
