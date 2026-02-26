import { captureImage } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

describe('Playwright Capture Engine', () => {

    const outputDir = path.resolve(__dirname, '../../output');
    const mockFile = path.resolve(outputDir, 'test-capture.png');

    beforeAll(() => {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
    });

    afterAll(() => {
        // Clean up
        if (fs.existsSync(mockFile)) {
            fs.unlinkSync(mockFile);
        }
    });

    test('Deve capturar um screenshot local a partir de uma URL válida', async () => {
        // Como isto é um teste unitario sem network real profunda, usaremos about:blank ou mock mode
        // Mas para testar engine base, rodamos em isMock=true ou usamos uma URL levissima internal. 
        // Usaremos "data:text/html,<h1>Test</h1>" para ser muito rapido sem timeout
        const testUrl = 'data:text/html,<html><body><h1 style="color:blue">Poti Builder Automated Capture</h1></body></html>';

        await captureImage(testUrl, mockFile);

        // Verifica se arquivo foi criado e possui bytes
        expect(fs.existsSync(mockFile)).toBe(true);
        const stats = fs.statSync(mockFile);
        expect(stats.size).toBeGreaterThan(100);
    }, 15000);

});
