# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Sistema de turnos online para **GF Studio** — estudio de belleza de Guada en Henderson, Buenos Aires. Stack sin build step: React 18 + Babel standalone en CDN, Supabase como backend, Vercel como hosting.

## Deploy

### Setup (una vez por terminal)

```bash
# Windows bash / Git Bash — exportar el token Supabase CLI
export SUPABASE_ACCESS_TOKEN=sbp_...   # generar en https://supabase.com/dashboard/account/tokens

# Opcional: persistir en ~/.bashrc para no tener que re-exportarlo
echo 'export SUPABASE_ACCESS_TOKEN=sbp_...' >> ~/.bashrc
```

> **Nunca** pegues el token en este archivo, en commits, ni en PRs. Si lo necesitás ahora y no lo tenés a mano, generá uno nuevo y revocá el anterior en https://supabase.com/dashboard/account/tokens.

### Comandos

```bash
# Código (index.html / admin.html) — Vercel auto-deploya en ~1 min
git push origin main

# Edge Function (solo si se modificó supabase/functions/)
npx supabase functions deploy notify-booking --no-verify-jwt \
  --project-ref ibikdnjuctopdkmtmgdd

# Migraciones DB
npx supabase db push --linked --yes

# Query directa a la DB (diagnóstico / fixes urgentes sin migration)
npx supabase db query --linked "SQL aquí;"
```

URLs: `https://gf-studio.vercel.app` (landing) · `https://gf-studio.vercel.app/admin.html` (admin, login con email + contraseña via Supabase Auth)

### Staging vs prod

Hay dos branches con deploy automático en Vercel:

| branch | URL | cuándo |
|---|---|---|
| `main` | `https://gf-studio.vercel.app` | prod — lo que ven las clientas |
| `staging` | `https://gf-studio-git-staging-alvaros-projects-XXX.vercel.app` (URL exacta la da Vercel al primer deploy) | pre-prod — probar cambios grandes |

Flujo recomendado para cambios no triviales (UX grande, migrations, cambios de RLS):

```bash
# 1. Salir de main, ir a staging
git checkout staging && git pull

# 2. Merge main en staging si hay drift (o rebase)
git merge main

# 3. Traer tu rama o editar directo y pushear
git push origin staging   # Vercel deploya la URL de staging en ~1 min

# 4. Probar en la URL de staging (misma DB que prod — ojo con inserts reales)
# 5. Cuando quede OK, volver a main y mergear
git checkout main && git merge staging && git push origin main
```

> **Importante:** staging y prod apuntan a la **misma** instancia de Supabase. Si necesitás aislamiento de datos (ej. testing de migrations destructivas), creá un proyecto Supabase paralelo y cambiá `SB_URL`/`SB_KEY` en la branch staging. Hoy no lo tenemos — el uso principal de staging es probar cambios de UI/UX contra datos reales sin exponerlos en la URL pública.

## Secrets: público vs privado

Hay tres niveles de credenciales — mezclarlos es la mayor fuente de leaks.

### Públicos (viven en index.html / admin.html, van al browser)

| constante | valor | por qué está OK |
|---|---|---|
| `SB_URL` | `https://ibikdnjuctopdkmtmgdd.supabase.co` | URL pública del proyecto |
| `SB_KEY` | anon key (JWT firmado con `role:anon`) | **diseñado para ir al cliente**; los permisos los da RLS |

Estas claves están en HTML servido por Vercel. Cualquiera las puede leer en DevTools. La única defensa real son las policies RLS (ver `supabase/migrations/20260420_rls_lockdown.sql`).

### Privados (nunca van al cliente, nunca al git)

| secret | dónde vive | rota si... |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` (CLI) | `~/.bashrc` del dev | se lee desde tu máquina, se commitea sin querer, o lo compartís |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Edge Functions env vars | **nunca** salió del dashboard; si aparece en un log/PR, rotar inmediatamente |
| `RESEND_API_KEY` | Supabase secret (`notify-booking`) | se filtra en logs o se commitea |
| `MP_ACCESS_TOKEN` | Supabase secret (`create-mp-preference`, `mp-webhook`) | cuando lo active, rota si sale de Supabase |

Regla: si un secret termina en JWT con `role:service_role` o arranca con `sbp_` / `re_` / `APP_USR-` → **jamás** en repo, browser, logs públicos ni PR descriptions.

### Qué hacer si leakeás un secret

1. Revocar el viejo en el dashboard del servicio (Supabase, Resend, MP).
2. Generar uno nuevo.
3. Re-setear en el lugar correcto (env var, secret, `.bashrc`).
4. Si estuvo en un commit público: aunque lo borres después, **asumí que ya fue scrapeado** y rotá igual.

## Arquitectura

**No hay build step.** `index.html` y `admin.html` son SPAs auto-contenidas: React 18 UMD + Babel standalone transpilan JSX en el browser en runtime. Todo el código de cada página vive en un único `<script type="text/babel">`.

```
index.html         → landing pública (servicios, booking, contacto)
admin.html         → panel privado (turnos, servicios CRUD, bloqueos, resultados)
og-image.png       → 1200×630 para previews de WhatsApp/redes
assets/logo/       → SVG (negro/blanco/color) + export-png.html
supabase/
  functions/bump-coupon-usage/   → Edge Function que bumpeo uses_count con service_role
  functions/create-mp-preference/→ MercadoPago preference (seña, gated por MP_ACCESS_TOKEN)
  functions/mp-webhook/          → Webhook de MP para confirmar pagos
  functions/notify-booking/      → Emails via Resend (sandbox hasta dominio propio)
  migrations/                    → SQL migrations (push manual con CLI)
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
| duration_minutes | int | DEFAULT 60 — source of truth de duración |
| description | text | nullable |
| active | bool | `COALESCE(active, true)` en la landing |
| display_order | int | orden en la landing (ASC) |
| category | text | nullable |

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

### RLS (desde 20/04/2026)
Policies reales por rol. Source of truth: `supabase/migrations/20260420_rls_lockdown.sql`.

- **anon** (landing pública con anon key):
  - SELECT filtrado sobre `gf_services` (active), `gf_packs` (active + landing_visible), `gf_gallery` (active), `gf_coupons` (active), `gf_content`, `gf_blocked_slots`.
  - **No** SELECT sobre `gf_appointments` ni `gf_clients` (PII). Para chequeo de colisión existe la view `gf_appointments_slots` (solo id/fecha/hora/servicio/status).
  - INSERT controlado en `gf_appointments` (status='pending', fecha ≥ hoy) y `gf_clients`.
  - **No** UPDATE ni DELETE en ninguna tabla. El bump de `uses_count` de cupones pasa por la Edge Function `bump-coupon-usage` (service_role).
- **authenticated** (admin logueado con Supabase Auth): `USING(true) WITH CHECK(true)` en todas las tablas.

Si agregás una tabla nueva, **enableá RLS + definí policy explícita**, o queda accesible a todos.

## Constantes clave

```js
// index.html
const WA_GUADA = "5492314555856";   // WhatsApp de Guada (único número usado en toda la landing)
const SB_URL = "https://ibikdnjuctopdkmtmgdd.supabase.co";
const SLOT_START = 9 * 60;          // 09:00
const SLOT_END = 18 * 60;           // 18:00
const SLOT_STEP = 30;               // intervalos de 30 min

// admin.html
const ADMIN_EMAIL = "guadalupefernandez016@gmail.com"; // identificador técnico para signInWithPassword
// Password: lo setea Guada en Supabase Auth. No vive en el código.
```

## Quirks importantes

**Day-of-week:** JavaScript `getDay()` devuelve 0=Domingo. La DB almacena 0=Lunes. Conversión: `mb = dow===0 ? 6 : dow-1`.

**IntersectionObserver y datos async:** El observer `.reveal` corre en `useEffect([], [])` — antes de que Supabase devuelva datos. Hay un segundo `useEffect([svcs])` que re-observa `.reveal:not(.vis)` cuando cargan los servicios. No eliminar ese segundo efecto o los cards de servicios quedan en opacity 0.

**Slot collision detection:** `slotAvailable()` verifica overlap real (no solo igualdad de hora): `aMin < slotEnd && (aMin + aDur) > slotStart`. Requiere `svcs` y `blocks` en scope — ambos se pasan explícitamente.

**Email en sandbox:** Resend está en modo sandbox con `onboarding@resend.dev` como FROM. Los emails a clientes solo funcionarán cuando se configure un dominio propio verificado en Resend (Fase C).

## Pendientes externos (no implementado)

1. Dominio propio (`gfstudio.com`) + verificación en Resend para emails reales a clientes.
2. Activar `MP_ACCESS_TOKEN` en Supabase secrets para habilitar seña por MercadoPago (toggle en admin ya listo).

> `ADMIN_PASS` hardcodeado y RLS abierto son **Fase D (completada el 20/04/2026)**. Supabase Auth + RLS real están live.
