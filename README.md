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
- `GDRIVE_TARGET_FOLDER_ID` (ID da pasta de destino no Google Drive)
- `GOOGLE_APPLICATION_CREDENTIALS` (caminho para o JSON da Service Account)
- `GDRIVE_UPLOAD_MAX_RETRIES` (padrão: `2`, total de retries apos a primeira tentativa)
- `GDRIVE_UPLOAD_RETRY_BASE_MS` (padrão: `1000`)
- `GDRIVE_UPLOAD_RETRY_MAX_MS` (padrão: `8000`)

## Upload Google Drive (Shared Drive obrigatorio)

Para evitar o erro `Service Accounts do not have storage quota`, o upload deve apontar para uma pasta dentro de um **Shared Drive**.

Checklist de configuracao:

1. Crie ou escolha um Shared Drive no Google Workspace.
2. Mova/crie a pasta de destino dentro desse Shared Drive.
3. Adicione a Service Account como membro do Shared Drive com permissao de escrita.
4. Configure:
   - `GDRIVE_TARGET_FOLDER_ID` com o ID dessa pasta.
   - `GOOGLE_APPLICATION_CREDENTIALS` para o arquivo JSON da Service Account.

Comportamento do worker:

- Se upload falhar por erro transitório, o sistema tenta novamente com backoff exponencial.
- Se upload falhar de forma permanente, o job termina como `done` com aviso operacional em `error_message`.
- Se upload funcionar, mas a permissao publica (`anyone-reader`) for bloqueada por politica do dominio, o arquivo permanece no Drive e o job termina com aviso operacional (sem falhar o processamento principal).
