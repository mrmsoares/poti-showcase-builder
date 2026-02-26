# Motor de Design e Frontend Inicial Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Concluir a integração do Canvas/Sharp/FFmpeg para os 4 modos flexíveis de mockup e implementar o formulário Frontend em Next.js para disparo do fluxo.

**Architecture:** Monólito modular local. O pacote `packages/mockup` usará FFmpeg para encodar os vídeos com as molduras overlay, e o pacote `packages/capture` consumirá essa factory. No client-side, o `apps/web` fará um POST pra `apps/api/jobs`.

**Tech Stack:** Next.js (App Router), TailwindCSS, Fastify, Playwright, FFmpeg, Sharp, SQLite.

---

### Task 1: [Mockups Flexíveis] Componente Motor de Mockups
O sistema atual precisa de uma atualização para processar as 4 matrizes definidas (`all`, `images_only`, `videos_only`, `none`).

**Files:**
- Create: `packages/mockup/src/index.ts`
- Create: `packages/mockup/src/types.ts`
- Test: `packages/mockup/tests/matrix.test.ts`

**Step 1: Write the failing test**
Criar o mock data das matrizes e garantir que o validador falhe.

**Step 2: Run test to verify it fails**
Rodar Mocha/Jest.

**Step 3: Write minimal implementation**
Implementar o switch case central processando o `Asset` gerado conforme o `mockup_mode`.

**Step 4: Run test to verify it passes**
Confirmar aprovação do teste.

**Step 5: Commit**
Commit das regras do Épico 2 finalizado em código.

---

### Task 2: [Orquestração] Finalizar o Model e POST Job
Preparar a API do Fastify para aceitar as requisições que virão do novo Frontend.

**Files:**
- Modify: `apps/api/src/routes/jobs.ts`
- Modify: `apps/api/src/schemas/job.schema.ts`

**Step 1: Write the failing test**
Fazer POST mockado no supertest enviando o body exigido no ARCHITECTURE.md.

**Step 2: Run test to verify it fails**
Aguardando erro 404/500 por schema ausente.

**Step 3: Write minimal implementation**
Criar as rotas com Zod schema validator e inserir no SQLite.

**Step 4: Run test to verify it passes**
Receber 200 OK.

**Step 5: Commit**
Commit da base do Épico 3.

---

### Task 3: [Frontend] Interface de Disparo Next.js
A tela simples para coletar a URL, Nome do Cliente e Dropdown do Mockup.

**Files:**
- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/components/JobForm.tsx`

**Step 1: Scaffold do Page e do Form**
Criar um hook simples conectando ao localhost:3001 via fetch padrão do Next com validação Zod no client.

**Step 2: Run test / Dev Server**
Rodar `npm run dev:web` e verificar renderização sem erros na tela.

**Step 3: Commit**
Commit do frontend concluído e entregável do Épico 3 na base.
