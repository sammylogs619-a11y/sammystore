import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import multer from "multer";
import { pool } from "./db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IS_PROD = process.env.NODE_ENV === "production";

const app = express();
app.use(cors());
app.use(express.json());

// ─── File upload (multer) ──────────────────────────────────────────────────
const uploadsDir = path.resolve(__dirname, "../public/uploads");
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop()?.toLowerCase() ?? "jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// ─── Config ──────────────────────────────────────────────────────────
// Prefer VITE_SUPABASE_URL (the active project) over the legacy SUPABASE_URL
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const PAYSTACK_SECRET_KEY  = process.env.PAYSTACK_SECRET_KEY ?? "";
const NOWPAYMENTS_API_KEY  = process.env.NOWPAYMENTS_API_KEY ?? "";
const ADMIN_EMAIL          = process.env.ADMIN_EMAIL ?? "";
const ADMIN_API_TOKEN      = process.env.ADMIN_API_TOKEN ?? "";

// ─── Supabase admin client ─────────────────────────────────────────────────
let supabaseAdmin: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  try {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    console.log("[API] Supabase admin client initialized");
  } catch (e) {
    console.error("[API] Failed to initialize Supabase client:", e);
  }
} else {
  console.warn("[API] ⚠️  SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY not set — auth-dependent routes will return 503");
}

// ─── Admin auto-seeding ────────────────────────────────────────────────────
async function seedAdmin() {
  if (!supabaseAdmin || !ADMIN_EMAIL) return;
  try {
    // Find the user by email
    const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr || !users) return;
    const adminUser = users.users.find((u) => u.email === ADMIN_EMAIL);
    if (!adminUser) {
      console.log(`[API] Admin seed: user ${ADMIN_EMAIL} not found in auth — they must sign up first`);
      return;
    }
    // Check if role already exists
    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", adminUser.id)
      .eq("role", "admin")
      .limit(1);
    if (existing && existing.length > 0) {
      console.log(`[API] Admin seed: ${ADMIN_EMAIL} already has admin role ✓`);
      return;
    }
    // Insert admin role
    const { error: insertErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: adminUser.id, role: "admin" });
    if (insertErr) {
      console.error("[API] Admin seed: failed to insert role —", insertErr.message);
    } else {
      console.log(`[API] ✅ Admin role granted to ${ADMIN_EMAIL}`);
    }
  } catch (e) {
    console.error("[API] Admin seed error:", e);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────
function requireSupabase(res: express.Response): supabaseAdmin is SupabaseClient {
  if (!supabaseAdmin) {
    res.status(503).json({ error: "Service temporarily unavailable — Supabase not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Replit Secrets." });
    return false;
  }
  return true;
}

async function getAuthUser(req: express.Request) {
  if (!supabaseAdmin) return null;
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

function err(res: express.Response, status: number, msg: string) {
  return res.status(status).json({ error: msg });
}

// ─── Routes ──────────────────────────────────────────────────────────

// Image upload — no auth required (admin-only UI enforces access control)
app.post("/api/upload/image", upload.single("file"), (req, res) => {
  if (!req.file) return err(res, 400, "No file uploaded");
  const siteUrl =
    process.env.VITE_SITE_URL ??
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "");
  const url = siteUrl
    ? `${siteUrl}/uploads/${req.file.filename}`
    : `/uploads/${req.file.filename}`;
  return res.json({ url });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    supabase: !!supabaseAdmin,
    paystack: !!PAYSTACK_SECRET_KEY,
    nowpayments: !!NOWPAYMENTS_API_KEY,
    adminEmail: ADMIN_EMAIL || null,
  });
});

app.post("/api/payment/verify-paystack", async (req, res) => {
  if (!requireSupabase(res)) return;
  const user = await getAuthUser(req);
  if (!user) return err(res, 401, "Unauthorized");

  const { reference, userId } = req.body as { reference?: string; userId?: string };
  if (!reference || !userId) return err(res, 400, "reference and userId are required");
  if (userId !== user.id) return err(res, 403, "Forbidden");

  const { data: intent, error: intentErr } = await supabaseAdmin!
    .from("payment_intents")
    .select("*")
    .eq("reference", reference)
    .eq("user_id", userId)
    .eq("provider", "paystack")
    .single();

  if (intentErr || !intent) return err(res, 400, "Invalid or expired payment reference");
  if ((intent as Record<string, unknown>).status === "success") {
    return res.json({ success: true, amount: Number((intent as Record<string, unknown>).amount), alreadyCredited: true });
  }

  if (!PAYSTACK_SECRET_KEY) return err(res, 500, "Paystack is not configured — contact support");

  let paystackRes: Response;
  try {
    paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
  } catch {
    return err(res, 502, "Could not reach Paystack — please try again later");
  }

  if (!paystackRes.ok) return err(res, 502, "Could not verify with Paystack — please try again");

  const json = (await paystackRes.json()) as { status: boolean; data?: { status: string; amount: number } };
  if (!json.status || json.data?.status !== "success") {
    return err(res, 400, "Payment not confirmed — contact support if you were charged");
  }

  const amount = (json.data?.amount ?? 0) / 100;

  const { error: creditErr } = await supabaseAdmin!.rpc(
    "credit_wallet" as never,
    { _user_id: userId, _amount: amount, _provider: "paystack", _reference: reference, _description: "Wallet funded via Paystack" } as never
  );
  if (creditErr) return err(res, 500, (creditErr as { message: string }).message);

  await supabaseAdmin!
    .from("payment_intents")
    .update({ status: "success", updated_at: new Date().toISOString() })
    .eq("reference", reference);

  return res.json({ success: true, amount, alreadyCredited: false });
});

app.post("/api/payment/nowpayments-invoice", async (req, res) => {
  if (!requireSupabase(res)) return;
  const user = await getAuthUser(req);
  if (!user) return err(res, 401, "Unauthorized");

  const { amount, userId, reference } = req.body as { amount?: number; userId?: string; reference?: string };
  if (!amount || !userId || !reference) return err(res, 400, "amount, userId and reference are required");
  if (userId !== user.id) return err(res, 403, "Forbidden");

  const { data: intent, error: intentErr } = await supabaseAdmin!
    .from("payment_intents")
    .select("id")
    .eq("reference", reference)
    .eq("user_id", userId)
    .eq("provider", "nowpayments")
    .single();

  if (intentErr || !intent) return err(res, 400, "Invalid payment reference");
  if (!NOWPAYMENTS_API_KEY) return err(res, 500, "NOWPayments is not configured — contact support");

  const siteUrl =
    process.env.VITE_SITE_URL ??
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://mmystorelogs.com");

  let nowRes: Response;
  try {
    nowRes = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: { "x-api-key": NOWPAYMENTS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: "ngn",
        order_id: reference,
        order_description: "Sammy Store Logs — Wallet Funding",
        success_url: `${siteUrl}/wallet?funded=crypto`,
        cancel_url: `${siteUrl}/wallet`,
      }),
    });
  } catch {
    return err(res, 502, "Could not reach NOWPayments — please try again later");
  }

  if (!nowRes.ok) {
    const errText = await nowRes.text();
    return err(res, 502, `NOWPayments error: ${errText}`);
  }
  const invoice = (await nowRes.json()) as { invoice_url: string; id: string };
  return res.json({ invoiceUrl: invoice.invoice_url, invoiceId: invoice.id });
});

app.post("/api/payment/nowpayments-status", async (req, res) => {
  if (!requireSupabase(res)) return;
  const user = await getAuthUser(req);
  if (!user) return err(res, 401, "Unauthorized");

  const { reference, userId } = req.body as { reference?: string; userId?: string };
  if (!reference || !userId) return err(res, 400, "reference and userId are required");
  if (userId !== user.id) return err(res, 403, "Forbidden");

  const { data: intent } = await supabaseAdmin!
    .from("payment_intents")
    .select("*")
    .eq("reference", reference)
    .eq("user_id", userId)
    .single();

  if (!intent) return err(res, 404, "Payment intent not found");
  if ((intent as Record<string, unknown>).status === "success") return res.json({ status: "success", alreadyCredited: true });

  if (!NOWPAYMENTS_API_KEY) return err(res, 500, "NOWPayments not configured");

  let nowRes: Response;
  try {
    nowRes = await fetch(
      `https://api.nowpayments.io/v1/payment?order_id=${encodeURIComponent(reference)}&limit=1`,
      { headers: { "x-api-key": NOWPAYMENTS_API_KEY } }
    );
  } catch {
    return err(res, 502, "Failed to check payment status — please try again");
  }

  if (!nowRes.ok) return err(res, 502, "Failed to check payment status");

  const json = (await nowRes.json()) as { data?: { payment_status?: string }[] };
  const paymentStatus = json.data?.[0]?.payment_status ?? "waiting";

  if (paymentStatus === "finished" || paymentStatus === "confirmed") {
    const { error: creditErr } = await supabaseAdmin!.rpc(
      "credit_wallet" as never,
      { _user_id: userId, _amount: Number((intent as Record<string, unknown>).amount), _provider: "nowpayments", _reference: reference, _description: "Wallet funded via NOWPayments (crypto)" } as never
    );
    if (!creditErr) {
      await supabaseAdmin!
        .from("payment_intents")
        .update({ status: "success", updated_at: new Date().toISOString() })
        .eq("reference", reference);
      return res.json({ status: "success", alreadyCredited: false });
    }
  }
  return res.json({ status: paymentStatus, alreadyCredited: false });
});

app.post("/api/payment/admin-credit", async (req, res) => {
  if (!requireSupabase(res)) return;
  const user = await getAuthUser(req);
  if (!user) return err(res, 401, "Unauthorized");

  const { data: roles } = await supabaseAdmin!
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .limit(1);
  if (!roles?.length) return err(res, 403, "Forbidden: admin access required");

  const { targetUserId, amount, description } = req.body as { targetUserId?: string; amount?: number; description?: string };
  if (!targetUserId || !amount || !description) return err(res, 400, "targetUserId, amount and description are required");

  const ref = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  const { error: creditErr } = await supabaseAdmin!.rpc(
    "credit_wallet" as never,
    { _user_id: targetUserId, _amount: amount, _provider: "manual", _reference: ref, _description: description } as never
  );
  if (creditErr) return err(res, 500, (creditErr as { message: string }).message);

  await supabaseAdmin!.from("activity_logs").insert({
    actor_id: user.id,
    action: "admin_credit_wallet",
    target: targetUserId,
    metadata: { amount, description, ref },
  });

  return res.json({ success: true });
});

// New endpoint: Verify manual deposit (admin token or admin role)
app.post("/api/admin/manual-deposits/verify", async (req, res) => {
  // Two auth options: Admin role (via supabase token) OR admin API token header
  const adminHeader = req.header("X-Admin-Token");
  let isAdmin = false;
  let adminId: string | null = null;

  if (adminHeader && ADMIN_API_TOKEN && adminHeader === ADMIN_API_TOKEN) {
    isAdmin = true;
    adminId = "api-token"; // generic identifier if called with token
  } else {
    // Check supabase auth token and role
    if (!requireSupabase(res)) return;
    const user = await getAuthUser(req);
    if (!user) return err(res, 401, "Unauthorized");
    const { data: roles } = await supabaseAdmin!.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").limit(1);
    if (roles && roles.length > 0) {
      isAdmin = true;
      adminId = user.id;
    }
  }

  if (!isAdmin) return err(res, 403, "Forbidden: admin access required");

  const { reference } = req.body as { reference?: string };
  if (!reference) return err(res, 400, "reference is required");

  if (!pool) return err(res, 500, "Database not configured");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock the payment_intent row
    const intentRes = await client.query(
      `SELECT reference, user_id, amount, provider, status
       FROM payment_intents
       WHERE reference = $1
       FOR UPDATE`,
      [reference]
    );

    if (intentRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return err(res, 404, "payment_intent not found");
    }

    const intent = intentRes.rows[0] as { reference: string; user_id: string; amount: number; provider: string; status: string };

    if (intent.provider !== "manual") {
      await client.query("ROLLBACK");
      return err(res, 400, "intent is not a manual deposit");
    }

    if (intent.status === "completed" || intent.status === "success") {
      await client.query("ROLLBACK");
      return err(res, 409, "payment_intent already completed");
    }

    if (!["pending", "submitted"].includes(intent.status)) {
      await client.query("ROLLBACK");
      return err(res, 400, `cannot verify intent in status: ${intent.status}`);
    }

    // Lock or create wallet row and update balance
    const walletRes = await client.query(
      `SELECT user_id, balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
      [intent.user_id]
    );

    let newBalance: number;
    if (walletRes.rowCount === 0) {
      await client.query(
        `INSERT INTO wallets (user_id, balance) VALUES ($1, $2)`,
        [intent.user_id, intent.amount]
      );
      newBalance = Number(intent.amount);
    } else {
      const current = Number(walletRes.rows[0].balance ?? 0);
      newBalance = current + Number(intent.amount);
      await client.query(
        `UPDATE wallets SET balance = $1 WHERE user_id = $2`,
        [newBalance, intent.user_id]
      );
    }

    // Insert a wallet_transactions/audit row
    await client.query(
      `INSERT INTO wallet_transactions (user_id, amount, type, reference, created_at)
       VALUES ($1, $2, $3, $4, now())`,
      [intent.user_id, intent.amount, "manual_topup", intent.reference]
    );

    // Update payment_intents status -> completed and set audit fields
    await client.query(
      `UPDATE payment_intents
       SET status = 'completed', verified_by = $2, verified_at = now()
       WHERE reference = $1`,
      [intent.reference, adminId]
    );

    // Add activity log entry for manual deposit verification
    await client.query(
      `INSERT INTO activity_logs (actor_id, action, target, metadata, created_at)
       VALUES ($1, $2, $3, $4, now())`,
      [adminId, 'verify_manual_deposit', intent.user_id, JSON.stringify({ reference: intent.reference, amount: intent.amount })]
    );

    await client.query("COMMIT");

    return res.json({ status: "ok", reference: intent.reference, user_id: intent.user_id, amount: intent.amount, newBalance });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("verifyManualDeposit error:", e);
    return err(res, 500, "Internal server error");
  } finally {
    client.release();
  }
});

// ─── Static file serving ──────────────────────────────────────────────────
app.use("/uploads", express.static(uploadsDir));

if (IS_PROD) {
  const distPath = path.resolve(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
  console.log(`[API] Serving static files from ${distPath}`);
}

// ─── Start ──────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? process.env.API_PORT ?? (IS_PROD ? "5000" : "3001"), 10);
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`[API] Server running on port ${PORT} (${IS_PROD ? "production" : "development"})`);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) console.warn("[API] ⚠️  Supabase not configured — add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Replit Secrets");
  if (!PAYSTACK_SECRET_KEY)  console.warn("[API] ⚠️  PAYSTACK_SECRET_KEY not set");
  if (!NOWPAYMENTS_API_KEY)  console.warn("[API] ⚠️  NOWPAYMENTS_API_KEY not set");
  if (ADMIN_EMAIL) {
    await seedAdmin();
  } else {
    console.log("[API] ℹ️  ADMIN_EMAIL not set — skipping admin seed. Add it to Replit Secrets to auto-grant admin.");
  }
});
