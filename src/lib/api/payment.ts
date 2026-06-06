import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

async function getToken(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function callApi<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const token = await getToken();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((data as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export async function verifyPaystackPayment(data: { reference: string; userId: string }) {
  return callApi<{ success: boolean; amount: number; alreadyCredited: boolean }>(
    "/api/payment/verify-paystack",
    data
  );
}

export async function createNowPaymentsInvoice(data: { amount: number; userId: string; reference: string }) {
  return callApi<{ invoiceUrl: string; invoiceId: string }>(
    "/api/payment/nowpayments-invoice",
    data
  );
}

export async function checkNowPaymentsStatus(data: { reference: string; userId: string }) {
  return callApi<{ status: string; alreadyCredited: boolean }>(
    "/api/payment/nowpayments-status",
    data
  );
}

export async function adminCreditWalletFn(data: { targetUserId: string; amount: number; description: string }) {
  return callApi<{ success: boolean }>(
    "/api/payment/admin-credit",
    data
  );
}

export async function adminDebitWalletFn(data: { targetUserId: string; amount: number; description: string }) {
  return callApi<{ success: boolean; newBalance: number }>(
    "/api/payment/admin-debit",
    data
  );
}
