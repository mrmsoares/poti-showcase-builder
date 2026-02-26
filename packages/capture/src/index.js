"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureImage = captureImage;
const playwright_1 = require("playwright");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Função principal do motor capture para tirar Screenshot full-page.
 *
 * @param url Endereço a ser capturado
 * @param destinationPath Caminho absoluto de salvamento do arquivo PNG
 */
async function captureImage(url, destinationPath) {
    // Garantir diretório criado
    const dir = path_1.default.dirname(destinationPath);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    const browser = await playwright_1.chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2, // High-Res para mockups bonitos
    });
    const page = await context.newPage();
    try {
        // Aguarda o HTML e o Idle de rede (sem novos requests por 500ms)
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        // Full Page Screenshot
        await page.screenshot({
            path: destinationPath,
            fullPage: true,
            type: 'png'
        });
    }
    catch (error) {
        console.error(`[Capture Engine] Erro salvando imagem de ${url}: ${error.message}`);
        throw error;
    }
    finally {
        await browser.close();
    }
}
