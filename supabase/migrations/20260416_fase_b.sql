-- Fase B migrations

-- 1. Duración en minutos para servicios
ALTER TABLE gf_services ADD COLUMN IF NOT EXISTS duration_minutes int NOT NULL DEFAULT 60;

-- Poblar duration_minutes según el text existente
UPDATE gf_services SET duration_minutes = 45 WHERE duration ILIKE '%45%';
UPDATE gf_services SET duration_minutes = 30 WHERE duration ILIKE '%30%';
UPDATE gf_services SET duration_minutes = 50 WHERE duration ILIKE '%50%';
UPDATE gf_services SET duration_minutes = 60 WHERE duration NOT ILIKE '%45%' AND duration NOT ILIKE '%30%' AND duration NOT ILIKE '%50%';

-- 2. Campos extra en turnos (para panel de resultados)
ALTER TABLE gf_appointments
  ADD COLUMN IF NOT EXISTS charged_price numeric,
  ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('efectivo','transferencia','tarjeta_debito','tarjeta_credito')),
  ADD COLUMN IF NOT EXISTS notes text;

-- 3. Tabla de bloqueos de agenda
CREATE TABLE IF NOT EXISTS gf_blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('datetime_range','full_day','date_range','weekly')),
  block_date date,
  start_time time,
  end_time time,
  date_from date,
  date_to date,
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),
  recurring_from date,
  recurring_to date,
  label text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- RLS para gf_blocked_slots
ALTER TABLE gf_blocked_slots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_blocked_slots' AND policyname='open_read') THEN
    CREATE POLICY "open_read" ON gf_blocked_slots FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_blocked_slots' AND policyname='open_insert') THEN
    CREATE POLICY "open_insert" ON gf_blocked_slots FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_blocked_slots' AND policyname='open_update') THEN
    CREATE POLICY "open_update" ON gf_blocked_slots FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_blocked_slots' AND policyname='open_delete') THEN
    CREATE POLICY "open_delete" ON gf_blocked_slots FOR DELETE USING (true);
  END IF;
END $$;
