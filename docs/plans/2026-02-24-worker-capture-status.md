# Phase 4 & 5: Capture Engine, Worker Daemon e Visual Frontend Status

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fechar o ciclo do MVP (Épicos 3 e 4). O sistema deve capturar telas reais (via Playwright), orquestrar a fila pendente do banco de dados (Worker) e exibir o progresso em tempo real no Frontend Next.js.

**Architecture:**
1. `packages/capture`: Script assíncrono em Playwright focado em acesso direto à página e emissão de Screenshots (High-Res) e Videos.
2. `apps/worker`: Serviço Node (daemon) em loop contínuo que lê a fila do SQLite (`status=queued`), orquestra o `Crawler`, delega para a `Capture` e repassa para o `Mockup`.
3. `apps/api`: Adição do endpoint `GET /jobs/:id` para habilitar a consulta do front.
4. `apps/web`: Criação da página `app/jobs/[id]/page.tsx` exibindo o polling da API.

---

### Task 1: [API] Leitura de Status de Job (GET /jobs/:id)
Habilitar a consulta de acompanhamento de projeto para o Frontend.

**Files:**
- Modify: `apps/api/src/routes/jobs.ts`
- Modify: `packages/db/src/index.ts` (query extendida se necessário)

**Steps:**
1. Criar rota `fastify.get('/jobs/:id')`.
2. Buscar no `request.server.db` o status atual do Job.
3. Opcionalmente trazer contagem de pages/assets vinculados.

---

### Task 2: [Capture] Motor Playwright de Assets
Pacote isolado do Playwright focado puramente em capturar imagens e vídeos.

**Files:**
- Create: `packages/capture/package.json`
- Create: `packages/capture/src/index.ts`

**Steps:**
1. Setup de Chromium Headless.
2. Criar método `captureImage(url, destPath)` utilizando viewport em alta definição e auto-scroll/fullPage screenshot.
3. Teste TDD com `jest` validando a geração do arquivo `.png` local em `output/`.

---

### Task 3: [Worker] Orquestrador da Fila SQLite
O "coração" operacional do projeto. Processo rodando indefinidamente em background.

**Files:**
- Create: `apps/worker/package.json`
- Create: `apps/worker/src/index.ts`

**Steps:**
1. Setup importando `@poti/db`, `@poti/crawler`, `@poti/capture` e `@poti/mockup`.
2. Loop `setInterval` de 5 segundos lendo Jobs `queued`.
3. Pipeline: `queued` -> `crawling` -> salva pages no DB -> `capturing` -> captura e salva assets no DB -> `done`.

---

### Task 4: [Frontend] Acompanhamento de Status Gráfico
A interface Web do usuário acompanhando a mágica acontecer.

**Files:**
- Modify: `apps/web/components/JobForm.tsx`
- Create: `apps/web/src/app/jobs/[id]/page.tsx`

**Steps:**
1. Após sucesso no `JobForm`, invocar `useRouter().push('/jobs/' + data.job_id)`.
2. Criar Server/Client Component no diretório `jobs/[id]` que faz `setInterval` e exibe em TailwindCSS uma barra de progresso ou passos dinâmicos (Fila -> Rastreio -> Captura -> Pronto) até o status ser done.
