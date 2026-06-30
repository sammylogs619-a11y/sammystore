import { useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

type Product = {
  id: string;
  title: string;
  price: number;
  stock: number;
  image_url: string | null;
  category_id: string | null;
};

type Category = { id: string; name: string; slug: string };

type Visual = { gradient: string; emoji: string; badge: string };

function getVisual(categoryName: string, title: string): Visual {
  const n = (categoryName ?? '').toLowerCase();
  const t = (title ?? '').toLowerCase();
  const text = `${n} ${t}`;

  if (text.includes('twitter') || /\bx\b/.test(text))
    return { gradient: 'from-slate-700 to-slate-900', emoji: '🐦', badge: 'TWITTER/X' };
  if (text.includes('instagram'))
    return { gradient: 'from-pink-500 to-purple-600', emoji: '📷', badge: 'INSTAGRAM' };
  if (text.includes('facebook'))
    return { gradient: 'from-blue-500 to-blue-700', emoji: '👥', badge: 'FACEBOOK' };
  if (text.includes('tiktok'))
    return { gradient: 'from-slate-800 to-black', emoji: '🎵', badge: 'TIKTOK' };
  if (text.includes('telegram'))
    return { gradient: 'from-sky-400 to-blue-500', emoji: '✈️', badge: 'TELEGRAM' };
  if (text.includes('youtube'))
    return { gradient: 'from-red-500 to-red-700', emoji: '▶️', badge: 'YOUTUBE' };
  if (text.includes('linkedin'))
    return { gradient: 'from-blue-600 to-blue-800', emoji: '💼', badge: 'LINKEDIN' };
  if (text.includes('whatsapp'))
    return { gradient: 'from-green-500 to-green-700', emoji: '💬', badge: 'WHATSAPP' };
  return { gradient: 'from-indigo-500 to-purple-600', emoji: '🛍️', badge: 'ACCOUNT' };
}

export default function Accounts() {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const [buying, setBuying] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }

    Promise.all([
      supabase.from('product_categories').select('id,name,slug').order('name'),
      supabase.from('products').select('id,title,price,stock,image_url,category_id').eq('published', true).order('created_at', { ascending: false }),
    ]).then(([catRes, prodRes]) => {
      setCategories((catRes.data ?? []) as Category[]);
      setProducts((prodRes.data ?? []) as Product[]);
      setLoading(false);
    });
  }, []);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(c => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const filtered = filter === 'all'
    ? products
    : products.filter(p => (categoryNameById.get(p.category_id ?? '') ?? '').toLowerCase().includes(filter));

  const filterTabs = ['all', 'instagram', 'twitter', 'facebook', 'tiktok'];

  const handleBuy = async (product: Product) => {
    if (!user) { toast.error('Please log in to purchase'); return; }
    if (product.stock <= 0) { toast.error('Out of stock'); return; }
    setBuying(product.id);
    try {
      const { data, error } = await supabase.rpc('purchase_with_wallet', {
        _product_id: product.id,
        _quantity: 1,
        _user_id: user.id,
      });
      if (error) throw error;
      toast.success(`✅ Purchase successful! Order: ${String(data).slice(0, 8)}…`);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: p.stock - 1 } : p));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Purchase failed';
      if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('balance')) {
        toast.error('❌ Insufficient wallet balance. Please fund your wallet.');
      } else {
        toast.error(`❌ ${msg}`);
      }
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-poppins text-2xl font-bold text-white">Buy Account (Logs)</h2>
        <p className="text-gray-500 text-sm mt-1">Browse our collection of aged social media accounts</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 border-b border-[#1e2030]">
        {filterTabs.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
              filter === cat
                ? 'border-b-4 border-indigo-500 text-indigo-300 font-semibold'
                : 'text-gray-400 hover:text-indigo-400'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="h-64 bg-[#13151c] border border-[#252836] rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">📦</p>
          <p>No accounts available{filter !== 'all' ? ` in "${filter}"` : ''} right now.</p>
          <p className="text-xs mt-1">Check back soon — new stock is added regularly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => {
            const categoryName = categoryNameById.get(product.category_id ?? '') ?? '';
            const visual = getVisual(categoryName, product.title);
            const outOfStock = product.stock <= 0;
            return (
              <div key={product.id} className="bg-[#13151c] rounded-2xl border border-[#252836] overflow-hidden card-hover">
                <div className={`h-36 bg-gradient-to-br ${visual.gradient} flex items-center justify-center relative`}>
                  <span className="absolute top-3 right-3 bg-white/90 text-xs font-bold px-2 py-1 rounded-full text-gray-800">
                    {outOfStock ? 'OUT OF STOCK' : visual.badge}
                  </span>
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl">{visual.emoji}</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white">{product.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{product.stock} in stock</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-indigo-400 font-bold text-lg">₦{Number(product.price).toLocaleString()}</span>
                    <button
                      onClick={() => handleBuy(product)}
                      disabled={buying === product.id || outOfStock}
                      className="bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                      {buying === product.id ? 'Buying…' : outOfStock ? 'Sold Out' : 'Buy Now'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
