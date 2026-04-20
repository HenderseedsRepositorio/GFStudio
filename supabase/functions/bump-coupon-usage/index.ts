// @ts-ignore - Deno import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Bump de uses_count de un cupón tras reserva.
// Bajo RLS (20260420_rls_lockdown.sql) anon no puede UPDATE gf_coupons,
// así que el landing delega acá con service_role.
//
// Contrato:
//   POST { code: string }
//   → { ok:true, uses_count:N } o { ok:false, error:<motivo> }
//
// Validaciones antes de bumpear:
// - active = true (o NULL)
// - valid_from <= hoy (si está seteado)
// - valid_to >= hoy (si está seteado)
// - max_uses > uses_count (si está seteado)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  // @ts-ignore - Deno global
  const SB_URL = Deno.env.get("SUPABASE_URL");
  // @ts-ignore - Deno global
  const SB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SB_URL || !SB_SERVICE_KEY) {
    return json({ ok: false, error: "misconfigured" }, 500);
  }

  let body: any;
  try { body = await req.json(); } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) return json({ ok: false, error: "missing_code" }, 400);

  const headers = {
    "apikey": SB_SERVICE_KEY,
    "Authorization": `Bearer ${SB_SERVICE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };

  // 1) Fetch cupón
  const selRes = await fetch(
    `${SB_URL}/rest/v1/gf_coupons?code=eq.${encodeURIComponent(code)}&select=id,code,active,uses_count,max_uses,valid_from,valid_to&limit=1`,
    { headers }
  );
  if (!selRes.ok) {
    const txt = await selRes.text();
    console.error("coupon fetch failed", selRes.status, txt);
    return json({ ok: false, error: "db_fetch_failed", status: selRes.status, detail: txt }, 502);
  }
  const rows = await selRes.json();
  const c = Array.isArray(rows) ? rows[0] : null;
  if (!c) return json({ ok: false, error: "not_found" }, 404);

  // 2) Validación
  if (c.active === false) return json({ ok: false, error: "inactive" }, 409);
  const today = new Date().toISOString().slice(0, 10);
  if (c.valid_from && c.valid_from > today) return json({ ok: false, error: "not_yet_valid" }, 409);
  if (c.valid_to && c.valid_to < today) return json({ ok: false, error: "expired" }, 409);
  const used = Number(c.uses_count || 0);
  if (c.max_uses && used >= Number(c.max_uses)) return json({ ok: false, error: "exhausted" }, 409);

  // 3) Bump
  const updRes = await fetch(
    `${SB_URL}/rest/v1/gf_coupons?id=eq.${encodeURIComponent(c.id)}&select=uses_count`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ uses_count: used + 1 }),
    }
  );
  if (!updRes.ok) {
    const txt = await updRes.text();
    console.error("coupon update failed", updRes.status, txt);
    return json({ ok: false, error: "db_update_failed" }, 502);
  }
  const updated = await updRes.json();
  const newCount = Array.isArray(updated) ? Number(updated[0]?.uses_count || used + 1) : used + 1;
  return json({ ok: true, uses_count: newCount });
});
