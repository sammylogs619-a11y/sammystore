import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Transfer = {
  id: string;
  user_id: string;
  amount: number;
  reference: string;
  sender_name: string;
  status: string;
  created_at: string;
  receipt_url: string | null;
  profiles?: { email: string };
};

export default function AdminBankTransfers() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [receiptLinks, setReceiptLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchTransfers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bank_transfer_requests")
      .select("*, profiles(email)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) {
      setTransfers((data as unknown as Transfer[]) ?? []);

      // Generate signed URLs for any attached receipts (bucket is private).
      const withReceipts = (data as unknown as Transfer[]).filter(t => t.receipt_url);
      const links: Record<string, string> = {};
      await Promise.all(
        withReceipts.map(async (t) => {
          const { data: signed } = await supabase.storage
            .from("payment-receipts")
            .createSignedUrl(t.receipt_url as string, 60 * 30);
          if (signed?.signedUrl) links[t.id] = signed.signedUrl;
        })
      );
      setReceiptLinks(links);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTransfers(); }, []);

  const handle = async (id: string, action: "approve" | "reject") => {
    setProcessing(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/bank-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, requestId: id }),
      });

      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed"); return; }

      toast.success(action === "approve" ? "✅ Wallet credited!" : "❌ Request rejected");
      fetchTransfers();
    } catch (e) {
      toast.error("Something went wrong");
    } finally {
      setProcessing(null);
    }
  };

  const statusColor = (s: string) =>
    s === "approved" ? "text-green-600 bg-green-50" :
    s === "rejected" ? "text-red-600 bg-red-50" :
    "text-yellow-700 bg-yellow-50";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">Bank Transfer Requests</h2>
        <button onClick={fetchTransfers} className="text-xs text-orange-500 underline">Refresh</button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : transfers.length === 0 ? (
        <p className="text-sm text-gray-400">No requests yet.</p>
      ) : (
        <div className="space-y-3">
          {transfers.map(t => (
            <div key={t.id} className="border border-gray-100 rounded-xl p-4 space-y-2 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">{t.profiles?.email || t.user_id}</p>
                  <p className="text-xs text-gray-500">Sender: {t.sender_name}</p>
                  <p className="text-xs text-gray-400">Ref: {t.reference}</p>
                  <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleString("en-NG")}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-base">₦{Number(t.amount).toLocaleString()}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>
                    {t.status}
                  </span>
                </div>
              </div>

              {t.receipt_url && (
                receiptLinks[t.id] ? (
                  <a href={receiptLinks[t.id]} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={receiptLinks[t.id]}
                      alt="Payment receipt"
                      className="w-28 h-28 object-cover rounded-lg border border-gray-200 hover:border-orange-400 transition-colors"
                    />
                  </a>
                ) : (
                  <p className="text-xs text-gray-400">Loading receipt…</p>
                )
              )}

              {t.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handle(t.id, "approve")}
                    disabled={processing === t.id}
                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold py-1.5 rounded-lg transition-colors"
                  >
                    {processing === t.id ? "..." : "✅ Approve & Credit"}
                  </button>
                  <button
                    onClick={() => handle(t.id, "reject")}
                    disabled={processing === t.id}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold py-1.5 rounded-lg transition-colors"
                  >
                    ❌ Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
