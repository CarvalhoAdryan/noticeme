-- 0006_retention.sql
-- Função de retenção máxima de dados (padrão: 30 dias), preservando artigos favoritados por qualquer usuário.

CREATE OR REPLACE FUNCTION public.purge_old_articles(days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF days < 1 THEN
    RAISE EXCEPTION 'O parâmetro days deve ser maior ou igual a 1.';
  END IF;

  DELETE FROM public.articles a
  WHERE a.published_at < (now() - make_interval(days => days))
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_articles ua
      WHERE ua.article_id = a.id
        AND ua.is_favorite = true
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_articles(integer) FROM PUBLIC, anon, authenticated;
