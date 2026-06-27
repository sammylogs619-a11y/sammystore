import { useNavigate } from 'react-router-dom';

const services = [
  { slug: 'whatsapp', name: 'WhatsApp', emoji: '💬', price: 500, color: 'from-green-500 to-emerald-600' },
  { slug: 'telegram', name: 'Telegram', emoji: '✈️', price: 400, color: 'from-blue-500 to-cyan-600' },
  { slug: 'google', name: 'Google', emoji: '🔍', price: 600, color: 'from-red-500 to-orange-600' },
  { slug: 'facebook', name: 'Facebook', emoji: '👥', price: 550, color: 'from-blue-600 to-blue-800' },
  { slug: 'twitter', name: 'Twitter/X', emoji: '🐦', price: 500, color: 'from-gray-700 to-gray-900' },
  { slug: 'instagram', name: 'Instagram', emoji: '📸', price: 480, color: 'from-pink-500 to-purple-600' },
  { slug: 'discord', name: 'Discord', emoji: '🎮', price: 450, color: 'from-indigo-500 to-purple-700' },
  { slug: 'tiktok', name: 'TikTok', emoji: '🎵', price: 420, color: 'from-pink-600 to-red-600' },
  { slug: 'binance', name: 'Binance', emoji: '🪙', price: 600, color: 'from-yellow-500 to-orange-600' },
  { slug: 'paypal', name: 'PayPal', emoji: '💳', price: 700, color: 'from-blue-600 to-indigo-700' },
  { slug: 'amazon', name: 'Amazon', emoji: '📦', price: 550, color: 'from-orange-500 to-yellow-600' },
  { slug: 'netflix', name: 'Netflix', emoji: '🎬', price: 480, color: 'from-red-600 to-red-800' },
];

export default function Numbers() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-poppins text-2xl font-bold text-white">Buy USA Numbers</h2>
        <p className="text-gray-500 text-sm mt-1">🇺🇸 US virtual numbers for SMS verification — instant delivery</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map(service => (
          <div key={service.slug} className="bg-[#13151c] rounded-2xl border border-[#252836] overflow-hidden card-hover">
            <div className={`h-24 bg-gradient-to-br ${service.color} flex items-center justify-center`}>
              <span className="text-4xl">{service.emoji}</span>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-white">{service.name} OTP</h3>
              <p className="text-xs text-gray-500 mt-1">🇺🇸 United States · ~1 min delivery</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-indigo-400 font-bold text-lg">₦{service.price.toLocaleString()}</span>
                <button
                  onClick={() => navigate('/foreign-numbers/united-states')}
                  className="bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-indigo-500 transition active:scale-95"
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
