import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Loader2, Users, Package, ShoppingCart, CreditCard, BarChart3, Settings,
  Plus, Pencil, Trash2, CheckCircle, XCircle, Eye, EyeOff, Wallet, Key,
  Copy, CheckCheck, Ban, UserCheck, Tag, ClipboardList, MinusCircle, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { adminCreditWalletFn, adminDebitWalletFn } from "@/lib/api/payment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploader } from "@/components/admin/ImageUploader";

type Profile = { id: string; email: string | null; display_name: string | null; suspended: boolean; created_at: string };
type UserWallet = { balance: number; currency: string };
type UserRow = Profile & { wallet: UserWallet | null; role: string };
type Category = { id: string; name: string; slug: string; description: string | null; created_at: string };
type Product = { id: string; title: string; slug: string; price: number; stock: number; published: boolean; description: string | null; image_url: string | null; category_id: string | null; currency: string; created_at: string };
type Order = { id: string; user_id: string; total: number; status: string; currency: string; created_at: string };
type Tx = { id: string; user_id: string; type: string; amount: number; provider: string | null; description: string | null; status: string; created_at: string };
type SoldItem = { id: string; order_id: string; product_id: string | null; title: string; unit_price: number; quantity: number; delivered_payload: string | null; created_at: string; order_user_id: string; order_status: string };
type AuditLog = { id: string; actor_id: string | null; action: string; target: string | null; metadata: Record<string, unknown>; created_at: string };
type Stats = { users: number; revenue: number; orders: number; products: number };

export default function AdminPage() {
  const { user, loading, isAdmin, role } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading) {
      if (!user) navigate("/auth?redirect=/admin");
      else if (role !== null && !isAdmin) navigate("/dashboard");
    }
  }, [user, loading, isAdmin, role, navigate]);
  if (loading || !user || role === null) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div>;
  if (!isAdmin) return null;
  return <AdminDashboard adminUser={user} />;
}

function AdminDashboard({ adminUser }: { adminUser: import("@supabase/supabase-js").User }) {
  const [stats, setStats] = useState<Stats>({ users: 0, revenue: 0, orders: 0, products: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = async () => {
    setStatsLoading(true);
    const [u, rev, o, p] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("wallet_transactions").select("amount").eq("type", "credit").eq("status", "success"),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("published", true),
    ]);
    setStats({
      users: u.count ?? 0,
      revenue: (rev.data ?? []).reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0),
      orders: o.count ?? 0,
      products: p.count ?? 0,
    });
    setStatsLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <div className="min-h-[calc(100vh-200px)] bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">{adminUser.email}</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/dashboard">← User Dashboard</Link></Button>
        </div>

        {!statsLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Users",   value: stats.users.toLocaleString(),          icon: Users,        color: "text-blue-500",        bg: "bg-blue-50" },
              { label: "Total Revenue", value: `₦${stats.revenue.toLocaleString()}`,  icon: Wallet,       color: "text-green-500",       bg: "bg-green-50" },
              { label: "Total Orders",  value: stats.orders.toLocaleString(),          icon: ShoppingCart, color: "text-purple-500",      bg: "bg-purple-50" },
              { label: "Live Products", value: stats.products.toLocaleString(),        icon: Package,      color: "text-brand-orange",    bg: "bg-brand-orange/10" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}><Icon className={`w-5 h-5 ${color}`} /></div>
                  <div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-lg font-bold text-brand-navy">{value}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="users"><Users className="w-3.5 h-3.5 mr-1" />Users</TabsTrigger>
            <TabsTrigger value="products"><Package className="w-3.5 h-3.5 mr-1" />Products</TabsTrigger>
            <TabsTrigger value="categories"><Tag className="w-3.5 h-3.5 mr-1" />Categories</TabsTrigger>
            <TabsTrigger value="sold"><CheckCircle className="w-3.5 h-3.5 mr-1" />Sold</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingCart className="w-3.5 h-3.5 mr-1" />Orders</TabsTrigger>
            <TabsTrigger value="payments"><CreditCard className="w-3.5 h-3.5 mr-1" />Payments</TabsTrigger>
            <TabsTrigger value="audit"><ClipboardList className="w-3.5 h-3.5 mr-1" />Audit</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="w-3.5 h-3.5 mr-1" />Analytics</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="w-3.5 h-3.5 mr-1" />Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="products"><ProductsTab /></TabsContent>
          <TabsContent value="categories"><CategoriesTab /></TabsContent>
          <TabsContent value="sold"><SoldTab /></TabsContent>
          <TabsContent value="orders"><OrdersTab /></TabsContent>
          <TabsContent value="payments"><PaymentsTab /></TabsContent>
          <TabsContent value="audit"><AuditTab /></TabsContent>
          <TabsContent value="analytics"><AnalyticsTab stats={stats} /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [creditTarget, setCreditTarget] = useState<UserRow | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDesc, setCreditDesc] = useState("");
  const [crediting, setCrediting] = useState(false);

  const [debitTarget, setDebitTarget] = useState<UserRow | null>(null);
  const [debitAmount, setDebitAmount] = useState("");
  const [debitDesc, setDebitDesc] = useState("");
  const [debiting, setDebiting] = useState(false);

  const [suspending, setSuspending] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (!profiles) { setLoading(false); return; }
    const ids = profiles.map((p: Profile) => p.id);
    const [wallets, roles] = await Promise.all([
      supabase.from("wallets").select("user_id, balance, currency").in("user_id", ids),
      supabase.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);
    const walletMap = Object.fromEntries((wallets.data ?? []).map((w: { user_id: string } & UserWallet) => [w.user_id, w]));
    const roleMap   = Object.fromEntries((roles.data ?? []).map((r: { user_id: string; role: string }) => [r.user_id, r.role]));
    setUsers(profiles.map((p: Profile) => ({ ...p, wallet: walletMap[p.id] ?? null, role: roleMap[p.id] ?? "user" })));
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCredit = async () => {
    if (!creditTarget) return;
    const amount = parseFloat(creditAmount);
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");
    if (!creditDesc.trim()) return toast.error("Description is required");
    setCrediting(true);
    try {
      await adminCreditWalletFn({ targetUserId: creditTarget.id, amount, description: creditDesc.trim() });
      toast.success(`₦${amount.toLocaleString()} credited to ${creditTarget.display_name ?? creditTarget.email}`);
      setCreditTarget(null); setCreditAmount(""); setCreditDesc("");
      fetchUsers();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Credit failed"); }
    setCrediting(false);
  };

  const handleDebit = async () => {
    if (!debitTarget) return;
    const amount = parseFloat(debitAmount);
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");
    if (!debitDesc.trim()) return toast.error("Description is required");
    const currentBal = debitTarget.wallet?.balance ?? 0;
    if (amount > currentBal) return toast.error(`Amount exceeds balance of ₦${currentBal.toLocaleString()}`);
    setDebiting(true);
    try {
      await adminDebitWalletFn({ targetUserId: debitTarget.id, amount, description: debitDesc.trim() });
      toast.success(`₦${amount.toLocaleString()} debited from ${debitTarget.display_name ?? debitTarget.email}`);
      setDebitTarget(null); setDebitAmount(""); setDebitDesc("");
      fetchUsers();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Debit failed"); }
    setDebiting(false);
  };

  const toggleSuspend = async (u: UserRow) => {
    setSuspending(u.id);
    const newVal = !u.suspended;
    const { error } = await supabase.from("profiles").update({ suspended: newVal, updated_at: new Date().toISOString() }).eq("id", u.id);
    setSuspending(null);
    if (error) { toast.error(error.message); return; }
    toast.success(newVal ? `${u.display_name ?? u.email} suspended` : `${u.display_name ?? u.email} unsuspended`);
    fetchUsers();
  };

  const filtered = users.filter((u) =>
    (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.display_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-semibold text-brand-navy">All Users ({users.length})</h2>
        <Input placeholder="Search by email or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{["User", "Role", "Balance", "Joined", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u) => (
                <tr key={u.id} className={`hover:bg-muted/20 transition-colors ${u.suspended ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-brand-navy">{u.display_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={u.role === "admin" ? "bg-brand-orange text-white" : "bg-muted text-muted-foreground"}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-brand-navy">₦{(u.wallet?.balance ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString("en-NG")}</td>
                  <td className="px-4 py-3">
                    {u.suspended
                      ? <Badge className="bg-red-100 text-red-600 text-xs">Suspended</Badge>
                      : <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button size="sm" variant="outline" className="text-xs border-green-500 text-green-600 hover:bg-green-50 h-7 px-2"
                        onClick={() => { setCreditTarget(u); setCreditAmount(""); setCreditDesc(""); }}>
                        <Wallet className="w-3 h-3 mr-1" />Credit
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs border-red-400 text-red-500 hover:bg-red-50 h-7 px-2"
                        onClick={() => { setDebitTarget(u); setDebitAmount(""); setDebitDesc(""); }}
                        disabled={!u.wallet || u.wallet.balance <= 0}>
                        <MinusCircle className="w-3 h-3 mr-1" />Debit
                      </Button>
                      <Button size="sm" variant="outline"
                        className={`text-xs h-7 px-2 ${u.suspended ? "border-green-400 text-green-600 hover:bg-green-50" : "border-orange-400 text-orange-600 hover:bg-orange-50"}`}
                        disabled={suspending === u.id}
                        onClick={() => toggleSuspend(u)}>
                        {suspending === u.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : u.suspended ? <><UserCheck className="w-3 h-3 mr-1" />Unsuspend</> : <><Ban className="w-3 h-3 mr-1" />Suspend</>}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No users found</div>}
        </div>
      )}

      {/* Credit Dialog */}
      <Dialog open={!!creditTarget} onOpenChange={(o) => !o && setCreditTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Credit Wallet — {creditTarget?.display_name ?? creditTarget?.email}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Current Balance</Label>
              <div className="mt-1 text-lg font-bold text-green-600">₦{(creditTarget?.wallet?.balance ?? 0).toLocaleString()}</div>
            </div>
            <div>
              <Label>Amount to Credit (₦)</Label>
              <Input type="number" min="1" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="mt-1" placeholder="e.g. 5000" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={creditDesc} onChange={(e) => setCreditDesc(e.target.value)} className="mt-1" placeholder="e.g. Bonus credit" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditTarget(null)}>Cancel</Button>
            <Button disabled={crediting} onClick={handleCredit} className="bg-green-600 hover:bg-green-700 text-white">
              {crediting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Credit Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Debit Dialog */}
      <Dialog open={!!debitTarget} onOpenChange={(o) => !o && setDebitTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Debit Wallet — {debitTarget?.display_name ?? debitTarget?.email}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Current Balance</Label>
              <div className="mt-1 text-lg font-bold text-brand-navy">₦{(debitTarget?.wallet?.balance ?? 0).toLocaleString()}</div>
            </div>
            <div>
              <Label>Amount to Debit (₦)</Label>
              <Input type="number" min="1" max={debitTarget?.wallet?.balance ?? 0} value={debitAmount} onChange={(e) => setDebitAmount(e.target.value)} className="mt-1" placeholder="e.g. 1000" />
            </div>
            <div>
              <Label>Reason</Label>
              <Input value={debitDesc} onChange={(e) => setDebitDesc(e.target.value)} className="mt-1" placeholder="e.g. Reversal — refund error" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDebitTarget(null)}>Cancel</Button>
            <Button disabled={debiting} onClick={handleDebit} className="bg-red-500 hover:bg-red-600 text-white">
              {debiting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Debit Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────
function CategoriesTab() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("product_categories").select("*").order("name");
    setCats((data as Category[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);

  const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const openCreate = () => { setEditing(null); setForm({ name: "", slug: "", description: "" }); setDialogOpen(true); };
  const openEdit   = (c: Category) => { setEditing(c); setForm({ name: c.name, slug: c.slug, description: c.description ?? "" }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const payload = { name: form.name.trim(), slug: (form.slug || slugify(form.name)).trim(), description: form.description.trim() || null };
    const { error } = editing
      ? await supabase.from("product_categories").update(payload).eq("id", editing.id)
      : await supabase.from("product_categories").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Category updated!" : "Category created!");
    setDialogOpen(false); fetch();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("product_categories").delete().eq("id", deleteId);
    setDeleting(false); setDeleteId(null);
    error ? toast.error(error.message) : toast.success("Category deleted");
    fetch();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-semibold text-brand-navy">Product Categories ({cats.length})</h2>
        <Button onClick={openCreate} className="bg-brand-orange hover:bg-brand-orange-hover text-white text-sm">
          <Plus className="w-4 h-4 mr-1" />Add Category
        </Button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{["Name", "Slug", "Description", "Created", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cats.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-brand-navy">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.slug}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{c.description ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("en-NG")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteId(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cats.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No categories yet</div>}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })} className="mt-1" placeholder="e.g. Aged Twitter" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1" placeholder="auto-generated" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleSave} className="bg-brand-orange hover:bg-brand-orange-hover text-white">
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Category?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Products in this category will become uncategorized. This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button disabled={deleting} onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
              {deleting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sold Products Tab ────────────────────────────────────────────────────────
function SoldTab() {
  const [items, setItems] = useState<SoldItem[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data: orders } = await supabase
      .from("orders")
      .select("id, user_id, status")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!orders?.length) { setLoading(false); return; }

    const orderIds = orders.map((o: { id: string }) => o.id);
    const { data: oi } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds)
      .order("created_at", { ascending: false });

    const orderMap = Object.fromEntries(orders.map((o: { id: string; user_id: string; status: string }) => [o.id, o]));
    const enriched: SoldItem[] = ((oi ?? []) as Array<{
      id: string; order_id: string; product_id: string | null; title: string;
      unit_price: number; quantity: number; delivered_payload: string | null; created_at: string;
    }>).map((item) => ({
      ...item,
      order_user_id: orderMap[item.order_id]?.user_id ?? "",
      order_status: orderMap[item.order_id]?.status ?? "completed",
    }));
    setItems(enriched);

    const userIds = [...new Set(enriched.map((i) => i.order_user_id).filter(Boolean))];
    if (userIds.length) {
      const { data: p } = await supabase.from("profiles").select("id, email, display_name").in("id", userIds);
      const map: Record<string, string> = {};
      (p ?? []).forEach((x: { id: string; email: string | null; display_name: string | null }) => {
        map[x.id] = x.display_name ?? x.email ?? x.id.slice(-8);
      });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = items.filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    (profiles[i.order_user_id] ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-semibold text-brand-navy">Sold Products ({items.length} items)</h2>
        <div className="flex items-center gap-2">
          <Input placeholder="Search product or buyer…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Button size="sm" variant="outline" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{["Product", "Buyer", "Unit Price", "Qty", "Credential", "Date"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-brand-navy">{item.title}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{profiles[item.order_user_id] ?? item.order_user_id.slice(-8)}</td>
                  <td className="px-4 py-3 font-medium text-brand-navy">₦{Number(item.unit_price).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center font-medium">{item.quantity}</td>
                  <td className="px-4 py-3">
                    {item.delivered_payload
                      ? <Badge className="bg-green-100 text-green-700 text-xs">Delivered</Badge>
                      : <Badge className="bg-yellow-100 text-yellow-700 text-xs">Pending</Badge>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString("en-NG")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No sold products yet</div>}
        </div>
      )}
    </div>
  );
}

// ─── Products Tab ─────────────────────────────────────────────────────────────
const emptyProduct: Omit<Product, "id" | "created_at"> = { title: "", slug: "", price: 0, stock: 0, published: false, description: "", image_url: "", category_id: "", currency: "NGN" };

function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, "id" | "created_at">>(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [credProduct, setCredProduct] = useState<Product | null>(null);
  const [credCounts, setCredCounts] = useState<Record<string, { available: number; total: number }>>({});

  const fetchCredCounts = async (productIds: string[]) => {
    if (!productIds.length) return;
    const { data } = await supabase.from("product_credentials").select("product_id, order_id").in("product_id", productIds);
    const counts: Record<string, { available: number; total: number }> = {};
    ((data ?? []) as Array<{ product_id: string; order_id: string | null }>).forEach((row) => {
      if (!counts[row.product_id]) counts[row.product_id] = { available: 0, total: 0 };
      counts[row.product_id].total += 1;
      if (!row.order_id) counts[row.product_id].available += 1;
    });
    setCredCounts(counts);
  };

  const fetchData = async () => {
    setLoading(true);
    const [p, c] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("product_categories").select("*").order("name"),
    ]);
    const prods = (p.data as Product[]) ?? [];
    setProducts(prods);
    setCategories((c.data as Category[]) ?? []);
    setLoading(false);
    fetchCredCounts(prods.map((x) => x.id));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setEditing(null); setForm({ ...emptyProduct }); setDialogOpen(true); };
  const openEdit   = (p: Product) => {
    setEditing(p);
    setForm({ title: p.title, slug: p.slug, price: p.price, stock: p.stock, published: p.published, description: p.description ?? "", image_url: p.image_url ?? "", category_id: p.category_id ?? "", currency: p.currency });
    setDialogOpen(true);
  };
  const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    if (form.price == null || Number(form.price) < 0) return toast.error("Price must be ≥ 0");
    setSaving(true);
    const isValidUUID = (val: string | null | undefined) =>
      !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const now = new Date().toISOString();
    const payload = {
      title: form.title.trim(),
      slug: (form.slug || slugify(form.title)).trim(),
      price: Number(form.price),
      stock: Number(form.stock) || 0,
      published: Boolean(form.published),
      currency: form.currency || "NGN",
      category_id: isValidUUID(form.category_id) ? form.category_id : null,
      description: form.description?.trim() || null,
      image_url: form.image_url?.trim() || null,
      updated_at: now,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("products").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("products").insert({ ...payload, created_at: now }));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Product updated!" : "Product created!");
    setDialogOpen(false); fetchData();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("products").delete().eq("id", deleteId);
    setDeleting(false); setDeleteId(null);
    error ? toast.error(error.message) : toast.success("Product deleted");
    fetchData();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-semibold text-brand-navy">Products ({products.length})</h2>
        <Button onClick={openCreate} className="bg-brand-orange hover:bg-brand-orange-hover text-white text-sm">
          <Plus className="w-4 h-4 mr-1" />Add Product
        </Button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{["Title", "Category", "Price", "Stock", "Cred Stock", "Status", "Actions"].map((h) =>
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => {
                const cat = categories.find((c) => c.id === p.category_id);
                const cc  = credCounts[p.id];
                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-brand-navy">{p.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">{p.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{cat?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-brand-navy">₦{Number(p.price).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`text-sm font-medium ${p.stock === 0 ? "text-red-500" : "text-brand-navy"}`}>{p.stock}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => setCredProduct(p)} className="flex items-center gap-1 text-xs font-medium hover:opacity-80">
                        <Key className="w-3 h-3 text-brand-orange" />
                        <span className={cc?.available === 0 ? "text-red-500" : "text-green-600"}>{cc ? `${cc.available}/${cc.total}` : "0/0"}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={p.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>{p.published ? "Live" : "Draft"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-brand-orange" onClick={() => setCredProduct(p)}><Key className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-green-600"
                          onClick={async () => { await supabase.from("products").update({ published: !p.published, updated_at: new Date().toISOString() }).eq("id", p.id); fetchData(); }}>
                          {p.published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteId(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {products.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No products yet — add one!</div>}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Product" : "Add New Product"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: slugify(e.target.value) })} className="mt-1" placeholder="Aged Twitter Account" />
              </div>
              <div className="col-span-2">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1" placeholder="auto-generated" />
              </div>
              <div>
                <Label>Price (₦) *</Label>
                <Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <Label>Stock</Label>
                <Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) })} className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Category</Label>
                <Select value={form.category_id || undefined} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-brand-orange/30" placeholder="Optional description…" />
              </div>
              <div className="col-span-2">
                <Label>Product Image</Label>
                <ImageUploader value={form.image_url ?? null} onChange={(url) => setForm({ ...form, image_url: url ?? "" })} />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <input type="checkbox" id="published" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="w-4 h-4 accent-orange-500" />
                <Label htmlFor="published">Publish (visible to users)</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleSave} className="bg-brand-orange hover:bg-brand-orange-hover text-white">
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{editing ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Product?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action is permanent and cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button disabled={deleting} onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
              {deleting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {credProduct && (
        <CredentialsDialog product={credProduct} onClose={() => { setCredProduct(null); fetchCredCounts(products.map((x) => x.id)); }} />
      )}
    </div>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────
const ORDER_STATUS = ["pending", "completed", "failed", "refunded"];
const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-700", pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",        refunded: "bg-blue-100 text-blue-700",
};

function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    const { data: o } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100);
    setOrders((o as Order[]) ?? []);
    if (o?.length) {
      const ids = [...new Set(o.map((x: Order) => x.user_id))];
      const { data: p } = await supabase.from("profiles").select("id, email, display_name").in("id", ids);
      const map: Record<string, string> = {};
      (p ?? []).forEach((x: { id: string; email: string | null; display_name: string | null }) => { map[x.id] = x.email ?? x.display_name ?? x.id; });
      setProfiles(map);
    }
    setLoading(false);
  };
  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as "completed" | "failed" | "pending" | "refunded" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Order updated"); fetchOrders(); }
  };

  return (
    <div>
      <h2 className="font-semibold text-brand-navy mb-4">All Orders ({orders.length})</h2>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{["Order ID", "User", "Total", "Status", "Date", "Update"].map((h) =>
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{o.id.slice(-8).toUpperCase()}</td>
                  <td className="px-4 py-3 text-sm">{profiles[o.user_id] ?? o.user_id.slice(-8)}</td>
                  <td className="px-4 py-3 font-medium text-brand-navy">₦{Number(o.total).toLocaleString()}</td>
                  <td className="px-4 py-3"><Badge className={`text-xs ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-500"}`}>{o.status}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-NG")}</td>
                  <td className="px-4 py-3">
                    <Select defaultValue={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                      <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>{ORDER_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No orders yet</div>}
        </div>
      )}
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────
function PaymentsTab() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(150).then(async ({ data }) => {
      setTxs((data as Tx[]) ?? []);
      if (data?.length) {
        const ids = [...new Set(data.map((x: Tx) => x.user_id))];
        const { data: p } = await supabase.from("profiles").select("id, email, display_name").in("id", ids);
        const map: Record<string, string> = {};
        (p ?? []).forEach((x: { id: string; email: string | null; display_name: string | null }) => { map[x.id] = x.email ?? x.display_name ?? x.id.slice(-8); });
        setProfiles(map);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h2 className="font-semibold text-brand-navy mb-4">Wallet Transactions ({txs.length})</h2>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{["User", "Type", "Amount", "Provider", "Description", "Status", "Date"].map((h) =>
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {txs.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-sm">{profiles[t.user_id] ?? t.user_id.slice(-8)}</td>
                  <td className="px-4 py-3">
                    <Badge className={t.type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"}>{t.type}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-brand-navy">₦{Number(t.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs capitalize text-muted-foreground">{t.provider ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{t.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {t.status === "success" ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                      <span className="text-xs capitalize">{t.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("en-NG")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {txs.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No transactions yet</div>}
        </div>
      )}
    </div>
  );
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────────
const ACTION_COLORS: Record<string, string> = {
  admin_credit_wallet: "bg-green-100 text-green-700",
  admin_debit_wallet:  "bg-red-100 text-red-600",
  suspend_user:        "bg-orange-100 text-orange-700",
  unsuspend_user:      "bg-blue-100 text-blue-700",
};

function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200);
    const logs = (data ?? []) as AuditLog[];
    setLogs(logs);
    const actorIds = [...new Set(logs.map((l) => l.actor_id).filter(Boolean))] as string[];
    if (actorIds.length) {
      const { data: p } = await supabase.from("profiles").select("id, email, display_name").in("id", actorIds);
      const map: Record<string, string> = {};
      (p ?? []).forEach((x: { id: string; email: string | null; display_name: string | null }) => { map[x.id] = x.display_name ?? x.email ?? x.id.slice(-8); });
      setProfiles(map);
    }
    setLoading(false);
  };
  useEffect(() => { fetchLogs(); }, []);

  const filtered = logs.filter((l) =>
    l.action.includes(search.toLowerCase()) ||
    (l.target ?? "").includes(search.toLowerCase()) ||
    (profiles[l.actor_id ?? ""] ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-semibold text-brand-navy">Audit Log ({logs.length})</h2>
        <div className="flex items-center gap-2">
          <Input placeholder="Filter by action or user…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Button size="sm" variant="outline" onClick={fetchLogs}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{["Action", "Actor", "Target", "Details", "Date"].map((h) =>
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${ACTION_COLORS[l.action] ?? "bg-muted text-muted-foreground"}`}>
                      {l.action.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">{l.actor_id ? (profiles[l.actor_id] ?? l.actor_id.slice(-8)) : "system"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{l.target ? l.target.slice(-12) : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                    {l.metadata && Object.keys(l.metadata).length > 0
                      ? Object.entries(l.metadata).map(([k, v]) => `${k}: ${v}`).join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No audit entries yet</div>}
        </div>
      )}
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab({ stats }: { stats: Stats }) {
  return (
    <div className="max-w-2xl">
      <h2 className="font-semibold text-brand-navy mb-6">Platform Analytics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "Registered Users",  value: stats.users,                         desc: "Total accounts created",       color: "text-blue-500" },
          { label: "Total Revenue (₦)", value: `₦${stats.revenue.toLocaleString()}`, desc: "Sum of all credited wallets",  color: "text-green-500" },
          { label: "Orders Placed",     value: stats.orders,                         desc: "All time purchase orders",     color: "text-purple-500" },
          { label: "Live Products",     value: stats.products,                       desc: "Published & available",        color: "text-brand-orange" },
        ].map(({ label, value, desc, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className={`text-3xl font-bold ${color} mb-1`}>{value}</div>
              <div className="font-medium text-brand-navy text-sm">{label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab() {
  const [settings, setSettings] = useState<{ key: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("site_settings").select("*").order("key");
    setSettings((data ?? []).map((s: { key: string; value: unknown }) => ({ key: s.key, value: JSON.stringify(s.value) })));
    setLoading(false);
  };
  useEffect(() => { fetchSettings(); }, []);

  const saveSetting = async () => {
    if (!newKey.trim() || !newVal.trim()) return toast.error("Key and value are required");
    setSaving(true);
    let parsed: unknown;
    try { parsed = JSON.parse(newVal); } catch { parsed = newVal; }
    const { error } = await supabase.from("site_settings").upsert({ key: newKey.trim(), value: parsed as never, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Setting saved!"); setNewKey(""); setNewVal(""); fetchSettings();
  };

  const deleteSetting = async (key: string) => {
    const { error } = await supabase.from("site_settings").delete().eq("key", key);
    if (error) toast.error(error.message);
    else { toast.success("Setting deleted"); fetchSettings(); }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="font-semibold text-brand-navy mb-4">Site Settings</h2>
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base text-brand-navy">Add / Update Setting</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><Label>Key</Label><Input value={newKey} onChange={(e) => setNewKey(e.target.value)} className="mt-1" placeholder="e.g. maintenance_mode" /></div>
            <div><Label>Value (JSON or text)</Label><Input value={newVal} onChange={(e) => setNewVal(e.target.value)} className="mt-1" placeholder='e.g. true or "welcome"' /></div>
          </div>
          <Button onClick={saveSetting} disabled={saving} className="bg-brand-orange hover:bg-brand-orange-hover text-white text-sm">
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save Setting
          </Button>
        </CardContent>
      </Card>
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-brand-orange" /> : (
        <div className="space-y-2">
          {settings.length === 0 ? <p className="text-sm text-muted-foreground">No settings configured yet.</p> : settings.map((s) => (
            <Card key={s.key}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-sm font-medium text-brand-navy">{s.key}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate max-w-xs">{s.value}</div>
                </div>
                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 shrink-0" onClick={() => deleteSetting(s.key)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Credentials Dialog ───────────────────────────────────────────────────────
type Credential = { id: string; content: string; label: string | null; order_id: string | null; delivered_at: string | null; created_at: string };

function CredentialsDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const [creds, setCreds] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkText, setBulkText] = useState("");
  const [bulkLabel, setBulkLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<"available" | "delivered">("available");

  const fetchCreds = async () => {
    setLoading(true);
    const { data } = await supabase.from("product_credentials").select("id, content, label, order_id, delivered_at, created_at").eq("product_id", product.id).order("created_at");
    setCreds(((data ?? []) as unknown) as Credential[]);
    setLoading(false);
  };
  useEffect(() => { fetchCreds(); }, []);

  const available = creds.filter((c) => !c.order_id);
  const delivered = creds.filter((c) => c.order_id);

  const handleBulkAdd = async () => {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return toast.error("Enter at least one credential");
    setAdding(true);
    const rows = lines.map((content, i) => ({
      product_id: product.id, content,
      label: bulkLabel.trim() ? `${bulkLabel.trim()} #${i + 1}` : null,
    }));
    const { error } = await supabase.from("product_credentials").insert(rows);
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${lines.length} credential${lines.length > 1 ? "s" : ""} added`);
    setBulkText(""); fetchCreds();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("product_credentials").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); fetchCreds(); }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-4 h-4 text-brand-orange" />Credentials — {product.title}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Available", value: available.length, color: available.length === 0 ? "text-red-500" : "text-green-600" },
              { label: "Delivered", value: delivered.length, color: "text-blue-500" },
              { label: "Total",     value: creds.length,    color: "text-brand-navy" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-muted/50 rounded-xl p-3">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          <div className="border border-border rounded-xl p-4 space-y-3">
            <div className="font-medium text-sm text-brand-navy">Add Credentials</div>
            <div>
              <Label className="text-xs">Label (optional)</Label>
              <Input value={bulkLabel} onChange={(e) => setBulkLabel(e.target.value)} className="mt-1 text-sm" placeholder='e.g. "Facebook Aged Account"' />
            </div>
            <div>
              <Label className="text-xs">Credentials — one per line</Label>
              <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={5}
                className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
                placeholder={"username:password\nusername2:password2"} />
              <p className="text-xs text-muted-foreground mt-1">Each non-empty line becomes one credential slot.</p>
            </div>
            <Button onClick={handleBulkAdd} disabled={adding || !bulkText.trim()} className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white">
              {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add {bulkText.split("\n").filter((l) => l.trim()).length || 0} Credential(s)
            </Button>
          </div>

          <div>
            <div className="flex border-b border-border mb-3">
              {(["available", "delivered"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? "border-brand-orange text-brand-orange" : "border-transparent text-muted-foreground hover:text-brand-navy"}`}>
                  {t} ({t === "available" ? available.length : delivered.length})
                </button>
              ))}
            </div>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-brand-orange" /></div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(tab === "available" ? available : delivered).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {tab === "available" ? "No available credentials — add some above" : "No delivered credentials yet"}
                  </p>
                ) : (tab === "available" ? available : delivered).map((c) => (
                  <div key={c.id} className="flex items-start gap-2 rounded-lg border border-border p-3 bg-muted/20">
                    <div className="flex-1 min-w-0">
                      {c.label && <div className="text-xs font-medium text-brand-navy mb-1">{c.label}</div>}
                      <pre className="text-xs font-mono break-all whitespace-pre-wrap leading-relaxed text-muted-foreground line-clamp-3">{c.content}</pre>
                      {c.delivered_at && <div className="text-xs text-blue-500 mt-1">Delivered {new Date(c.delivered_at).toLocaleDateString("en-NG")}</div>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => handleCopy(c.content, c.id)}>
                        {copied === c.id ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                      {!c.order_id && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
