-- supabase/seed.sql
-- Seed idempotente de categorias e fontes iniciais do DailyBrief.

-- 1. Categorias padrão
INSERT INTO public.categories (slug, name)
VALUES
  ('geral', 'Geral'),
  ('politica', 'Política'),
  ('economia', 'Economia'),
  ('tecnologia', 'Tecnologia'),
  ('mundo', 'Mundo'),
  ('esportes', 'Esportes'),
  ('ciencia-saude', 'Ciência e Saúde'),
  ('maranhao', 'Maranhão')
ON CONFLICT (slug) DO NOTHING;

-- 2. Fontes iniciais (espelhando apps/backend/src/collector/feeds.config.ts)
INSERT INTO public.sources (slug, name, feed_url, site_url, default_category_id, enabled)
VALUES
  (
    'g1-geral',
    'G1 - Todas as Notícias',
    'https://g1.globo.com/rss/g1/',
    'https://g1.globo.com',
    (SELECT id FROM public.categories WHERE slug = 'geral'),
    true
  ),
  (
    'g1-tecnologia',
    'G1 - Tecnologia',
    'https://g1.globo.com/rss/g1/tecnologia/',
    'https://g1.globo.com/tecnologia',
    (SELECT id FROM public.categories WHERE slug = 'tecnologia'),
    true
  ),
  (
    'g1-economia',
    'G1 - Economia',
    'https://g1.globo.com/rss/g1/economia/',
    'https://g1.globo.com/economia',
    (SELECT id FROM public.categories WHERE slug = 'economia'),
    true
  )
ON CONFLICT (slug) DO NOTHING;
