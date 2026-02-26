import { crawlerEngine } from '../src/index';

describe('Playwright Crawler Engine', () => {

    test('Deve retornar a lista de links locais e remover exclusões (Mock HTML)', async () => {
        // Simulando comportamento de descoberta (o setup Playwright local rodará em in-memory mockup ou test page)
        const result = await crawlerEngine('https://example.com', true); // mockMode = true

        expect(result).toBeInstanceOf(Set);
        expect(result.has('https://example.com/sobre')).toBe(true);
        // Assegura que o script ignorou o admin
        expect(result.has('https://example.com/wp-admin')).toBe(false);
    });
});
