-- 0003_indexes.sql
-- Índices para paginação por cursor, filtro por fonte/categoria, trigramas no título e busca full-text em português.

CREATE INDEX IF NOT EXISTS idx_articles_published_at_id
  ON public.articles (published_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_articles_source_published_at
  ON public.articles (source_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_article_categories_category_article
  ON public.article_categories (category_id, article_id);

CREATE INDEX IF NOT EXISTS idx_articles_title_trgm
  ON public.articles USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_articles_search_fts
  ON public.articles USING gin (
    to_tsvector('portuguese', title || ' ' || coalesce(description, ''))
  );
