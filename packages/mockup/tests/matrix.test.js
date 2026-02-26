"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
const types_1 = require("../src/types");
describe('Mockup Matrix Logic (Poti Showcase Builder)', () => {
    const imageAsset = { type: 'image', path: 'capture.png' };
    const videoAsset = { type: 'video', path: 'scroll.mp4' };
    test('Deve aplicar mockup em tudo no modo "all"', () => {
        const config = { mode: 'all' };
        expect((0, index_1.shouldApplyMockup)(imageAsset, config)).toBe(true);
        expect((0, index_1.shouldApplyMockup)(videoAsset, config)).toBe(true);
    });
    test('Deve aplicar apenas em imagens no modo "images_only"', () => {
        const config = { mode: 'images_only' };
        expect((0, index_1.shouldApplyMockup)(imageAsset, config)).toBe(true);
        expect((0, index_1.shouldApplyMockup)(videoAsset, config)).toBe(false);
    });
    test('Deve aplicar apenas em vídeos no modo "videos_only"', () => {
        const config = { mode: 'videos_only' };
        expect((0, index_1.shouldApplyMockup)(imageAsset, config)).toBe(false);
        expect((0, index_1.shouldApplyMockup)(videoAsset, config)).toBe(true);
    });
    test('Não deve aplicar mockup em nada no modo "none"', () => {
        const config = { mode: 'none' };
        expect((0, index_1.shouldApplyMockup)(imageAsset, config)).toBe(false);
        expect((0, index_1.shouldApplyMockup)(videoAsset, config)).toBe(false);
    });
});
//# sourceMappingURL=matrix.test.js.map