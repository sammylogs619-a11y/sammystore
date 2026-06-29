import { useEffect, useState } from 'react';
import { Copy, Check, CreditCard, Bitcoin, Banknote, Loader2, Upload, X, FileImage } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { ensureWalletWithRetry } from '@/lib/walletEnsure';
import { verifyPaystackPayment, createNowPaymentsInvoice, checkNowPaymentsStatus } from '@/lib/api/payment';

declare global { interface Window { PaystackPop: { setup(o: Record<string, unknown>): { openIframe(): void } } } }

const BANK_DETAILS = {
  bank: 'UBA',
  accountName: 'Akintan Ayomide Olamilekan',
  accountNumber: '2136011152',
};

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];
const RECEIPT_BUCKET = 'payment-receipts';

function genRef() {
  return `ss-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

function DarkReceiptUploader({ userId, value, onChange }: { userId: string; value: string | null; onChange: (path: string | null) => void }) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return toast.error('Only image files are allowed');
    if (file.size > 5 * 1024 * 1024) return toast.error('Receipt image must be 5MB or smaller');

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from(RECEIPT_BUCKET).upload(path, file, { upsert: false });
      if (error) { toast.error(error.message ?? 'Upload failed'); return; }

      const { data: signed } = await supabase.storage.from(RECEIPT_BUCKET).createSignedUrl(path, 3600);
      setPreviewUrl(signed?.signedUrl ?? null);
      onChange(path);
      toast.success('Receipt uploaded');
    } catch {
      toast.error('Upload failed — please try again');
    } finally {
      setUploading(false);
    }
  };

  if (value) {
    return (
      <div className="relative inline-block">
        {previewUrl ? (
          <img src={previewUrl} alt="Receipt" className="w-full max-w-[200px] h-32 object-cover rounded-xl border border-[#252836]" />
        ) : (
          <div className="w-full max-w-[200px] h-32 rounded-xl border border-[#252836] bg-[#0f1117] flex items-center justify-center gap-2 text-gray-500 text-sm">
            <FileImage className="w-4 h-4" /> Receipt attached
          </div>
        )}
        <button onClick={() => { setPreviewUrl(null); onChange(null); }} className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-500/90 text-white flex items-center justify-center">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-[#252836] rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500/50 transition">
      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
      {uploading ? (
        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
      ) : (
        <>
          <Upload className="w-5 h-5 text-indigo-400" />
          <span className="text-sm text-gray-300">Upload receipt screenshot</span>
          <span className="text-xs text-gray-500">PNG, JPG, WEBP · up to 5MB</span>
        </>
      )}
    </label>
  );
}

export default function FundWallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [psAmount, setPsAmount] = useState('');
  const [psLoading, setPsLoading] = useState(false);

  const [cryptoAmount, setCryptoAmount] = useState('');
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const [cryptoPending, setCryptoPending] = useState<{ reference: string } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const [btAmount, setBtAmount] = useState('');
  const [btReference, setBtReference] = useState('');
  const [btSenderName, setBtSenderName] = useState('');
  const [btReceiptPath, setBtReceiptPath] = useState<string | null>(null);
  const [btLoading, setBtLoading] = useState(false);
  const [btSubmitted, setBtSubmitted] = useState(false);

  const [copied, setCopied] = useState(false);

  const fetchBalance = () => {
    if (!user) return;
    supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { setBalance(data?.balance ?? 0); setLoading(false); });
  };

  useEffect(() => { fetchBalance(); }, [user]);

  const copyAccount = async () => {
    await navigator.clipboard.writeText(BANK_DETAILS.accountNumber);
    setCopied(true);
    toast.success('Account number copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaystack = async () => {
    const amt = parseFloat(psAmount || '0');
    if (amt < 100) return toast.error('Minimum amount is ₦100');
    if (!user) return;
    if (!isSupabaseConfigured()) return toast.error('Supabase not configured — contact admin');

    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined;
    if (!publicKey) return toast.error('Paystack is not configured — contact admin');
    if (!window.PaystackPop) return toast.error('Paystack is still loading — please wait a moment and try again');

    setPsLoading(true);
    const { wallet, error: walletErr } = await ensureWalletWithRetry(user.id);
    if (!wallet) { setPsLoading(false); return toast.error(`Could not create wallet: ${walletErr}`); }

    const ref = genRef();
    const { error: intentErr } = await supabase.from('payment_intents').insert({
      user_id: user.id, provider: 'paystack', reference: ref, amount: amt, currency: 'NGN', status: 'pending',
    });
    setPsLoading(false);
    if (intentErr) return toast.error(`Failed to initialize payment: ${intentErr.message}`);

    const handler = window.PaystackPop.setup({
      key: publicKey,
      email: user.email,
      amount: Math.round(amt * 100),
      ref,
      currency: 'NGN',
      metadata: { userId: user.id },
      onSuccess: async (tx: { reference: string }) => {
        const tid = toast.loading('Verifying payment…');
        try {
          const result = await verifyPaystackPayment({ reference: tx.reference, userId: user.id });
          toast.dismiss(tid);
          if (result.alreadyCredited) toast.info('Payment already credited');
          else toast.success(`₦${result.amount?.toLocaleString()} added to your wallet!`);
          fetchBalance();
          setPsAmount('');
        } catch (err: unknown) {
          toast.dismiss(tid);
          toast.error(err instanceof Error ? err.message : 'Verification failed — contact support');
        }
      },
      onCancel: () => toast.info('Payment cancelled'),
    });
    handler.openIframe();
  };

  const handleCrypto = async () => {
    const amt = parseFloat(cryptoAmount || '0');
    if (amt < 100) return toast.error('Minimum amount is ₦100');
    if (!user) return;
    if (!isSupabaseConfigured()) return toast.error('Supabase not configured — contact admin');

    setCryptoLoading(true);
    const { wallet, error: walletErr } = await ensureWalletWithRetry(user.id);
    if (!wallet) { setCryptoLoading(false); return toast.error(`Could not create wallet: ${walletErr}`); }

    const ref = genRef();
    try {
      const { error: intentErr } = await supabase.from('payment_intents').insert({
        user_id: user.id, provider: 'nowpayments', reference: ref, amount: amt, currency: 'NGN', status: 'pending',
      });
      if (intentErr) { setCryptoLoading(false); return toast.error(`Failed to initialize payment: ${intentErr.message}`); }

      const result = await createNowPaymentsInvoice({ amount: amt, userId: user.id, reference: ref });
      setCryptoLoading(false);
      if (result.invoiceUrl) {
        setCryptoPending({ reference: ref });
        window.open(result.invoiceUrl, '_blank');
        toast.info('Complete your payment in the new tab — your wallet will update automatically when confirmed.');
      }
    } catch (err: unknown) {
      setCryptoLoading(false);
      toast.error(err instanceof Error ? err.message : 'Failed to create invoice');
    }
  };

  const handleCheckCryptoStatus = async () => {
    if (!cryptoPending || !user) return;
    setCheckingStatus(true);
    try {
      const result = await checkNowPaymentsStatus({ reference: cryptoPending.reference, userId: user.id });
      setCheckingStatus(false);
      if (result.status === 'success') {
        toast.success(result.alreadyCredited ? 'Already credited!' : 'Wallet credited successfully!');
        fetchBalance();
        setCryptoPending(null);
        setCryptoAmount('');
      } else {
        toast.info(`Payment status: ${result.status} — waiting for blockchain confirmation.`);
      }
    } catch (err: unknown) {
      setCheckingStatus(false);
      toast.error(err instanceof Error ? err.message : 'Failed to check status');
    }
  };

  const handleBankSubmit = async () => {
    if (!user) return;
    if (!btAmount || !btReference || !btSenderName) return toast.error('Please fill all fields');
    if (!btReceiptPath) return toast.error('Please upload your payment receipt');
    const numAmount = parseFloat(btAmount);
    if (isNaN(numAmount) || numAmount < 100) return toast.error('Minimum top-up is ₦100');

    setBtLoading(true);
    const { error } = await supabase.from('bank_transfer_requests').insert({
      user_id: user.id,
      amount: numAmount,
      reference: btReference.trim(),
      sender_name: btSenderName.trim(),
      receipt_url: btReceiptPath,
      status: 'pending',
    });
    setBtLoading(false);

    if (error) {
      if (error.message?.toLowerCase().includes('duplicate')) toast.error('This reference has already been submitted');
      else toast.error(error.message ?? 'Submission failed');
      return;
    }
    setBtSubmitted(true);
    toast.success('Submitted! Your wallet will be credited once an admin verifies the transfer.');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-poppins text-2xl font-bold text-white">Fund Wallet</h2>
        <p className="text-gray-500 text-sm mt-1">Top up via Paystack, crypto, or bank transfer</p>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <p className="text-white/70 text-sm">Current Balance</p>
        {loading
          ? <div className="h-10 w-40 bg-white/20 animate-pulse rounded-lg mt-2" />
          : <p className="text-4xl font-bold mt-1">₦{(balance ?? 0).toLocaleString()}</p>
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-[#13151c] rounded-2xl border border-[#252836] p-6 space-y-4">
          <h3 className="font-semibold text-white text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" /> Paystack
          </h3>
          <p className="text-gray-400 text-sm">Pay via card, bank transfer, or USSD — instant credit.</p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map(a => (
              <button key={a} onClick={() => setPsAmount(String(a))}
                className={`py-2 rounded-xl text-xs font-medium transition border ${psAmount === String(a) ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'border-[#252836] text-gray-400 hover:border-indigo-500/50'}`}>
                ₦{a.toLocaleString()}
              </button>
            ))}
          </div>
          <input type="number" min="100" placeholder="Enter amount" value={psAmount} onChange={(e) => setPsAmount(e.target.value)}
            className="w-full bg-[#0f1117] border border-[#252836] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
          <button onClick={handlePaystack} disabled={psLoading || parseFloat(psAmount || '0') < 100}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2">
            {psLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Pay with Paystack
          </button>
        </div>

        <div className="bg-[#13151c] rounded-2xl border border-[#252836] p-6 space-y-4">
          <h3 className="font-semibold text-white text-lg flex items-center gap-2">
            <Bitcoin className="w-5 h-5 text-indigo-400" /> Crypto
          </h3>
          <p className="text-gray-400 text-sm">Bitcoin, USDT, ETH and 50+ coins via NOWPayments.</p>
          {cryptoPending ? (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 space-y-3">
              <p className="text-sm text-indigo-300">Waiting for blockchain confirmation…</p>
              <button onClick={handleCheckCryptoStatus} disabled={checkingStatus}
                className="w-full bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2">
                {checkingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Check payment status
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_AMOUNTS.map(a => (
                  <button key={a} onClick={() => setCryptoAmount(String(a))}
                    className={`py-2 rounded-xl text-xs font-medium transition border ${cryptoAmount === String(a) ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'border-[#252836] text-gray-400 hover:border-indigo-500/50'}`}>
                    ₦{a.toLocaleString()}
                  </button>
                ))}
              </div>
              <input type="number" min="100" placeholder="Enter amount" value={cryptoAmount} onChange={(e) => setCryptoAmount(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#252836] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
              <button onClick={handleCrypto} disabled={cryptoLoading || parseFloat(cryptoAmount || '0') < 100}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2">
                {cryptoLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Pay with Crypto
              </button>
            </>
          )}
        </div>

        <div className="bg-[#13151c] rounded-2xl border border-[#252836] p-6 space-y-4">
          <h3 className="font-semibold text-white text-lg flex items-center gap-2">
            <Banknote className="w-5 h-5 text-indigo-400" /> Bank Transfer
          </h3>
          {btSubmitted ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center space-y-1.5">
              <p className="text-green-400 font-semibold text-sm">Submitted for review</p>
              <p className="text-gray-400 text-xs">Your wallet will be credited once an admin verifies the transfer.</p>
              <button onClick={() => { setBtSubmitted(false); setBtAmount(''); setBtReference(''); setBtSenderName(''); setBtReceiptPath(null); }}
                className="text-xs text-indigo-400 underline mt-1">Submit another</button>
            </div>
          ) : (
            <>
              <p className="text-gray-400 text-xs">Transfer to the account below, then submit your receipt.</p>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Bank', value: BANK_DETAILS.bank },
                  { label: 'Account Name', value: BANK_DETAILS.accountName },
                ].map(item => (
                  <div key={item.label} className="flex justify-between py-1.5 border-b border-[#1e2030]">
                    <span className="text-gray-500 text-xs">{item.label}</span>
                    <span className="text-white font-medium text-xs">{item.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-1.5 border-b border-[#1e2030]">
                  <span className="text-gray-500 text-xs">Account Number</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm tracking-wider">{BANK_DETAILS.accountNumber}</span>
                    <button onClick={copyAccount} className="p-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 transition">
                      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  </div>
                </div>
              </div>
              <input type="number" min="100" placeholder="Amount transferred (₦)" value={btAmount} onChange={(e) => setBtAmount(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#252836] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
              <input type="text" placeholder="Sender's name" value={btSenderName} onChange={(e) => setBtSenderName(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#252836] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
              <input type="text" placeholder="Transaction reference / narration" value={btReference} onChange={(e) => setBtReference(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#252836] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
              {user && <DarkReceiptUploader userId={user.id} value={btReceiptPath} onChange={setBtReceiptPath} />}
              <button onClick={handleBankSubmit} disabled={btLoading}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2">
                {btLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit for Verification
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
        <p className="text-yellow-400 text-sm">
          ⚠️ Paystack and crypto top-ups credit your wallet automatically. Bank transfers are reviewed by an admin and credited within a few minutes of approval.
        </p>
      </div>
    </div>
  );
}
