# Fundação SQLite e Motor de Crawler Playwright Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar o banco de dados local com SQLite (better-sqlite3) e o pacote de descoberta de links (Crawler) via Playwright.

**Architecture:** 
1. `packages/db`: Módulo TypeScript responsável por abstrair a camada de dados (better-sqlite3) criando o arquivo banco de dados e as tabelas `jobs`, `pages` e `assets`. Deve habilitar `WAL mode` para melhor performance.
2. `packages/crawler`: Módulo que exporta uma engine em Playwright responsável por visitar a URL inicial, respeitar a política de mesma origem e compor um Set de páginas (links) a serem capturados.

**Tech Stack:** Node.js, TypeScript, better-sqlite3, Playwright.

---

### Task 1: [Database] Setup do Módulo de DB Local
Criar o pacote de acesso e inicialização de banco de dados SQLite. Aplicar as melhores práticas do SQLite Expert Skill (Parameterized Queries, WAL Mode ativado, foreign keys).

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/src/schema.ts`
- Test: `packages/db/tests/db.test.ts`

**Step 1: Instalar dependências e arquivos base**
Configurar `better-sqlite3` e tipagens. Criar schema com as tabelas (jobs, pages, assets) conforme ARCHITECTURE.md.

**Step 2: Write the failing test**
Criar um teste simples inserindo um job e garantindo a falha inicial.

**Step 3: Write minimal implementation**
Implementar o initDb com PRAGMAS de segurança (WAL, Foreign Keys). Implementar queries parametrizadas na criação do Job.

**Step 4: Run test to verify it passes**
Passar o teste TDD local usando Jest/TS-Node no Jest com in-memory db.

**Step 5: Commit**
Finalizar pacote db.

---

### Task 2: [Crawler] Motor Discovery com Playwright
Criar o pacote isolado responsável por captar links de uma URL usando as orientações da Playwright Expert Skill (sem waitForTimeout implícito, isolamento de browser states e auto-waiting limitando a mesma origem).

**Files:**
- Create: `packages/crawler/package.json`
- Create: `packages/crawler/src/index.ts`
- Test: `packages/crawler/tests/crawl.test.ts`

**Step 1: Setup do pacote Crawler**
Instalar dependências (Playwright, TS/Jest).

**Step 2: Write the failing test**
Fazer mock de uma interação da página ou tentar rodar a lógica validada que deve capturar uma string de HTML e retornar as tags 'a' do mesmo domínio ignorando /wp-admin.

**Step 3: Write minimal implementation**
A implementação da classe `CrawlerEngine`. Ao ser iniciada (`start`), carrega o Playwright, abre context/page, carrega o site principal. Localiza as âncoras locais, remove as regras de exclusão de crawler e mapeia a lista. Fecha o Playwright e retorna a lista em `<Set>String`.

**Step 4: Run test to verify it passes**
Aprovar os testes de TDD.

**Step 5: Commit**
Finalizar pacote crawler.
