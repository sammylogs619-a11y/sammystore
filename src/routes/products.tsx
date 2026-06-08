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
            <h2 className="text-3xl md:text-4xl font-bold text-brand-navy mb-3 tracking-tight">Browse our categories</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">A wide range of verified social media accounts ready for immediate transfer.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
            {displayCategories.map((category, index) => {
              const { Icon, iconColor, bg } = getCategoryMeta(category.slug, category.name);
              const isActive = activeCat === category.slug;
              return (
                <motion.button key={category.id}
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: index * 0.08 }} whileHover={{ y: -4 }}
                  onClick={() => navigate(`/products/${category.slug}`)}
                  className={`group text-left bg-card rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border ${isActive ? "border-brand-orange ring-2 ring-brand-orange/30" : "border-border"}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isActive ? "bg-brand-orange" : `${bg} group-hover:bg-brand-orange`}`}>
                      <Icon className={`w-6 h-6 transition-colors ${isActive ? "text-white" : `${iconColor} group-hover:text-white`}`} />
                    </div>
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full">Available</span>
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 transition-colors ${isActive ? "text-brand-orange" : "text-brand-navy group-hover:text-brand-orange"}`}>{category.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{category.description ?? `Browse verified ${category.name.toLowerCase()} accounts.`}</p>
                  <div className={`inline-flex items-center gap-2 font-medium text-sm ${isActive ? "text-brand-orange" : "text-brand-orange"}`}>
                    {isActive ? "Viewing products" : "Browse products"}
                    <ArrowRight className={`w-4 h-4 transition-transform ${isActive ? "rotate-90" : "group-hover:translate-x-1"}`} />
                  </div>
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {activeCat && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-brand-navy">{activeCategory?.name ?? activeCat}</h3>
                    <p className="text-sm text-muted-foreground">
                      {productsLoading ? "Loading…" : `${products.length} product${products.length !== 1 ? "s" : ""} available`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {user && walletBalance !== null && (
                      <span className="text-sm text-muted-foreground">Wallet: <span className="font-medium text-brand-navy">₦{walletBalance.toLocaleString()}</span></span>
                    )}
                    {user && (
                      <Button size="sm" variant="outline"
                        onClick={() => { setTopUpAmount(undefined); setTopUpOpen(true); }}
                        className="h-8 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white text-xs">
                        <CreditCard className="w-3.5 h-3.5 mr-1" />Top Up
                      </Button>
                    )}
                    <button onClick={() => setCat(undefined)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy transition-colors">
                      <X className="w-4 h-4" />Close
                    </button>
                  </div>
                </div>

                {productsLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div>
                ) : products.length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <ShoppingCart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">No products in this category yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Check back soon or contact support</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((p, i) => (
                      <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <Card className="group hover:shadow-lg transition-all border-border hover:border-brand-orange/30 h-full">
                          <CardContent className="p-5 flex flex-col h-full">
                            {p.image_url && (
                              <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-muted">
                                <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="font-semibold text-brand-navy group-hover:text-brand-orange transition-colors text-sm">{p.title}</h4>
                                <Badge className={p.stock > 0 ? "bg-green-100 text-green-700 shrink-0 text-xs" : "bg-red-100 text-red-500 shrink-0 text-xs"}>
                                  {p.stock > 0 ? `${p.stock} left` : "Sold out"}
                                </Badge>
                              </div>
                              {p.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>}
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                              <div className="text-lg font-bold text-brand-navy">₦{Number(p.price).toLocaleString()}</div>
                              <Button size="sm" disabled={p.stock === 0}
                                onClick={() => {
                                  if (!user) { navigate("/auth?redirect=/products"); return; }
                                  setBuyTarget(p);
                                }}
                                className="bg-brand-orange hover:bg-brand-orange-hover text-white text-xs">
                                {p.stock === 0 ? "Out of stock" : "Buy Now"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section className="w-full bg-brand-navy py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 tracking-tight">Can't find what you're looking for?</h2>
          <p className="text-white/70 max-w-2xl mx-auto mb-8">Contact our support team and we'll help you find the perfect account.</p>
          <Link to="/contact" className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-hover text-white px-8 py-4 rounded-lg font-semibold transition-colors">
            Contact Support<ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <Dialog open={!!buyTarget && !purchaseOrderId} onOpenChange={(o) => { if (!o) { setBuyTarget(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirm Purchase</DialogTitle></DialogHeader>
          {buyTarget && (
            <div className="py-2 space-y-3">
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="font-semibold text-brand-navy mb-1">{buyTarget.title}</div>
                <div className="text-2xl font-bold text-brand-orange">₦{Number(buyTarget.price).toLocaleString()}</div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your wallet balance</span>
                <span className={`font-medium ${(walletBalance ?? 0) < buyTarget.price ? "text-red-500" : "text-green-600"}`}>₦{(walletBalance ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">After purchase</span>
                <span className="font-medium text-brand-navy">₦{Math.max(0, (walletBalance ?? 0) - buyTarget.price).toLocaleString()}</span>
              </div>
              {(walletBalance ?? 0) < buyTarget.price && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center justify-between gap-2 flex-wrap">
                  <span>Insufficient balance.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTopUpAmount(Math.max(100, Math.ceil((buyTarget.price - (walletBalance ?? 0)) / 100) * 100));
                      setTopUpOpen(true);
                    }}
                    className="underline font-medium hover:text-red-700"
                  >
                    Fund wallet now →
                  </button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyTarget(null)}>Cancel</Button>
            <Button disabled={buying || (walletBalance ?? 0) < (buyTarget?.price ?? 0)} onClick={handleBuy} className="bg-brand-orange hover:bg-brand-orange-hover text-white">
              {buying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</> : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!purchaseOrderId} onOpenChange={(o) => { if (!o) closePurchaseResult(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <PackageCheck className="w-5 h-5" />
              Order Confirmed!
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-muted-foreground">
              Your purchase of <span className="font-medium text-brand-navy">{buyTarget?.title}</span> was successful.
            </p>
            {deliveredCred ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-brand-navy">
                  <CheckCheck className="w-4 h-4 text-green-500" />
                  {deliveredCred.label ?? "Account credentials delivered"}
                </div>
                <div className="bg-muted rounded-xl border border-border p-4 space-y-2">
                  {parseCred(deliveredCred.content).map(({ label, value }) => (
                    <div key={label} className="flex items-start gap-2 text-sm">
                      <span className="text-xs font-semibold text-purple-600 w-28 shrink-0 pt-0.5">{label}</span>
                      <span className="font-mono text-brand-navy break-all">{value}</span>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="outline" onClick={handleCopy} className="w-full h-8 text-xs gap-1.5">
                  {copied ? <><CheckCheck className="w-3.5 h-3.5 text-green-500" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy All Credentials</>}
                </Button>
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-yellow-500" />
                  Save these credentials now. You can also view them later in your Dashboard → Orders.
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
                <div className="font-medium mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />Delivery pending
                </div>
                <p>Your order has been placed. Account credentials will be delivered to your Dashboard within a short time.</p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link to="/dashboard?tab=orders">View in Dashboard</Link>
              </Button>
              <Button onClick={closePurchaseResult} size="sm" className="flex-1 bg-brand-orange hover:bg-brand-orange-hover text-white">
                Continue Shopping
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {user && (
        <PaystackTopUpDialog
          open={topUpOpen}
          onOpenChange={setTopUpOpen}
          user={user}
          defaultAmount={topUpAmount}
          onFunded={(newBalance) => { if (newBalance !== null) setWalletBalance(newBalance); }}
        />
      )}
    </>
  );
}
