import BankTransferTopup from "@/components/BankTransferTopup";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Wallet, ArrowDownCircle, ArrowUpCircle, Bitcoin, CreditCard, CheckCircle2, RefreshCw, AlertCircle, Banknote } from "lucide-react";
import { toast } from "sonner";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyPaystackPayment, createNowPaymentsInvoice, checkNowPaymentsStatus } from "@/lib/api/payment";
import { ensureWalletWithRetry, type WalletRow } from "@/lib/walletEnsure";

type Tx = { id: string; type: "credit" | "debit"; amount: number; balance_after: number; status: string; provider: string | null; description: string | null; created_at: string };

declare global { interface Window { PaystackPop: { setup(o: Record<string, unknown>): { openIframe(): void } } } }

export default function WalletPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);
  const psLoaded = useRef(false);

  useEffect(() => { if (!loading && !user) navigate("/auth?redirect=/wallet"); }, [user, loading, navigate]);

  useEffect(() => {
    if (psLoaded.current) return;
    const existing = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
    if (!existing) {
      const s = document.createElement("script");
      s.src = "https://js.paystack.co/v1/inline.js";
      s.async = true;
      document.body.appendChild(s);
    }
    psLoaded.current = true;
  }, []);

  const fetchData = async () => {
    if (!user) return;
    setDataLoading(true);
    setWalletError(null);

    const [{ wallet: walletRow, error: walletErr }, txResult] = await Promise.all([
      ensureWalletWithRetry(user.id),
      (async (): Promise<Tx[]> => {
        if (!isSupabaseConfigured()) return [];
        try {
          const { data, error } = await supabase
            .from("wallet_transactions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50);
          if (error) console.warn("[Wallet] tx fetch error:", error.message);
          return (data as Tx[]) ?? [];
        } catch { return []; }
      })(),
    ]);

    setWallet(walletRow);
    setTransactions(txResult);

    if (!walletRow) {
      setWalletError(walletErr ?? "Unable to load wallet — please try again");
    }

    setDataLoading(false);
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  // Handle Paystack callback redirect: /wallet?ref=REF&userId=UID
  useEffect(() => {
    const ref    = searchParams.get("ref");
    const userId = searchParams.get("userId");
    if (!ref || !userId || !user) return;
    const tid = toast.loading("Verifying your payment…");
    verifyPaystackPayment({ reference: ref, userId })
      .then((result) => {
        toast.dismiss(tid);
        if (result.alreadyCredited) toast.info("Payment already credited to your wallet.");
        else toast.success(`₦${result.amount?.toLocaleString("en-NG")} added to your wallet!`);
        fetchData();
      })
      .catch((err) => {
        toast.dismiss(tid);
        toast.error(err instanceof Error ? err.message : "Verification failed — contact support");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const funded = searchParams.get("funded");
    if (funded === "1")      toast.success("Payment submitted! Your wallet will be credited shortly.");
    else if (funded === "crypto") toast.info("Crypto payment received — your wallet will update automatically.");
  }, [searchParams]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    let ch: ReturnType<typeof supabase.channel> | null = null;
    try {
      ch = supabase.channel("wallet-rt")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, () => fetchData())
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "wallet_transactions", filter: `user_id=eq.${user.id}` }, () => fetchData())
        .subscribe();
    } catch { /* realtime optional */ }
    return () => { if (ch) supabase.removeChannel(ch).catch(() => {}); };
  }, [user]);

  if (loading || !user) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div>;

  return (
    <div className="min-h-[calc(100vh-200px)] bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-navy">My Wallet</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your balance and fund your account</p>
        </div>

        {!isSupabaseConfigured() && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Configuration Required</p>
                <p className="text-xs text-yellow-700 mt-0.5">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable wallet features.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {walletError && !dataLoading && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800">Wallet could not be loaded</p>
                <p className="text-xs text-red-600 mt-0.5 font-mono break-all">{walletError}</p>
                <p className="text-xs text-red-500 mt-1">Open browser DevTools → Console to see full diagnostics.</p>
              </div>
              <Button size="sm" variant="outline" onClick={fetchData} className="shrink-0 text-xs border-red-300 text-red-700 hover:bg-red-100">
                <RefreshCw className="w-3 h-3 mr-1" />Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {dataLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
            <p className="text-xs text-muted-foreground">Setting up your wallet…</p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-brand-navy to-brand-navy/90 text-white rounded-2xl p-6 mb-6 relative overflow-hidden">
              <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #f97316 0%, transparent 60%)" }} />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-5 h-5 text-brand-orange" />
                  <span className="text-white/70 text-sm">Available Balance</span>
                  <button onClick={fetchData} className="ml-auto text-white/50 hover:text-white transition-colors" title="Refresh balance"><RefreshCw className="w-4 h-4" /></button>
                </div>
                <div className="text-3xl sm:text-4xl font-bold mb-1">
                  ₦{(wallet?.balance ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-white/40 text-xs">{wallet?.currency ?? "NGN"} · Updated {wallet?.updated_at ? new Date(wallet.updated_at).toLocaleTimeString() : "—"}</div>
              </div>
            </div>

            <FundWallet user={user} wallet={wallet} onFunded={fetchData} bankSlot={<BankTransferTopup userId={user.id} />} />

            <div className="mt-10">
              <h2 className="text-lg font-semibold text-brand-navy mb-4">Transaction History</h2>
              <TransactionList transactions={transactions} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const PRESETS = [1000, 2000, 5000, 10000, 20000, 50000];

function FundWallet({ user, wallet, onFunded, bankSlot }: { user: import("@supabase/supabase-js").User; wallet: WalletRow | null; onFunded: () => void; bankSlot: ReactNode }) {
  const [amount, setAmount] = useState("");
  const [psLoading, setPsLoading] = useState(false);
  const [nowLoading, setNowLoading] = useState(false);
  const [cryptoPending, setCryptoPending] = useState<{ reference: string } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const genRef = () => `ss-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  const amt = parseFloat(amount || "0");

  const ensureWalletBeforePayment = async (): Promise<boolean> => {
    if (wallet) return true;
    const { wallet: w, error } = await ensureWalletWithRetry(user.id);
    if (!w) { toast.error(`Could not create wallet: ${error}`); return false; }
    return true;
  };

  const handlePaystack = async () => {
    if (amt < 100) return toast.error("Minimum amount is ₦100");
    if (!isSupabaseConfigured()) return toast.error("Supabase not configured — add credentials to Replit Secrets");

    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined;
    if (!publicKey) return toast.error("Paystack is not configured — contact admin");
    if (!window.PaystackPop) return toast.error("Paystack is still loading — please wait a moment and try again");

    setPsLoading(true);
    const ready = await ensureWalletBeforePayment();
    if (!ready) { setPsLoading(false); return; }

    const ref = genRef();
    try {
      const { error: intentErr } = await supabase.from("payment_intents").insert({
        user_id: user.id, provider: "paystack", reference: ref, amount: amt, currency: "NGN", status: "pending",
      });
      setPsLoading(false);
      if (intentErr) return toast.error(`Failed to initialize payment: ${intentErr.message}`);
    } catch (e) {
      setPsLoading(false);
      return toast.error("Failed to initialize payment — check your connection");
    }

    const handler = window.PaystackPop.setup({
      key: publicKey,
      email: user.email,
      amount: Math.round(amt * 100),
      ref,
      currency: "NGN",
      metadata: { userId: user.id },
      onSuccess: async (tx: { reference: string }) => {
        const tid = toast.loading("Verifying payment…");
        try {
          const result = await verifyPaystackPayment({ reference: tx.reference, userId: user.id });
          toast.dismiss(tid);
          if (result.alreadyCredited) toast.info("Payment already credited");
          else toast.success(`₦${result.amount?.toLocaleString()} added to your wallet!`);
          onFunded();
          setAmount("");
        } catch (err: unknown) {
          toast.dismiss(tid);
          toast.error(err instanceof Error ? err.message : "Verification failed — contact support");
        }
      },
      onCancel: () => toast.info("Payment cancelled"),
    });

    handler.openIframe();
  };

  const handleNowPayments = async () => {
    if (amt < 100) return toast.error("Minimum amount is ₦100");
    if (!isSupabaseConfigured()) return toast.error("Supabase not configured — add credentials to Replit Secrets");

    setNowLoading(true);
    const ready = await ensureWalletBeforePayment();
    if (!ready) { setNowLoading(false); return; }

    const ref = genRef();
    try {
      const { error: intentErr } = await supabase.from("payment_intents").insert({
        user_id: user.id, provider: "nowpayments", reference: ref, amount: amt, currency: "NGN", status: "pending",
      });
      if (intentErr) { setNowLoading(false); return toast.error(`Failed to initialize payment: ${intentErr.message}`); }

      const result = await createNowPaymentsInvoice({ amount: amt, userId: user.id, reference: ref });
      setNowLoading(false);
      if (result.invoiceUrl) {
        setCryptoPending({ reference: ref });
        window.open(result.invoiceUrl, "_blank");
        toast.info("Complete your payment in the new tab — your wallet will update automatically when confirmed.");
      }
    } catch (err: unknown) {
      setNowLoading(false);
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
    }
  };

  const handleCheckStatus = async () => {
    if (!cryptoPending) return;
    setCheckingStatus(true);
    try {
      const result = await checkNowPaymentsStatus({ reference: cryptoPending.reference, userId: user.id });
      setCheckingStatus(false);
      if (result.status === "success") {
        toast.success(result.alreadyCredited ? "Already credited!" : "Wallet credited successfully!");
        onFunded();
        setCryptoPending(null);
        setAmount("");
      } else {
        toast.info(`Payment status: ${result.status} — waiting for blockchain confirmation.`);
      }
    } catch (err: unknown) {
      setCheckingStatus(false);
      toast.error(err instanceof Error ? err.message : "Failed to check status");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-brand-navy flex items-center gap-2 text-base">
            <CreditCard className="w-5 h-5 text-brand-orange" />Pay with Paystack
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Pay via card, bank transfer, or USSD — instant credit.</p>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Quick amounts</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button key={p} onClick={() => setAmount(String(p))}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${amount === String(p) ? "bg-brand-orange text-white border-brand-orange" : "border-border hover:border-brand-orange hover:text-brand-orange"}`}>
                  ₦{p.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="ps-amount">Amount (₦)</Label>
            <Input id="ps-amount" type="number" min="100" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
          </div>
          <Button onClick={handlePaystack} disabled={psLoading || amt < 100} className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white">
            {psLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Pay ₦{amt > 0 ? amt.toLocaleString() : "—"} with Paystack
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-brand-navy flex items-center gap-2 text-base">
            <Bitcoin className="w-5 h-5 text-brand-orange" />Pay with Crypto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Fund via Bitcoin, USDT, ETH and 50+ cryptocurrencies via NOWPayments.</p>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Quick amounts</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button key={p} onClick={() => setAmount(String(p))}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${amount === String(p) ? "bg-brand-orange text-white border-brand-orange" : "border-border hover:border-brand-orange hover:text-brand-orange"}`}>
                  ₦{p.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="np-amount">Amount (₦ equivalent)</Label>
            <Input id="np-amount" type="number" min="100" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
          </div>
          {cryptoPending ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-sky-700 bg-sky-50 p-3 rounded-lg">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                Invoice created — your wallet will update automatically once the network confirms. You can also check manually below.
              </div>
              <Button onClick={handleCheckStatus} disabled={checkingStatus} variant="outline" className="w-full border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white">
                {checkingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Check Payment Status
              </Button>
              <button onClick={() => setCryptoPending(null)} className="text-xs text-muted-foreground hover:text-brand-navy transition-colors w-full text-center">Start over</button>
            </div>
          ) : (
            <Button onClick={handleNowPayments} disabled={nowLoading || amt < 100} variant="outline" className="w-full border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white">
              {nowLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Pay with Crypto (NOWPayments)
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-brand-navy flex items-center gap-2 text-base">
            <Banknote className="w-5 h-5 text-brand-orange" />Bank Transfer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bankSlot}
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionList({ transactions }: { transactions: Tx[] }) {
  if (transactions.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3 mt-4" />
          <p className="text-muted-foreground text-sm">No transactions yet. Fund your wallet to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <Card key={tx.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tx.type === "credit" ? "bg-green-50" : "bg-red-50"}`}>
                  {tx.type === "credit"
                    ? <ArrowDownCircle className="w-5 h-5 text-green-600" />
                    : <ArrowUpCircle className="w-5 h-5 text-red-500" />}
                </div>
                <div>
                  <div className="text-sm font-medium text-brand-navy">{tx.description ?? (tx.type === "credit" ? "Wallet Credit" : "Purchase")}</div>
                  <div className="text-xs text-muted-foreground">
                    {tx.provider && <span className="capitalize mr-1.5">{tx.provider}</span>}·
                    {" "}{new Date(tx.created_at).toLocaleString("en-NG", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`font-semibold text-sm ${tx.type === "credit" ? "text-green-600" : "text-red-500"}`}>
                  {tx.type === "credit" ? "+" : "-"}₦{Number(tx.amount).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Bal: ₦{Number(tx.balance_after).toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
