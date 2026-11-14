-- supabase/seed.sql
-- Seed idempotente de categorias e fontes iniciais do DailyBrief (espelhando feeds.config.ts).

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
  -- Geral
  (
    'agencia-brasil',
    'Agência Brasil',
    'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',
    'https://agenciabrasil.ebc.com.br',
    (SELECT id FROM public.categories WHERE slug = 'geral'),
    true
  ),
  (
    'g1-geral',
    'g1',
    'https://g1.globo.com/rss/g1/',
    'https://g1.globo.com',
    (SELECT id FROM public.categories WHERE slug = 'geral'),
    true
  ),
  (
    'folha-geral',
    'Folha de S.Paulo',
    'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml',
    'https://www.folha.uol.com.br',
    (SELECT id FROM public.categories WHERE slug = 'geral'),
    true
  ),
  (
    'cnn-brasil',
    'CNN Brasil',
    'https://www.cnnbrasil.com.br/feed/',
    'https://www.cnnbrasil.com.br',
    (SELECT id FROM public.categories WHERE slug = 'geral'),
    true
  ),

  -- Política
  (
    'g1-politica',
    'g1 Política',
    'https://g1.globo.com/rss/g1/politica/',
    'https://g1.globo.com/politica',
    (SELECT id FROM public.categories WHERE slug = 'politica'),
    true
  ),
  (
    'poder360',
    'Poder360',
    'https://www.poder360.com.br/feed/',
    'https://www.poder360.com.br',
    (SELECT id FROM public.categories WHERE slug = 'politica'),
    true
  ),

  -- Economia
  (
    'g1-economia',
    'g1 Economia',
    'https://g1.globo.com/rss/g1/economia/',
    'https://g1.globo.com/economia',
    (SELECT id FROM public.categories WHERE slug = 'economia'),
    true
  ),
  (
    'folha-mercado',
    'Folha Mercado',
    'https://feeds.folha.uol.com.br/mercado/rss091.xml',
    'https://www1.folha.uol.com.br/mercado',
    (SELECT id FROM public.categories WHERE slug = 'economia'),
    true
  ),
  (
    'infomoney',
    'InfoMoney',
    'https://www.infomoney.com.br/feed/',
    'https://www.infomoney.com.br',
    (SELECT id FROM public.categories WHERE slug = 'economia'),
    true
  ),

  -- Tecnologia
  (
    'tecnoblog',
    'Tecnoblog',
    'https://tecnoblog.net/feed/',
    'https://tecnoblog.net',
    (SELECT id FROM public.categories WHERE slug = 'tecnologia'),
    true
  ),
  (
    'canaltech',
    'Canaltech',
    'https://canaltech.com.br/rss/',
    'https://canaltech.com.br',
    (SELECT id FROM public.categories WHERE slug = 'tecnologia'),
    true
  ),
  (
    'olhar-digital',
    'Olhar Digital',
    'https://olhardigital.com.br/feed/',
    'https://olhardigital.com.br',
    (SELECT id FROM public.categories WHERE slug = 'tecnologia'),
    true
  ),
  (
    'g1-tecnologia',
    'g1 Tecnologia',
    'https://g1.globo.com/rss/g1/tecnologia/',
    'https://g1.globo.com/tecnologia',
    (SELECT id FROM public.categories WHERE slug = 'tecnologia'),
    true
  ),
  (
    'folha-tec',
    'Folha Tec',
    'https://feeds.folha.uol.com.br/tec/rss091.xml',
    'https://www1.folha.uol.com.br/tec',
    (SELECT id FROM public.categories WHERE slug = 'tecnologia'),
    true
  ),
  (
    'eep',
    'Electrical Engineering Portal',
    'https://electrical-engineering-portal.com/feed',
    'https://electrical-engineering-portal.com',
    (SELECT id FROM public.categories WHERE slug = 'tecnologia'),
    true
  ),
  (
    'ieee-spectrum',
    'IEEE Spectrum',
    'https://spectrum.ieee.org/feeds/feed.rss',
    'https://spectrum.ieee.org',
    (SELECT id FROM public.categories WHERE slug = 'tecnologia'),
    true
  ),
  (
    'portal-radar-energia',
    'Portal Radar Energia',
    'https://portalradarenergia.com.br/feed.xml',
    'https://portalradarenergia.com.br',
    (SELECT id FROM public.categories WHERE slug = 'tecnologia'),
    true
  ),

  -- Mundo
  (
    'bbc-brasil',
    'BBC Brasil',
    'https://feeds.bbci.co.uk/portuguese/rss.xml',
    'https://www.bbc.com/portuguese',
    (SELECT id FROM public.categories WHERE slug = 'mundo'),
    true
  ),
  (
    'dw-brasil',
    'DW Brasil',
    'https://rss.dw.com/rdf/rss-br-all',
    'https://www.dw.com/pt-br',
    (SELECT id FROM public.categories WHERE slug = 'mundo'),
    true
  ),
  (
    'g1-mundo',
    'g1 Mundo',
    'https://g1.globo.com/rss/g1/mundo/',
    'https://g1.globo.com/mundo',
    (SELECT id FROM public.categories WHERE slug = 'mundo'),
    true
  ),

  -- Esportes
  (
    'ge',
    'ge',
    'https://ge.globo.com/rss/ge/',
    'https://ge.globo.com',
    (SELECT id FROM public.categories WHERE slug = 'esportes'),
    true
  ),
  (
    'folha-esporte',
    'Folha Esporte',
    'https://feeds.folha.uol.com.br/esporte/rss091.xml',
    'https://www1.folha.uol.com.br/esporte',
    (SELECT id FROM public.categories WHERE slug = 'esportes'),
    true
  ),

  -- Ciência e saúde
  (
    'g1-ciencia',
    'g1 Ciência',
    'https://g1.globo.com/rss/g1/ciencia/',
    'https://g1.globo.com/ciencia',
    (SELECT id FROM public.categories WHERE slug = 'ciencia-saude'),
    true
  ),
  (
    'g1-saude',
    'g1 Saúde',
    'https://g1.globo.com/rss/g1/saude/',
    'https://g1.globo.com/saude',
    (SELECT id FROM public.categories WHERE slug = 'ciencia-saude'),
    true
  ),
  (
    'folha-ciencia',
    'Folha Ciência',
    'https://feeds.folha.uol.com.br/ciencia/rss091.xml',
    'https://www1.folha.uol.com.br/ciencia',
    (SELECT id FROM public.categories WHERE slug = 'ciencia-saude'),
    true
  ),

  -- Regional
  (
    'g1-maranhao',
    'g1 Maranhão',
    'https://g1.globo.com/rss/g1/ma/maranhao/',
    'https://g1.globo.com/ma/maranhao',
    (SELECT id FROM public.categories WHERE slug = 'maranhao'),
    true
  )
ON CONFLICT (slug) DO NOTHING;
