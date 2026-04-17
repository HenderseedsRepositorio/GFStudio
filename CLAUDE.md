# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Sistema de turnos online para **GF Studio** — estudio de belleza de Guada en Henderson, Buenos Aires. Stack sin build step: React 18 + Babel standalone en CDN, Supabase como backend, Vercel como hosting.

## Deploy

```bash
# Código (index.html / admin.html) — Vercel auto-deploya en ~1 min
git push origin main

# Edge Function (solo si se modificó supabase/functions/)
SUPABASE_ACCESS_TOKEN=sbp_0bb0d54178992657636f7afbab1ec20ad9797939 \
  npx supabase functions deploy notify-booking --no-verify-jwt \
  --project-ref ibikdnjuctopdkmtmgdd

# Migraciones DB
SUPABASE_ACCESS_TOKEN=sbp_0bb0d54178992657636f7afbab1ec20ad9797939 \
  npx supabase db push --linked --yes

# Query directa a la DB (diagnóstico / fixes urgentes sin migration)
SUPABASE_ACCESS_TOKEN=sbp_0bb0d54178992657636f7afbab1ec20ad9797939 \
  npx supabase db query --linked "SQL aquí;"
```

> Token CLI expira **15 May 2026** — rotar en Supabase Dashboard antes.

URLs: `https://gf-studio.vercel.app` (landing) · `https://gf-studio.vercel.app/admin.html` (admin, pass: `guada`)

## Arquitectura

**No hay build step.** `index.html` y `admin.html` son SPAs auto-contenidas: React 18 UMD + Babel standalone transpilan JSX en el browser en runtime. Todo el código de cada página vive en un único `<script type="text/babel">`.

```
index.html     → landing pública (servicios, booking, contacto)
admin.html     → panel privado (turnos, servicios CRUD, bloqueos, resultados)
logos.js       → librería de 48 variantes SVG del logo (actualmente no usada)
og-image.png   → 1200×630 para previews de WhatsApp/redes
supabase/
  functions/notify-booking/   → Edge Function Deno que envía emails vía Resend
  migrations/                 → SQL migrations (push manual con CLI)
```

### Flujo de datos

El cliente (index.html) lee `gf_services` y `gf_blocked_slots` al montar, luego fetchea `gf_appointments` por fecha al elegir día. El admin (admin.html) tiene subscripción realtime a los tres cambios de postgres_changes, con debounce de 400 ms para evitar refetches duplicados.

### Pattern de JSX con variables locales

Cuando un tab del admin necesita variables locales dentro del JSX, se usa IIFE:
```jsx
{tab==="resultados" && (()=>{
  const total = appts.reduce(...);
  return <div>{total}</div>;
})()}
```

## DB Schema

**Proyecto Supabase:** `ibikdnjuctopdkmtmgdd`

### `gf_services`
| columna | tipo | notas |
|---|---|---|
| id | integer | secuencia `gf_services_id_seq`, arranca en 15 |
| name | text | |
| price | numeric | en pesos ARS sin decimales |
| duration | text | legacy ("60 min") — mantener sincronizado |
| duration_minutes | int | DEFAULT 60 — el que usa el frontend |
| description | text | nullable |

### `gf_appointments`
| columna | tipo | notas |
|---|---|---|
| id | uuid | gen_random_uuid() |
| service_id | int | FK → gf_services.id |
| appointment_date | date | |
| time_slot | text | "HH:MM" |
| status | text | pending / confirmed / cancelled / no_show |
| charged_price | numeric | editable desde tab Resultados |
| payment_method | text | efectivo / transferencia / tarjeta_debito / tarjeta_credito |
| notes | text | notas internas admin |

Índice UNIQUE parcial: `(appointment_date, time_slot)` WHERE status IN ('pending','confirmed').

### `gf_blocked_slots`
Tipo `full_day` usa `block_date`. Tipo `datetime_range` usa `block_date + start_time + end_time`. Tipo `date_range` usa `date_from + date_to`. Tipo `weekly` usa `day_of_week + start_time + end_time + recurring_from + recurring_to`.

### `gf_packs`
Tabla para packs/bonos (tab Packs en admin). Campos: name, services_included (text descriptivo), pack_price, list_price, uses_count.

### RLS
Todas las tablas tienen políticas `USING (true)` para todas las operaciones. La única protección real es la contraseña JS hardcodeada en el admin.

## Constantes clave

```js
// index.html
const WA_GUADA = "5492314555856";   // WhatsApp de Guada (flotante + confirmaciones)
const WA = "5492314573218";         // número de Alvaro (testing — cambiar en Fase C)
const SB_URL = "https://ibikdnjuctopdkmtmgdd.supabase.co";
const SLOT_START = 9 * 60;          // 09:00
const SLOT_END = 18 * 60;           // 18:00
const SLOT_STEP = 30;               // intervalos de 30 min

// admin.html
const ADMIN_PASS = "guada";
```

## Quirks importantes

**Day-of-week:** JavaScript `getDay()` devuelve 0=Domingo. La DB almacena 0=Lunes. Conversión: `mb = dow===0 ? 6 : dow-1`.

**Duration duality:** `gf_services` tiene `duration` (text legacy) y `duration_minutes` (int). Al crear/editar un servicio desde el admin, el `saveSvc` escribe ambos campos (`duration: \`${n} min\``). No romper esta sincronía.

**IntersectionObserver y datos async:** El observer `.reveal` corre en `useEffect([], [])` — antes de que Supabase devuelva datos. Hay un segundo `useEffect([svcs])` que re-observa `.reveal:not(.vis)` cuando cargan los servicios. No eliminar ese segundo efecto o los cards de servicios quedan en opacity 0.

**Slot collision detection:** `slotAvailable()` verifica overlap real (no solo igualdad de hora): `aMin < slotEnd && (aMin + aDur) > slotStart`. Requiere `svcs` y `blocks` en scope — ambos se pasan explícitamente.

**Email en sandbox:** Resend está en modo sandbox con `onboarding@resend.dev` como FROM. Los emails a clientes solo funcionarán cuando se configure un dominio propio verificado en Resend (Fase C).

## Fase C pendiente (no implementado)

1. Dominio propio (`gfstudio.com`) + verificación en Resend para emails reales a clientes
2. Supabase Auth reemplaza `ADMIN_PASS` hardcodeado
3. Cerrar RLS (políticas por usuario autenticado)
4. Cambiar `WA` (número de Alvaro) al número definitivo de Guada
5. Análisis MercadoPago para cobrar seña
