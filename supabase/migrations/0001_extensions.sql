-- 0001_extensions.sql
-- Habilita extensões necessárias para UUIDs/criptografia e busca textual por trigramas.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
