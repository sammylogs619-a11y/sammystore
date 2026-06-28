export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const { createClient } = await import("@supabase/supabase-js");

    // Verify user token
    const supabaseUser = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const body = await request.json();
    const { action } = body;

    // Admin approves/rejects a request
    if (action === "approve" || action === "reject") {
      // Verify caller is admin
      const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
      const { data: isAdmin } = await supabaseAdmin
        .rpc("has_role", { _user_id: user.id, _role: "admin" });

      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
      }

      const { requestId, adminNote } = body;

      // Get the transfer request
      const { data: transfer, error: fetchErr } = await supabaseAdmin
        .from("bank_transfer_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchErr || !transfer) return new Response(JSON.stringify({ error: "Request not found" }), { status: 404 });
      if (transfer.status !== "pending") return new Response(JSON.stringify({ error: "Already processed" }), { status: 400 });

      if (action === "approve") {
        // Credit wallet - check for duplicate first
        const { data: existingTx } = await supabaseAdmin
          .from("wallet_transactions")
          .select("id")
          .eq("reference", `bank_${transfer.reference}`)
          .single();

        if (!existingTx) {
          // Get current wallet balance
          const { data: wallet } = await supabaseAdmin
            .from("wallets")
            .select("balance")
            .eq("user_id", transfer.user_id)
            .single();

          const newBalance = (wallet?.balance || 0) + transfer.amount;

          // Update wallet balance
          await supabaseAdmin
            .from("wallets")
            .update({ balance: newBalance })
            .eq("user_id", transfer.user_id);

          // Log transaction
          await supabaseAdmin
            .from("wallet_transactions")
            .insert({
              user_id: transfer.user_id,
              amount: transfer.amount,
              type: "credit",
              reference: `bank_${transfer.reference}`,
              description: "Bank Transfer Top-up",
              provider: "bank_transfer",
              balance_after: newBalance,
            });
        }
      }

      // Update request status
      await supabaseAdmin
        .from("bank_transfer_requests")
        .update({ status: action === "approve" ? "approved" : "rejected", admin_note: adminNote || null })
        .eq("id", requestId);

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 });
  } catch (err) {
    console.error("bank-transfer error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
