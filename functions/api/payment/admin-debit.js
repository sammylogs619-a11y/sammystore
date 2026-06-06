// Cloudflare Pages Function — POST /api/payment/admin-debit

export async function onRequestPost({ request, env }) {
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || "";
  const serviceKey  = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceKey) return json({ error: "Server not configured" }, 503);

  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const user = await getUser(supabaseUrl, serviceKey, auth.slice(7));
  if (!user) return json({ error: "Unauthorized" }, 401);

  const rolesRes = await sbFetch(supabaseUrl, serviceKey,
    `/rest/v1/user_roles?user_id=eq.${user.id}&role=eq.admin&limit=1`);
  const roles = await rolesRes.json();
  if (!roles.length) return json({ error: "Forbidden: admin access required" }, 403);

  const { targetUserId, amount, description } = await request.json();
  if (!targetUserId || !amount || amount <= 0 || !description)
    return json({ error: "targetUserId, amount and description required" }, 400);

  // Fetch wallet
  const wRes = await sbFetch(supabaseUrl, serviceKey,
    `/rest/v1/wallets?user_id=eq.${targetUserId}&limit=1`);
  const wallets = await wRes.json();
  if (!wallets.length) return json({ error: "Wallet not found for this user" }, 404);

  const wallet = wallets[0];
  if (Number(wallet.balance) < Number(amount))
    return json({ error: `Insufficient balance. Current: ₦${wallet.balance}` }, 400);

  const newBalance = Number(wallet.balance) - Number(amount);
  const ref = `admin-debit-${Date.now()}-${Math.random().toString(36).substring(2,9)}`;

  // Update wallet balance
  const updateRes = await sbFetch(supabaseUrl, serviceKey,
    `/rest/v1/wallets?id=eq.${wallet.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ balance: newBalance, updated_at: new Date().toISOString() }),
    });
  if (!updateRes.ok) {
    const msg = await updateRes.text();
    return json({ error: "Failed to update wallet: " + msg }, 500);
  }

  // Insert transaction record
  await sbFetch(supabaseUrl, serviceKey, "/rest/v1/wallet_transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      wallet_id: wallet.id, user_id: targetUserId,
      type: "debit", amount: Number(amount),
      balance_after: newBalance, status: "success",
      provider: "manual", reference: ref,
      description: description,
    }),
  });

  // Audit log
  await sbFetch(supabaseUrl, serviceKey, "/rest/v1/activity_logs", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      actor_id: user.id, action: "admin_debit_wallet",
      target: targetUserId, metadata: { amount, description, ref, new_balance: newBalance },
    }),
  });

  return json({ success: true, newBalance });
}

async function getUser(supabaseUrl, serviceKey, token) {
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
  });
  return res.ok ? res.json() : null;
}

function sbFetch(supabaseUrl, serviceKey, path, extra = {}) {
  const { headers: h = {}, ...rest } = extra;
  return fetch(`${supabaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, ...h },
    ...rest,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
