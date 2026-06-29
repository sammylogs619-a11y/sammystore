import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

export type WalletRow = { id: string; balance: number; currency: string; updated_at: string };

async function getFreshToken(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

const RETRY_DELAY_MS = 2000;
const MAX_ATTEMPTS = 3;

/**
 * Ensures the user has a wallet row.
 * Strategy (each attempt):
 *   1. SELECT existing wallet (idempotency — never duplicate-create)
 *   2. POST /api/wallet/ensure  (CF Pages Function, uses service role)
 *   3. ensure_user_wallet() RPC (SECURITY DEFINER fallback)
 *   4. Direct INSERT via anon client (wallets_self_insert policy)
 *
 * Returns { wallet, error } after up to MAX_ATTEMPTS tries.
 *
 * Extracted from routes/wallet.tsx so pages/FundWallet.tsx (the permanent
 * sidebar nav target) can share the exact same logic rather than duplicate it.
 */
export async function ensureWalletWithRetry(
  userId: string,
): Promise<{ wallet: WalletRow | null; error: string | null }> {
  let lastError = "Wallet unavailable — please retry";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`[Wallet] ensureWallet attempt ${attempt}/${MAX_ATTEMPTS} for user ${userId}`);

    // ── Step 1: idempotency — check if wallet already exists ─────────────
    try {
      const { data: existing, error: selErr } = await supabase
        .from("wallets")
        .select("id,balance,currency,updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (selErr) {
        console.warn(`[Wallet] attempt ${attempt} SELECT error:`, selErr.message, `(code ${selErr.code})`);
        lastError = `DB error: ${selErr.message} (${selErr.code})`;
      } else if (existing) {
        console.log(`[Wallet] attempt ${attempt} wallet found via SELECT`);
        return { wallet: existing as WalletRow, error: null };
      }
    } catch (e) {
      console.warn(`[Wallet] attempt ${attempt} SELECT threw:`, e);
    }

    // ── Step 2: server-side CF Pages Function ────────────────────────────
    const token = await getFreshToken();
    if (token) {
      try {
        const res = await fetch("/api/wallet/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userId }),
          signal: AbortSignal.timeout(10_000),
        });

        if (res.ok) {
          const data = await res.json() as { wallet: WalletRow };
          console.log(`[Wallet] attempt ${attempt} wallet ensured via /api/wallet/ensure`);
          return { wallet: data.wallet, error: null };
        }

        const errData = await res.json().catch(() => ({})) as { error?: string };
        const reason = errData.error ?? `HTTP ${res.status}`;
        console.warn(`[Wallet] attempt ${attempt} /api/wallet/ensure failed: ${reason}`);
        lastError = `Server error: ${reason}`;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[Wallet] attempt ${attempt} /api/wallet/ensure threw: ${msg}`);
        lastError = `Network error: ${msg}`;
      }
    } else {
      console.warn(`[Wallet] attempt ${attempt} no auth token — skipping server call`);
      lastError = "Not authenticated — please sign in again";
    }

    // ── Step 3: SECURITY DEFINER RPC ─────────────────────────────────────
    try {
      const { data: rpcRows, error: rpcErr } = await supabase.rpc("ensure_user_wallet" as never);
      if (rpcErr) {
        console.warn(`[Wallet] attempt ${attempt} ensure_user_wallet RPC error:`, rpcErr.message, `(${rpcErr.code})`);
        lastError = `RPC error: ${rpcErr.message} (${rpcErr.code})`;
      } else {
        const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
        if (row) {
          console.log(`[Wallet] attempt ${attempt} wallet ensured via RPC`);
          return { wallet: row as WalletRow, error: null };
        }
      }
    } catch (e) {
      console.warn(`[Wallet] attempt ${attempt} RPC threw:`, e);
    }

    // ── Step 4: direct INSERT (wallets_self_insert policy) ───────────────
    try {
      const { data: created, error: insErr } = await supabase
        .from("wallets")
        .insert({ user_id: userId, balance: 0, currency: "NGN" })
        .select("id,balance,currency,updated_at")
        .maybeSingle();

      if (insErr) {
        console.warn(`[Wallet] attempt ${attempt} INSERT error:`, insErr.message, `(${insErr.code})`);
        lastError = `Insert error: ${insErr.message} (${insErr.code})`;
      } else if (created) {
        console.log(`[Wallet] attempt ${attempt} wallet created via direct INSERT`);
        return { wallet: created as WalletRow, error: null };
      }
    } catch (e) {
      console.warn(`[Wallet] attempt ${attempt} INSERT threw:`, e);
    }

    // Pause before next attempt
    if (attempt < MAX_ATTEMPTS) {
      console.log(`[Wallet] retrying in ${RETRY_DELAY_MS}ms…`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }

  console.error(`[Wallet] all ${MAX_ATTEMPTS} attempts failed. Last error: ${lastError}`);
  return { wallet: null, error: lastError };
}
