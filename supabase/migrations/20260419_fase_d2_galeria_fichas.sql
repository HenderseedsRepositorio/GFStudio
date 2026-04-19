-- =====================================================
-- Fase D.2 — Galería real, Fichas de clienta, Testimonios editables
-- 19 Abr 2026
-- =====================================================

-- ---------- 1. gf_gallery — fotos reales (antes/después) ----------
CREATE TABLE IF NOT EXISTS public.gf_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  description text,
  category text NOT NULL DEFAULT 'otros',
  service_id int REFERENCES public.gf_services(id) ON DELETE SET NULL,
  before_url text,
  after_url text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.gf_gallery ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_gallery' AND policyname='open_read') THEN
    CREATE POLICY "open_read" ON public.gf_gallery FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_gallery' AND policyname='open_insert') THEN
    CREATE POLICY "open_insert" ON public.gf_gallery FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_gallery' AND policyname='open_update') THEN
    CREATE POLICY "open_update" ON public.gf_gallery FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_gallery' AND policyname='open_delete') THEN
    CREATE POLICY "open_delete" ON public.gf_gallery FOR DELETE USING (true);
  END IF;
END $$;

-- ---------- 2. gf_ficha_questions — plantilla de preguntas ----------
CREATE TABLE IF NOT EXISTS public.gf_ficha_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  hint text,
  category text NOT NULL DEFAULT 'general',
  type text NOT NULL DEFAULT 'text'
    CHECK (type IN ('text','textarea','number','select','scale','boolean')),
  options text[] NOT NULL DEFAULT '{}',
  display_order int NOT NULL DEFAULT 0,
  required boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.gf_ficha_questions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_ficha_questions' AND policyname='open_read') THEN
    CREATE POLICY "open_read" ON public.gf_ficha_questions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_ficha_questions' AND policyname='open_insert') THEN
    CREATE POLICY "open_insert" ON public.gf_ficha_questions FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_ficha_questions' AND policyname='open_update') THEN
    CREATE POLICY "open_update" ON public.gf_ficha_questions FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_ficha_questions' AND policyname='open_delete') THEN
    CREATE POLICY "open_delete" ON public.gf_ficha_questions FOR DELETE USING (true);
  END IF;
END $$;

-- ---------- 3. gf_fichas — ficha completada por clienta ----------
CREATE TABLE IF NOT EXISTS public.gf_fichas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_phone text NOT NULL,
  client_name text,
  appointment_id uuid REFERENCES public.gf_appointments(id) ON DELETE SET NULL,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  professional_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gf_fichas_phone_idx ON public.gf_fichas (client_phone);
CREATE INDEX IF NOT EXISTS gf_fichas_created_idx ON public.gf_fichas (created_at DESC);

ALTER TABLE public.gf_fichas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_fichas' AND policyname='open_read') THEN
    CREATE POLICY "open_read" ON public.gf_fichas FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_fichas' AND policyname='open_insert') THEN
    CREATE POLICY "open_insert" ON public.gf_fichas FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_fichas' AND policyname='open_update') THEN
    CREATE POLICY "open_update" ON public.gf_fichas FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_fichas' AND policyname='open_delete') THEN
    CREATE POLICY "open_delete" ON public.gf_fichas FOR DELETE USING (true);
  END IF;
END $$;

-- ---------- 4. Seeds: preguntas iniciales de la ficha ----------
INSERT INTO public.gf_ficha_questions (question, hint, category, type, options, display_order, required) VALUES
('¿Cuánta agua tomás por día?', 'Aprox. en litros o vasos', 'habitos', 'text', '{}', 10, false),
('Exposición al sol', '¿Usás protector solar? ¿Con qué frecuencia?', 'habitos', 'textarea', '{}', 20, false),
('¿Fumás?', NULL, 'habitos', 'select', '{"No","Social","Sí, todos los días"}', 30, false),
('Horas de sueño promedio', NULL, 'habitos', 'select', '{"Menos de 5","5 a 6","7 a 8","Más de 8"}', 40, false),
('Tipo de piel', NULL, 'piel', 'select', '{"Seca","Mixta","Grasa","Sensible","No sé"}', 50, true),
('¿Alguna alergia o condición dermatológica?', 'Rosácea, dermatitis, eczema, alergias a productos, etc.', 'piel', 'textarea', '{}', 60, false),
('Medicación actual', 'Si toma algún medicamento que pueda afectar el tratamiento', 'salud', 'textarea', '{}', 70, false),
('¿Está embarazada o en período de lactancia?', NULL, 'salud', 'boolean', '{}', 80, false),
('Rutina de skincare actual', 'Qué productos usa habitualmente', 'rutina', 'textarea', '{}', 90, false),
('Objetivo principal con el tratamiento', '¿Qué espera lograr?', 'rutina', 'textarea', '{}', 100, true),
('Comentarios profesionales', 'Observaciones de la sesión (solo lo ve el equipo)', 'notas', 'textarea', '{}', 200, false)
ON CONFLICT DO NOTHING;

-- ---------- 5. Seed: galería vacía (Guada agrega sus fotos desde admin) ----------
-- (sin seed — arranca vacía)

-- ---------- 6. Actualizar narrativa de "about" en gf_content ----------
UPDATE public.gf_content
SET value = jsonb_set(
  jsonb_set(
    value,
    '{body_main}',
    '"Soy Guada. GF Studio nació de la idea de brindar un servicio de belleza de verdad: con tiempo para cada piel, técnica profesional y productos que elijo uno por uno. Un espacio donde cuidarse es una experiencia, no un trámite."'::jsonb
  ),
  '{body_sec}',
  '"Me especializo en cejas, faciales y terapias combinadas. Cada sesión arranca con una consulta breve: no todas las pieles son iguales, ni todas las cejas quieren lo mismo."'::jsonb
)
WHERE key = 'about';
