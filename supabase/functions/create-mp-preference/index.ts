// @ts-ignore - Deno import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

interface PrefBody {
  appointment_id?: string;
  service_name?: string;
  amount?: number;
  client_name?: string;
  client_email?: string;
  back_url?: string;
}

function validate(b: any): PrefBody | null {
  if (!b || typeof b !== "object") return null;
  if (typeof b.appointment_id !== "string" || !b.appointment_id) return null;
  if (typeof b.service_name !== "string" || !b.service_name) return null;
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return {
    appointment_id: b.appointment_id,
    service_name: b.service_name,
    amount,
    client_name: typeof b.client_name === "string" ? b.client_name : "",
    client_email: typeof b.client_email === "string" ? b.client_email : "",
    back_url: typeof b.back_url === "string" ? b.back_url : "",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  // @ts-ignore - Deno global
  const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
  // @ts-ignore - Deno global
  const publicSiteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://gf-studio.vercel.app";

  // Fallback explícito cuando MercadoPago aún no está configurado.
  // El frontend interpreta { configured:false } y oculta el flujo de seña.
  if (!mpToken) {
    return json({ ok: true, configured: false, reason: "mp_not_configured" });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const data = validate(body);
  if (!data) return json({ ok: false, error: "missing_fields" }, 400);

  const back = data.back_url || publicSiteUrl;

  const preference = {
    items: [{
      id: data.appointment_id,
      title: `Seña · ${data.service_name}`,
      quantity: 1,
      currency_id: "ARS",
      unit_price: Number(data.amount),
    }],
    payer: data.client_email ? {
      name: data.client_name || undefined,
      email: data.client_email,
    } : undefined,
    external_reference: data.appointment_id,
    notification_url: `${publicSiteUrl}/functions/v1/mp-webhook`,
    back_urls: {
      success: `${back}?mp=ok&apt=${data.appointment_id}`,
      failure: `${back}?mp=fail&apt=${data.appointment_id}`,
      pending: `${back}?mp=pending&apt=${data.appointment_id}`,
    },
    auto_return: "approved",
    statement_descriptor: "GFSTUDIO",
    metadata: { appointment_id: data.appointment_id },
  };

  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${mpToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preference),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("MP error", res.status, txt);
    return json({ ok: false, error: "mp_failed", status: res.status, detail: txt }, 502);
  }

  const out = await res.json();
  return json({
    ok: true,
    configured: true,
    preference_id: out.id,
    init_point: out.init_point,
    sandbox_init_point: out.sandbox_init_point,
  });
});
