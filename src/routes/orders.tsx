import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Loader2, ShoppingBag, Copy, CheckCheck, ChevronDown, ChevronUp,
  Package, CheckCircle, Clock, XCircle, RefreshCw, Key, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { assignCredentialToOrder } from "@/lib/api/delivery";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Credential = {
  id: string;
  content: string;
  label: string | null;
  delivered_at: string | null;
};

type OrderItem = {
  id: string;
  title: string;
  unit_price: number;
  quantity: number;
  product_id: string | null;
  delivered_payload: string | null;
  credential: Credential | null;
};

type Order = {
  id: string;
  total: number;
  currency: string;
  status: string;
  created_at: string;
  items: OrderItem[];
};

const CRED_FIELDS = ["Username", "Password", "Email", "Email Password", "2FA Code"];
function parseCredential(content: string) {
  const parts = content.split(/\||\//).map((part) => part.trim());
  return CRED_FIELDS.map((label, i) => ({ label, value: parts[i] ?? "" })).filter((f) => f.value);
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  completed:          { label: "Completed",            color: "bg-green-100 text-green-700",  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  pending:            { label: "Pending",              color: "bg-yellow-100 text-yellow-700", icon: <Clock className="w-3.5 h-3.5" /> },
  pending_credentials: { label: "Pending credentials", color: "bg-orange-100 text-orange-700", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  failed:             { label: "Failed",               color: "bg-red-100 text-red-600",      icon: <XCircle className="w-3.5 h-3.5" /> },
  refunded:           { label: "Refunded",             color: "bg-blue-100 text-blue-700",    icon: <RefreshCw className="w-3.5 h-3.5" /> },
};

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/orders");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    setDataLoading(true);

    const { data: rawOrders } = await supabase
      .from("orders")
      .select("id, total, currency, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!rawOrders?.length) { setDataLoading(false); return; }

    const orderIds = rawOrders.map((o: { id: string }) => o.id);

    const { data: rawItems } = await supabase
      .from("order_items")
      .select("id, order_id, title, unit_price, quantity, product_id, delivered_payload")
      .in("order_id", orderIds);

    const credIds = ((rawItems ?? []) as Array<{ delivered_payload: string | null }>)
      .map((i) => i.delivered_payload)
      .filter((p): p is string => !!p);

    let credMap: Record<string, Credential> = {};
    if (credIds.length) {
      const { data: creds } = await supabase
        .from("product_credentials")
        .select("id, content, label, delivered_at")
        .in("id", credIds);
      credMap = Object.fromEntries(
        ((creds ?? []) as Credential[]).map((c) => [c.id, c])
      );
    }

    const itemsByOrder: Record<string, OrderItem[]> = {};
    ((rawItems ?? []) as Array<{
      id: string; order_id: string; title: string; unit_price: number;
      quantity: number; product_id: string | null; delivered_payload: string | null;
    }>).forEach((item) => {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push({
        id: item.id,
        title: item.title,
        unit_price: item.unit_price,
        quantity: item.quantity,
        product_id: item.product_id,
        delivered_payload: item.delivered_payload,
        credential: item.delivered_payload ? (credMap[item.delivered_payload] ?? null) : null,
      });
    });

    const enriched: Order[] = (rawOrders as Array<{
      id: string; total: number; currency: string; status: string; created_at: string;
    }>).map((o) => ({ ...o, items: itemsByOrder[o.id] ?? [] }));

    const pendingAssignments = enriched.flatMap((order) =>
      order.items
        .filter((item) => (order.status === "completed" || order.status === "pending_credentials") && !item.credential && item.product_id)
        .map((item) => ({ orderId: order.id, productId: item.product_id }))
    );

    if (pendingAssignments.length > 0) {
      const assignmentResults = await Promise.allSettled(
        pendingAssignments.map(async (item) => {
          const delivery = await assignCredentialToOrder({ orderId: item.orderId, productId: item.productId });
          return delivery.assigned ? item.orderId : null;
        })
      );

      if (assignmentResults.some((result) => result.status === "fulfilled" && result.value)) {
        return fetchOrders();
      }
    }

    setOrders(enriched);
    if (enriched.length > 0) setExpanded(new Set([enriched[0].id]));
    setDataLoading(false);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(null), 2500);
    });
  };

  if (loading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-brand-orange" />My Orders
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              All your purchases with delivered credentials
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={fetchOrders}>
              <RefreshCw className="w-4 h-4 mr-1" />Refresh
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard">← Dashboard</Link>
            </Button>
          </div>
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-brand-orange/10 flex items-center justify-center">
                <Package className="w-8 h-8 text-brand-orange" />
              </div>
              <div>
                <p className="font-semibold text-brand-navy text-lg">No orders yet</p>
                <p className="text-muted-foreground text-sm mt-1">Purchase a product and your credentials will appear here.</p>
              </div>
              <Button asChild className="bg-brand-orange hover:bg-brand-orange-hover text-white">
                <Link to="/products">Browse Products</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const meta = STATUS_META[order.status] ?? STATUS_META.pending;
              const isOpen = expanded.has(order.id);
              const hasCredentials = order.items.some((i) => i.credential);

              return (
                <Card key={order.id} className="overflow-hidden border border-border">
                  {/* Order header — always visible */}
                  <button
                    onClick={() => toggleExpand(order.id)}
                    className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-brand-orange/10 flex items-center justify-center shrink-0 mt-0.5">
                        <ShoppingBag className="w-4 h-4 text-brand-orange" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">
                            #{order.id.slice(-10).toUpperCase()}
                          </span>
                          <Badge className={`text-xs flex items-center gap-1 ${meta.color}`}>
                            {meta.icon}{meta.label}
                          </Badge>
                          {hasCredentials && (
                            <Badge className="text-xs bg-purple-100 text-purple-700 flex items-center gap-1">
                              <Key className="w-3 h-3" />Credentials Ready
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="font-bold text-brand-navy text-sm">
                            ₦{Number(order.total).toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString("en-NG", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>

                  {/* Expanded items */}
                  {isOpen && (
                    <div className="border-t border-border divide-y divide-border">
                      {order.items.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                          No items found for this order.
                        </div>
                      ) : (
                        order.items.map((item) => (
                          <div key={item.id} className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <p className="font-semibold text-brand-navy text-sm">{item.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  ₦{Number(item.unit_price).toLocaleString()} × {item.quantity}
                                  {" "}= <span className="font-medium text-brand-navy">
                                    ₦{(Number(item.unit_price) * item.quantity).toLocaleString()}
                                  </span>
                                </p>
                              </div>
                            </div>

                            {/* Credential box */}
                            {item.credential ? (
                              <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Key className="w-4 h-4 text-purple-600" />
                                  <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                                    Your Account Credentials
                                  </span>
                                  {item.credential.label && (
                                    <Badge className="text-xs bg-purple-100 text-purple-600 ml-auto">
                                      {item.credential.label}
                                    </Badge>
                                  )}
                                </div>

                                <div className="bg-white rounded-lg border border-purple-200 p-3 mb-3 space-y-2">
                                  {parseCredential(item.credential.content).map(({ label, value }) => (
                                    <div key={label} className="flex items-start gap-2 text-sm">
                                      <span className="text-xs font-semibold text-purple-600 w-28 shrink-0 pt-0.5">{label}</span>
                                      <span className="font-mono text-brand-navy break-all">{value}</span>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    onClick={() => copyText(item.credential!.content, item.id)}
                                    className={`text-xs h-8 gap-1.5 transition-all ${
                                      copied === item.id
                                        ? "bg-green-600 hover:bg-green-600 text-white"
                                        : "bg-purple-600 hover:bg-purple-700 text-white"
                                    }`}
                                  >
                                    {copied === item.id
                                      ? <><CheckCheck className="w-3.5 h-3.5" />Copied!</>
                                      : <><Copy className="w-3.5 h-3.5" />Copy All</>}
                                  </Button>
                                  {item.credential.delivered_at && (
                                    <span className="text-xs text-muted-foreground">
                                      Delivered {new Date(item.credential.delivered_at).toLocaleDateString("en-NG")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : order.status === "pending_credentials" ? (
                              <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
                                <p className="text-xs text-orange-700">
                                  This order is awaiting credential fulfillment. It will appear here once a credential is available.
                                </p>
                              </div>
                            ) : order.status === "completed" ? (
                              <div className="rounded-xl border border-yellow-200 bg-yellow-50/60 p-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-yellow-600 shrink-0" />
                                <p className="text-xs text-yellow-700">
                                  Credentials are being assigned — refresh in a moment or{" "}
                                  <a href="https://wa.me/" className="underline font-medium">contact support</a>.
                                </p>
                              </div>
                            ) : order.status === "pending" ? (
                              <div className="rounded-xl border border-muted bg-muted/30 p-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                                <p className="text-xs text-muted-foreground">
                                  Awaiting payment confirmation — credentials will appear once payment is verified.
                                </p>
                              </div>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          Missing a credential?{" "}
          <Link to="/contact" className="text-brand-orange hover:underline font-medium">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
