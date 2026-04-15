# Turnera GF Studio — Fase A: Notificaciones por email + WA confirmación

**Fecha:** 2026-04-15
**Autor:** Alvaro + Claude
**Status:** Draft para aprobación

## Objetivo

Dejar la turnera de GF Studio a "nivel pro" en su flujo mínimo:

1. Cuando una cliente reserva un turno, recibe un **email automático** con los detalles.
2. Guada (admin) recibe en paralelo un **email de aviso** con los datos de la reserva.
3. En el panel de admin, un botón **"Confirmar por WhatsApp"** marca el turno como confirmado y abre WhatsApp Web/App con un mensaje predefinido listo para enviar a la cliente.

Nada más. Cancelación automática al cliente, recordatorios, vista calendario, bloqueo de fechas: quedan para Fase B.

## Estado actual

- **index.html**: form público → INSERT en `gf_appointments` (Supabase) → abre WhatsApp del negocio con mensaje prearmado. Hay un webhook a Make.com (`hook.us2.make.com/vbqc4j...`) que creemos vacío.
- **admin.html**: password `guada` (hardcoded, client-side), vista lista con filtros, botones confirmar / cancelar / eliminar, atajo WA verde que abre chat con la cliente.
- **Supabase**: proyecto `nawinxkwfrkxvqwinegi`, tablas `gf_appointments` y `gf_services`, realtime activo.
- **WhatsApp**: número hardcodeado `5491112345678` (placeholder irreal).

## Decisiones de diseño

### Canal de notificación: email transaccional
- **Proveedor:** Resend (3.000 emails/mes gratis, API simple, buena deliverability).
- **Dominio:** arrancamos con `onboarding@resend.dev` (sandbox de Resend). Migramos a dominio propio en Fase B.
- **Destinatarios:**
  - Cliente: al email que cargó en el form.
  - Guada: `henderseeds@gmail.com` por ahora (de Alvaro, para testing). Se cambia en 1 constante cuando Guada tenga email del negocio.

### Por qué NO usar webhook de DB ni Make.com
- Un insert-trigger + DB webhook + edge function es más piezas, más latencia, más cosas que pueden fallar.
- En esta fase sólo necesitamos disparar en INSERT (no en updates). Llamar la edge function directo desde el frontend después del insert exitoso es más directo y falla visible.
- Make.com se elimina de la ruta: el fetch actual al webhook se reemplaza por un fetch a la edge function de Supabase.

### Arquitectura

```
Cliente completa form (index.html)
  └─ sb.insert(gf_appointments)  ─── si falla, mensaje de error UI
       └─ fetch(supabase edge fn "notify-booking", {body: {...datos}})
            ├─ Resend → email a cliente (template "reserva recibida")
            └─ Resend → email a Guada    (template "nuevo turno")
       └─ UI: pantalla "Te mandamos un email con los detalles. Te confirmamos pronto."

Guada clickea "Confirmar por WA" en admin.html
  └─ sb.update(gf_appointments) status=confirmed
  └─ window.open(`https://wa.me/${tel}?text=${mensajeArmado}`)
```

### Edge Function `notify-booking`

- **Path:** `supabase/functions/notify-booking/index.ts`
- **Runtime:** Deno (default Supabase).
- **Input (POST JSON):** `{ nombre, email, telefono, servicio, fecha, horario, precio }`
- **Acciones:**
  1. Valida que el body tenga los campos requeridos (400 si falta).
  2. Llama a Resend API 2 veces (cliente y Guada) con templates HTML simples.
  3. Devuelve 200 aunque falle uno de los 2 emails (no queremos bloquear al usuario por un error de email).
  4. Loguea errores a `console.error` para revisar en Supabase logs.
- **Secrets necesarios (Supabase):**
  - `RESEND_API_KEY` — Alvaro la pega después de crear cuenta.
  - `GUADA_EMAIL` — por ahora `henderseeds@gmail.com`.

### Templates de email

**Al cliente** (asunto: `Recibimos tu reserva — GF Studio`):
- Header con logo/nombre GF Studio
- "Hola {nombre}, recibimos tu reserva:"
- Bloque destacado: servicio, fecha (formato "lunes 20 de abril"), horario, precio
- Dirección: Hipólito Yrigoyen 229, Henderson
- "Te confirmamos a la brevedad por WhatsApp."
- Footer con contacto

**A Guada** (asunto: `Nuevo turno — {nombre} — {fecha} {horario}`):
- Datos crudos: nombre, tel, email, servicio, fecha, horario, precio
- Link al panel: `https://[url-admin]/admin.html`
- Botón: "Abrir WhatsApp con {nombre}" → link wa.me

### Cambios en admin.html

1. **Reemplazar botón "Confirmar"** (verde, texto plano hoy) por **"Confirmar por WA"** que:
   - Hace `updateStatus(id, "confirmed")`
   - Abre `wa.me/{telefono}?text={mensajeArmado}` en pestaña nueva
2. **Mensaje WA predefinido** (encodeURIComponent):

```
Hola {nombre}! Soy Guada de GF Studio ✨

Te confirmo tu turno:
📅 {fecha}
🕐 {horario} hs
💆 {servicio}

Te espero en Hipólito Yrigoyen 229, Henderson. Cualquier cambio avisame por acá.
¡Nos vemos!
```

3. **Mantener sin cambios:** botón Cancelar, botón Eliminar, botón WA verde genérico (sirve si Guada quiere escribir manualmente), password `guada`.

### Cambios en index.html

1. **Constante WA:** actualizar de `5491112345678` → `5492314573218` (número de Alvaro para testing).
2. **Remover fetch a Make.com** — reemplazar por fetch a edge function de Supabase.
3. **Remover apertura automática de WhatsApp post-reserva** (hoy líneas 251-252: arma mensaje y `window.open(wa.me...)`). Confunde porque el turno está pending.
4. **Pantalla de éxito post-reserva:** cambiar texto de "Enviá el mensaje de WhatsApp para confirmar" a "Te mandamos un email con los detalles. Te confirmamos a la brevedad."
5. **Botón "Reservar otro turno"** queda igual.

### Schema DB
Sin cambios. La tabla `gf_appointments` actual alcanza. No necesitamos columna `cancellation_reason` en Fase A (la cancelación no notifica al cliente todavía).

## Testing manual

1. Reservar un turno con email propio → verificar llegada de 2 emails (cliente + Guada).
2. En admin, clickear "Confirmar por WA" → verificar que (a) el status cambia, (b) abre WhatsApp con el mensaje correcto.
3. Probar error de Resend (API key inválida temporalmente) → la reserva igual se guarda, la UI no rompe.
4. Probar en mobile (Guada usa celular).

## Riesgos / consideraciones

- **Deliverability con `onboarding@resend.dev`**: puede caer en spam. Advertir a Alvaro que avise a la primera cliente que revise spam, o migrar a dominio propio apenas se pueda.
- **Password admin expuesta**: sigue siendo un riesgo en Fase A. Mitigación: dominio/URL del admin no se linkea desde ningún lado público. Fase B: Supabase Auth con magic link.
- **Rate limit Resend**: 3k/mes = ~100/día. Más que suficiente para este volumen.
- **CORS en edge function**: configurar para aceptar el dominio donde corre el index.

## Fuera de alcance (Fase B)

- Notificación al cliente cuando Guada cancela o reagenda.
- Recordatorio automático 24h antes.
- Vista calendario semanal en admin.
- Bloqueo de fechas/horarios por Guada (vacaciones, feriados).
- Anti-solape por duración del servicio.
- Supabase Auth en admin (magic link).
- Dominio propio para email.
- Integración WhatsApp Business API (envío programático).

## Criterios de aceptación

- [ ] Reservar turno dispara email al cliente y a Guada en < 10 seg.
- [ ] "Confirmar por WA" cambia status en DB y abre WhatsApp con mensaje correcto.
- [ ] No se rompe el flujo si Resend falla.
- [ ] Número WA actualizado al de Alvaro.
- [ ] Sin referencias a Make.com en el código.
