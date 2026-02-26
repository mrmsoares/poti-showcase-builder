import { chromium } from 'playwright';

// Configurações Globais de Limite de Segurança
const MAX_PAGES = 30;
const MAX_DEPTH = 3;

// Blocklist arquitetural (RegEx e Includes)
const BLOCKLIST = [
    '/wp-admin', '/wp-login', '/admin', '/dashboard', '/login',
    '/blog', '/categoria', '/tag/', '/author/',
];

const EXTENSION_BLOCKLIST = [
    '.pdf', '.zip', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.mp4'
];

/**
 * Limpa a URL de lixo inútil para evitar que a mesma página seja contada 2x.
 * Remove indexações locais (#) e Tracking UTMs (?).
 */
function sanitizeUrl(rawUrl: string, origin: string): string | null {
    try {
        const urlOb = new URL(rawUrl, origin);

        // Mantém apenas a mesma origem
        if (urlOb.origin !== origin) return null;

        // Verifica extensões banidas
        const lowPath = urlOb.pathname.toLowerCase();
        if (EXTENSION_BLOCKLIST.some(ext => lowPath.endsWith(ext))) return null;

        // Verifica rotas banidas
        if (BLOCKLIST.some(route => lowPath.includes(route))) return null;

        // Higienização de Hash e Query
        urlOb.hash = '';
        urlOb.search = '';

        // Omitir a barra final para unificar 'site.com/sobre/' e 'site.com/sobre'
        let cleanHref = urlOb.href;
        if (cleanHref.endsWith('/')) {
            cleanHref = cleanHref.slice(0, -1);
        }

        return cleanHref;
    } catch (e) {
        return null;
    }
}

interface QueueItem {
    url: string;
    depth: number;
}

/**
 * Função principal do motor crawler usando o Algoritmo BFS (Breadth-First Search).
 * Varre em largura respeitando a profundidade MAX_DEPTH.
 * 
 * @param startUrl URL raiz de partida.
 * @param isMock Mock fallback de segurança.
 */
export async function crawlerEngine(startUrl: string, isMock: boolean = false): Promise<Set<string>> {
    const discoveredLinks = new Set<string>();

    if (isMock) {
        discoveredLinks.add(`${startUrl}/sobre`);
        discoveredLinks.add(`${startUrl}/contato`);
        return discoveredLinks;
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        const origin = new URL(startUrl).origin;
        const startClean = sanitizeUrl(startUrl, origin);
        if (!startClean) return discoveredLinks; // Fail-safe se a home for inválida

        // Fila de processamento BFS
        const queue: QueueItem[] = [{ url: startClean, depth: 0 }];

        // Set Auxiliar para saber o que já foi posto na queue e não enfileirar em dobro
        const enqueued = new Set<string>([startClean]);

        console.log(`[Crawler] Iniciando BFS Mapeamento na raiz: ${startClean}`);

        while (queue.length > 0 && discoveredLinks.size < MAX_PAGES) {
            // Desenfileira o primeiro (FIFO - First In, First Out)
            const currentObj = queue.shift()!;

            // Marca como visitado Oficial
            discoveredLinks.add(currentObj.url);

            // Se chegamos no fundo do poço, não extraimos os filhos deste cara
            if (currentObj.depth >= MAX_DEPTH) {
                continue;
            }

            try {
                // Acessa a página para ler o DOM
                await page.goto(currentObj.url, { waitUntil: 'domcontentloaded', timeout: 15000 });

                // Extrai todos os âncoras brutas
                const hrefs = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('a')).map(a => a.href);
                });

                // Sanitiza e enfileira
                for (const rawHref of hrefs) {
                    if (discoveredLinks.size + queue.length >= MAX_PAGES * 2) {
                        break; // Se a fila explodir demais (site gigantesco), para de enfileirar.
                    }

                    const cleanHref = sanitizeUrl(rawHref, origin);

                    if (cleanHref && !enqueued.has(cleanHref)) {
                        enqueued.add(cleanHref);
                        queue.push({ url: cleanHref, depth: currentObj.depth + 1 });
                    }
                }
            } catch (err: any) {
                console.log(`[Crawler] Ignorando nó cego (Timeout/Error): ${currentObj.url}`);
            }
        }

        console.log(`[Crawler] BFS Concluído. Extraídos ${discoveredLinks.size} links limpos válidos.`);

    } finally {
        await browser.close();
    }

    return discoveredLinks;
}
