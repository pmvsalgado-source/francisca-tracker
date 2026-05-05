-- Week type operational override layer.
-- Use this project table because the local schema has training_plans by week,
-- but no training_weeks table.

CREATE TABLE IF NOT EXISTS week_overrides (
  week_start DATE PRIMARY KEY,
  week_type TEXT NULL CHECK (week_type IN ('load','deload','competition','transition')),
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE week_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read week overrides" ON week_overrides;
CREATE POLICY "Authenticated can read week overrides" ON week_overrides
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Coaches can insert week overrides" ON week_overrides;
CREATE POLICY "Coaches can insert week overrides" ON week_overrides
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('coach_golf','coach_gym','admin','Golf Coach','Putting Coach','Strength & Conditioning Coach')
    )
  );

DROP POLICY IF EXISTS "Coaches can update week overrides" ON week_overrides;
CREATE POLICY "Coaches can update week overrides" ON week_overrides
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('coach_golf','coach_gym','admin','Golf Coach','Putting Coach','Strength & Conditioning Coach')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('coach_golf','coach_gym','admin','Golf Coach','Putting Coach','Strength & Conditioning Coach')
    )
  );
