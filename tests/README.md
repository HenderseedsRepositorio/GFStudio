# GF Studio — Testing Suite

Estructura de testing integral para GF Studio (Sistema de reservas para estudio de belleza).

## Archivos

### 1. TEST-PLAN.md
**Plan comprehensivo de testing**

Contiene:
- Checklist de 130+ casos de test organizados por categoría
- Unit tests (validaciones, cálculos, formateo)
- Integration tests (Supabase, Edge Functions)
- E2E tests (flujos de usuario completos)
- Mobile responsiveness tests (iPhone, Pixel, iPad)
- Accessibility tests (WCAG 2.1 AA)
- Performance tests (Lighthouse, Core Web Vitals)
- Security tests (XSS, CSRF, auth)
- Browser compatibility tests
- Procedimiento de testing
- Criterio de aceptación
- Tracking de bugs

**Usar este archivo para:** Entender qué se debe probar y en qué orden.

---

### 2. test-smoke.js
**Script automático de validación básica**

Ejecuta verificaciones rápidas:
- Archivos HTML existen
- Tamaños dentro de límites
- HTML bien formado
- URLs de CDN accesibles
- Configuración Supabase presente
- Sin console.log, TODO, debugger
- Problemas de seguridad obvios
- Headers y CSP

**Usar así:**
```bash
cd /sessions/nice-happy-hopper/mnt/Documents/2-ClientesIA/gf-studio
node tests/test-smoke.js
```

**Cuándo ejecutar:**
- Antes de cada commit
- Pre-deploy a producción
- Después de cambios mayores

**Output:**
- Tabla con resultados
- Lista de problemas encontrados
- Exit code 0 (ok) o 1 (fallos)

---

### 3. test-mobile.html
**Herramienta interactiva de testing mobile**

Características:
- Presets de dispositivos: iPhone SE, iPhone 14, iPhone Pro Max, Pixel 7, iPad Mini, iPad Pro, Desktop 1920
- Toggle entre index.html (booking) y admin.html (panel)
- Mostrar/ocultar regla de pixeles
- Detectar automáticamente contenido que sobresale (overflow)
- Toggle portrait/landscape
- Botón para refrescar
- Sidebar con info del dispositivo

**Usar así:**
1. Abre `tests/test-mobile.html` en navegador
2. Selecciona dispositivo
3. Selecciona página (Booking o Admin)
4. Interactúa con la página dentro del iframe
5. Si ves borde rojo, hay overflow — corregir

**Ventajas:**
- No requiere DevTools
- Detecta automáticamente problemas
- Prueba todos los devices clave en un lugar

---

### 4. test-checklist.html
**Checklist interactivo con localStorage**

Características:
- 300+ casos de test organizados en 9 secciones
- Radio buttons: Pass / Fail / Skip per test
- Progreso guardado automáticamente en localStorage
- Barra de progreso (0-100%)
- Estadísticas en tiempo real (total, pasados, fallados, saltados)
- Filtro por estado (Todos, Pasados, Fallados, Saltados)
- Botones: Expandir/contraer todo, Marcar todo PASS, Resetear
- Exportar resultados a clipboard (formato resumido)
- Dark theme profesional

**Secciones:**
1. Flujo Público: Reservar Turno (12 tests)
2. Flujo Admin: Gestión de Turnos (10 tests)
3. Gestión de Servicios (5 tests)
4. Bloqueo de Horarios (5 tests)
5. Gestión de Cupones (7 tests)
6. UX Mobile & Responsive (10 tests)
7. Accesibilidad WCAG AA (10 tests)
8. Notificaciones & Emails (7 tests)
9. Performance & Carga (8 tests)
10. Seguridad & Auth (8 tests)
11. Compatibilidad Navegadores (7 tests)

**Usar así:**
1. Abre `tests/test-checklist.html` en navegador
2. Sigue cada sección del TEST-PLAN.md
3. Marca cada test: ✓ Pass, ✗ Fail, ⊘ Skip
4. Progreso se guarda automáticamente
5. Antes de deploy, exporta resultados: click "Copiar al portapapeles"
6. Pega en documento/email de sign-off

**Datos:**
- Se guardan en localStorage del navegador
- Permanecen aunque cierres la pestaña
- Click "Resetear" borra todo (requiere confirmación)

---

## Flujo de Testing Recomendado

### Antes de commit (5 min)
```bash
node tests/test-smoke.js
```
Verifica que no hay errores sintácticos obvios.

### Durante desarrollo (20 min)
```
1. Abre tests/test-mobile.html
2. Prueba iPhone 14 y Pixel 7
3. Verifica que no hay overflow
4. Interactúa con la feature nueva
```

### Pre-release (60 min)
```
1. Ejecuta smoke tests
   node tests/test-smoke.js

2. Completa checklist:
   - Abre tests/test-checklist.html
   - Sigue TEST-PLAN.md
   - Marca cada test
   - Marca al menos 70% como PASS

3. Prueba en navegadores reales:
   - Chrome Desktop
   - Safari iPhone
   - Chrome Android

4. Exporta resultados:
   - tests/test-checklist.html → "Copiar al portapapeles"
   - Guarda en documento de sign-off

5. Verifica Lighthouse en Vercel preview:
   - Performance > 85
   - Accessibility > 90
   - Best Practices > 85
   - SEO > 90
```

### Post-deploy (seguimiento)
```
- Monitor errores en Sentry (si está configurado)
- Recolecta feedback de usuarios
- Reporta bugs encontrados en producción
- Actualiza TEST-PLAN.md con nuevos casos descubiertos
```

---

## Estructura de Datos del Checklist

Los resultados se guardan en localStorage como JSON:
```javascript
{
  "bf-1": "pass",
  "bf-2": "fail",
  "bf-3": "skip",
  "ac-1": "pass",
  // ... más tests
}
```

Para acceder desde DevTools:
```javascript
JSON.parse(localStorage.getItem('gf-test-progress'))
```

---

## Checklist de QA Antes de Deploy

Antes de hacer `git push` a main:

- [ ] `node tests/test-smoke.js` ejecuta sin fallos críticos
- [ ] `tests/test-mobile.html` — sin overflow en iPhone, Pixel, iPad
- [ ] `tests/test-checklist.html` — al menos 70% PASS
- [ ] Lighthouse en Vercel preview: Performance > 85
- [ ] Probado en Chrome, Firefox, Safari (Desktop y Mobile)
- [ ] Probado con keyboard navigation
- [ ] Probado sin JavaScript (funcionalidad básica)
- [ ] URLs de Supabase están vivas
- [ ] Emails de confirmación se envían
- [ ] Cupones se aplican correctamente
- [ ] Admin puede crear/editar/cancelar turnos
- [ ] Mobile: inputs no se ocultan con teclado
- [ ] Mobile: botones son touch-friendly (min 44px)
- [ ] No hay console errors o warnings
- [ ] CHANGELOG.md está actualizado

---

## Criterios de Aceptación

**MVP debe pasar:**
- ✓ Todos los smoke tests (0 fallos críticos)
- ✓ Flujos públicos: Reservar turno (e2e en checklist)
- ✓ Flujos admin: Listar + crear turno (e2e en checklist)
- ✓ Mobile: iPhone 14, Pixel 7, iPad Mini sin overflow
- ✓ Accessibility: Focus visible, labels en formularios
- ✓ Security: Sin XSS obvios, auth funciona
- ✓ Performance: LCP < 2.5s, CLS < 0.1

**Nice to have (post-MVP):**
- Lighthouse > 90 en todas categorías
- Todos los navegadores testeados
- 100% del checklist PASS
- Performance budget < 500KB

---

## Troubleshooting

### "Admin.html supera 180KB"
- Minimizar CSS/JS inline
- Considerar separar en múltiples archivos
- Revisar assets (imágenes, fonts)

### "Possibly unclosed tags"
- False positives si usas componentes React personalizados
- Verificar manualmente si son reales
- Ignorar si la página carga correctamente

### "URLs de CDN no accesibles"
- Normal si no tienes internet
- En Vercel, los CDNs se cachean automáticamente
- No impide deploy

### "innerHTML = encontrado"
- Revisar dónde se usa
- Reemplazar con `.textContent` si es posible
- Si es necesario, sanitizar input primero

### "Supabase URL/Key no encontrada"
- Verificar que están en index.html
- En minified/uglified, pueden ser hard de detectar
- Asegurarse de que `createClient()` se llama

---

## Historial de Releases

Registrar aquí después de cada deploy:

```markdown
## [YYYY-MM-DD] v1.0.0
- E2E: Booking flow ✓
- E2E: Admin CRUD ✓
- Mobile: iPhone, Pixel, iPad ✓
- Accessibility: WCAG AA basics ✓
- Performance: LCP 1.8s, CLS 0.08 ✓
- Security: XSS, CSRF básico ✓
- Issues encontrados: 0 críticos, 3 menores
- Status: READY FOR PRODUCTION
- Testeado por: [Nombre QA]
- Timestamp: 2026-04-19 17:30 UTC

## [YYYY-MM-DD] v0.9.0
(pre-release)
```

---

## Stack & Herramientas

- **HTML Validator:** Script simple (test-smoke.js)
- **Mobile Testing:** Test interactivo (test-mobile.html)
- **QA Checklist:** Checklist interactivo (test-checklist.html)
- **Lighthouse:** A través de Vercel preview
- **DevTools:** Chrome/Firefox/Safari nativas
- **Manual Testing:** En dispositivos reales

---

## Contacto & Notas

- **Responsable:** QA Team
- **Última actualización:** 2026-04-19
- **Próxima revisión:** Post-launch (después de 1 mes en producción)

Para preguntas o sugerencias de mejora, abrir issue en GitHub.

---

**GF Studio Testing Suite v1.0** — Para desarrollo interno — No distribuir
