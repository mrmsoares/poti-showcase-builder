"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
describe('Playwright Crawler Engine', () => {
    test('Deve retornar a lista de links locais e remover exclusões (Mock HTML)', async () => {
        // Simulando comportamento de descoberta (o setup Playwright local rodará em in-memory mockup ou test page)
        const result = await (0, index_1.crawlerEngine)('https://example.com', true); // mockMode = true
        expect(result).toBeInstanceOf(Set);
        expect(result.has('https://example.com/sobre')).toBe(true);
        // Assegura que o script ignorou o admin
        expect(result.has('https://example.com/wp-admin')).toBe(false);
    });
});
//# sourceMappingURL=crawl.test.js.map