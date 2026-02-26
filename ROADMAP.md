# ROADMAP - Poti Showcase Builder

Atualizado em: 25/02/2026  
Produto: Automacao de capturas e mockups para portfolio da Agencia Poti  
Status geral: Em desenvolvimento (Fase 3 de 5)

## 1. Resumo Executivo

O Poti Showcase Builder e uma ferramenta com frontend simples + motor Node.js para automatizar a geracao de ativos visuais de portfolio (prints, videos e mockups) em cenarios de "antes e depois".

O problema atacado e operacional: hoje a montagem manual de evidencias visuais para cada cliente consome tempo, gera inconsistencias de naming e aumenta retrabalho no time de design e marketing.

A estrategia do produto e transformar esse fluxo em uma pipeline unica, padronizada e reproduzivel.

## 2. Objetivo do Produto

Entregar uma rotina unica capaz de:

1. Capturar paginas web em multiplas resolucoes com consistencia.
2. Organizar automaticamente a estrutura de arquivos por cliente e fase.
3. Gerar mockups prontos para publicacao no portfolio da agencia.
4. Evoluir para processamento e distribuicao automatizada de midia.

## 3. Escopo do MVP

### Incluido no MVP

- Frontend simples para configuracao e disparo da execucao.
- Captura automatica de imagens e videos por URL.
- Fluxo "Antes" e "Depois" para comparacao visual.
- Geracao de mockups a partir de molduras pre-definidas.
- Estrutura de pastas e convencao de nomes padrao.

### Regras funcionais obrigatorias (confirmadas)

- Campos de entrada no frontend: `nome_cliente`, `url_site` e modo de aplicacao de mockup.
- Modos de mockup no MVP:
  - `all` (aplicado em imagens e vídeos)
  - `images_only` (aplicado apenas em imagens)
  - `videos_only` (aplicado apenas em vídeos)
  - `none` (sem mockup aplicado em nenhuma mídia)
- Videos devem ser gerados apenas em dois formatos: Desktop e Mobile.
- Navegacao deve capturar apenas paginas publicas internas do proprio site (ex.: home, quem somos, sobre, contato).
- Navegacao deve ignorar qualquer pagina de blog e qualquer area administrativa.
- Captura de imagens deve ser em alta resolucao com registro de todas as dobras de cada pagina.

### Fora do escopo do MVP

- Dashboard web de gerenciamento.
- Edicao visual de mockups em tempo real.
- Armazenamento cloud obrigatorio (somente opcional em fase posterior).
- Sistema multiusuario com permissao por papel.

## 4. Estado Atual (Baseline)

| Area | Situacao atual | Status |
|---|---|---|
| Motor de captura (Playwright) | Configurado e funcional no fluxo base | Concluido |
| Captura multi-resolucao | Implementada na base inicial, com espaco para padronizacao final das 4 resolucoes alvo | Parcial |
| Gravacao de video | Fluxo de gravacao definido no processo de captura | Concluido |
| Motor de mockup (Canvas) | Implementacao em andamento | Em progresso |
| Branding Agencia Poti | Diretriz definida, aplicacao em andamento | Em progresso |
| Frontend de entrada (formulario) | Implementado em Next.js (pt-BR) | Concluido |
| Orquestracao de fila Local (SQLite) | Setup DB evoluido com Progress Tracking, Pause/Resume deterministico e Caching CWD | Concluido |
| Pos-processamento e cloud | Ainda nao implementado | Planejado |

## 5. Roadmap por Epicos

### E1. Fundacao de Captura e Automacao
Status: Concluido

Entregas:

- Setup do Playwright para navegacao automatizada.
- Captura de tela por resolucao.
- Gravacao de video por execucao (Desktop e Mobile).
- Scroll suave durante gravacao de video.
- Rastreamento apenas de paginas publicas internas com filtro de exclusao de blog/admin.

Resultado esperado:
- Pipeline minima funcional para gerar evidencias visuais com um comando.

### E2. Motor de Design e Branding
Status: Em progresso

Entregas:

- Integracao com Canvas para composicao de mockups.
- Aplicacao de molduras (Notebook e Mobile, com expansao para demais formatos).
- Padronizacao visual com identidade da Agencia Poti.
- Aplicacao condicional de mockup por tipo de midia (imagem ou video, conforme modo escolhido).

Criterios de aceite:
- Cada captura elegivel gera versao bruta e versao mockup.
- Assets seguem naming padrao por cliente, fase e dispositivo.
- Modo escolhido no frontend é respeitado rigorosamente (individualmente para imagens ou vídeos, ou em grupo).

### E3. Frontend de Execucao e Validacoes
Status: Concluido

Entregas:

- Formulario frontend para coleta de cliente, URL e modo de mockup.
- Validacao de URLs com mensagens de erro claras.
- Botao unico de execucao e Dashboard completo (Progresso, ETA estimado real-time, Controles Pause/Resume/Cancel).
- Regras de filtro de navegacao (somente paginas publicas internas, sem blog/admin).

Criterios de aceite:
- Usuario executa sem editar codigo.
- Erros de entrada sao tratados sem quebra do processo.
- UI segue os principios de UX "Industrial Luxury" do app.
- O crawler ignora blog/admin e processa apenas paginas internas permitidas usando memoria local de cache (resume state).
- Prints sao gerados em alta resolucao para todas as dobras de cada pagina.

### E4. Pos-processamento de Midia
Status: Planejado

Entregas:

- Conversao automatica de `.webm` para `.mp4`.
- Compressao de imagens para web.
- Perfis de qualidade (alta, media, leve).

Criterios de aceite:
- Videos exportados em formato compativel com distribuicao comercial.
- Imagens finais com equilibrio entre qualidade visual e peso.

### E5. Distribuicao e Integracoes
Status: Planejado

Entregas:

- Upload opcional para Google Drive e/ou Dropbox.
- Estrategia de retry e logs para falhas de rede.
- Relatorio final de execucao com resumo de artefatos gerados.

Criterios de aceite:
- Processo finaliza com rastreabilidade de sucesso/erro por arquivo.

## 6. Plano de Entrega (Now / Next / Later)

### Now (ciclo atual)

- Concluir E2 com mockups estaveis e naming final.
- Revisar padrao de resolucoes oficiais do produto.
- Iniciar E4 com pipeline de conversao de video e compressao.

### Next

- Finalizar E4 (perfis de saida).
- Explorar testes E2E do fluxo completo.

### Later

- Finalizar E4 (compressao e perfis de saida).
- Implementar E5 (integracoes de upload e relatorio operacional).

## 7. Metricas de Sucesso

| KPI | Meta MVP |
|---|---|
| Tempo de setup por cliente | <= 2 minutos |
| Tempo medio de execucao por projeto | <= 10 minutos |
| Taxa de sucesso de captura | >= 95% |
| Taxa de retrabalho manual de naming | < 5% |
| Percentual de artefatos prontos para portfolio sem edicao extra | >= 80% |

## 8. Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|---|---|---|
| Quebras por mudancas de layout dos sites | Alto | Definir estrategia de fallback por viewport e timeout configuravel |
| Inconsistencia de recorte no mockup | Medio | Parametrizar coordenadas por tipo de dispositivo |
| Dependencia de rede durante captura | Medio | Retry com backoff e log detalhado por URL |
| Crawler entrar em blog/admin por links internos | Alto | Regras de bloqueio por path/padrao e validacao de dominio interno |
| Captura incompleta das dobras da pagina | Medio/Alto | Algoritmo de scroll por passos com cobertura total da altura da pagina |
| Arquivos pesados para web | Medio | Compressao automatica com perfis de qualidade |
| Falhas em upload cloud | Baixo/Medio | Upload opcional, idempotencia e relatorio final de falhas |

## 9. Padroes de Implementacao

Padroes que devem ser mantidos a partir desta versao do roadmap:

- Separar claramente documentacao de roadmap e codigo de implementacao.
- Manter convencoes consistentes de nomes de arquivos e pastas.
- Registrar status por epico com criterio objetivo de aceite.
- Evitar informacoes redundantes e blocos longos de codigo dentro do ROADMAP.
- Evoluir este documento por versao, com data de atualizacao.

## 10. Definition of Done (DoD)

Um epico e considerado concluido quando:

1. Entregas previstas estao implementadas.
2. Criterios de aceite estao validados.
3. Fluxo foi testado em pelo menos um caso real.
4. Nomenclatura e estrutura de pastas seguem o padrao oficial.
5. Documentacao foi atualizada neste `ROADMAP.md`.

## 11. Proximos Passos Imediatos

1. Fechar matriz oficial de mockup por midia (os 4 modos do MVP: `all`, `images_only`, `videos_only`, `none`) e converter em regra de codigo.
2. Definir lista oficial de resolucoes de print e regra de capturas por dobra.
3. Criar relatorio de execucao (saida no terminal + arquivo `.json` opcional).

## 12. Documento de Arquitetura

- Arquitetura tecnica completa: `docs/ARCHITECTURE.md`
