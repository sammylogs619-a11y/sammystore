import { useState, useEffect, useCallback } from 'react';
import { X, Copy, Check, AlertCircle, Loader2, Phone, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOtpPolling } from '@/hooks/useForeignNumbers';
import type { FnCountry, FnService, FnServiceAvailability } from '@/types/foreignNumbers';

interface Props {
  country: FnCountry;
  service: FnService;
  availability: FnServiceAvailability;
  onClose: () => void;
}

type Step = 'confirm' | 'purchasing' | 'waiting_otp' | 'otp_received' | 'error';

export function PurchaseModal({ country, service, availability, onClose }: Props) {
  const [step, setStep] = useState<Step>('confirm');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copied, setCopied] = useState<'phone' | 'otp' | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const isPolling = step === 'waiting_otp';
  const { status: otpStatus, otpCode } = useOtpPolling(orderId, isPolling);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff === 0 && step === 'waiting_otp') setStep('error');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, step]);

  useEffect(() => {
    if (otpStatus === 'otp_received' && otpCode) {
      setStep('otp_received');
    } else if (otpStatus === 'expired') {
      setErrorMsg('The number expired without receiving an OTP.');
      setStep('error');
    } else if (otpStatus === 'cancelled') {
      setErrorMsg('The number was cancelled.');
      setStep('error');
    }
  }, [otpStatus, otpCode]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handlePurchase = useCallback(async () => {
    setStep('purchasing');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please log in to continue');

      const res = await fetch('/api/foreign-numbers/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          country_code: country.code,
          service_slug: service.slug,
        }),
      });

      const data = await res.json() as {
        order_id?: string;
        phone_number?: string;
        expires_at?: string;
        error?: string;
      };

      if (!res.ok || data.error) throw new Error(data.error ?? 'Purchase failed');

      setOrderId(data.order_id!);
      setPhoneNumber(data.phone_number!);
      setExpiresAt(new Date(data.expires_at!));
      setStep('waiting_otp');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred');
      setStep('error');
    }
  }, [country.code, service.slug]);

  const handleCancel = useCallback(async () => {
    if (!orderId) { onClose(); return; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/foreign-numbers/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ order_id: orderId }),
      });
    } finally {
      onClose();
    }
  }, [orderId, onClose]);

  const copy = async (text: string, type: 'phone' | 'otp') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xl">{country.flag_emoji}</span>
            <div>
              <h3 className="font-semibold text-sm text-brand-navy">{service.name}</h3>
              <p className="text-xs text-muted-foreground">{country.name}</p>
            </div>
          </div>
          <button
            onClick={step === 'waiting_otp' ? handleCancel : onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {step === 'confirm' && (
            <>
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium text-brand-navy">{service.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Country</span>
                  <span className="font-medium text-brand-navy">{country.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stock available</span>
                  <span className="font-medium">{availability.total_stock.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. delivery</span>
                  <span className="font-medium">
                    {availability.estimated_wait_seconds != null
                      ? `~${Math.ceil(availability.estimated_wait_seconds / 60)} min`
                      : 'Varies'}
                  </span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-brand-orange text-lg">
                    ₦{availability.best_price_ngn.toLocaleString()}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Deducted from your wallet. Numbers valid for 20 minutes.
              </p>
              <button
                onClick={handlePurchase}
                className="w-full py-3 bg-brand-orange text-white rounded-xl font-semibold text-sm hover:bg-brand-orange-hover active:scale-[0.98] transition-all"
              >
                Confirm Purchase
              </button>
            </>
          )}

          {step === 'purchasing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-10 h-10 text-brand-orange animate-spin" />
              <div className="text-center">
                <p className="font-semibold text-brand-navy">Assigning your number…</p>
                <p className="text-sm text-muted-foreground mt-1">Finding the best available number</p>
              </div>
            </div>
          )}

          {step === 'waiting_otp' && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Your virtual number</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-brand-orange" />
                    <span className="font-mono font-bold text-lg tracking-wide text-brand-navy">{phoneNumber}</span>
                  </div>
                  <button onClick={() => copy(phoneNumber!, 'phone')} className="p-1.5 rounded-lg hover:bg-muted">
                    {copied === 'phone' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Time remaining</span>
                <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-brand-navy'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-brand-orange h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${(timeLeft / 1200) * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Waiting for OTP…
              </div>
              <p className="text-xs text-muted-foreground">
                Use the number above to verify your account. OTP appears here automatically.
              </p>
              <button
                onClick={handleCancel}
                className="w-full py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel & Refund
              </button>
            </div>
          )}

          {step === 'otp_received' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-4xl mb-2">✅</p>
                <p className="font-bold text-lg text-brand-navy">OTP Received!</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">Phone number</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-brand-navy">{phoneNumber}</span>
                  <button onClick={() => copy(phoneNumber!, 'phone')}>
                    {copied === 'phone' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="bg-orange-50 border border-brand-orange/20 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Your OTP code</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-3xl tracking-[0.2em] text-brand-orange">{otpCode}</span>
                  <button onClick={() => copy(otpCode!, 'otp')}>
                    {copied === 'otp' ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-brand-orange" />}
                  </button>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 bg-brand-orange text-white rounded-xl font-semibold text-sm hover:bg-brand-orange-hover transition-all"
              >
                Done
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-red-700">Something went wrong</p>
                  <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => { setStep('confirm'); setErrorMsg(''); }}
                  className="flex-1 py-2.5 bg-brand-orange text-white rounded-xl text-sm font-medium hover:bg-brand-orange-hover flex items-center justify-center gap-1.5 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
