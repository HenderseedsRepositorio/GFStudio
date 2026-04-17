-- Fix gf_services RLS: add write policies (admin is JS-password-protected)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_services' AND policyname='open_insert') THEN
    CREATE POLICY "open_insert" ON gf_services FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_services' AND policyname='open_update') THEN
    CREATE POLICY "open_update" ON gf_services FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gf_services' AND policyname='open_delete') THEN
    CREATE POLICY "open_delete" ON gf_services FOR DELETE USING (true);
  END IF;
END $$;
