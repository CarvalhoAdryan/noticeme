# Banco de Dados — DailyBrief (PostgreSQL / Supabase)

Documentação do modelo relacional, índices, políticas de segurança (RLS), rotina de retenção e instruções de aplicação das migrations.

---

## 1. Visão Geral e Relacionamentos

O esquema está dividido em dois grupos de tabelas no schema `public`:

1. **Tabelas Compartilhadas (Catálogo e Metadados de Notícias):**
   - `categories`: categorias editoriais fixas (`geral`, `politica`, `economia`, `tecnologia`, `mundo`, `esportes`, `ciencia-saude`, `maranhao`).
   - `sources`: fontes RSS cadastradas, estado de sincronização HTTP (`etag`, `last_modified`), saúde da coleta (`last_success_at`, `last_error`, `last_error_at`, `consecutive_failures`) e categoria padrão (`default_category_id -> categories.id`).
   - `articles`: metadados das notícias coletadas (`source_id -> sources.id`), incluindo `title`, `description`, `url`, `url_normalized` (`UNIQUE`), `image_url`, `author`, `published_at`, `collected_at`, `summary` e `cluster_id`. **Nunca armazena o corpo completo da notícia.**
   - `article_categories`: tabela associativa N:N entre `articles` e `categories` (`PRIMARY KEY (article_id, category_id)` com `ON DELETE CASCADE`).

2. **Tabelas Individuais de Usuário (vinculadas a `auth.users` com `ON DELETE CASCADE`):**
   - `profiles`: perfil complementar do usuário (`id = auth.users.id`, `display_name`, `created_at`).
   - `user_categories`: preferências de categorias seguidas pelo usuário (`PRIMARY KEY (user_id, category_id)`).
   - `user_articles`: estado de interação do usuário com cada notícia (`PRIMARY KEY (user_id, article_id)`, `is_favorite`, `read_at`, `hidden`, `updated_at`).

---

## 2. Índices e Performance (`0003_indexes.sql`)

- **`idx_articles_published_at_id` (`published_at DESC, id DESC`):** suporta a paginação determinística por cursor composto `(published_at, id)` no feed principal.
- **`idx_articles_source_published_at` (`source_id, published_at DESC`):** otimiza listagens filtradas por fonte.
- **`idx_article_categories_category_article` (`category_id, article_id`):** acelera a filtragem de artigos por categoria (sentido inverso da PK composta `(article_id, category_id)`).
- **`idx_articles_title_trgm` (GIN `pg_trgm` em `title`):** permite buscas parciais (`ILIKE` / similaridade) rápidas pelo título.
- **`idx_articles_search_fts` (GIN Full-Text Search em português):** indexa `to_tsvector('portuguese', title || ' ' || coalesce(description, ''))` para busca textual completa.

---

## 3. Decisões de Arquitetura e Negócio

### Deduplicação por `url_normalized`
- Cada artigo possui `url` (link original do feed) e `url_normalized` (URL canônica sem parâmetros de rastreamento como `utm_*`, `fbclid`, fragmentos `#`, etc.).
- A constraint `UNIQUE` em `articles.url_normalized` garante no nível do banco que a mesma notícia não seja duplicada em coletas subsequentes.

### Armazenamento Exclusivo de Metadados e Retenção de 30 Dias
- Em conformidade com o `AGENTS.md`, apenas metadados do feed RSS e a URL original são persistidos.
- A função `public.purge_old_articles(days int default 30)` (`0006_retention.sql`) remove artigos cujo `published_at` seja anterior a `now() - make_interval(days => days)` e retorna o total de registros excluídos.

### Preservação de Favoritos
- A rotina `purge_old_articles` preserva automaticamente qualquer artigo que possua `is_favorite = true` em `public.user_articles` para pelo menos um usuário (`NOT EXISTS (...)`), evitando que notícias salvas desapareçam da aba **Salvos**.

### RLS como Segunda Camada de Defesa (Defense-in-Depth)
- Toda comunicação do app mobile passa pelo backend NestJS, onde a autorização principal acontece.
- Mesmo assim, **todas as 7 tabelas** possuem **Row Level Security (RLS)** habilitado (`0005_rls.sql`):
  - **Tabelas compartilhadas (`categories`, `sources`, `articles`, `article_categories`):** somente leitura (`SELECT`) para `anon` e `authenticated`. Nenhuma política de escrita (`INSERT`/`UPDATE`/`DELETE`) é concedida a clientes; apenas a conexão de servidor/coletor pode escrever.
  - **Tabelas individuais (`profiles`, `user_categories`, `user_articles`):** políticas estritas `auth.uid() = id` (em `profiles`) e `auth.uid() = user_id` (nas demais) para `SELECT`, `INSERT`, `UPDATE` e `DELETE`.

---

## 4. Ordem das Migrations e Como Aplicar

Arquivos em `supabase/migrations/`:
1. `0001_extensions.sql` — extensões `pgcrypto` e `pg_trgm`
2. `0002_shared_tables.sql` — `categories`, `sources`, `articles`, `article_categories`
3. `0003_indexes.sql` — índices B-Tree e GIN (`pg_trgm` + Full-Text Search)
4. `0004_user_tables.sql` — `profiles`, `user_categories`, `user_articles`
5. `0005_rls.sql` — ativação de RLS e políticas em todas as tabelas
6. `0006_retention.sql` — função `purge_old_articles(days int default 30)`

Seed inicial:
- `supabase/seed.sql` — popula as 8 categorias e as 3 fontes iniciais de forma idempotente (`ON CONFLICT (slug) DO NOTHING`).

### Opção A: Via Supabase CLI
```bash
# Aplicar todas as migrations no banco vinculado
supabase db push

# Ou em ambiente local do Supabase (aplica migrations + seed.sql)
supabase db reset
```

### Opção B: Via `psql` (`DATABASE_URL`)
```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_extensions.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_shared_tables.sql
psql "$DATABASE_URL" -f supabase/migrations/0003_indexes.sql
psql "$DATABASE_URL" -f supabase/migrations/0004_user_tables.sql
psql "$DATABASE_URL" -f supabase/migrations/0005_rls.sql
psql "$DATABASE_URL" -f supabase/migrations/0006_retention.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

### Opção C: Via SQL Editor (Dashboard do Supabase)
1. Acesse o **SQL Editor** no painel do projeto Supabase.
2. Execute o conteúdo dos arquivos `0001_extensions.sql` até `0006_retention.sql` na ordem numérica.
3. Execute o conteúdo de `supabase/seed.sql` para popular categorias e fontes iniciais.
