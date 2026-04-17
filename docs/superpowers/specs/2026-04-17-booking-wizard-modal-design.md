# Spec — Booking Wizard Modal (GF Studio)

**Fecha:** 2026-04-17
**Autor:** Alvaro + Claude (Opus 4.7)
**Estado:** Diseño aprobado por Alvaro — pendiente plan de implementación

## Contexto

El formulario de booking actual en [index.html](../../../index.html) es un único form vertical (nombre, email, teléfono, select de servicio, fecha, grilla de slots) dentro de la sección `#reservar` del landing. Funciona, pero la UX no es "app-like" y compite visualmente con el resto del landing. El objetivo de este rediseño es elevar la percepción de profesionalismo y facilitar la reserva al cliente que llega desde IG (mobile, baja paciencia).

Referencia inspiradora: **tuturno.io** (plataforma SaaS de turnos). Patrón observado: wizard paso-a-paso dentro de pantalla dedicada, con cards de pasos anteriores "Modificar-ables", carrusel horizontal de días y slots agrupados por franja horaria.

## Objetivos

1. Reemplazar el form vertical único por un **wizard de 3 pasos** dentro de un **modal fullscreen/panel centrado**.
2. Permitir **deep-link** (`?book=1`) para usar el modal como destino directo desde el bio de IG.
3. Mantener la **identidad visual actual** (olive `#5E6B2E`, glass-morphism, Playfair Display). La modernidad viene del flow y el layout, no del color.
4. Mantener la **funcionalidad existente** post-reserva (descarga ICS, reagendar WA, reservar otro turno).

## No-objetivos (fuera de scope)

- Rediseñar el landing (hero, servicios, contacto, footer). Queda como está.
- Tocar el admin (`admin.html`). Queda como está.
- Cambiar el schema de DB o la Edge Function `notify-booking`. La payload que se envía es idéntica.
- Detección de cliente recurrente / autocomplete de email. Va a Sprint 2.
- Selector de profesional. GF tiene un solo profesional (Guada). Se elimina del flow.

## Arquitectura técnica

- Nuevo componente `<BookingModal/>` dentro del mismo [index.html](../../../index.html). Sin build step, sigue siendo React 18 UMD + Babel standalone.
- State machine interno:

```
step ∈ {"servicio", "fecha", "datos", "exito"}
```

- **Desktop (≥ 640px):** panel centrado, `max-width: 520px`, `max-height: 90dvh`, con backdrop `rgba(0,0,0,.5)` + `backdrop-filter: blur(8px)`.
- **Mobile (< 640px):** fullscreen `100dvw × 100dvh`, sin backdrop visible.
- **Apertura:**
  - Query param `?book=1` al cargar → abre modal directo (Paso 1).
  - Bonus: `?book=1&svc=<id>` → pre-selecciona servicio y salta a Paso 2.
  - Botones "Reservar Turno" del nav, nav mobile, y CTA hero → abren modal.
- **Cierre:**
  - Click en backdrop (desktop).
  - Botón X en header del modal.
  - Tecla ESC.
  - Si hay datos a medio llenar (nombre/email/WA con contenido), confirm dialog "¿Descartar reserva?" antes de cerrar. Excepción: si ya está en "exito", cierra sin preguntar.
- **Body scroll lock** mientras modal está abierto (`overflow: hidden` en `<body>`).
- **Focus trap** y ARIA (`role="dialog"`, `aria-modal="true"`, `aria-labelledby` al título del paso).
- Al cerrar post-éxito: limpiar state y remover query param con `history.replaceState`.

### Componente — forma general

```jsx
<BookingModal
  open={bk}
  initialServiceId={null}       // si viene de ?book=1&svc=X
  svcs={svcs}                   // lista de servicios ya fetchada
  blocks={blocks}               // bloqueos ya fetchados
  onClose={()=>setBk(false)}
  // internamente fetchea appts por fecha
/>
```

El modal comparte el cliente Supabase y el fetch de `svcs`/`blocks` ya presentes en `<App/>` (no duplicar). Fetch de `gf_appointments` sí ocurre adentro porque es por fecha seleccionada.

## Flujo del wizard

### Paso 1 — Servicio

**Título:** "Elegí tu servicio"

- Grilla de cards: **2 columnas en desktop, 1 en mobile**.
- Cada card muestra: nombre (bold), precio (olive), chip de duración (`60 min`), descripción si existe (2 líneas max con ellipsis).
- Tap en card = selecciona servicio Y avanza auto al Paso 2.
- Card seleccionada (si vuelve con "Modificar") con borde olive 2px y check icon en esquina.

### Paso 2 — Fecha + Horario

**Título:** "Elegí fecha y horario"

**Sub-sección A — Carrusel de días:**

- 5 pills horizontales visibles (Lun a Vie de la semana actual o la que se esté viendo).
- Flechas ← → arriba del carrusel para navegar semanas. Rango permitido: **semana que contiene `minD()` (hoy + 1 día hábil)** hasta **8 semanas adelante**. Fuera de ese rango, la flecha correspondiente se deshabilita.
- Cada pill muestra: mes abreviado arriba (`abr`), día de semana (`vie`), número grande (`17`).
- Estados visuales (respetando paleta):
  - **Seleccionado:** fondo `var(--olive-dk)`, texto blanco.
  - **Disponible:** fondo olive translúcido, texto olive.
  - **Sin slots / bloqueado día completo:** fondo gris claro, texto gris, cursor `not-allowed`.
- Sábados y domingos **no se muestran** (la regla "Lun-Vie" ya es política del negocio).

**Sub-sección B — Slots agrupados:**

- Se muestran cuando hay fecha seleccionada. Mientras se fetchean, skeleton loader.
- Dos grupos:
  - **"Por la mañana"** — slots cuya hora de inicio < 13:00
  - **"Por la tarde"** — slots cuya hora de inicio ≥ 13:00
- Cada grupo con título + icono de reloj.
- Grid de slots: **4 columnas desktop, 3 mobile**.
- Formato del slot: `9:00 hs` (no `09:00 → 10:00`). Al seleccionar, debajo aparece label `9:00 → 10:00 hs` (igual que hoy).
- Deshabilitados: opacidad 0.35 + `cursor: not-allowed`, sin texto "Ocupado".

Tap en slot = selecciona y avanza auto al Paso 3.

### Paso 3 — Datos + Confirmar

**Título:** "Confirmá tu turno"

**Arriba — Resumen del turno en 2 cards "Modificar":**

```
┌─────────────────────────────────────────┐
│ 🎀 Servicio                [Modificar] │
│ Corte + Brushing · 60 min · $15.000    │
├─────────────────────────────────────────┤
│ 📅 Fecha y horario         [Modificar] │
│ Vie 17 abr · 14:00 → 15:00 hs          │
└─────────────────────────────────────────┘
```

Click en "Modificar" de cada card → vuelve al paso correspondiente manteniendo el resto del state.

**Form:**

- **Nombre completo** — text, required, maxLength 80.
- **Email** — type=email, required, maxLength 120, con detector de typo (ya existe como `suggestEmail`).
- **WhatsApp** — row de 2 elementos:
  - **Selector de país:** native `<select>` custom-styled con emoji + prefijo. Default `🇦🇷 +549`. Set inicial:
    ```
    🇦🇷 AR +549    🇺🇾 UY +598    🇨🇱 CL +56
    🇧🇷 BR +55     🇪🇸 ES +34     🇺🇸 US +1
    🇲🇽 MX +52
    ```
  - **Input número:** `inputMode="numeric"`, `maxLength` 10 para AR/UY/CL/ES/MX, variable para otros. Placeholder cambia según país (`2317 40-1234` para AR).
  - Se almacena en DB como string: `+549 2317 40-1234` (prefijo + espacio + número formateado).

**CTA:**

- Botón "Confirmar reserva" full-width, background `var(--olive-dk)`.
- Disabled mientras `submitting`.
- Debajo, bloque de política de cancelación (ya existe, se reusa).

### Éxito

Reemplaza Paso 3 en el mismo modal (no es un quinto paso aparte, es un "modo" del modal).

- Reusa la pantalla actual post-submit de [index.html:499-537](../../../index.html:499): "¡Turno reservado!" + resumen + botones ICS · Reagendar WA · Reservar otro.
- **"Reservar otro"** → resetea state del wizard, vuelve al Paso 1 (no cierra modal).
- **Cerrar modal** desde éxito: remueve query param y limpia state.

## Header del modal

Único y persistente en todos los pasos. Dos filas:

**Fila 1 (sticky top):**
- **Izquierda:** título del paso actual (Playfair Display, tamaño medio) — "Elegí tu servicio" / "Elegí fecha y horario" / "Confirmá tu turno" / "¡Turno reservado!".
- **Derecha:** botón X (cierra modal).

**Fila 2 — breadcrumb/progress unificado:**
- Formato: `① Servicio  ─  ② Fecha  ─  ③ Datos`
- Cada "paso" es un pill con número circular + label.
- **Estado actual:** círculo olive relleno, label bold olive.
- **Pasos completados:** círculo con check ✓, label olive, **clickeable** para volver a ese paso manteniendo state.
- **Pasos futuros:** círculo outline gris, label gris, no clickeable.
- En "éxito": los tres pasos con check, label "¡Listo!" en el lugar donde iría el actual.

Esto reemplaza tanto los "progress dots" como un breadcrumb separado — un solo indicador visual hace de ambos.

## Transiciones

- Entre pasos: **fade + slide horizontal 200ms** (paso nuevo entra de derecha, paso anterior sale a izquierda; inverso al volver).
- Modal abrir: fade backdrop + scale-up 0.96→1.0 del panel (250ms).
- Modal cerrar: reverso (150ms).

## Integración con código existente

### A agregar

- `<BookingModal/>` component (inline en el mismo `<script type="text/babel">`).
- `useEffect` en `<App/>` que lee `window.location.search` al mount y abre modal si `?book=1` está presente (con `svc` opcional).
- Lógica de country-code selector con formato dinámico del número.
- Funciones helper: `groupSlotsByPeriod(slots)`, `getDaysOfWeek(weekStart)`, `countrySet` constante.

### A reemplazar

- La sección `#reservar` del landing actual se **elimina**. En su lugar, el botón "Reservar Turno" del hero abre el modal en vez de scrollear a `#reservar`.
- El link del nav "Turnos" se reemplaza por un botón que abre el modal.
- El link del footer/IG queda con `?book=1` como URL definitiva (ej. `https://gf-studio.vercel.app/?book=1`).

### A preservar sin cambios

- `sb` client Supabase y fetchs (`svcs`, `blocks`).
- `fetchSlots`, `slotAvailable`, `blockCoversSlot`, `genSlots`, `downloadICS`, `isWeekday`, `normPhone`, `suggestEmail`.
- La lógica de submit (`sub`), incluido el refresh defensivo de slots antes del insert.
- La llamada a Edge Function `notify-booking` con misma payload.
- Schema DB.

## Deep link — comportamiento detallado

| URL | Comportamiento |
|---|---|
| `/` | Landing normal, modal cerrado |
| `/?book=1` | Landing renderiza detrás, modal abre en Paso 1 |
| `/?book=1&svc=17` | Modal abre directamente en Paso 2 con servicio id 17 pre-seleccionado. Si el `svc` no existe en DB, fallback a Paso 1. |
| `/#servicios` | Landing, scroll a sección servicios. Modal cerrado. |

Al cerrar el modal se hace `history.replaceState(null, "", "/")` para limpiar los query params y no dejar la URL "sucia".

## Accesibilidad

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` apuntando al título del paso.
- Focus inicial al abrir el modal: botón cerrar (X).
- Focus trap: Tab no escapa del modal.
- ESC cierra (respetando el confirm dialog).
- Cada button tiene label accesible. Los pills del carrusel tienen `aria-label` descriptivo (`"Viernes 17 de abril, 3 turnos disponibles"`).

## Mobile-first considerations

- Todo el flow optimizado para mobile (mayoría vendrá de IG).
- Tappables mínimo 44×44px.
- No hover-only interactions.
- Scroll interno del modal si el contenido excede viewport (header sticky top, CTA sticky bottom).
- Safe-area insets para notch / gesture bar (`env(safe-area-inset-bottom)`).

## Riesgos conocidos

1. **Complejidad del componente:** `<BookingModal/>` consolida la lógica que hoy está dispersa en `<App/>`. Riesgo de stale closures si no se maneja bien (ya pasó en Fase B). Mitigación: pasar explícitamente todo lo necesario como props y usar `useCallback` con deps completas.
2. **Country-code selector sin librería:** validación de longitud por país es ad-hoc. Mitigación: empezar con 7 países fijos y validación "≥ 8 dígitos" genérica; no validar formato local estricto.
3. **Animaciones con Tailwind CDN:** sin build step, las transiciones entre pasos se hacen con CSS en el `<style>` inline y clases condicionales. Riesgo de jank. Mitigación: `transform` y `opacity` únicamente.
4. **Deep link con `svc` inválido:** el servicio puede haber sido eliminado del admin. Mitigación: validar antes de saltar a Paso 2; si no existe, caer a Paso 1.

## Criterios de éxito

- Cliente que entra por `?book=1` (IG bio) completa reserva en ≤ 3 taps después de abrir el modal (servicio → fecha → hora → confirmar = 4 taps, el mínimo teórico).
- Modal funciona en Chrome mobile y desktop sin layout-shift.
- Todos los tests manuales actuales (bloqueos, slots ocupados, validación email) siguen pasando.
- Identidad visual coherente: un visitante nuevo no nota que el modal es "otra cosa" — se siente parte de GF Studio.
- Link `gf-studio.vercel.app/?book=1` funciona desde IG stories y bio.

## Pendiente (Sprint 2, fuera de este spec)

- Autocomplete de email para clienta recurrente (match contra `gf_appointments.email`).
- Lista de espera cuando el día está completo.
- Validación estricta de formato de teléfono por país (con librería si justifica).
- Animaciones pulidas con Framer Motion (requiere build step o CDN).
- Botón "Cómo llegar" (Google Maps) en el paso éxito.
