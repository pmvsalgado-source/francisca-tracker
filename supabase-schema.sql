-- ============================================
-- FRANCISCA DRIVE TRACKER — SUPABASE SCHEMA
-- Colar no SQL Editor do Supabase e executar
-- ============================================

-- Tabela de entradas de métricas
CREATE TABLE IF NOT EXISTS entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month_index INTEGER NOT NULL,        -- 0 a 5 (Mês 1 a Mês 6)
  metric_id TEXT NOT NULL,             -- ex: 'swing_speed', 'smash_factor'
  value TEXT,                          -- valor como texto (numero ou texto)
  updated_by TEXT,                     -- email do utilizador que guardou
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (month_index, metric_id)      -- um valor por mês por métrica
);

-- Permitir leitura e escrita a utilizadores autenticados
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler" ON entries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem escrever" ON entries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem actualizar" ON entries
  FOR UPDATE USING (auth.role() = 'authenticated');
