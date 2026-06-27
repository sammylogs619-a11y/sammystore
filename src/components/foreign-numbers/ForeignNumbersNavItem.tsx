import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCountries } from '@/hooks/useForeignNumbers';

export function ForeignNumbersNavItem() {
  const [isOpen, setIsOpen] = useState(false);
  const { countries, loading } = useCountries();
  const location = useLocation();

  const isForeignNumbersRoute = location.pathname.startsWith('/foreign-numbers');

  return (
    <div className="mt-1">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
          isForeignNumbersRoute
            ? 'bg-gradient-to-r from-indigo-500/20 to-transparent border-r-4 border-indigo-500 text-indigo-300'
            : 'text-gray-300 hover:text-gray-200'
        }`}
      >
        <span className="flex items-center gap-3">
          <span className="text-lg">🌍</span>
          <span>Shop Foreign Numbers</span>
        </span>
        {isOpen
          ? <ChevronDown className="w-4 h-4 opacity-60" />
          : <ChevronRight className="w-4 h-4 opacity-60" />
        }
      </button>

      {isOpen && (
        <div className="mt-1 ml-4 pl-3 border-l border-[#1e2030] space-y-0.5 max-h-64 overflow-y-auto">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-7 rounded bg-[#1a1d27] animate-pulse my-1" />
              ))
            : countries.map(country => {
                const countrySlug = country.name.toLowerCase().replace(/\s+/g, '-');
                const isActive = location.pathname === `/foreign-numbers/${countrySlug}`;
                return (
                  <Link
                    key={country.code}
                    to={`/foreign-numbers/${countrySlug}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                      isActive
                        ? 'text-indigo-300 bg-indigo-500/10 font-semibold'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1d27]'
                    }`}
                  >
                    <span>{country.flag_emoji}</span>
                    <span className="truncate">{country.name}</span>
                  </Link>
                );
              })
          }
        </div>
      )}
    </div>
  );
}
