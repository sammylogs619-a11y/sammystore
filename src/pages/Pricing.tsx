interface PricingItem {
  service: string;
  country: string;
  price: number;
}

export default function Pricing() {
  const pricingData: PricingItem[] = [
    { service: 'WhatsApp OTP', country: 'USA', price: 500 },
    { service: 'Telegram OTP', country: 'USA', price: 400 },
    { service: 'Google OTP', country: 'USA', price: 600 },
    { service: 'Facebook OTP', country: 'USA', price: 550 },
    { service: 'Twitter/X OTP', country: 'USA', price: 500 },
    { service: 'Any Service (Universal)', country: 'USA', price: 700 },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-poppins text-2xl font-bold text-white">USA Services & Pricing</h2>
        <p className="text-gray-500 text-sm mt-1">Complete pricing for all USA virtual number services</p>
      </div>

      <div className="bg-[#13151c] rounded-2xl border border-[#252836] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1a1d27]">
            <tr>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Service</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Country</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Price</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2030]">
            {pricingData.map((item, idx) => (
              <tr key={idx} className="hover:bg-[#1a1d27] transition">
                <td className="px-6 py-4 text-sm font-medium text-white">{item.service}</td>
                <td className="px-6 py-4 text-sm text-gray-400">🇺🇸 {item.country}</td>
                <td className="px-6 py-4 text-sm font-bold text-indigo-400 text-right">₦{item.price}</td>
                <td className="px-6 py-4 text-right">
                  <button className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-500 transition">
                    Buy
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
