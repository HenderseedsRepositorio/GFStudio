-- =====================================================
-- Fase D — Rediseño completo
-- Tablas nuevas: gf_coupons, gf_clients, gf_content
-- Extensiones: gf_services, gf_packs, gf_appointments
-- =====================================================

-- ---------- 1. gf_coupons ----------
CREATE TABLE IF NOT EXISTS public.gf_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text,
  type text NOT NULL DEFAULT 'percent' CHECK (type IN ('percent','fixed')),
  value numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  valid_from date,
  valid_to date,
  max_uses int,
  uses_count int NOT NULL DEFAULT 0,
  max_per_client int NOT NULL DEFAULT 1,
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','services','packs')),
  applies_ids int[] NOT NULL DEFAULT '{}',
  min_amount numeric,
  first_visit_only boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.gf_coupons ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_coupons' AND policyname='open_read') THEN
    CREATE POLICY "open_read" ON public.gf_coupons FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_coupons' AND policyname='open_insert') THEN
    CREATE POLICY "open_insert" ON public.gf_coupons FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_coupons' AND policyname='open_update') THEN
    CREATE POLICY "open_update" ON public.gf_coupons FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_coupons' AND policyname='open_delete') THEN
    CREATE POLICY "open_delete" ON public.gf_coupons FOR DELETE USING (true);
  END IF;
END $$;

-- ---------- 2. gf_clients ----------
CREATE TABLE IF NOT EXISTS public.gf_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text UNIQUE,
  email text,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.gf_clients ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_clients' AND policyname='open_read') THEN
    CREATE POLICY "open_read" ON public.gf_clients FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_clients' AND policyname='open_insert') THEN
    CREATE POLICY "open_insert" ON public.gf_clients FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_clients' AND policyname='open_update') THEN
    CREATE POLICY "open_update" ON public.gf_clients FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_clients' AND policyname='open_delete') THEN
    CREATE POLICY "open_delete" ON public.gf_clients FOR DELETE USING (true);
  END IF;
END $$;

-- ---------- 3. gf_content ----------
CREATE TABLE IF NOT EXISTS public.gf_content (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.gf_content ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_content' AND policyname='open_read') THEN
    CREATE POLICY "open_read" ON public.gf_content FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_content' AND policyname='open_insert') THEN
    CREATE POLICY "open_insert" ON public.gf_content FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_content' AND policyname='open_update') THEN
    CREATE POLICY "open_update" ON public.gf_content FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_content' AND policyname='open_delete') THEN
    CREATE POLICY "open_delete" ON public.gf_content FOR DELETE USING (true);
  END IF;
END $$;

-- ---------- 4. gf_services — extender ----------
ALTER TABLE public.gf_services
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_order int,
  ADD COLUMN IF NOT EXISTS category text;

UPDATE public.gf_services SET display_order = id WHERE display_order IS NULL;

UPDATE public.gf_services SET category =
  CASE
    WHEN lower(name) LIKE '%pestañ%' AND lower(name) NOT LIKE '%ceja%' THEN 'pestañas'
    WHEN lower(name) LIKE '%ceja%' THEN 'cejas'
    WHEN lower(name) LIKE '%depil%' THEN 'depilación'
    WHEN lower(name) LIKE '%maquill%' THEN 'maquillaje'
    WHEN lower(name) LIKE '%facial%'
      OR lower(name) LIKE '%limpieza%'
      OR lower(name) LIKE '%radiofrec%'
      OR lower(name) LIKE '%led%'
      OR lower(name) LIKE '%fototerap%'
      OR lower(name) LIKE '%peeling%'
      OR lower(name) LIKE '%hidrat%'
      OR lower(name) LIKE '%mascar%'
      OR lower(name) LIKE '%dermapl%'
      OR lower(name) LIKE '%skincare%'
      OR lower(name) LIKE '%anti-edad%'
      OR lower(name) LIKE '%antiedad%'
    THEN 'facial'
    ELSE 'otros'
  END
WHERE category IS NULL;

-- ---------- 5. gf_packs — extender ----------
ALTER TABLE public.gf_packs
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS services jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS valid_days int NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS landing_visible boolean NOT NULL DEFAULT true;

-- ---------- 6. gf_appointments — extender ----------
ALTER TABLE public.gf_appointments
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_price numeric,
  ADD COLUMN IF NOT EXISTS mp_preference_id text,
  ADD COLUMN IF NOT EXISTS mp_payment_status text NOT NULL DEFAULT 'pending'
    CHECK (mp_payment_status IN ('pending','approved','rejected','refunded','in_process')),
  ADD COLUMN IF NOT EXISTS mp_payment_id text,
  ADD COLUMN IF NOT EXISTS sena_amount numeric;

-- Ampliar status check para incluir 'completed'
DO $$
DECLARE con_name text;
BEGIN
  SELECT conname INTO con_name FROM pg_constraint
  WHERE conrelid = 'public.gf_appointments'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%'
    AND pg_get_constraintdef(oid) NOT ILIKE '%mp_payment_status%'
  LIMIT 1;
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.gf_appointments DROP CONSTRAINT %I', con_name);
  END IF;
  ALTER TABLE public.gf_appointments
    ADD CONSTRAINT gf_appointments_status_check
    CHECK (status IN ('pending','confirmed','cancelled','no_show','completed'));
END $$;

-- ---------- 7. Seeds (idempotentes) ----------

-- Contenido del landing
INSERT INTO public.gf_content (key, value) VALUES
('hero', '{"tag":"Reservando turnos para mayo","title_a":"El arte","title_b":"de cuidarte","quote":"Técnica profesional, espacio relajado y resultados que se sostienen en el tiempo.","quote_attr":"Desde 2026 en Henderson","sticker":"Abril\n—\n10% off\n1º turno","stat_a_v":"+400","stat_a_l":"Clientas","stat_b_v":"4.9★","stat_b_l":"Google"}'::jsonb),
('about', '{"title_a":"Un espacio pensado","title_b":"desde el detalle","body_main":"Soy Guada. GF Studio nació en Henderson para ofrecer tratamientos de belleza que respeten tu tiempo y tu piel — sin atajos, con técnica profesional y productos que elijo uno por uno.","body_sec":"Me especializo en cejas, faciales y terapias combinadas. Cada sesión arranca con una consulta breve: no todas las pieles son iguales, ni todas las cejas quieren lo mismo.","stat_a_v":"3+","stat_a_l":"Años de experiencia","stat_b_v":"12","stat_b_l":"Tratamientos en carta","stat_c_v":"1:1","stat_c_l":"Atención personalizada"}'::jsonb),
('contact', '{"phone":"+54 9 2314 55-5856","whatsapp":"5492314555856","instagram":"@gf.studio.henderson","address":"Hipólito Yrigoyen 229, Henderson","hours":"Lunes a sábado · 09:00 — 18:00","email":"hola@gfstudio.com.ar"}'::jsonb),
('faq', '[{"q":"¿Cómo reservo un turno?","a":"Desde el botón Reservá tu turno elegís servicio, día y horario. Recibís confirmación por email y Guada te confirma por WhatsApp el mismo día."},{"q":"¿Necesito seña para reservar?","a":"Por ahora no. La reserva es directa. Si no podés venir, avisá hasta 4hs antes por WhatsApp — después se cobra el 50% del servicio."},{"q":"¿Cuándo abre el estudio?","a":"Lunes a sábado de 09:00 a 18:00. Fuera de ese horario podés escribirnos por WhatsApp y coordinamos."},{"q":"¿Aceptan tarjeta?","a":"Sí, todos los medios de pago: efectivo, transferencia, débito y crédito."},{"q":"¿Los packs tienen vencimiento?","a":"No hay vencimiento estricto, pero recomendamos consumirlos dentro de los 3 meses."},{"q":"¿Dónde están ubicadas?","a":"En Hipólito Yrigoyen 229, centro de Henderson (Buenos Aires)."}]'::jsonb),
('testimonials', '[{"name":"Lucía P.","svc":"Laminado de cejas","text":"Cambió mi cara. Guada tiene un ojo para la forma que pocas tienen.","rating":5,"visible":true},{"name":"Martina T.","svc":"Radiofrecuencia facial","text":"Hice el pack de 4 y la diferencia es real. Piel más tensa y luminosa.","rating":5,"visible":true},{"name":"Carla L.","svc":"Limpieza profunda","text":"Espacio muy relajado, productos de calidad. Ya reservé la próxima.","rating":5,"visible":true}]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Cupones de ejemplo (mapeados a IDs reales: facial = svc 3,4,5)
INSERT INTO public.gf_coupons (code, name, type, value, valid_from, valid_to, max_uses, max_per_client, applies_to, applies_ids, first_visit_only, active) VALUES
('OTONO20',   'Otoño 20% off',         'percent', 20,    '2026-04-01', '2026-05-31', 100,  1, 'all',      '{}'::int[],     false, true),
('PRIMERA10', 'Primer turno 10% off',  'percent', 10,    NULL,         NULL,         NULL, 1, 'services', '{3,4,5,11,12}'::int[], true,  true),
('PACK5K',    '$5.000 off en packs',   'fixed',   5000,  '2026-04-01', '2026-06-30', 50,   2, 'packs',    '{}'::int[],     false, true),
('AMIGA15',   'Referido 15%',          'percent', 15,    '2026-03-01', '2026-03-31', 30,   1, 'all',      '{}'::int[],     false, false)
ON CONFLICT (code) DO NOTHING;

-- Packs (solo si la tabla está vacía — IDs de servicios reales)
INSERT INTO public.gf_packs (name, description, services, pack_price, list_price, valid_days, active, landing_visible)
SELECT * FROM (VALUES
  ('Radiofrecuencia + LED — x4', '4 sesiones combinadas. Resultado progresivo en 2 meses.',           '[{"svc_id":5,"qty":4},{"svc_id":3,"qty":4}]'::jsonb,                 76800::numeric, 96000::numeric, 90,  true,  true),
  ('Limpieza profunda — x3',     '3 limpiezas mensuales. Mantenimiento piel grasa o acneica.',        '[{"svc_id":4,"qty":3}]'::jsonb,                                       72000::numeric, 84000::numeric, 120, true,  true),
  ('Mirada completa',            'Laminado + lifting de pestañas en una sesión.',                     '[{"svc_id":2,"qty":1},{"svc_id":8,"qty":1}]'::jsonb,                 34000::numeric, 40000::numeric, 0,   true,  true),
  ('Cuidado integral',           'Limpieza facial + LED + perfilado de cejas. Sesión de 2 horas.',    '[{"svc_id":4,"qty":1},{"svc_id":3,"qty":1},{"svc_id":1,"qty":1}]'::jsonb, 48000::numeric, 56000::numeric, 30,  true,  true)
) AS new_packs(name, description, services, pack_price, list_price, valid_days, active, landing_visible)
WHERE NOT EXISTS (SELECT 1 FROM public.gf_packs);

-- Sincronizar applies_ids del cupón PACK5K con los packs recién insertados
UPDATE public.gf_coupons
SET applies_ids = (SELECT ARRAY_AGG(id::int) FROM (SELECT id FROM public.gf_packs ORDER BY id LIMIT 2) t)
WHERE code = 'PACK5K' AND applies_ids = '{}'::int[];
