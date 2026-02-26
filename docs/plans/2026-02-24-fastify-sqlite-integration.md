# Integração Orquestrada: Fastify & SQLite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrar o motor orquestrador (API Fastify) ao módulo de persistência local (SQLite), transformando o Job fictício recebido pelo Frontend (Web) em um registro real na base de dados para ser posteriormente lido pelo Worker.

**Architecture:** 
1. `apps/api` passará a importar e depender de `packages/db`.
2. O Startup do Servidor `server.ts` instanciará a conexão `initDb()` e fará o registro no lifecycle do Fastify (ex via `fastify.decorate`).
3. O Route File `jobs.ts` acessará a conexão do banco para chamar a query parametrizada segura `insertJob()`.

**Tech Stack:** Node.js, Fastify, better-sqlite3, Zod, TypeScript.

---

### Task 1: [Monorepo] Ligar a dependência do BD na API
Conectar o pacote base (`packages/db`) para que seja resolvível dentro do `apps/api` no projeto monorepo.

**Files:**
- Modify: `package.json` (raiz) -> Opcional, adicionar workspace flag se aplicável.
- Modify: `apps/api/package.json` -> Declarar `@poti/db` apontando para o workspace local `file:../../packages/db`.
- Command: `npm install` no diretório de `apps/api`.

**Step 1: Referenciar pacote**
Vincular o `package.json` para importar a biblioteca `@poti/db`.

**Step 2: Rodar npm i**
Assegurar o link com sucesso dentro do `node_modules`.

**Step 3: Commit**
Finalizar configuração modular da Task 1.

---

### Task 2: [Fastify] Instanciar e Decorar Conexão com SQLite
A injeção de dependência nativa do banco no Lifecycle do Servidor da API.

**Files:**
- Modify: `apps/api/src/server.ts`

**Step 1: Write the failing test / Try Build**
Se o TypeScript falhar, significa que o Fastify não tem o tipo decorado localmente. 

**Step 2: Write minimal implementation**
No `server.ts`, chamar `initDb('./showcase.db')` importando o `setupDatabase` da engine. Utilizar `fastify.decorate('db', dbInstance)`. O arquivo SQLite pode ficar na raiz do monorepo ou em um diretório /data exclusivo.

**Step 3: Run test to verify it passes**
Iniciar o `npx ts-node --esm src/server.ts` para verificar se a conexão ocorreu e a mensagem de console Log comemora o db ativo.

**Step 4: Commit**
Conclusão da injeção Fastify/Database.

---

### Task 3: [Rota Jobs] Salvar Jobs e Validar IDs UUID
Remover o código mock e dar início ao salvamento TDD dos itens disparados pelo Front.

**Files:**
- Modify: `apps/api/src/routes/jobs.ts`

**Step 1: Write minimal implementation**
Desempacotar os dados (client_name, url, mode) validados pelo Zod. Chamar `insertJob`, salvando com um novo `uuid` as propriedades. Responder "201 Created". 

**Step 2: Run test to verify it passes**
Fazer um post manual via `curl` ou no frontend e verificar se o ID subiu no prompt / ver SQLite Database Viewer.

**Step 3: Commit**
Aprovação da Task 3.
