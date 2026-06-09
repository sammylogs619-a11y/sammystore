import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Facebook, Instagram, Twitter, Youtube, Linkedin, Music2, Send, MessageCircle, Globe, ShoppingBag, Loader2, ShoppingCart, X, Copy, CheckCheck, PackageCheck, AlertCircle, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { PageHero } from "@/components/sections/PageHero";
import { categories as staticCategories } from "@/data/site";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { assignCredentialToOrder } from "@/lib/api/delivery";
import { PaystackTopUpDialog } from "@/components/wallet/PaystackTopUpDialog";

type DbCategory = { id: string; name: string; slug: string; description: string | null };
type Product = { id: string; title: string; price: number; stock: number; description: string | null; image_url: string | null; slug: string; currency: string };
type DeliveredCred = { content: string; label: string | null };

const CRED_FIELDS = ["Username", "Password", "Email", "Email Password", "2FA Code"];
function parseCred(content: string) {
  const parts = content.split(/\||\//).map((part) => part.trim());
  return CRED_FIELDS.map((label, i) => ({ label, value: parts[i] ?? "" })).filter((f) => f.value);
}

type CategoryMeta = { Icon: React.ElementType; iconColor: string; bg: string };
function getCategoryMeta(slug: string, name: string): CategoryMeta {
  const s = (slug ?? "").toLowerCase();
  const n = (name ?? "").toLowerCase();
  if (s.includes("twitter") || s.includes("-x-") || s.endsWith("-x") || n.includes("twitter") || / x$/.test(n))
    return { Icon: Twitter, iconColor: "text-slate-900", bg: "bg-slate-100" };
  if (s.includes("instagram") || n.includes("instagram"))
    return { Icon: Instagram, iconColor: "text-pink-600", bg: "bg-pink-100" };
  if (s.includes("facebook") || n.includes("facebook") || s.includes("fb-") || n.includes(" fb "))
    return { Icon: Facebook, iconColor: "text-blue-600", bg: "bg-blue-100" };
  if (s.includes("youtube") || n.includes("youtube"))
    return { Icon: Youtube, iconColor: "text-red-600", bg: "bg-red-100" };
  if (s.includes("tiktok") || n.includes("tiktok"))
    return { Icon: Music2, iconColor: "text-slate-800", bg: "bg-slate-100" };
  if (s.includes("linkedin") || n.includes("linkedin"))
    return { Icon: Linkedin, iconColor: "text-blue-700", bg: "bg-blue-100" };
  if (s.includes("telegram") || n.includes("telegram"))
    return { Icon: Send, iconColor: "text-sky-500", bg: "bg-sky-100" };
  if (s.includes("whatsapp") || n.includes("whatsapp"))
    return { Icon: MessageCircle, iconColor: "text-green-600", bg: "bg-green-100" };
  if (s.includes("website") || s.includes("web") || n.includes("website") || n.includes("web"))
    return { Icon: Globe, iconColor: "text-brand-orange", bg: "bg-brand-orange/10" };
  return { Icon: ShoppingBag, iconColor: "text-gray-500", bg: "bg-gray-100" };
}

export default function ProductsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [buyTarget, setBuyTarget] = useState<Product | null>(null);
  const [buying, setBuying] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [deliveredCred, setDeliveredCred] = useState<DeliveredCred | null>(null);
  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number | undefined>(undefined);


  const activeCat = searchParams.get("cat") ?? undefined;
  const activeCategory = dbCategories.find((c) => c.slug === activeCat);

  useEffect(() => {
    supabase.from("product_categories").select("*").order("name").then(({ data }) => {
      if (data?.length) setDbCategories(data as DbCategory[]);
    });
  }, []);

  useEffect(() => {
    if (!activeCat) { setProducts([]); return; }
    setProductsLoading(true);
    const catId = dbCategories.find((c) => c.slug === activeCat)?.id ?? "";
    if (!catId) { setProductsLoading(false); return; }
    supabase
      .from("products")
      .select("id, title, price, stock, description, image_url, slug, currency")
      .eq("published", true)
      .eq("category_id", catId)
      .order("price")
      .then(({ data }) => { setProducts((data as Product[]) ?? []); setProductsLoading(false); });
  }, [activeCat, dbCategories]);

  // Fetch wallet balance + subscribe realtime so balance reflects
  // immediately after admin credits or Paystack top-up completes.
  useEffect(() => {
    if (!user) return;
    const fetchBalance = () => {
      supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => { if (data) setWalletBalance(Number(data.balance)); });
    };
    fetchBalance();
    const channel = supabase
      .channel("products-wallet-rt")
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` } as any,
        (payload: any) => { setWalletBalance(Number(payload.new.balance)); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const displayCategories = dbCategories.length > 0
    ? dbCategories
    : staticCategories.map((c) => ({ id: String(c.id), name: c.name, slug: c.slug, description: null }));

  const refreshProducts = () => {
    const catId = dbCategories.find((c) => c.slug === activeCat)?.id;
    if (!catId) return;
    supabase.from("products").select("id, title, price, stock, description, image_url, slug, currency")
      .eq("published", true).eq("category_id", catId).order("price")
      .then(({ data }) => setProducts((data as Product[]) ?? []));
  };

  const handleBuy = async () => {
    if (!buyTarget || !user) return;
    if (walletBalance === null) return toast.error("Wallet not found");
    if (walletBalance < buyTarget.price) {
      toast.error(`Insufficient balance — need ₦${buyTarget.price.toLocaleString()}, have ₦${walletBalance.toLocaleString()}`);
      return;
    }

    setBuying(true);

    // Ensure the user session is fresh before purchasing
    await supabase.auth.getSession();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orderId, error } = await (supabase.rpc as any)("purchase_with_wallet", {
      _user_id: user.id,
      _product_id: buyTarget.id,
      _quantity: 1,
    });

    if (error) {
      setBuying(false);
      console.error("[Buy] purchase_with_wallet error:", error);
      if (error.message.includes("insufficient") || error.message.includes("balance"))
        toast.error("Insufficient wallet balance. Please top up and try again.");
      else if (error.message.includes("stock") || error.message.includes("out"))
        toast.error("This product is out of stock.");
      else
        toast.error(error.message || "Purchase failed. Please try again.");
      return;
    }

    if (!orderId) {
      setBuying(false);
      toast.error("Purchase failed — no order ID returned. Please contact support.");
      return;
    }

    // Refresh wallet balance (realtime also handles this, but fetch immediately too)
    supabase.from("wallets").select("balance").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setWalletBalance(Number(data.balance)); });
    refreshProducts();

    try {
      const delivery = await assignCredentialToOrder({ orderId: orderId as string, productId: buyTarget.id });
      setBuying(false);
      setPurchaseOrderId(orderId as string);
      if (delivery.assigned && delivery.content) {
        setDeliveredCred({ content: delivery.content, label: delivery.label });
      } else {
        setDeliveredCred(null);
      }
    } catch (deliveryErr) {
      console.warn("[Buy] credential delivery error:", deliveryErr);
      setBuying(false);
      setPurchaseOrderId(orderId as string);
      setDeliveredCred(null);
    }
  };

  const handleCopy = () => {
    if (!deliveredCred?.content) return;
    navigator.clipboard.writeText(deliveredCred.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closePurchaseResult = () => {
    setBuyTarget(null);
    setPurchaseOrderId(null);
    setDeliveredCred(null);
    setCopied(false);
  };

  const setCat = (slug: string | undefined) => {
    if (slug) setSearchParams({ cat: slug });
    else setSearchParams({});
  };

  return (
    <>
      <PageHero title="Our Products" subtitle="Verified accounts across every major social platform." breadcrumbs={[{ name: "Products" }]} />

      <section className="w-full bg-background py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-12">
            <h3 className="text-lg font-semibold text-brand-foreground/80">Handpicked categories</h3>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold">Verified accounts for sale</h2>
          </motion.div>

          {/* Categories */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-8">
            {displayCategories.map((c) => {
              const meta = getCategoryMeta(c.slug, c.name);
              const active = activeCategory?.id === c.id;
              return (
                <button key={c.id} onClick={() => setCat(c.slug)} aria-pressed={active} className={`group p-3 rounded-lg flex flex-col items-center justify-center space-y-2 ${meta.bg} ${active ? 'ring-2 ring-offset-2 ring-brand-500' : ''}`}>
                  <meta.Icon className={`w-6 h-6 ${meta.iconColor}`} />
                  <div className="text-xs text-slate-700 mt-1">{c.name}</div>
                </button>
              );
            })}
          </div>

          {/* Products grid (simplified for brevity) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {productsLoading ? (
              <div className="col-span-full text-center py-12"><Loader2 className="mx-auto" /></div>
            ) : products.map((p) => (
              <Card key={p.id}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{p.title}</h3>
                      <div className="text-sm text-slate-500">₦{p.price.toLocaleString()}</div>
                    </div>
                    <div>
                      <Button onClick={() => { setBuyTarget(p); }} disabled={p.stock <= 0}>Buy</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
