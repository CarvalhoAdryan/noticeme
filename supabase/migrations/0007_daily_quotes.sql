-- 0007_daily_quotes.sql
-- Tabela global para armazenar o histórico de citações do "Pensamento do Dia" (ZenQuotes).

CREATE TABLE IF NOT EXISTS public.daily_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote text NOT NULL,
  author text NOT NULL,
  display_date date NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'https://zenquotes.io',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_quotes_display_date_desc
  ON public.daily_quotes (display_date DESC);

ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;

-- Leitura pública apenas para consulta (escrita restrita ao backend via DATABASE_URL / service_role)
DROP POLICY IF EXISTS "daily_quotes_select_public" ON public.daily_quotes;
CREATE POLICY "daily_quotes_select_public"
  ON public.daily_quotes
  FOR SELECT
  TO anon, authenticated
  USING (true);
