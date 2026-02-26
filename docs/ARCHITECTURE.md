# ARQUITETURA - Poti Showcase Builder

Última atualização: 25/02/2026  
Status: Arquitetura base aprovada para o MVP

## 1. Escopo

Este documento define a arquitetura completa para o MVP do Poti Showcase Builder.

O objetivo do produto é automatizar a geração de ativos de portfólio a partir de um site:

- rastrear (crawl) páginas públicas internas
- capturar screenshots em alta resolução de todas as dobras
- gravar vídeos com scroll suave (apenas desktop + mobile)
- aplicar mockup condicionalmente por tipo de mídia
- organizar as saídas com nomenclatura determinística de pastas e arquivos

## 2. Requisitos Funcionais (fechados para o MVP)

1. Campos do frontend:
   - `client_name` (nome do cliente)
   - `site_url` (url do site)
   - `mockup_mode` (modo de mockup)
2. Modos de mockup permitidos no MVP:
   - `all` (aplicado em imagens e vídeos)
   - `images_only` (aplicado apenas em imagens)
   - `videos_only` (aplicado apenas em vídeos)
   - `none` (sem mockup aplicado em nenhuma mídia)
3. Os vídeos são gerados apenas para:
   - desktop
   - mobile
4. Rastrear apenas páginas públicas internas do site alvo.
5. Não capturar páginas de blog e páginas da área administrativa.
6. Gerar screenshots em alta resolução para todas as dobras de cada página capturada.

## 3. Metas Não-Funcionais

- Tempo de setup do job: <= 2 minutos
- Tempo de execução ponta-a-ponta (site pequeno/médio): <= 10 minutos
- Taxa de sucesso de captura: >= 95%
- Saídas reprodutíveis (mesma entrada => mesmo padrão de pastas e nomes)
- Padrões seguros para evitar excesso de rastreamento e páginas privadas

## 4. Estilo de Arquitetura

Monólito modular com worker em background.

Justificativa:
- projeto pequeno, baixo custo operacional (ops overhead)
- limites limpos entre UI, orquestração e motor de captura
- fácil separação futura em microsserviços, se necessário

## 5. Topologia de Alto Nível

```text
+-------------------+      HTTP/SSE       +----------------------+
| Web Frontend      | <-----------------> | API + Orquestrador   |
| (React/Next)      |                     | (Node/Fastify)       |
+-------------------+                     +----------+-----------+
                                                     |
                                                     | Fila DB + estado (Cache JSON)
                                                     v
                                           +---------+-----------+
                                           | Worker              |
                                           | (Motor Playwright)  |
                                           +----+-----------+----+
                                                |           |
                                                |           |
                                                v           v
                                      +----------------+  +----------------+
                                      | Storage Local  |  | FFmpeg/Sharp   |
                                      | saídas/ ativos |  | pós-process.   |
                                      +----------------+  +----------------+
```

## 6. Decisões de Tecnologia

### Runtime

- Node.js 22 LTS
- TypeScript

### Frontend

- Next.js (App Router) para interface simples e dashboard local
- Tailwind CSS (opcional, uso leve)

### Backend API

- Fastify (performance + validação simples de schema)
- Zod para schemas de requisição/resposta

### Captura/Automação

- Playwright (Chromium)

### Processamento de Mídia

- Sharp para composição/compressão de imagem
- FFmpeg para conversão de vídeo e sobreposição de vídeo mockup

### Persistência

- SQLite (`better-sqlite3`) para jobs, páginas, metadados de ativos

### Estratégia de Fila

- Fila baseada em DB com worker polling (sem Redis no MVP)

## 7. Estrutura do Projeto

```text
07-poti-showcase-builder/
├── apps/
│   ├── web/                         # formulário frontend + progresso
│   ├── api/                         # fastify API + orquestração
│   └── worker/                      # processo worker de captura
├── packages/
│   ├── core/                        # tipos compartilhados, enums, contratos
│   ├── crawler/                     # descoberta (sitemap) + filtros
│   ├── capture/                     # motor de captura de imagens/vídeos
│   ├── mockup/                      # composição de mockup para imagem/vídeo
│   ├── naming/                      # slug + nomes determinísticos
│   └── manifest/                    # gerador de manifesto de saída
├── assets/
│   └── mockups/                     # molduras (refs de overlay em png/webm)
├── output/                          # entregáveis gerados para o cliente
├── docs/
│   └── ARCHITECTURE.md
├── ROADMAP.md
└── package.json
```

## 8. Modelo de Dados Principal

## 8.1 Job

- `id`
- `client_name`
- `site_url`
- `mockup_mode`
- `status` (`queued`, `crawling`, `capturing_images`, `capturing_videos`, `post_processing`, `paused`, `cancelled`, `done`, `failed`)
- `total_pages` (Quantidade descoberta pelo crawler / cache)
- `processed_pages` (Páginas capturadas com sucesso)
- `created_at`, `started_at`, `finished_at`
- `error_message` (anulável)

## 8.2 Page

- `id`
- `job_id`
- `url`
- `slug`
- `depth`
- `status` (`pending`, `processing`, `done`, `failed`, `skipped`)
- `skip_reason` (anulável)

## 8.3 Asset

- `id`
- `job_id`
- `page_id`
- `type` (`image`, `video`)
- `variant` (`raw`, `mockup`)
- `viewport` (`desktop`, `notebook`, `tablet`, `mobile`)
- `fold_index` (anulável para vídeos)
- `path`
- `width`, `height`
- `size_bytes`

## 9. Contrato da API (MVP)

## 9.1 POST /jobs

Cria um novo job de execução.

Corpo da requisição:

```json
{
  "client_name": "Cliente X",
  "site_url": "https://example.com",
  "mockup_mode": "all"
}
```

Resposta:

```json
{
  "job_id": "job_...",
  "status": "queued"
}
```

## 9.2 GET /jobs/:jobId

Retorna os contadores de progresso e status atual.

## 9.3 GET /jobs/:jobId/events

Fluxo de Server-Sent Events (SSE) para progresso ao vivo no frontend.

## 9.4 GET /jobs/:jobId/manifest

Retorna os metadados finais de `manifest.json` quando concluído.

## 9.5 Controles de Ciclo de Vida (Lifecycle)

- `POST /jobs/:jobId/pause`: Altera status para `paused`, fazendo o Worker suspender a fila graciosamente salvando o cache.
- `POST /jobs/:jobId/resume`: Altera status para `queued`, fazendo o Worker carregar o cache e retomar de `processed_pages`.
- `POST /jobs/:jobId/cancel`: Cancela o Job irreversivelmente.

## 10. Política de Crawl (Rastreamento)

## 10.1 Regras de Inclusão

- mesmo protocolo (`http`/`https`) e mesmo host que a `site_url`
- rotas públicas normais, exemplo:
  - `/`
  - `/sobre`
  - `/quem-somos`
  - `/contato`
  - `/servicos`

## 10.2 Regras de Exclusão

Blocklist de caminhos (caminho contém ou começa com):

- `/blog`
- `/categoria`
- `/tag/`
- `/author/`
- `/wp-admin`
- `/wp-login`
- `/admin`
- `/login`
- `/dashboard`

Também excluir:

- arquivos não-HTML (`.pdf`, `.zip`, links de imagens, etc.)
- domínios externos
- duplicatas geradas por query parameters (quando a URL canônica repete)

## 10.3 Estratégia de Crawl

- Crawl em largura (BFS - Breadth-First Search) com limite máximo de profundidade e páginas
- padrões:
  - `MAX_PAGES=30`
  - `MAX_DEPTH=3`
- desduplicação por URL normalizada

## 11. Arquitetura de Captura de Imagens (Todas as Dobras)

## 11.1 Viewports (resoluções) para imagens

- desktop: 1920x1080, `deviceScaleFactor=2`
- notebook: 1440x900, `deviceScaleFactor=2`
- tablet: 834x1112, `deviceScaleFactor=2`
- mobile: 390x844, `deviceScaleFactor=3`

## 11.2 Algoritmo de Dobras

Para cada página + viewport de imagem:

1. ler `document.documentElement.scrollHeight`
2. computar posições da dobra:
   - `step = viewportHeight - overlap`
   - `overlap = 120px`
3. posições do topo até o fim, sempre incluindo a posição final
4. em cada posição:
   - `window.scrollTo(0, position)`
   - aguardar o assentamento de layout (`150-250ms`)
   - capturar viewport (`fullPage=false`)

Saída:
- um arquivo por dobra (`fold-001`, `fold-002`, ...)
- alta resolução pelas configurações DSF (Device Scale Factor)

## 12. Arquitetura de Captura de Vídeo (Desktop + Mobile)

## 12.1 Viewports de vídeo

- desktop: 1920x1080
- mobile: 390x844

## 12.2 Rotina de Scroll Suave

Durante a gravação, o worker injeta um script controlado de scroll:

- intervalo fixo (`50ms`)
- velocidade alvo:
  - desktop: `~480 px/s`
  - mobile: `~360 px/s`
- leves pausas em limites de sessão
- parar ao chegar no final da página (com snippet opcional de retorno ao topo)

Objetivo:
- vídeo de demonstração fluído e legível
- velocidade determinística em todas as execuções

## 13. Matriz de Aplicação de Mockup

| modo | imagens | vídeos |
|---|---|---|
| `all` | originais (raw) + mockup | originais (raw) + mockup |
| `images_only` | originais (raw) + mockup | apenas originais (raw) |
| `videos_only` | apenas originais (raw) | originais (raw) + mockup |
| `none` | apenas originais (raw) | apenas originais (raw) |

Implementação:

- mockup de imagem:
  - Composição usando Sharp com moldura PNG
- mockup de vídeo:
  - Filtro overlay via FFmpeg sobreposto ao vídeo original

## 14. Pasta de Saída e Convenção de Nomenclatura

```text
output/
  <client_slug>/
    <YYYYMMDD_HHMMSS>/
      manifest.json
      pages/
        <page_slug>/
          images/
            raw/<viewport>/fold-001.png
            mockup/<viewport>/fold-001.png
          videos/
            raw/<viewport>.webm
            mockup/<viewport>.mp4
```

Padrão de nomenclatura:

`<client_slug>__<page_slug>__<media>__<viewport>__<variant>__<index>`

Exemplos:

- `acme__home__image__desktop__raw__fold-001.png`
- `acme__contato__video__mobile__mockup.mp4`

## 15. Máquina de Estados

```text
queued (na fila)
  -> crawling (rastreando)
  -> capturing_images (capturando imagens)
  -> capturing_videos (capturando vídeos)
  -> post_processing (pós-processamento)
  -> done (concluído)
ou
  -> failed (falhou)
```

Tentativas (Retries):

- tentativa de captura por página: 2 tentativas
- tentativa por processamento de mídia: 2 tentativas
- falhas críticas e irreversíveis mantêm as saídas parciais + bloco de erro no manifesto

## 16. Segurança e Limites de Risco

- capturar apenas URLs de mesmo domínio
- blocklist rígida para rotas de admin/blog
- sanitizar nomes de arquivos (evitar path traversal - diretórios relativos maliciosos)
- limitar total de páginas mapeadas, tempo máximo de execução e tamanho máximo de arquivo
- contexto do navegador isolado por página/viewport

## 17. Observabilidade

- logs estruturados com `job_id`, `page_slug`, `step`
- eventos de progresso lançados para o frontend
- `manifest.json` final contém:
  - metadados do job
  - páginas capturadas
  - ativos gerados
  - páginas ignoradas e motivos
  - erros e retries

## 18. Estratégia de Testes

## 18.1 Unitários

- normalização de URLs e filtros
- nomenclaturas e geração de paths
- algoritmo de posições de dobras
- regras da matriz de modo de mockup

## 18.2 Integração

- crawlear + capturar em um site simulado (fixture)
- execução end-to-end do job com asserções das saídas locais

## 18.3 Regressão

- snapshots de amostra perfeitas (golden sample) da árvore de arquivos gerados e do manifesto

## 19. Ordem de Implementação

1. [x] Inicializar estrutura do monorepo (`apps`, `packages`)
2. [x] Construir API + modelo do Job + loop da fila
3. [ ] Construir pacote Crawler com política de inclusão/exclusão
4. [ ] Construir o motor de captura de dobras de imagens
5. [x] Construir o motor de gravação de vídeos (desktop/mobile + scroll suave)
6. [ ] Construir os processadores de mockup (imagem e vídeo)
7. [x] Construir painel de progresso e formulário frontend
8. [ ] Adicionar manifesto e relatório final
9. Adicionar testes e proteção contra falhas (hardening)

## 20. Itens em Aberto (a fechar antes de codificar)

1. Confirmar a lista final de viewports de imagem (4 viewports fixados por este documento).
2. Confirmar se o fluxo "Antes/Depois" continua opcional ou se será removido da UI no MVP.
3. Confirmar os limites padrão de rastreamento para sites muito grandes.
