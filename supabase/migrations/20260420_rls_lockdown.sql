-- =====================================================
-- RLS Lockdown — policies por rol (anon vs authenticated)
-- 20 Abr 2026
--
-- Hasta ahora todas las policies eran USING(true) en todas las operaciones.
-- Esto cierra el acceso: anon solo puede leer catálogo público + insertar
-- turnos/clientes. Authenticated (admin logueado) mantiene ALL.
-- =====================================================

BEGIN;

-- ---------- 1. VIEW pública de slots (sin PII) ----------
-- La landing necesita chequear slots ocupados sin ver datos del cliente.
-- Esta view expone solo los campos necesarios para colisión de horarios.
CREATE OR REPLACE VIEW public.gf_appointments_slots AS
  SELECT
    id,
    appointment_date,
    time_slot,
    service_id,
    status
  FROM public.gf_appointments
  WHERE status IN ('pending', 'confirmed');

GRANT SELECT ON public.gf_appointments_slots TO anon, authenticated;

-- ---------- 2. Drop TODAS las policies existentes en gf_* ----------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename LIKE 'gf\_%' ESCAPE '\'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ---------- 3. RLS enabled en todas las tablas ----------
ALTER TABLE public.gf_services           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gf_appointments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gf_blocked_slots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gf_packs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gf_coupons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gf_clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gf_content            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gf_gallery            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gf_ficha_questions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gf_fichas             ENABLE ROW LEVEL SECURITY;

-- ---------- 4. gf_services ----------
-- anon: lee solo activos (o los nullos que se asumen activos)
CREATE POLICY gf_services_anon_select ON public.gf_services
  FOR SELECT TO anon
  USING (COALESCE(active, true) = true);
-- authenticated (admin): todo
CREATE POLICY gf_services_auth_all ON public.gf_services
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ---------- 5. gf_appointments ----------
-- anon: INSERT con guards; NO SELECT (usa view gf_appointments_slots)
CREATE POLICY gf_appointments_anon_insert ON public.gf_appointments
  FOR INSERT TO anon
  WITH CHECK (
    status = 'pending'
    AND appointment_date >= CURRENT_DATE
  );
-- authenticated: todo
CREATE POLICY gf_appointments_auth_all ON public.gf_appointments
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ---------- 6. gf_blocked_slots ----------
CREATE POLICY gf_blocked_slots_anon_select ON public.gf_blocked_slots
  FOR SELECT TO anon USING (true);
CREATE POLICY gf_blocked_slots_auth_all ON public.gf_blocked_slots
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ---------- 7. gf_packs ----------
CREATE POLICY gf_packs_anon_select ON public.gf_packs
  FOR SELECT TO anon
  USING (
    COALESCE(active, true) = true
    AND COALESCE(landing_visible, true) = true
  );
CREATE POLICY gf_packs_auth_all ON public.gf_packs
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ---------- 8. gf_coupons ----------
-- anon: lee activos. UPDATE de uses_count se mueve a Edge Function (1.4)
CREATE POLICY gf_coupons_anon_select ON public.gf_coupons
  FOR SELECT TO anon
  USING (COALESCE(active, true) = true);
CREATE POLICY gf_coupons_auth_all ON public.gf_coupons
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ---------- 9. gf_clients ----------
-- anon: solo INSERT (upsert de landing). NO SELECT (PII), NO UPDATE (se cambia
-- la landing a ignoreDuplicates:true para que upsert no requiera UPDATE).
CREATE POLICY gf_clients_anon_insert ON public.gf_clients
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY gf_clients_auth_all ON public.gf_clients
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ---------- 10. gf_content ----------
CREATE POLICY gf_content_anon_select ON public.gf_content
  FOR SELECT TO anon USING (true);
CREATE POLICY gf_content_auth_all ON public.gf_content
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ---------- 11. gf_gallery ----------
CREATE POLICY gf_gallery_anon_select ON public.gf_gallery
  FOR SELECT TO anon
  USING (COALESCE(active, true) = true);
CREATE POLICY gf_gallery_auth_all ON public.gf_gallery
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ---------- 12. gf_ficha_questions (privada) ----------
CREATE POLICY gf_ficha_questions_auth_all ON public.gf_ficha_questions
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ---------- 13. gf_fichas (privada) ----------
CREATE POLICY gf_fichas_auth_all ON public.gf_fichas
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

COMMIT;
