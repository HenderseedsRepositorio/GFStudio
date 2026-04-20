-- =====================================================
-- Drop columna legacy duration (text "60 min")
-- 20 Abr 2026
--
-- El frontend usa duration_minutes (int) como source of truth.
-- admin.html ya no escribe duration en denormSvc.
-- =====================================================

BEGIN;

ALTER TABLE public.gf_services DROP COLUMN IF EXISTS duration;

COMMIT;
