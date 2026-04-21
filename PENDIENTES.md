# GF Studio — Pendientes post semi-final

**Estado al 20/04/2026 (noche):** versión hardening + polish desplegada en `https://gf-studio.vercel.app`.
Fase D completa (Auth + RLS real), CI con secret-scan, staging branch, tech debt limpio, audit integral cerrado en 8/10.

---

## Hecho en esta ronda (20/04 tarde-noche) — polish del audit integral

- **Accesibilidad WCAG 2.1 AA** (`53a850e`) — aria-labels descriptivos en todos los botones sin texto (paginadores week/month del wizard de reserva, días de calendario, slots horarios, galería abrir/antes/después/cerrar, hamburguesa mobile, cerrar drawer). aria-pressed en toggles. aria-hidden en SVGs decorativos (via el componente `Icon` compartido cubre de una sola vez todo admin.html).
- **Mapa Google en Contacto** (`53a850e`) — iframe embebido con `?q=&output=embed` (sin API key). Grayscale(.3) para respetar la paleta. Lazy loading + referrer-policy.
- **Recuperar contraseña admin** (`53a850e`) — link "¿Olvidaste la contraseña?" en login con `sb.auth.resetPasswordForEmail` + redirect al admin. Toast éxito/error.
- **Honeypot anti-spam** (`75120a8`) — campo offscreen `<input name="website">` en StepData del booking. Si un bot lo llena, `handleSubmit` retorna inmediatamente a la pantalla de éxito sin insertar el turno. Log en consola para tracking.
- **`prefers-reduced-motion`** (`795a1d5`) — media query al final del `<style>` de ambos HTMLs que desactiva animaciones, transiciones, `.reveal`, ticker y dot-live cuando el SO pide movimiento reducido.

## Hecho en esta ronda (20/04 mañana) — hardening

- **Supabase Auth** reemplaza `ADMIN_PASS` hardcoded — admin.html usa `signInWithPassword` contra `guadalupefernandez016@gmail.com`.
- **RLS lockdown** con policies reales por rol (anon vs authenticated). View `gf_appointments_slots` expone solo id/fecha/hora/servicio/status para chequeo de colisión sin PII. Source: `20260420_rls_lockdown.sql`.
- **Edge Function `bump-coupon-usage`** con `service_role` para que anon no necesite UPDATE sobre `gf_coupons`. Valida active + valid_from/to + max_uses antes de bumpear.
- **Tokens fuera de docs versionadas** — CLAUDE.md con sección "Secrets: público vs privado" (3 niveles), checklist de rotación, secretos reales solo en `~/.bashrc` / Supabase secrets.
- **GitHub Actions CI** con 3 jobs — secret-scan (patrones `sbp_`, `"role":"service_role"`, `re_`, `APP_USR-`, `TEST-`), HTML tag balance, smoke post-deploy (200 + títulos).
- **Tech debt**: drop columna legacy `gf_services.duration`, cleanup root (5 archivos dead-weight borrados), assets/logo committed, skills-lock.json gitignored.
- **Staging branch** con deploy automático en Vercel — flujo documentado en CLAUDE.md.

## Hecho en rondas anteriores (18-19/04)

- **Fotos editoriales SVG** (`EditorialArt`) reemplazan placeholders de Gallery (9 items) + About — son arte vectorial custom con la paleta oliva/arena/crema. Placeholder hasta que Guada mande fotos reales.
- **Alertas de clientas dormidas** en tab Clientes: banner con cantidad de dormidas (31–90 días) e inactivas (>90 días), filtro "Dormidas", botón WA del drawer con mensaje contextual según tag (Dormida / Inactiva / Nueva / Recurrente).
- **Admin Resultados rediseñado**: 8 KPIs (ingresos, turnos, ticket prom., ocupación %, no-shows, cancelados, con cupón, clientas únicas) con comparativa vs período anterior (% y flecha), bar chart de día-de-semana, alerta si no-shows > 10%.
- **Mobile admin**: reemplazo del bottom-nav 8 items que no navegaba por un drawer overlay (hamburguesa + título del tab + backdrop blur). Cierra al tocar item y hace scrollTo(0,0).
- **Mobile landing**: `overflow-x:hidden` en html/body + hero con media query <640px (clamp 2.3–3.5rem) → no más scroll lateral indeseado.
- **Formato duración humano** estilo tuturno.io: `<60min → "35 min"`, `=60 → "1 hs"`, múltiplos → `"2 hs"`, resto → `"1:30 hs"`. Helper `fDur()` en 10 ubicaciones del UI (sin tocar el campo legacy `duration` de DB).

Commits: `32433f2` + `f1aaea6` en `main`.

---

## Pendientes críticos antes de promocionar el link a clientas

1. **Fotos reales del estudio** — Reemplazar los 10 `<EditorialArt kind="X"/>` en Gallery + About con `<img src="/assets/fotos/..."/>`. Las 10 variantes de `kind` están documentadas: `duo`, `brow`, `space`, `detail`, `facial`, `tools`, `ambience`, `portrait`, `product`, `studio`.
2. ~~**WhatsApp de Guada**~~ ✅ Hecho — toda la landing usa `WA_GUADA = "5492314555856"` como único número. La constante `WA` (testing, Alvaro) ya fue eliminada.
3. **Política de cancelación visible** — Agregar texto en StepData del booking ("Avisame con 24 hs si no podés"). Hoy no aparece.
4. **Dominio propio + Resend verificado** — Verificar `gfstudio.com` (o similar) en Resend para que `notify-booking` pueda mandar emails reales a clientas (hoy está en sandbox, solo llega a `onboarding@resend.dev`).

## Pendientes operativos (próxima iteración)

5. ~~**Supabase Auth**~~ ✅ Hecho (20/04) — `signInWithPassword` con email.
6. ~~**Cerrar RLS**~~ ✅ Hecho (20/04) — policies reales por rol, ver `20260420_rls_lockdown.sql`.
7. **MercadoPago seña** — Activar `MP_ACCESS_TOKEN` en Supabase secrets **solo si** en el primer mes real `no-shows > 10%`. Las clientas recurrentes no pagan seña. El Edge Function `create-mp-preference` ya está deployado con fallback `{configured:false}`.
8. **Recordatorio WA automático** día anterior — cron Edge Function en Supabase.
9. ~~**Reagendar desde admin**~~ ✅ Hecho (20/04) — commit `350329d`.
10. **Buscador** por nombre/teléfono en tab Turnos (hoy solo filtros por fecha/estado).
11. ~~**Notificación sonora**~~ ✅ Hecho (20/04) — commit `2141017`.
12. ~~**Export CSV**~~ ✅ Hecho (20/04) — commit `2141017`.
13. **Templates WA editables** desde admin (hoy hardcodeados en `confirmAndWA` / `cancelAndNotify`).
14. **Sentry (errors + performance)** — diferido: falta DSN. Cuando lo tengamos, meter el script en index.html/admin.html + env var en Vercel.
15. **Bump `actions/checkout@v4` → v5 o Node 24** — warning de deprecación en CI (Node.js 20 se saca el 16/09/2026, forzado a Node 24 el 02/06/2026). Editar `.github/workflows/ci.yml` y subir la action. No bloqueante hasta junio.

## Nice to have (backlog)

15. **Lista de espera** cuando el día está completo.
16. **Programa de fidelidad** (cada N turnos, descuento automático como cupón generado).
17. **Encuesta post-turno** automática para generar Google Reviews.
18. **Tag VIP automático** en tab Clientes para `appts.length >= 5` (hoy existe visualmente como "Recurrente" pero no como tag en DB).
19. **Calendario ICS** en página de confirmación (botón "Agregar al calendario").
20. ~~**JSON-LD LocalBusiness**~~ ✅ Hecho (20/04) — commit `2141017` (SEO canonical + JSON-LD).

---

## Testing sugerido antes de promocionar

- [ ] Guada prueba el admin durante 1 semana con datos reales
- [ ] Testear booking end-to-end en celular de Guada (iOS/Android real, no emulator)
- [ ] Verificar que `notify-booking` mande email a `guadaf.studio@gmail.com` OK
- [ ] Dashboard Supabase: revisar RLS + logs de Edge Functions
- [ ] Smoke test de cupones: OTONO20, PRIMERA10, PACK5K

## Issues conocidos

- **Emails sandbox Resend** — `notify-booking` solo puede mandar a `guadaf.studio@gmail.com`. Email a clienta no llega hasta que se verifique dominio propio.
- **Foto hero ausente** — el hero no tiene foto, es tipografía pura. Evaluar si agregar foto de Guada al pie del hero cuando esté disponible.

---

## Referencias

- **Roadmap completo:** `project_gf_roadmap.md` en memoria (3 sprints priorizados)
- **Estado técnico Fase D:** `project_gf_studio_turnera.md` en memoria
- **Estrategia señas:** `project_senas_estrategia.md` en memoria
- **Preferencias trabajo:** `user_alvaro_gf.md` en memoria
- **Guía dev:** `CLAUDE.md` en root del repo
