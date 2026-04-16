// @ts-ignore - Deno import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { clientEmailHTML, guadaEmailHTML, cancellationClientEmailHTML, BookingData } from "./templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FROM = "GF Studio <onboarding@resend.dev>";

async function sendEmail(to: string, subject: string, html: string, apiKey: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend ${res.status}: ${err}`);
  }
  return res.json();
}

function validate(body: any): BookingData | null {
  const required = ["nombre", "email", "telefono", "servicio", "fecha", "horario", "precio"];
  for (const k of required) {
    if (typeof body?.[k] !== "string" || !body[k].trim()) return null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return null;
  return body as BookingData;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const guadaEmail = Deno.env.get("GUADA_EMAIL");
  if (!apiKey || !guadaEmail) {
    console.error("Missing secrets");
    return new Response(JSON.stringify({ ok: false, error: "missing_secrets" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = validate(body);
  if (!data) {
    return new Response(JSON.stringify({ ok: false, error: "missing_fields" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const event = body.event === "cancellation" ? "cancellation" : "booking";

  const tasks = event === "cancellation"
    ? [sendEmail(data.email, "Tu turno fue cancelado — GF Studio", cancellationClientEmailHTML(data), apiKey)]
    : [
        sendEmail(data.email, "Recibimos tu reserva — GF Studio", clientEmailHTML(data), apiKey),
        sendEmail(guadaEmail, `Nuevo turno — ${data.nombre} — ${data.fecha} ${data.horario}`, guadaEmailHTML(data), apiKey),
      ];

  const results = await Promise.allSettled(tasks);
  const failures = results.filter(r => r.status === "rejected");
  if (failures.length) console.error("Email failures:", failures.map((f: any) => f.reason?.message));

  return new Response(JSON.stringify({
    ok: true,
    event,
    sent: results.map(r => r.status === "fulfilled"),
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
