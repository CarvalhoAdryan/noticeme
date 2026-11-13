# AGENTS.md — Diretrizes de Engenharia do DailyBrief

Este arquivo define as regras inegociáveis de arquitetura, segurança e fluxo de trabalho para agentes de IA e desenvolvedores atuando neste repositório.

## Regras de Negócio e Dados
1. **Metadados e Retenção:** Armazene **apenas metadados e a URL original** das notícias (título, resumo curto do RSS, fonte, categoria, data de publicação e link). **Nunca** armazene o corpo/artigo completo da notícia. A retenção máxima no banco é de **30 dias**.
2. **Coleta Independente da API:** A coleta de feeds RSS roda diretamente no banco de dados via **GitHub Actions** (conectando ao pooler do Supabase via `DATABASE_URL` no contexto standalone do NestJS), sem depender da API HTTP estar online.
3. **Deduplicação e Isolamento de Falhas:** A deduplicação de notícias deve ser feita por **URL normalizada** (removendo parâmetros de rastreamento como `utm_*`, fragmentos, etc.). A falha na leitura ou parse de uma fonte/feed **nunca** deve derrubar ou interromper a coleta das demais fontes.

## Arquitetura e Segurança
4. **Centralização no Backend (NestJS):** Toda comunicação do app mobile passa pelo backend NestJS. A autorização e as regras de acesso são aplicadas no código do backend, mantendo o **RLS (Row Level Security)** no Supabase como segunda camada de defesa (defense-in-depth). Nunca exponha nem mencione chaves de servidor no mobile.
5. **Paginação e Validação:** Listagens devem utilizar **paginação por cursor** composto por `(published_at, id)`. Todos os payloads e parâmetros de entrada devem ter **DTOs validados** (`ValidationPipe` / schemas compartilhados).

## Fluxo de Desenvolvimento
6. **Escopo Incremental e Dependências:** Implemente **um módulo por vez**, sempre acompanhado de testes. **Não adicione novas dependências** sem avisar e justificar previamente.
7. **Comunicação e Versionamento:** Responda sempre em **português**. Faça **commits pequenos**, atômicos e organizados por etapa/contexto.
