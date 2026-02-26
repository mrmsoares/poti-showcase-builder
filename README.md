# Poti Showcase Builder

Motor de indexação e captura automatizado de alta performance para a Agência Poti. Construído com arquitetura monólito modular local, gerando artefatos visuais (prints e mockups) padrão "Industrial Luxury". O frontend foi integralmente traduzido para pt-BR.

## Apps

- `apps/web`: interface frontend em Next.js (pt-BR) com formulário e painel de progresso em tempo real (UX Industrial Luxury).
- `apps/api`: API Fastify de orquestração com endpoints de controle de ciclo de vida (Pause, Resume, Cancel).
- `apps/worker`: processo daemon orquestrador rodando Playwright com Caching determinístico e interceptação de estado.

## Packages

- `packages/core`: contratos compartilhados, política de URL e nomenclatura determinística
- `packages/crawler`: motor de discovery e crawler
- `packages/capture`: motor de captura de imagem em alta resolução via Headless Chromium
- `packages/mockup`: integração com modelo de composição de matriz de mockups
- `packages/db`: persistência local SQLite
- `packages/manifest`: placeholder do manifesto de saída

## Início Rápido

```bash
npm install
npm test
npm run dev
```

Frontend roda em `http://localhost:5000` e a API em `http://localhost:3001`.

## Ambiente

Variáveis de ambiente opcionais:

- `API_PORT` (padrão: `3001`)
- `WEB_PORT` (padrão: `5000`)
- `WEB_ORIGIN` (padrão: `http://localhost:5000`)
- `WORKER_TOKEN` (padrão: `dev-worker-token`)
- `API_BASE_URL` (worker -> api, padrão: `http://localhost:3001`)
