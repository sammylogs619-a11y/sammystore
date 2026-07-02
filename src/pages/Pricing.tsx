import { useNavigate } from 'react-router-dom';
import { usePricingTable } from '@/hooks/useForeignNumbers';

export default function Pricing() {
  const navigate = useNavigate();
  const { rows, loading } = usePricingTable();

  const handleBuy = (countryName: string) => {
    const slug = countryName.toLowerCase().replace(/\s+/g, '-');
    navigate(`/foreign-numbers/${slug}`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-poppins text-2xl font-bold text-white">Services & Pricing</h2>
        <p className="text-gray-500 text-sm mt-1">Live pricing across every available country and service</p>
      </div>

      <div className="bg-[#13151c] rounded-2xl border border-[#252836] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-[#1a1d27] animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">
            No live pricing available right now. Check back shortly.
          </div>
        ) : (
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
              {rows.map(row => (
                <tr key={`${row.country_code}:${row.service_slug}`} className="hover:bg-[#1a1d27] transition">
                  <td className="px-6 py-4 text-sm font-medium text-white">{row.service_name} OTP</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{row.flag_emoji} {row.country_name}</td>
                  <td className="px-6 py-4 text-sm font-bold text-indigo-400 text-right">₦{row.price_ngn.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleBuy(row.country_name)}
                      className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-500 transition active:scale-95"
                    >
                      Buy
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
