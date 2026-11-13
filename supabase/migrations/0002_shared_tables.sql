-- 0002_shared_tables.sql
-- Tabelas compartilhadas: categorias, fontes RSS, artigos (apenas metadados + URL) e relação artigo-categoria.

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  feed_url text NOT NULL,
  site_url text,
  default_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT true,
  etag text,
  last_modified text,
  last_success_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  consecutive_failures integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  url text NOT NULL,
  url_normalized text NOT NULL UNIQUE,
  image_url text,
  author text,
  published_at timestamptz NOT NULL,
  collected_at timestamptz NOT NULL DEFAULT now(),
  summary text,
  cluster_id uuid
);

CREATE TABLE IF NOT EXISTS public.article_categories (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, category_id)
);
