# Turnera Fase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando una cliente reserva en GF Studio recibe email automático con detalles del turno, Guada también recibe aviso por email, y en el panel admin hay un botón "Confirmar por WA" que cambia status y abre WhatsApp con mensaje prearmado.

**Architecture:** Edge Function en Supabase (Deno) que recibe POST del frontend post-INSERT y dispara 2 emails vía Resend. Admin actualizado con nuevo botón. Sin cambios de schema.

**Tech Stack:** HTML/React-inline standalone, Supabase (DB + Edge Functions Deno), Resend API, WhatsApp link protocol (`wa.me`).

**Precondición manual:**
- Proyecto Supabase `nawinxkwfrkxvqwinegi` despausado.
- Secrets cargados: `RESEND_API_KEY`, `GUADA_EMAIL`.
- Supabase CLI instalado localmente (`npm i -g supabase` o `scoop install supabase`).
- Logueado: `supabase login`.
- Proyecto linkeado: `cd gf-studio && supabase link --project-ref nawinxkwfrkxvqwinegi`.

---

## File Structure

- `supabase/functions/notify-booking/index.ts` — nueva Edge Function, maneja POST y envía 2 emails.
- `supabase/functions/notify-booking/templates.ts` — templates HTML de los 2 emails (separado para legibilidad).
- `supabase/config.toml` — config del proyecto Supabase (generado por CLI).
- `index.html` — modificar: constante WA, remover Make.com, remover apertura WA automática, llamar edge function, cambiar texto pantalla éxito.
- `admin.html` — modificar: botón "Confirmar" → "Confirmar por WA" con apertura de wa.me.

---

### Task 1: Inicializar proyecto Supabase CLI localmente

**Files:**
- Create: `supabase/config.toml` (generado por CLI)

- [ ] **Step 1: Verificar CLI instalado**

Run: `supabase --version`
Expected: versión >= 1.200.0. Si falla, instalar con `npm i -g supabase` o `scoop install supabase`.

- [ ] **Step 2: Login y link al proyecto**

Run desde `c:/Users/ALVARO/Documents/2-ClientesIA/gf-studio`:
```bash
supabase login
supabase link --project-ref nawinxkwfrkxvqwinegi
```
Expected: "Finished supabase link."

- [ ] **Step 3: Verificar archivos generados**

Run: `ls supabase/`
Expected: `config.toml` presente.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "chore: init supabase CLI project"
```

---

### Task 2: Crear Edge Function `notify-booking` (esqueleto vacío)

**Files:**
- Create: `supabase/functions/notify-booking/index.ts`

- [ ] **Step 1: Escribir esqueleto que responde 200**

Crear `supabase/functions/notify-booking/index.ts`:
```typescript
// @ts-ignore - Deno import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("notify-booking received:", body);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-booking error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 2: Deploy**

Run: `supabase functions deploy notify-booking --no-verify-jwt`
Expected: "Deployed Function notify-booking." Si falla por proyecto pausado, despausar y reintentar.

Nota: `--no-verify-jwt` porque el frontend público no tiene JWT de usuario autenticado.

- [ ] **Step 3: Test manual**

Run:
```bash
curl -X POST https://nawinxkwfrkxvqwinegi.supabase.co/functions/v1/notify-booking \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd2lueGt3ZnJreHZxd2luZWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDE4MTAsImV4cCI6MjA5MDAxNzgxMH0.nSjNXK1bIpR-4Qmlh9UkUjf0TeNsz295bg-ktoLakd0" \
  -d '{"test":"hello"}'
```
Expected: `{"ok":true}`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/notify-booking/index.ts
git commit -m "feat(edge): notify-booking skeleton"
```

---

### Task 3: Crear templates HTML de email

**Files:**
- Create: `supabase/functions/notify-booking/templates.ts`

- [ ] **Step 1: Escribir templates**

Crear `supabase/functions/notify-booking/templates.ts`:
```typescript
interface BookingData {
  nombre: string;
  email: string;
  telefono: string;
  servicio: string;
  fecha: string;
  horario: string;
  precio: string;
}

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 560px; margin: 0 auto; padding: 32px 24px;
  color: #1C1A14; background: #F5F1E8;
`;
const BOX_STYLE = `
  background: #FEFDF8; border-radius: 16px; padding: 24px;
  border: 1px solid rgba(0,0,0,.06); margin: 24px 0;
`;
const ROW_STYLE = `
  display: flex; justify-content: space-between; padding: 10px 0;
  border-bottom: 1px solid rgba(0,0,0,.04); font-size: 14px;
`;

export function clientEmailHTML(d: BookingData): string {
  return `
<div style="${BASE_STYLE}">
  <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #3D4A18; font-size: 28px; margin: 0 0 6px; font-weight: 700;">GF Studio</h1>
  <p style="color: #5C5840; font-size: 13px; margin: 0 0 28px; font-style: italic;">El arte de cuidarte</p>
  <h2 style="font-size: 22px; margin: 0 0 8px; color: #1C1A14;">¡Hola ${d.nombre}! ✨</h2>
  <p style="color: #5C5840; line-height: 1.6; font-size: 15px;">Recibimos tu reserva. Estos son los detalles:</p>
  <div style="${BOX_STYLE}">
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">📅 Fecha y hora</span><strong>${d.fecha} — ${d.horario} hs</strong></div>
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">💆 Servicio</span><strong>${d.servicio}</strong></div>
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">👩‍🎨 Profesional</span><strong>Guada</strong></div>
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">📍 Dirección</span><strong>Hipólito Yrigoyen 229, Henderson</strong></div>
    <div style="${ROW_STYLE} border-bottom: none;"><span style="color:#8A8470;">💰 Precio</span><strong style="color:#3D4A18;">${d.precio}</strong></div>
  </div>
  <p style="color: #5C5840; line-height: 1.6; font-size: 14px;">Te confirmamos a la brevedad por WhatsApp. Cualquier cambio o reagendamiento, respondé este mail o escribinos con anticipación.</p>
  <p style="color: #5C5840; line-height: 1.6; font-size: 14px; margin-top: 20px;">¡Te esperamos! 💚</p>
  <hr style="border: none; border-top: 1px solid rgba(0,0,0,.06); margin: 32px 0 16px;"/>
  <p style="color: #8A8470; font-size: 11px; margin: 0;">GF Studio — Henderson, Buenos Aires</p>
</div>`;
}

export function guadaEmailHTML(d: BookingData): string {
  const waLink = `https://wa.me/${d.telefono.replace(/\D/g, '')}`;
  return `
<div style="${BASE_STYLE}">
  <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #3D4A18; font-size: 24px; margin: 0 0 16px;">Nuevo turno 🌿</h1>
  <div style="${BOX_STYLE}">
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">Cliente</span><strong>${d.nombre}</strong></div>
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">Teléfono</span><strong>${d.telefono}</strong></div>
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">Email</span><span>${d.email}</span></div>
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">Servicio</span><strong>${d.servicio}</strong></div>
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">Fecha</span><strong>${d.fecha}</strong></div>
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">Horario</span><strong>${d.horario}</strong></div>
    <div style="${ROW_STYLE} border-bottom: none;"><span style="color:#8A8470;">Precio</span><strong style="color:#3D4A18;">${d.precio}</strong></div>
  </div>
  <div style="text-align: center; margin: 24px 0;">
    <a href="${waLink}" style="display: inline-block; background: #25D366; color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 500; font-size: 14px;">Abrir WhatsApp con ${d.nombre}</a>
  </div>
  <p style="color: #8A8470; font-size: 12px; text-align: center;">Entrá al panel para confirmar o cancelar.</p>
</div>`;
}

export type { BookingData };
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/notify-booking/templates.ts
git commit -m "feat(edge): email HTML templates"
```

---

### Task 4: Integrar Resend en Edge Function

**Files:**
- Modify: `supabase/functions/notify-booking/index.ts`

- [ ] **Step 1: Reemplazar contenido de index.ts**

Sobreescribir `supabase/functions/notify-booking/index.ts`:
```typescript
// @ts-ignore - Deno import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { clientEmailHTML, guadaEmailHTML, BookingData } from "./templates.ts";

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

  const results = await Promise.allSettled([
    sendEmail(data.email, "Recibimos tu reserva — GF Studio", clientEmailHTML(data), apiKey),
    sendEmail(guadaEmail, `Nuevo turno — ${data.nombre} — ${data.fecha} ${data.horario}`, guadaEmailHTML(data), apiKey),
  ]);

  const failures = results.filter(r => r.status === "rejected");
  if (failures.length) console.error("Email failures:", failures.map((f: any) => f.reason?.message));

  return new Response(JSON.stringify({
    ok: true,
    client_sent: results[0].status === "fulfilled",
    guada_sent: results[1].status === "fulfilled",
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
```

- [ ] **Step 2: Deploy**

Run: `supabase functions deploy notify-booking --no-verify-jwt`
Expected: "Deployed Function notify-booking."

- [ ] **Step 3: Test manual con datos reales**

Run (reemplazá `TU_EMAIL` por el de Alvaro):
```bash
curl -X POST https://nawinxkwfrkxvqwinegi.supabase.co/functions/v1/notify-booking \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd2lueGt3ZnJreHZxd2luZWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDE4MTAsImV4cCI6MjA5MDAxNzgxMH0.nSjNXK1bIpR-4Qmlh9UkUjf0TeNsz295bg-ktoLakd0" \
  -d '{
    "nombre":"Test Cliente",
    "email":"TU_EMAIL",
    "telefono":"+5492314573218",
    "servicio":"Perfilado de Cejas",
    "fecha":"lunes 20 de abril",
    "horario":"15:00",
    "precio":"$18.000"
  }'
```
Expected: `{"ok":true,"client_sent":true,"guada_sent":true}` y llegan 2 emails al inbox (revisar spam).

Si `client_sent` o `guada_sent` es `false`: `supabase functions logs notify-booking` para ver error. Causa común con `onboarding@resend.dev`: Resend en modo test sólo permite enviar al email dueño de la cuenta. Si ese es el caso, documentar y continuar (Guada es `henderseeds@gmail.com`, dueño de la cuenta Resend = ok; el email al cliente va a fallar hasta que se verifique un dominio propio, pero sigue OK para Fase A porque Alvaro testea con su propio email).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/notify-booking/index.ts
git commit -m "feat(edge): send emails via Resend"
```

---

### Task 5: Actualizar `index.html` — constante WA y remover Make.com

**Files:**
- Modify: `index.html` (líneas ~111, ~241-246, ~251-252, ~437-438)

- [ ] **Step 1: Actualizar constante WA**

En `index.html` línea 111, reemplazar:
```js
const WA="5491112345678";
```
por:
```js
const WA="5492314573218"; // Número de Alvaro para testing. CAMBIAR al de Guada cuando esté listo.
```

- [ ] **Step 2: Reemplazar fetch de Make.com por edge function**

En `index.html`, localizar el bloque `try{ await fetch("https://hook.us2.make.com/..." ...` (líneas ~241-246) y reemplazar todo el bloque por:
```js
try{
  await fetch("https://nawinxkwfrkxvqwinegi.supabase.co/functions/v1/notify-booking",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "apikey":SB_KEY,
    },
    body:JSON.stringify({
      nombre:n.trim(),
      email:em.trim(),
      telefono:"+54"+ph.replace(/\D/g,''),
      servicio:sn,
      fecha:df,
      horario:tm+" hs",
      precio:fP(pr)
    })
  });
}catch(e){console.warn("notify-booking failed",e)}
```

- [ ] **Step 3: Remover apertura automática de WhatsApp post-reserva**

En `index.html` líneas ~251-252, eliminar estas 2 líneas:
```js
const msg=encodeURIComponent(`*Reserva — GF Studio*\n\n${n.trim()}\n+54${ph.replace(/\D/g,'')}\n${sn}\n${df}\n${tm} hs`);
setTimeout(()=>window.open(`https://wa.me/${WA}?text=${msg}`,"_blank"),300);
```

- [ ] **Step 4: Actualizar pantalla de éxito post-reserva**

En `index.html` línea ~438, localizar:
```html
<p className="text-xs font-light mb-6" style={{color:'var(--muted)'}}>Enviá el mensaje de WhatsApp para confirmar. Te respondemos a la brevedad.</p>
```
Reemplazar por:
```html
<p className="text-xs font-light mb-6" style={{color:'var(--muted)'}}>Te mandamos un email con los detalles. Te confirmamos a la brevedad.</p>
```

- [ ] **Step 5: Verificación manual**

Abrir `index.html` en browser local (doble click o `npx serve .`):
1. Completar form con email propio + datos válidos
2. Click "Confirmar por WhatsApp" (botón del form, mantiene el texto pero ya no abre WA)
3. Esperado: pantalla de éxito con nuevo texto, NO se abre WhatsApp automáticamente
4. Revisar inbox: llegan los 2 emails (al cliente y a Guada)
5. Abrir DevTools → Network: el POST a `functions/v1/notify-booking` devuelve 200
6. Verificar en Supabase Dashboard → Table Editor → `gf_appointments`: aparece el registro con `status='pending'`

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(web): reemplazar Make.com por edge function, actualizar WA number"
```

---

### Task 6: Admin — botón "Confirmar por WA"

**Files:**
- Modify: `admin.html` (líneas ~73-78 y ~190-195)

- [ ] **Step 1: Agregar función `confirmAndWA` al componente App**

En `admin.html`, después de la función `updateStatus` (líneas ~73-78), agregar una nueva función:

Localizar:
```js
const updateStatus=async(id,status)=>{
  setUpdating(id);
  await sb.from("gf_appointments").update({status}).eq("id",id);
  await fetchData();
  setUpdating(null);
};
```

Agregar inmediatamente después:
```js
const confirmAndWA=async(appt)=>{
  setUpdating(appt.id);
  await sb.from("gf_appointments").update({status:"confirmed"}).eq("id",appt.id);
  const svc=services.find(s=>s.id===appt.service_id)?.name||"tu turno";
  const fecha=fDate(appt.appointment_date);
  const msg=`¡Hola ${appt.client_name}! ✨\n\nTe confirmamos tu turno en *GF Studio*:\n\n📅 *Fecha y hora:* ${fecha} — ${appt.time_slot} hs\n💆 *Servicio:* ${svc}\n👩‍🎨 *Profesional:* Guada\n📍 *Dirección:* Hipólito Yrigoyen 229, Henderson\n\nCualquier cambio o reagendamiento, avisanos por acá con anticipación 💚\n\n¡Te esperamos!\n— Guada, GF Studio`;
  const tel=appt.client_phone.replace(/\D/g,'');
  window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`,"_blank");
  await fetchData();
  setUpdating(null);
};
```

- [ ] **Step 2: Reemplazar botón "Confirmar" por "Confirmar por WA"**

En `admin.html` líneas ~190-195, localizar:
```jsx
{a.status==="pending"&&(
  <button onClick={()=>updateStatus(a.id,"confirmed")} disabled={updating===a.id}
    className="text-[11px] font-medium px-3 py-1.5 rounded-lg text-white" style={{background:'#065F46'}}>
    {updating===a.id?"...":"Confirmar"}
  </button>
)}
```

Reemplazar por:
```jsx
{a.status==="pending"&&(
  <button onClick={()=>confirmAndWA(a)} disabled={updating===a.id}
    className="text-[11px] font-medium px-3 py-1.5 rounded-lg text-white flex items-center gap-1" style={{background:'#065F46'}}>
    <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
    {updating===a.id?"...":"Confirmar por WA"}
  </button>
)}
```

- [ ] **Step 3: Verificación manual**

1. Abrir `admin.html` en browser, login con password `guada`
2. Reservar un turno de prueba desde `index.html` (en otra pestaña)
3. Volver al admin, filtro "Próximos" → debería aparecer el turno pending
4. Click "Confirmar por WA":
   - Se abre nueva pestaña con WhatsApp y el mensaje prearmado con nombre, fecha, hora, servicio
   - El badge cambia a "Confirmado" (verde)
   - El botón "Confirmar por WA" desaparece
5. Verificar en DB: `status='confirmed'`

- [ ] **Step 4: Commit**

```bash
git add admin.html
git commit -m "feat(admin): botón Confirmar por WA con mensaje prearmado"
```

---

### Task 7: Test end-to-end completo

**Files:**
- No file changes.

- [ ] **Step 1: Flujo completo de punta a punta**

1. Desplegar Edge Function (si no estaba ya): `supabase functions deploy notify-booking --no-verify-jwt`
2. Abrir `index.html` local o deployado
3. Reservar turno con datos reales (email de Alvaro)
4. Verificar:
   - [ ] Reserva guardada en DB con `status='pending'`
   - [ ] Pantalla de éxito muestra texto "Te mandamos un email..."
   - [ ] No se abrió WhatsApp automáticamente
   - [ ] Email llegó al cliente (puede tardar 30s)
   - [ ] Email llegó a `henderseeds@gmail.com`
5. Abrir `admin.html`, login
6. Ver turno en lista
7. Click "Confirmar por WA"
8. Verificar:
   - [ ] Se abre WhatsApp con mensaje prearmado correcto
   - [ ] Status cambia a `confirmed` en DB
9. Probar en celular (admin mobile, Guada va a usar celular)

- [ ] **Step 2: Documentar hallazgos**

Si algún paso falla, loguear el problema en una sección "Bugs pendientes" al final de este plan o crear nuevo task.

Si todo OK, cerrar plan.

- [ ] **Step 3: Commit final**

```bash
git commit --allow-empty -m "test: fase A end-to-end verificado"
```

---

## Post-implementación

### Dejar listo para producción
- [ ] `gf-studio/index.html` deployado a su hosting (¿Vercel? ¿GitHub Pages? Alvaro confirma).
- [ ] `gf-studio/admin.html` accesible pero no linkeado públicamente.
- [ ] URL del admin pasada a Guada por canal seguro (no commit, no público).

### Cuando se tenga dominio propio
1. En Resend: agregar dominio, verificar DNS (SPF, DKIM, DMARC).
2. Cambiar `FROM` en `supabase/functions/notify-booking/index.ts` de `onboarding@resend.dev` a `turnos@gfstudio.com.ar` (o similar).
3. Redeploy edge function.

### Cuando Guada tenga email del negocio
1. Supabase Dashboard → Secrets → editar `GUADA_EMAIL`.
2. No requiere redeploy (la function lee el secret en cada invocación).
