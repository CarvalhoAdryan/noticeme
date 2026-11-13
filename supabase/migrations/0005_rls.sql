-- 0005_rls.sql
-- Habilita Row Level Security (RLS) em todas as tabelas e define políticas de acesso (defense-in-depth).

-- 1. Habilitar RLS em todas as tabelas
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_articles ENABLE ROW LEVEL SECURITY;

-- 2. Tabelas compartilhadas: leitura pública (anon e authenticated), sem escrita para clientes
DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
CREATE POLICY "categories_select_public"
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "sources_select_public" ON public.sources;
CREATE POLICY "sources_select_public"
  ON public.sources
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "articles_select_public" ON public.articles;
CREATE POLICY "articles_select_public"
  ON public.articles
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "article_categories_select_public" ON public.article_categories;
CREATE POLICY "article_categories_select_public"
  ON public.article_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Tabelas individuais: acesso restrito ao próprio usuário (auth.uid())

-- profiles (id = auth.uid())
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- user_categories (user_id = auth.uid())
DROP POLICY IF EXISTS "user_categories_select_own" ON public.user_categories;
CREATE POLICY "user_categories_select_own"
  ON public.user_categories
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_categories_insert_own" ON public.user_categories;
CREATE POLICY "user_categories_insert_own"
  ON public.user_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_categories_update_own" ON public.user_categories;
CREATE POLICY "user_categories_update_own"
  ON public.user_categories
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_categories_delete_own" ON public.user_categories;
CREATE POLICY "user_categories_delete_own"
  ON public.user_categories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- user_articles (user_id = auth.uid())
DROP POLICY IF EXISTS "user_articles_select_own" ON public.user_articles;
CREATE POLICY "user_articles_select_own"
  ON public.user_articles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_articles_insert_own" ON public.user_articles;
CREATE POLICY "user_articles_insert_own"
  ON public.user_articles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_articles_update_own" ON public.user_articles;
CREATE POLICY "user_articles_update_own"
  ON public.user_articles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_articles_delete_own" ON public.user_articles;
CREATE POLICY "user_articles_delete_own"
  ON public.user_articles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
