import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ReceiptUploader } from "@/components/ReceiptUploader";

const BANK_DETAILS = {
  bankName: "UBA",
  accountNumber: "2136011152",
  accountName: "Akintan Ayomide Olamilekan",
};

export default function BankTransferTopup({ userId }: { userId: string }) {
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [senderName, setSenderName] = useState("");
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !reference || !senderName) {
      toast.error("Please fill all fields");
      return;
    }
    if (!receiptPath) {
      toast.error("Please upload your payment receipt");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      toast.error("Minimum top-up is ₦100");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("bank_transfer_requests").insert({
        user_id: userId,
        amount: numAmount,
        reference: reference.trim(),
        sender_name: senderName.trim(),
        receipt_url: receiptPath ?? null,
        status: "pending",
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("This reference has already been submitted");
        } else {
          toast.error("Failed to submit: " + error.message);
        }
        return;
      }

      setSubmitted(true);
      toast.success("Payment submitted! Your wallet will be credited after verification.");
    } catch (e) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center space-y-2">
        <div className="text-2xl">✅</div>
        <p className="font-semibold text-green-800">Submitted Successfully</p>
        <p className="text-sm text-green-700">
          Your payment is under review. Your wallet will be credited once verified (usually within a few minutes).
        </p>
        <button
          onClick={() => { setSubmitted(false); setAmount(""); setReference(""); setSenderName(""); setReceiptPath(null); }}
          className="mt-2 text-xs text-green-600 underline"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bank Details Card */}
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-3">
        <p className="text-sm font-semibold text-orange-800 uppercase tracking-wide">Transfer to this account</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Bank</span>
            <span className="font-semibold text-gray-800">{BANK_DETAILS.bankName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Account Number</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-widest text-gray-900">{BANK_DETAILS.accountNumber}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(BANK_DETAILS.accountNumber); toast.success("Copied!"); }}
                className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full"
              >
                Copy
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Account Name</span>
            <span className="font-semibold text-gray-800">{BANK_DETAILS.accountName}</span>
          </div>
        </div>
        <p className="text-xs text-orange-700 bg-orange-100 rounded-lg p-2">
          ⚠️ After transferring, fill the form below with your payment details so we can verify and credit your wallet.
        </p>
      </div>

      {/* Submission Form */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Amount Transferred (₦)</label>
          <input
            type="number"
            placeholder="e.g. 5000"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Your Name (as it appears on transfer)</label>
          <input
            type="text"
            placeholder="e.g. John Doe"
            value={senderName}
            onChange={e => setSenderName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Transfer Reference / Session ID</label>
          <input
            type="text"
            placeholder="From your bank app receipt"
            value={reference}
            onChange={e => setReference(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Payment Receipt Screenshot</label>
          <ReceiptUploader userId={userId} value={receiptPath} onChange={setReceiptPath} />
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          {loading ? "Submitting..." : "Submit Payment for Verification"}
        </button>
      </div>
    </div>
  );
}
