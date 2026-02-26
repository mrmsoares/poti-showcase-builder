import { initDb, getJobsByStatus, updateJobStatus, updateJobProgress, getJob } from '@poti/db';
import { crawlerEngine } from '@poti/crawler';
import { captureImageFolds, captureVideo } from '@poti/capture';
import { generateManifest, createArchive } from '@poti/export';
import { config } from 'dotenv';
config({ path: path.resolve(process.cwd(), '.env') });

import path from 'path';
import fs from 'fs';
import { chromium, Browser } from 'playwright';

// Utilizando CWD do monorepo onde o proxy npm script rodará
const DB_PATH = path.resolve(process.cwd(), 'data', 'showcase.db');
const OUTPUT_DIR = path.resolve(process.cwd(), 'output');

async function processJob(db: any, job: any, browser: Browser) {
    try {
        console.log(`\n============== JOB START ==============`);
        console.log(`[Worker] Iniciando '${job.client_name}' (${job.id})`);

        updateJobStatus(db, job.id, 'crawling');
        // 1. Crawler descobre links locais ou carrega do cache se for um Resume
        const cacheFile = path.join(OUTPUT_DIR, job.id, 'pages.json');
        let pagesList: string[] = [];

        if (fs.existsSync(cacheFile)) {
            pagesList = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
            console.log(`[Worker] Resume Detectado. Lendo lista de ${pagesList.length} páginas do cache local.`);
        } else {
            console.log(`[Worker] Crawling: ${job.site_url}...`);
            const linksPool = await crawlerEngine(job.site_url, false);
            pagesList = Array.from(linksPool);

            if (pagesList.length === 0) {
                pagesList.push(job.site_url); // Garante fallback da home se nada achou
            }

            // Cria o repositório do Job e salva a ordem determinística do Batch
            fs.mkdirSync(path.join(OUTPUT_DIR, job.id), { recursive: true });
            fs.writeFileSync(cacheFile, JSON.stringify(pagesList), 'utf-8');
            console.log(`[Worker] Lista de ${pagesList.length} páginas salva atômicamente no sistema de arquivos.`);
        }

        // Salva total_pages para refletir no Dashboard
        updateJobProgress(db, job.id, pagesList.length, job.processed_pages || 0);
        updateJobStatus(db, job.id, 'capturing');

        // Retomar de onde parou (se processed_pages > 0 via Pause e Resume).
        // Pode haver progresso fracionado para telemetria, então normalizamos para índice inteiro.
        const previousProgress = Number(job.processed_pages) || 0;
        let startIndex = Math.floor(previousProgress);

        // 2. Playwright Capture Engines
        for (let i = startIndex; i < pagesList.length; i++) {

            // Escuta dinâmica do estado atual no banco de dados para cada página (Life-cycle hooks)
            const currentJobState = getJob(db, job.id);
            if (currentJobState.status === 'paused') {
                console.log(`[Worker] Job ${job.id} pausado de forma limpa pelo usuário. Interrompendo batch.`);
                return; // Quebra a função de forma silenciosa e não altera status.
            }
            if (currentJobState.status === 'cancelled') {
                console.log(`[Worker] Job ${job.id} cancelado pelo usuário. Abortando.`);
                return;
            }

            const urlToCapture = pagesList[i];

            // Viewport Configurations
            const views = [
                { name: 'desktop', width: 1440, height: 900 },
                { name: 'tablet', width: 768, height: 1024 },
                { name: 'mobile', width: 390, height: 844 }
            ];

            const captureStepsPerPage = views.length * 2; // image + video por viewport
            let captureStepsDone = 0;

            for (const view of views) {
                // Nova Estrutura de Arquitetura de saida: output/<jobId>/<viewName>/images/raw/page_1/fold-001.png
                const baseImagesPath = path.join(OUTPUT_DIR, job.id, view.name, 'images', 'raw', `page_${i + 1}`);

                // Videos continuam tendo um só arquivo
                const baseVideosPath = path.join(OUTPUT_DIR, job.id, view.name, 'videos', 'raw');
                const destPathVideo = path.join(baseVideosPath, `page_${i + 1}.webm`);

                console.log(`[Worker] Capturando Folds de Imagem (${view.name.toUpperCase()} - ${view.width}x${view.height}): ${urlToCapture}`);
                await captureImageFolds(browser, urlToCapture, baseImagesPath, view.width, view.height);
                captureStepsDone += 1;
                updateJobProgress(db, job.id, pagesList.length, i + (captureStepsDone / captureStepsPerPage));

                console.log(`[Worker] Capturando Vídeo Contínuo (${view.name.toUpperCase()} - ${view.width}x${view.height}): ${urlToCapture}`);
                await captureVideo(browser, urlToCapture, destPathVideo, view.width, view.height);
                captureStepsDone += 1;
                updateJobProgress(db, job.id, pagesList.length, i + (captureStepsDone / captureStepsPerPage));
            }

            console.log(`[Worker] Imagens e vídeos capturados para página ${i + 1}.`);

            // Persiste o progresso atômico no DB
            updateJobProgress(db, job.id, pagesList.length, i + 1);
        }

        // 3. Phase Final (Local-only): Mantém os arquivos RAW no disco.
        // Não utiliza assets/frames nem processamento de mockup por imagem estática.
        updateJobStatus(db, job.id, 'post_processing');
        console.log('[Worker] Modo local ativo: mockups por frame desabilitados. Utilizando apenas capturas RAW no disco.');

        // 4. Exportação do Pacote (Manifest & ZIP Final)
        console.log(`[Worker] Iniciando Geração do Manifest & Compactação ZIP...`);
        const jobDate = new Date(); // Pode ser extraido do banco, mas aqui é apenas pro arquivo final.
        await generateManifest(job.id, job.client_name, job.site_url, path.join(OUTPUT_DIR, job.id), jobDate);

        const zipFile = await createArchive(path.join(OUTPUT_DIR, job.id), job.id);
        console.log(`[Worker] Export Finalizado. Arquivo em: ${zipFile}`);

        console.log('[Worker] Persistência local concluída. Upload em nuvem desabilitado neste fluxo.');

        console.log(`[Worker] Job Concluído com Sucesso e Extensões Renderizadas!`);
        updateJobStatus(db, job.id, 'done');

    } catch (error: any) {
        console.error(`[Worker] Job falhou: ${error.message}`);
        updateJobStatus(db, job.id, 'failed', error.message);
    }
}

async function orchestratorDaemon() {
    console.log(`[Daemon] Worker iniciado. Lançando Chromium Base e Polling SQLite a cada 5 segundos...`);
    const db = initDb(DB_PATH);

    // Motor global do navegador. Inicia 1x e reaproveita para velocidade brutal.
    const globalBrowser = await chromium.launch({ headless: true });

    setInterval(async () => {
        // Buscar se há alguma tarefa pendente
        const pendingJobs = getJobsByStatus(db, 'queued');

        for (const job of pendingJobs) {
            await processJob(db, job, globalBrowser);
        }
    }, 5000);
}

// Inicia o Background Service
orchestratorDaemon();
