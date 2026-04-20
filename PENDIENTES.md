# GF Studio — Pendientes post semi-final

**Estado al 18/04/2026:** versión semi-final desplegada en `https://gf-studio.vercel.app`.
Landing + admin operativos con datos reales, mobile fix aplicado, formato de duración humano.

---

## Hecho en esta ronda (18/04)

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

5. **Supabase Auth** → reemplazar `ADMIN_PASS="guada"` hardcodeado en [admin.html:~265](admin.html).
6. **Cerrar RLS** con políticas por usuario auth (hoy `USING (true)` en todas las tablas).
   > **Riesgo alto confirmado (19/04/2026):** la anon key permite `INSERT/UPDATE/DELETE` sobre `gf_services`, `gf_appointments`, `gf_blocked_slots`, `gf_packs` desde cualquier cliente. La única barrera hoy es que nadie conoce las URLs de admin. Prioridad alta cuando el link esté público.
7. **MercadoPago seña** — Activar `MP_ACCESS_TOKEN` en Supabase secrets **solo si** en el primer mes real `no-shows > 10%`. Las clientas recurrentes no pagan seña. El Edge Function `create-mp-preference` ya está deployado con fallback `{configured:false}`.
8. **Recordatorio WA automático** día anterior — cron Edge Function en Supabase.
9. **Reagendar desde admin** sin cancelar (hoy solo cambio de status + notas).
10. **Buscador** por nombre/teléfono en tab Turnos (hoy solo filtros por fecha/estado).
11. **Notificación sonora** al entrar turno nuevo (realtime ya está, solo falta alert sound + badge visual).
12. **Export CSV** desde tab Resultados.
13. **Templates WA editables** desde admin (hoy hardcodeados en `confirmAndWA` / `cancelAndNotify`).

## Nice to have (backlog)

14. **Lista de espera** cuando el día está completo.
15. **Programa de fidelidad** (cada N turnos, descuento automático como cupón generado).
16. **Encuesta post-turno** automática para generar Google Reviews.
17. **Tag VIP automático** en tab Clientes para `appts.length >= 5` (hoy existe visualmente como "Recurrente" pero no como tag en DB).
18. **Calendario ICS** en página de confirmación (botón "Agregar al calendario").
19. **JSON-LD LocalBusiness** en el head del index para SEO local.

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
