# GF Studio — Plan de Testing Integral

**Versión:** 1.0  
**Fecha:** 2026-04-19  
**Proyecto:** GF Studio (Sistema de reservas para estudio de belleza)  
**Stack:** React 18 + Babel standalone, Supabase, Vercel

---

## 1. UNIT TESTS — Funciones JavaScript

### Validaciones de Entrada
- [ ] `validateEmail()` — Aceptar emails válidos, rechazar inválidos
- [ ] `validatePhone()` — Validar formato de teléfono argentino (+54, 9XXXXXX)
- [ ] `validateName()` — Permitir nombres con acentos, rechazar números
- [ ] `validateDateFormat()` — Parsear fechas DD/MM/YYYY correctamente
- [ ] `validateTimeSlot()` — Verificar que la hora esté dentro del horario (09:00-18:00)

### Cálculos de Precios
- [ ] `calculateServicePrice()` — Precio base + impuestos
- [ ] `applyDiscount()` — Descuentos por paquetes
- [ ] `applyCoupon()` — Validar y aplicar códigos de descuento
- [ ] `calculatePackagePrice()` — Precio total con múltiples servicios
- [ ] `calculateTotalWithTax()` — IVA 21% calculado correctamente

### Formateo de Datos
- [ ] `formatCurrency()` — Mostrar "$9.999,50 ARS"
- [ ] `formatDate()` — "19 de abril, 2026"
- [ ] `formatTime()` — "14:30 hs"
- [ ] `formatPhone()` — "+54 9 2314 55-5856"
- [ ] `normalizeWhitespace()` — Limpiar espacios extra

### Lógica de Turnos
- [ ] `getAvailableSlots()` — Excluir turnos boqueados
- [ ] `isSlotAvailable()` — Verificar disponibilidad real-time
- [ ] `getNextAvailableDate()` — Encontrar primer turno disponible
- [ ] `calculateServiceDuration()` — Duración correcta por servicio
- [ ] `detectConflicts()` — Detectar solapamientos de turnos

### Manejo de Errores
- [ ] `sanitizeInput()` — Prevenir XSS (remover scripts)
- [ ] `validateServiceID()` — ID de servicio existe en BD
- [ ] `validateClientID()` — Cliente registrado
- [ ] `handleNetworkError()` — Reintentos automáticos
- [ ] `logError()` — Registrar errores sin exponer datos sensibles

---

## 2. INTEGRATION TESTS — Operaciones Supabase

### Tabla `gf_services`
- [ ] **Create:** Insertar nuevo servicio con todos los campos
- [ ] **Read:** Obtener lista completa de servicios
- [ ] **Update:** Modificar precio, duración, descripción
- [ ] **Delete:** Eliminar servicio (soft delete o physical)
- [ ] **Filter:** Filtrar por categoría, precio mín/máx

### Tabla `gf_appointments`
- [ ] **Create:** Reservar turno (INSERT con validación de disponibilidad)
- [ ] **Read:** Obtener turnos por cliente, por fecha, por rango
- [ ] **Update:** Cambiar hora/fecha de turno existente
- [ ] **Cancel:** Marcar turno como cancelado
- [ ] **Confirm:** Cambiar estado a confirmado
- [ ] **Conflict Check:** No permitir doble reserva en mismo slot

### Tabla `gf_blocked_slots`
- [ ] **Create:** Crear bloqueo de horario (vacaciones, mantenimiento)
- [ ] **Read:** Obtener bloqueos activos
- [ ] **Delete:** Remover bloqueo
- [ ] **Overlap Check:** Prevenir bloqueos solapados
- [ ] **Exclusion:** Excluir bloqueados de slots disponibles

### Tabla `gf_packs`
- [ ] **Create:** Insertar paquete (6 sesiones, descuento 15%)
- [ ] **Read:** Obtener packs disponibles
- [ ] **Update:** Cambiar precio o descripción del pack
- [ ] **Delete:** Discontinuar paquete
- [ ] **Sessions:** Rastrear sesiones consumidas vs restantes

### Edge Function `notify-booking`
- [ ] **Trigger:** Se ejecuta al crear appointment
- [ ] **Email Cliente:** Recibe confirmación con detalles
- [ ] **Email Admin:** Notificación interna con contacto
- [ ] **Template:** Usar template correcto (HTML bien formado)
- [ ] **Error Handling:** Si falla Resend, loguear sin romper transacción
- [ ] **Retry Logic:** Reintentar si hay error transitorio

### Autenticación Supabase
- [ ] **Admin Login:** Email + password correcto permite acceso
- [ ] **Session Persistence:** Token JWT se mantiene tras reload
- [ ] **Logout:** Limpiar sesión, redirigir a login
- [ ] **Forbidden Access:** Rutas admin no accesibles sin auth

### Transacciones
- [ ] **Booking Atomic:** Crear appointment + decrementar pack (si aplica) en transacción
- [ ] **Rollback:** Si falla email, no crear turno
- [ ] **Concurrency:** Dos usuarios no pueden reservar mismo slot

---

## 3. END-TO-END TESTS — Flujos de Usuario

### Flujo Público: Reservar Turno
**Precondición:** Usuario no autenticado, llega a https://gf-studio.vercel.app

**Pasos:**
1. [ ] Página carga con hero, galería, servicios
2. [ ] Scroll a servicios muestra lista completa
3. [ ] Click en servicio abre detalles (overlays, precio, duración)
4. [ ] Click "Reservar" abre calendario
5. [ ] Seleccionar fecha disponible (excluir pasadas, bloqueadas)
6. [ ] Seleccionar hora disponible (09:00-18:00, cada 30 min)
7. [ ] Ingresar nombre completo (validación en vivo)
8. [ ] Ingresar email (validación formato)
9. [ ] Ingresar teléfono (+54 9 XXXX XXXXXX)
10. [ ] Aplicar cupón (opcional, descuento actualiza total)
11. [ ] Seleccionar método de pago (Mercado Pago, transferencia)
12. [ ] Click "Confirmar Reserva"
13. [ ] Transacción de pago (simulada en dev)
14. [ ] Recibir confirmación en pantalla
15. [ ] Email de confirmación llega a cliente
16. [ ] QR para agregar a calendario

### Flujo Público: Comprar Paquete
1. [ ] Navegar a sección de paquetes
2. [ ] Ver descripción y precio con descuento
3. [ ] Click "Comprar Pack"
4. [ ] Ingresar datos (nombre, email, teléfono)
5. [ ] Pago Mercado Pago
6. [ ] Código de acceso al pack generado
7. [ ] Email con código e instrucciones

### Flujo Admin: Listar Turnos
**Precondición:** Admin autenticado en /admin.html

1. [ ] Sidebar carga con opciones (Turnos, Servicios, Bloqueos, etc.)
2. [ ] Click "Turnos" muestra tabla completa
3. [ ] Tabla tiene columnas: Cliente, Servicio, Fecha, Hora, Estado
4. [ ] Filtrar por fecha rango (fecha_inicio, fecha_fin)
5. [ ] Filtrar por estado (confirmado, pendiente, cancelado)
6. [ ] Buscar por nombre de cliente (busca mientras escribes)
7. [ ] Ordenes por fecha, cliente, estado
8. [ ] Total de turnos y summary (hoy, esta semana, próximos 7 días)

### Flujo Admin: Crear Turno Manual
1. [ ] Click "Nuevo Turno"
2. [ ] Selector de cliente (buscar o crear cliente nuevo)
3. [ ] Selector de servicio (autocomplete)
4. [ ] Date picker para fecha
5. [ ] Time picker para hora (solo slots disponibles)
6. [ ] Validación de conflictos en tiempo real
7. [ ] Click "Crear" guarda y muestra confirmación
8. [ ] Turno aparece inmediatamente en tabla

### Flujo Admin: Editar Turno
1. [ ] Click en turno abre modal de edición
2. [ ] Permitir cambiar fecha, hora, cliente, servicio
3. [ ] Validar disponibilidad de nuevo slot
4. [ ] Opción de notificar cliente por cambio
5. [ ] Click "Guardar" actualiza
6. [ ] Mostrar confirmación

### Flujo Admin: Cancelar Turno
1. [ ] Click en turno → opción "Cancelar"
2. [ ] Requerir motivo (dropdown: Cliente solicitó, No se presentó, Enfermedad, Otro)
3. [ ] Opción de notificar cliente
4. [ ] Turno marca como "cancelado"
5. [ ] Reembolso automático si corresponde

### Flujo Admin: Gestionar Servicios
1. [ ] Listar servicios con precio, duración, descripción
2. [ ] Crear nuevo servicio (nombre, descripción, precio, duración)
3. [ ] Editar servicio existente
4. [ ] Activar/desactivar servicio
5. [ ] Ver cantidad de turnos booked para cada servicio

### Flujo Admin: Bloquear Horarios
1. [ ] Click "Bloquear Horarios"
2. [ ] Seleccionar rango de fechas (ej: 20-25 abril = vacaciones)
3. [ ] Seleccionar rango horario (opcional: si no, bloqueada todo el día)
4. [ ] Motivo (vacaciones, mantenimiento, médico)
5. [ ] Guardar → excluye esos slots para nuevas reservas
6. [ ] Opción de cancelar turnos conflictivos automáticamente

### Flujo Admin: Gestionar Cupones
1. [ ] Listar cupones activos (código, descuento %, vigencia)
2. [ ] Crear cupón (código, descuento, fecha inicio/fin, uso máximo)
3. [ ] Validar códigos únicos
4. [ ] Editar cupón (cambiar descuento, vigencia)
5. [ ] Desactivar cupón
6. [ ] Ver estadísticas (usos, clientes, revenue impact)

### Flujo Admin: Reportes
1. [ ] Reporte mensual (ingresos, cantidad turnos, servicios top)
2. [ ] Reporte semanal (mismos datos, vista weekly)
3. [ ] Exportar a CSV
4. [ ] Gráficos (ingresos por día, servicios más vendidos)

---

## 4. RESPONSIVE DESIGN TESTS — Mobile & Tablet

### Devices a Probar
- [ ] iPhone SE (375px)
- [ ] iPhone 14 (390px)
- [ ] iPhone 14 Pro Max (430px)
- [ ] Pixel 7 (412px)
- [ ] iPad Mini (768px)
- [ ] iPad Pro 12.9" (1024px)
- [ ] Desktop 1920x1080

### Index.html (Landing & Booking)
- [ ] Hero section redimensiona correctamente
- [ ] Imagen de fondo no rebase viewport
- [ ] Galería en mobile es un carrusel (swipeable)
- [ ] Servicios: 1 columna en mobile, 2 en tablet, 3 en desktop
- [ ] Modal de reserva es full-screen en mobile
- [ ] Inputs son touch-friendly (min 44px altura)
- [ ] Botones no solapan entre sí
- [ ] Textos legibles sin zoom (min 16px)
- [ ] Bottom margin bottom para evitar covering con teclado
- [ ] No hay horizontal scroll

### Admin.html (Panel)
- [ ] Sidebar colapsable en mobile (hamburger menu)
- [ ] Tabla de turnos scrollea horizontalmente sin romper layout
- [ ] Inputs en formularios son responsive
- [ ] Modal de edición usa full screen en mobile
- [ ] Filtros en mobile son dropdown (no multi-select ancho)
- [ ] Breadcrumbs adaptan a ancho disponible

### Orientación
- [ ] Portrait y landscape funcionan correctamente
- [ ] No hay elementos fijos que cubran contenido
- [ ] Keyboard modal no rompe scroll

---

## 5. ACCESSIBILITY TESTS — WCAG 2.1 AA

### Contrast (WCAG AA: 4.5:1 para texto, 3:1 para grandes)
- [ ] Texto negro sobre blanco/cream: ✓ suficiente contraste
- [ ] Texto en olive-dk sobre bone: ✓ 5.8:1
- [ ] Botones: ✓ olive-dk texto sobre sand bg = 5.2:1
- [ ] Error messages en rojo: ✓ contrast suficiente
- [ ] Disabled buttons: no caen en trampilla de contraste bajo

### Keyboard Navigation
- [ ] Tab order lógico (izq→der, top→bottom)
- [ ] Skip to main content link (primera tab)
- [ ] Todos los botones y links accionables con Enter/Space
- [ ] Modales cierran con Escape
- [ ] No hay keyboard trap
- [ ] Focus visible (outline clara, no `outline:none`)

### Screen Readers
- [ ] `<img alt="">` tiene alt text descriptivo
- [ ] `<button>` tiene texto claro (no vacíos, no "Click here")
- [ ] `<form>` tiene labels asociados (`<label for="email">`)
- [ ] Errors vinculados a inputs via `aria-describedby`
- [ ] Status messages (confirmaciones) usan `aria-live="polite"`
- [ ] Modal tiene `role="dialog"` y `aria-modal="true"`
- [ ] Tabla tiene `<th>` con scope, caption

### Color Dependence
- [ ] Estados (error, success, disabled) no se diferencian SOLO por color
- [ ] Error: rojo + icono X
- [ ] Success: verde + icono check
- [ ] Disabled: gris + cursor not-allowed

### Focus Management
- [ ] Abrir modal mueve focus a modal (no detrás)
- [ ] Cerrar modal retorna focus a botón que la abrió
- [ ] Modales grandes: enfoque en primer input

### Semantic HTML
- [ ] Usar `<button>` no `<div onclick>`
- [ ] Usar `<a>` para navegación, no `<div>`
- [ ] Headings en orden lógico (h1 → h2 → h3, sin saltos)
- [ ] Listas usar `<ul>` o `<ol>`, no `<div>` con estilos
- [ ] Tablas usar `<table>`, `<thead>`, `<tbody>`, `<th>`

### Forms
- [ ] Labels asociados: `<label for="email">`
- [ ] Inputs con `type="email"`, `type="tel"`, `type="date"`
- [ ] Required fields marcados con `required` y visualmente (*)
- [ ] Error messages descriptivos ("Email inválido" no solo "Error")
- [ ] Success feedback claro

### Motion & Animation
- [ ] Respetar `prefers-reduced-motion`
- [ ] Animaciones durables (>500ms son accesibles si no son esenciales)
- [ ] No tiene autoplay videos con sonido sin control

---

## 6. PERFORMANCE TESTS — Velocidad & Recursos

### Carga Inicial
- [ ] Tiempo a primera interactividad (TTI) < 3s
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] First Input Delay (FID) < 100ms

### Tamaño de Assets
- [ ] index.html < 150KB
- [ ] admin.html < 180KB
- [ ] CSS inline < 50KB
- [ ] React + Babel + Supabase CDNs < 500KB combinado
- [ ] Imagen hero < 100KB (optimizada)

### Runtime Performance
- [ ] Cambiar date picker no causa jank (60 fps)
- [ ] Filtrar tabla de turnos es fluido
- [ ] Scroll de servicios es smooth
- [ ] Modal animations no stutterean

### Network
- [ ] Requests a Supabase < 1s (P95)
- [ ] Edge Function (notify-booking) responde < 2s
- [ ] No hay waterfalls innecesarios (async/parallel cuando sea posible)
- [ ] Caching headers correctos en Vercel

### Memory
- [ ] No hay memory leaks (event listeners se limpian)
- [ ] Re-renders React no explotan memoria
- [ ] Modal al abrirse/cerrarse no deja ruido

### Lighthouse
- [ ] Performance score > 85
- [ ] Accessibility score > 95
- [ ] Best Practices score > 90
- [ ] SEO score > 90

---

## 7. SECURITY TESTS — Seguridad

### Inyección & XSS
- [ ] Input con `<script>alert('xss')</script>` se sanitiza
- [ ] Datos de BD no se renderizan sin escaping
- [ ] React escapa automáticamente (verificar que no hay `dangerouslySetInnerHTML` innecesario)
- [ ] HTML entities correctas en emails

### CSRF & Autenticación
- [ ] Requests a Supabase tienen token JWT válido
- [ ] Logout invalida sesión (token no funciona post-logout)
- [ ] No hay credenciales en URLs
- [ ] CORS correctamente configurado (only https://gf-studio.vercel.app)

### Datos Sensibles
- [ ] No hay CUITs, datos bancarios, SSNs en localStorage
- [ ] Token JWT no está visible en logs de consola
- [ ] Passwords nunca se loguean
- [ ] Emails sensibles no aparecen en error messages públicos

### API Security
- [ ] Supabase RLS está activo (row-level security)
- [ ] Admin no puede ver datos de otros admins (si hay multi-user)
- [ ] Clients no pueden ver datos de otros clients
- [ ] Edge Function valida requests (no hace queries sin parámetros)

### SQL Injection
- [ ] Supabase SDK previene (usa prepared statements)
- [ ] No hay query building con string concat
- [ ] Filtros dinámicos usan typed parameters

### Rate Limiting
- [ ] Multiple failed logins son rate-limited
- [ ] Booking API tiene rate limit (max 10 req/min por IP)
- [ ] Edge Function tiene timeout (< 10s)

### HTTPS & Headers
- [ ] Sitio solo accesible vía HTTPS
- [ ] Vercel secuirty headers están configurados
- [ ] CSP (Content Security Policy) permite CDNs necesarios
- [ ] X-Frame-Options previene clickjacking

---

## 8. CROSS-BROWSER COMPATIBILITY

### Desktop Browsers
- [ ] Chrome/Edge 100+ (Chromium)
- [ ] Firefox 95+
- [ ] Safari 15+ (macOS & iOS)

### Mobile Browsers
- [ ] Chrome Android
- [ ] Firefox Android
- [ ] Safari iOS
- [ ] Samsung Internet

### Testing específico
- [ ] CSS Grid & Flexbox funcionan en todos
- [ ] ES6 (const, arrow functions) transpilado via Babel ✓
- [ ] Fetch API soportado (polyfill si necesario)
- [ ] LocalStorage disponible
- [ ] CSS custom properties (--olive-dk) funcionan

### Bugs conocidos a vigilar
- [ ] Safari: input date picker es nativo (OK)
- [ ] Firefox: scroll suave puede ser choppy en modales grandes
- [ ] IE 11: NO soportado (OK, es 2026)

---

## 9. PROCEDIMIENTO DE TESTING

### Unit Tests (Local)
```bash
node tests/test-smoke.js
```
Ejecutar antes de cada commit.

### Mobile Testing
```
Abrir tests/test-mobile.html en navegador
- Chrome DevTools: F12 → Toggle device toolbar (Ctrl+Shift+M)
- Safari: Develop → Enter responsive design mode
- Probar en devices reales si es posible
```

### QA Checklist
```
Abrir tests/test-checklist.html
- Marcar test cases a medida que se prueban
- El navegador guarda progreso en localStorage
- Exportar resultados antes de release
```

### Full Testing Flow (Previa a Deploy)
1. Corre `test-smoke.js` → todo debe pasar
2. Abre `test-mobile.html` → prueba devices clave
3. Abre `test-checklist.html` → completa checklist
4. Verifica Lighthouse scores en Vercel preview
5. Prueba en navegadores reales (devices distintos)
6. Review CLAUDE.md changelog
7. Commit + push a main → Vercel auto-deploy

### Regression Testing
Después de cualquier cambio a:
- Supabase schema → corre integration tests
- Validaciones → corre unit tests
- Layout → corre mobile + accessibility tests
- Auth → corre security + integration tests

---

## 10. CRITERIO DE ACEPTACIÓN

**MVP debe pasar:**
- ✓ Todos los smoke tests
- ✓ Flujos públicos: Reservar turno (e2e)
- ✓ Flujos admin: Listar + crear turno (e2e)
- ✓ Mobile: iPhone 14, Pixel 7, iPad Mini
- ✓ Accessibility: WCAG AA en elementos clave
- ✓ Security: XSS, CSRF, auth basico
- ✓ Performance: LCP < 2.5s, CLS < 0.1

**Nice to have (post-MVP):**
- Lighthouse > 90 en todas categorías
- Todos los browsers testeados
- Edge cases documentados
- Performance budget < 500KB

---

## 11. TRACKING DE BUGS

Usar GitHub Issues con template:
```markdown
## [BUG] Descripción corta

### Reproducir
1. Paso 1
2. Paso 2
3. Resultado inesperado

### Esperado
Comportamiento correcto

### Evidencia
Screenshot/video

### Severity
Critical / High / Medium / Low

### Device
iPhone 14 / Chrome Desktop / etc
```

---

## 12. CHANGELOG & RELEASES

Cada testing cycle registrar:
- Fecha
- Version
- Tests ejecutados
- Issues encontrados
- % pass rate
- Sign-off de QA

Ejemplo:
```
## [2026-04-19] v1.0.0
- E2E: Booking flow ✓
- Mobile: iPhone, Pixel, iPad ✓
- Security: XSS, CSRF ✓
- Performance: LCP 1.8s, CLS 0.08 ✓
- Issues: 0 críticos, 2 menores
- Status: READY FOR PRODUCTION
```

---

**Última actualización:** 2026-04-19  
**Responsable:** QA Team  
**Próxima revisión:** Post-launch (después de 1 mes en producción)
