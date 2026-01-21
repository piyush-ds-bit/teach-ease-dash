import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LinkLegacyRequest {
  borrowerId: string;
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function pickLoanIdForDate(loans: any[], entryDate: string) {
  const sorted = [...loans].sort((a, b) => {
    const d = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    if (d !== 0) return d;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const t = new Date(entryDate).getTime();
  for (let i = sorted.length - 1; i >= 0; i--) {
    const loanStart = new Date(sorted[i].start_date).getTime();
    if (loanStart <= t) return sorted[i].id;
  }

  return sorted[0].id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userResp, error: userError } = await supabaseAdmin.auth.getUser(token);
    const userId = userResp?.user?.id;
    if (userError || !userId) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Partial<LinkLegacyRequest>;
    const borrowerId = String(body.borrowerId ?? "");
    if (!borrowerId || !isValidUuid(borrowerId)) {
      return new Response(JSON.stringify({ error: "Invalid borrowerId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure caller is teacher/admin
    const { data: roleRows, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (roleErr) throw roleErr;
    const roles = (roleRows ?? []).map((r: any) => r.role);
    const allowed = roles.includes("teacher") || roles.includes("admin") || roles.includes("super_admin");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch loans for borrower
    const { data: loans, error: loansErr } = await supabaseAdmin
      .from("loans")
      .select("id,start_date,created_at")
      .eq("borrower_id", borrowerId);
    if (loansErr) throw loansErr;
    if (!loans || loans.length === 0) {
      return new Response(JSON.stringify({ error: "No loans exist for this borrower" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch legacy entries (loan_id is null)
    const { data: legacy, error: legacyErr } = await supabaseAdmin
      .from("lending_ledger")
      .select("id,entry_date")
      .eq("borrower_id", borrowerId)
      .is("loan_id", null);
    if (legacyErr) throw legacyErr;

    const legacyRows = legacy ?? [];
    if (legacyRows.length === 0) {
      return new Response(JSON.stringify({ success: true, linked: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch update (best-effort per row)
    const updates = legacyRows.map((row: any) => {
      const targetLoanId = pickLoanIdForDate(loans, row.entry_date);
      return supabaseAdmin
        .from("lending_ledger")
        .update({ loan_id: targetLoanId, teacher_id: userId })
        .eq("id", row.id);
    });

    const results = await Promise.all(updates);
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) throw firstError;

    return new Response(JSON.stringify({ success: true, linked: legacyRows.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("lending-link-legacy error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
