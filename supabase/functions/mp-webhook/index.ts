// @ts-ignore - Deno import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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

// Mapea estados MP -> mp_payment_status interno
const STATUS_MAP: Record<string, string> = {
  approved: "approved",
  authorized: "approved",
  in_process: "pending",
  pending: "pending",
  rejected: "rejected",
  cancelled: "cancelled",
  refunded: "refunded",
  charged_back: "refunded",
};

async function fetchPayment(id: string, token: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`MP payment ${id}: ${res.status}`);
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // @ts-ignore - Deno global
  const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
  // @ts-ignore - Deno global
  const sbUrl = Deno.env.get("SUPABASE_URL");
  // @ts-ignore - Deno global
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!mpToken || !sbUrl || !sbKey) {
    console.error("mp-webhook missing secrets");
    // Devolvemos 200 para que MP no reintente eternamente.
    return json({ ok: true, skipped: "not_configured" });
  }

  // MP envía notificaciones de varias formas. Aceptamos GET (legacy IPN) y POST (Webhooks v2).
  const url = new URL(req.url);
  let topic = url.searchParams.get("topic") || url.searchParams.get("type") || "";
  let resourceId = url.searchParams.get("id") || url.searchParams.get("data.id") || "";

  if (req.method === "POST") {
    try {
      const body = await req.json();
      topic = body.type || body.topic || topic;
      resourceId = body.data?.id || body.resource || resourceId;
    } catch {
      /* algunos webhooks llegan vacíos — fallback a query params */
    }
  }

  if (topic !== "payment" || !resourceId) {
    // Otros topics (merchant_order, plan, etc.) los ignoramos por ahora.
    return json({ ok: true, ignored: topic });
  }

  let payment: any;
  try {
    payment = await fetchPayment(String(resourceId), mpToken);
  } catch (err) {
    console.error("fetchPayment failed", err);
    return json({ ok: false, error: "mp_fetch_failed" }, 502);
  }

  const apptId =
    payment.external_reference ||
    payment.metadata?.appointment_id ||
    "";

  if (!apptId) {
    console.error("Payment without appointment ref", payment.id);
    return json({ ok: true, ignored: "no_appointment_ref" });
  }

  const mappedStatus = STATUS_MAP[payment.status] || "pending";
  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });

  const patch: Record<string, unknown> = {
    mp_payment_id: String(payment.id),
    mp_payment_status: mappedStatus,
  };
  // Si el pago se aprobó, dejamos el turno en confirmed automáticamente.
  if (mappedStatus === "approved") patch.status = "confirmed";

  const { error } = await sb
    .from("gf_appointments")
    .update(patch)
    .eq("id", apptId);

  if (error) {
    console.error("update appointment failed", error);
    return json({ ok: false, error: "db_update_failed", detail: error.message }, 500);
  }

  return json({ ok: true, appointment_id: apptId, status: mappedStatus });
});
