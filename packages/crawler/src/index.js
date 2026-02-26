"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlerEngine = crawlerEngine;
const playwright_1 = require("playwright");
/**
 * Função principal do motor crawler usando Auto-Waiting e Page Object principles.
 *
 * @param startUrl URL de partida do job
 * @param isMock (Opcional) ativa o modo de teste para evitar abertura real de browsers em testes unitários.
 * @returns Set com a lista única de links a serem processados.
 */
async function crawlerEngine(startUrl, isMock = false) {
    const discoveredLinks = new Set();
    if (isMock) {
        // Retorno do mock do Jest para simular uma extração de DOM sem chamar o HTTP real
        discoveredLinks.add(`${startUrl}/sobre`);
        discoveredLinks.add(`${startUrl}/contato`);
        // O /wp-admin simulado seria removido pelas políticas a seguir
        return discoveredLinks;
    }
    // Comportamento real de navegação do Playwright
    const browser = await playwright_1.chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        const origin = new URL(startUrl).origin;
        await page.goto(startUrl, { waitUntil: 'networkidle' });
        // Extrair todas as âncoras da página usando Playwright selectors (Auto-Waiting)
        // Extraímos o href property de toda e qualquer anchor <a>
        const locators = await page.locator('a').all();
        for (const locator of locators) {
            const href = await locator.getAttribute('href');
            if (!href)
                continue;
            try {
                const linkUrl = new URL(href, origin);
                // 1. Limitar crawl a mesma origem
                if (linkUrl.origin === origin) {
                    // 2. Aplicar políticas de filtro do ARCHITECTURE.md (sem blogs/painéis wp)
                    const isExcluded = linkUrl.pathname.includes('/wp-admin') || linkUrl.pathname.includes('/blog');
                    if (!isExcluded) {
                        discoveredLinks.add(linkUrl.href);
                    }
                }
            }
            catch (err) {
                // Ignorar URLs inválidas
            }
        }
    }
    finally {
        await browser.close();
    }
    return discoveredLinks;
}
//# sourceMappingURL=index.js.map