import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

/**
 * Retorna o fator de escala de dispositivo (deviceScaleFactor) de acordo com o viewport.
 * Desktop/Tablet = 2x, Mobile = 3x.
 */
function getScaleFactorForWidth(width: number): number {
    return width <= 430 ? 3 : 2;
}

/**
 * Filtro de Rede Anti-Tracking (AdBlock).
 * Impede que a página aguarde o carregamento infinito de scripts de terceiros analíticos,
 * acelerando o "networkidle" em até 10-15 segundos.
 */
async function blockTrackers(page: Page) {
    await page.route('**/*', (route) => {
        const url = route.request().url();
        const blocklist = ['google-analytics', 'googletagmanager', 'facebook.com/tr/', 'hotjar', 'pixel', 'analytics', 'clarity'];

        if (blocklist.some(b => url.includes(b))) {
            route.abort();
        } else {
            route.continue();
        }
    });
}

/**
 * Motor auxiliar para Smooth Scrolling genérico.
 * Usado tanto para disparar Lazy-loads de imagens em Screenshots quanto para gravar vídeos contínuos.
 * Ele calcula a altura real e rola suavemente a tela ao longo de vários frames.
 */
async function autoScroll(page: import('playwright').Page, fast: boolean = false) {
    await page.evaluate(async (isFast) => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = isFast ? 300 : 100; // Fast-forward para imagens, Smooth para vídeo
            const interval = isFast ? 10 : 50;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight - window.innerHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, interval);
        });
    }, fast);
}

/**
 * Motor de captura de Screenshot Folds (múltiplas dobras iterativas).
 * 
 * @param browser Instância já lançada do Chromium reciclada pelo Worker.
 * @param url Endereço a ser capturado
 * @param baseDir Diretório de saída final onde as dobras ficarão
 */
export async function captureImageFolds(browser: Browser, url: string, baseDir: string, width: number = 1440, height: number = 900): Promise<void> {
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }

    const scaleFactor = getScaleFactorForWidth(width);

    // Usa um Contexto vazio super-rápido invés de relançar o navegador
    const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: scaleFactor,
    });

    const page = await context.newPage();
    await blockTrackers(page);

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        // Aguarda estabilização de fontes e layout
        await page.waitForTimeout(1000);

        // Oculta barras de rolagem nativas para um recorte de mockup limpo
        await page.addStyleTag({ content: 'body::-webkit-scrollbar { display: none; }' });

        // PRÉ-AQUECIMENTO: Rola a página inteira rapidamente até o final para disparar todos os Lazy Loads (Imagens/Iframes)
        console.log(`[Capture Engine] Disparando Pre-scroll para Lazy Loading em ${url}...`);
        await autoScroll(page, true);

        // Volta para o topo suavemente para poder iniciar a captura real
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500); // Aguarda volta ao topo fixar header fixo (sticky)

        // Lê a altura matemática real da página
        const maxScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);

        let currentPosition = 0;
        let foldIndex = 1;
        const overlap = 120; // 120 pixels de tolerância/corte entre as imagens
        const step = height - overlap;

        while (currentPosition < maxScrollHeight) {
            // Rola até a posição alvo deste fold
            await page.evaluate((pos) => window.scrollTo(0, pos), currentPosition);

            // Aguarda Lazy Loads fixarem
            await page.waitForTimeout(300);

            // Nomeia como fold-001.png, fold-002.png...
            const fileName = `fold-${String(foldIndex).padStart(3, '0')}.png`;
            const destPath = path.join(baseDir, fileName);

            await page.screenshot({
                path: destPath,
                fullPage: false, // Tiramos apenas a fatia exata na tela do viewport
                type: 'png'
            });

            console.log(`[Capture Engine] Dobra ${foldIndex} capturada salva: ${fileName}`);

            currentPosition += step;
            foldIndex++;

            // Segurança: Se no meio do processo a página acabar mas o height for menor que currentPosition
            if (currentPosition >= maxScrollHeight) {
                // Força um último print para o restinho do rodapé para garantir 100% de cobertura
                await page.evaluate((pos) => window.scrollTo(0, pos), maxScrollHeight);
                await page.waitForTimeout(200);

                const finalFileName = `fold-${String(foldIndex).padStart(3, '0')}.png`;
                await page.screenshot({
                    path: path.join(baseDir, finalFileName),
                    fullPage: false,
                    type: 'png'
                });
                break;
            }
        }

    } catch (error: any) {
        console.error(`[Capture Engine] Erro mapeando dobras de ${url}: ${error.message}`);
        throw error;
    } finally {
        await context.close();
    }
}

/**
 * Função responsável por gravar vídeo (.webm) simulando Scroll.
 * @param browser Instância já lançada do Chromium reciclada pelo Worker.
 */
export async function captureVideo(browser: Browser, url: string, destinationPath: string, width: number = 1440, height: number = 900): Promise<void> {
    const dir = path.dirname(destinationPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const context = await browser.newContext({
        viewport: { width, height },
        recordVideo: {
            dir: dir,
            size: { width, height }
        }
    });

    const page = await context.newPage();
    await blockTrackers(page);

    try {
        console.log(`[Capture Engine] Iniciando gravação de vídeo para: ${url} (${width}x${height})`);

        // Aguarda a rede ficar silenciosa para garantir fontes e estilos
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        // Dá um tempinho inicial extra no topo
        await page.waitForTimeout(1000);

        // Dispara o smooth scroll lento que vai forçar a gravação de todos os frames descendo a página
        await autoScroll(page, false);

        // Dá um tempinho extra no fundo da página
        await page.waitForTimeout(1000);

    } catch (error: any) {
        console.error(`[Capture Engine] Falha na gravação de vídeo para ${url}: ${error.message}`);
        throw error;
    } finally {
        // Fechar a context finaliza o stream de vídeo em disco e salva o arquivo temporário
        await context.close();

        const video = await page.video();
        if (video) {
            const tempVideoPath = await video.path();
            fs.renameSync(tempVideoPath, destinationPath);
            console.log(`[Capture Engine] Vídeo salvo com sucesso em: ${destinationPath}`);
        }

        // Não finalizamos o browser, pois o worker o controla
    }
}
