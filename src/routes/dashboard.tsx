import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2, Wallet, ShoppingBag, ExternalLink, MessageCircle, Users, Send, Mail, Key, Copy, CheckCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { contactInfo } from "@/data/site";

type WalletRow = { balance: number; currency: string; updated_at: string };
type OrderItem = { title: string; quantity: number; unit_price: number };
type Order = { id: string; total: number; currency: string; status: string; created_at: string; order_items: OrderItem[] };
type Profile = { display_name: string | null; email: string | null; phone: string | null; created_at: string };
type Credential = { id: string; content: string; label: string | null; delivered_at: string | null };

export default function DashboardPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/dashboard");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).single(),
      supabase.from("orders").select("*, order_items(title, quantity, unit_price)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
    ]).then(([w, o, p]) => {
      setWallet(w.data as WalletRow | null);
      setOrders((o.data as Order[]) ?? []);
      setProfile(p.data as Profile | null);
      setDataLoading(false);
    });
  }, [user]);

  if (loading || !user) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div>;

  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "User";
  const defaultTab = searchParams.get("tab") ?? "overview";

  return (
    <div className="min-h-[calc(100vh-200px)] bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">Welcome, {displayName}</h1>
            <p className="text-muted-foreground text-sm mt-1">{user.email}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isAdmin && (
              <Button asChild variant="outline" size="sm" className="border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white">
                <Link to="/admin">Admin Panel</Link>
              </Button>
            )}
            <Button asChild className="bg-brand-orange hover:bg-brand-orange-hover text-white" size="sm">
              <Link to="/wallet"><Wallet className="w-4 h-4 mr-1" />Wallet</Link>
            </Button>
          </div>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div>
        ) : (
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="mb-6 flex-wrap h-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="orders">My Orders</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="support">Support</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <Card className="border-brand-orange/20 bg-brand-orange/5">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Wallet Balance</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-brand-navy">₦{(wallet?.balance ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</div>
                    <Button asChild size="sm" className="mt-3 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs">
                      <Link to="/wallet">Fund Wallet</Link>
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Orders</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-brand-navy">{orders.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">All time purchases</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Member Since</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-brand-navy">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-NG", { month: "short", year: "numeric" }) : "—"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-brand-navy">Recent Orders</h2>
                <Button asChild variant="link" size="sm" className="text-brand-orange p-0"><Link to="/products">Shop More</Link></Button>
              </div>

              {orders.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No orders yet</p>
                    <Button asChild size="sm" className="mt-4 bg-brand-orange hover:bg-brand-orange-hover text-white">
                      <Link to="/products">Browse Products</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">{orders.slice(0, 5).map((o) => <OrderCard key={o.id} order={o} />)}</div>
              )}
            </TabsContent>

            <TabsContent value="orders">
              <h2 className="text-lg font-semibold text-brand-navy mb-4">All Orders ({orders.length})</h2>
              {orders.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3 mt-4" />
                    <p className="text-muted-foreground text-sm">No orders yet</p>
                    <Button asChild size="sm" className="mt-4 bg-brand-orange hover:bg-brand-orange-hover text-white">
                      <Link to="/products">Browse Products</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">{orders.map((o) => <OrderCard key={o.id} order={o} />)}</div>
              )}
            </TabsContent>

            <TabsContent value="profile">
              <ProfileTab profile={profile} user={user} />
            </TabsContent>

            <TabsContent value="support">
              <SupportTab />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-700", pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700", refunded: "bg-blue-100 text-blue-700",
};

function OrderCard({ order }: { order: Order }) {
  const [credOpen, setCredOpen] = useState(false);
  const [creds, setCreds] = useState<Credential[]>([]);
  const [credsLoading, setCredsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchCreds = async () => {
    setCredsLoading(true);
    const { data } = await supabase
      .from("product_credentials")
      .select("id, content, label, delivered_at")
      .eq("order_id", order.id);
    setCreds((data as Credential[]) ?? []);
    setCredsLoading(false);
  };

  const openCreds = () => { setCredOpen(true); fetchCreds(); };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs text-muted-foreground font-mono">#{order.id.slice(-8).toUpperCase()}</span>
                <Badge className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"}`}>{order.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {order.order_items?.length ? order.order_items.map((i) => `${i.title} ×${i.quantity}`).join(", ") : "—"}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="font-semibold text-brand-navy">₦{Number(order.total).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("en-NG")}</div>
              </div>
              <Button size="sm" variant="outline" onClick={openCreds}
                className="border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white text-xs h-8">
                <Key className="w-3 h-3 mr-1" />Credentials
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={credOpen} onOpenChange={setCredOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-4 h-4 text-brand-orange" />
              Order Credentials — #{order.id.slice(-8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {credsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-brand-orange" /></div>
            ) : creds.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
                <div className="font-medium mb-1 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />Delivery pending</div>
                <p>Credentials for this order haven't been assigned yet. Please check back shortly or contact support.</p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <a href={contactInfo.whatsappSupport} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-green-700 hover:underline">WhatsApp Support →</a>
                  <a href={contactInfo.telegramSupport} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-sky-600 hover:underline">Telegram Support →</a>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{creds.length} credential{creds.length > 1 ? "s" : ""} delivered.</p>
                {creds.map((c) => (
                  <div key={c.id} className="rounded-xl border border-border overflow-hidden">
                    {c.label && <div className="bg-muted/50 px-4 py-2 text-xs font-medium text-brand-navy border-b border-border">{c.label}</div>}
                    <div className="relative">
                      <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-all leading-relaxed max-h-48 overflow-y-auto bg-muted/20">{c.content}</pre>
                      <Button size="sm" variant="ghost" onClick={() => handleCopy(c.content, c.id)}
                        className="absolute top-2 right-2 h-7 px-2 text-xs text-muted-foreground hover:text-brand-navy">
                        {copied === c.id ? <><CheckCheck className="w-3.5 h-3.5 mr-1 text-green-500" />Copied!</> : <><Copy className="w-3.5 h-3.5 mr-1" />Copy</>}
                      </Button>
                    </div>
                    {c.delivered_at && (
                      <div className="bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground border-t border-border">
                        Delivered {new Date(c.delivered_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-yellow-500" />
                  Keep these credentials safe. Do not share them with anyone.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProfileTab({ profile, user }: { profile: Profile | null; user: import("@supabase/supabase-js").User }) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const onSaveProfile = async () => {
    setSaving(true);
    // Use upsert so the call succeeds whether or not a profile row already exists.
    // onConflict:"id" updates the existing row; if absent it inserts.
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? null,
        display_name: displayName.trim() || null,
        phone: phone.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    setSaving(false);
    if (error) {
      console.error("[Profile] Update error:", error);
      toast.error(error.message || "Failed to update profile");
    } else {
      toast.success("Profile updated!");
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match");
    if (password.length < 8) return toast.error("Minimum 8 characters");
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPwLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated!"); setPassword(""); setConfirm(""); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
      <Card>
        <CardHeader><CardTitle className="text-brand-navy text-base">Profile Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Email</Label><Input value={user.email ?? ""} readOnly className="mt-1 bg-muted text-muted-foreground" /></div>
          <div><Label>Display Name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1" /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" placeholder="+234..." /></div>
          <Button onClick={onSaveProfile} disabled={saving} className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Changes
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-brand-navy text-base">Change Password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onChangePassword} className="space-y-3">
            <div><Label>New Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" placeholder="Min. 8 characters" required /></div>
            <div><Label>Confirm Password</Label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1" placeholder="Repeat password" required /></div>
            <Button type="submit" disabled={pwLoading} variant="outline" className="w-full border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white">
              {pwLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function SupportTab() {
  const links = [
    { icon: MessageCircle, label: "WhatsApp Support", href: contactInfo.whatsappSupport, color: "text-green-600", bg: "bg-green-50", desc: contactInfo.phone },
    { icon: Users, label: "WhatsApp Community", href: contactInfo.whatsappGroup, color: "text-green-600", bg: "bg-green-50", desc: "Join our community group" },
    { icon: Send, label: "Telegram Support", href: contactInfo.telegramSupport, color: "text-sky-500", bg: "bg-sky-50", desc: "@Sammy_store_logs" },
    { icon: Send, label: "Telegram Channel", href: contactInfo.telegramChannel, color: "text-sky-500", bg: "bg-sky-50", desc: "@sammystorelogss" },
  ];
  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold text-brand-navy mb-1">Support & Community</h2>
      <p className="text-muted-foreground text-sm mb-6">Reach our team or join the community for updates and help.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {links.map(({ icon: Icon, label, href, color, bg, desc }) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all group">
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}><Icon className={`w-6 h-6 ${color}`} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-brand-navy group-hover:text-brand-orange transition-colors text-sm">{label}</div>
              <div className="text-xs text-muted-foreground truncate">{desc}</div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
          </a>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center shrink-0"><Mail className="w-5 h-5 text-brand-orange" /></div>
            <div>
              <div className="font-medium text-brand-navy text-sm">Email Support</div>
              <a href={`mailto:${contactInfo.email}`} className="text-sm text-brand-orange hover:underline">{contactInfo.email}</a>
              <p className="text-xs text-muted-foreground mt-0.5">We typically respond within 24 hours</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
