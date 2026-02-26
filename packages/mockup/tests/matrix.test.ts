import { shouldApplyMockup } from '../src/index';
import { Asset, MockupConfig } from '../src/types';

describe('Mockup Matrix Logic (Poti Showcase Builder)', () => {
    const imageAsset: Asset = { type: 'image', path: 'capture.png' };
    const videoAsset: Asset = { type: 'video', path: 'scroll.mp4' };

    test('Deve aplicar mockup em tudo no modo "all"', () => {
        const config: MockupConfig = { mode: 'all' };
        expect(shouldApplyMockup(imageAsset, config)).toBe(true);
        expect(shouldApplyMockup(videoAsset, config)).toBe(true);
    });

    test('Deve aplicar apenas em imagens no modo "images_only"', () => {
        const config: MockupConfig = { mode: 'images_only' };
        expect(shouldApplyMockup(imageAsset, config)).toBe(true);
        expect(shouldApplyMockup(videoAsset, config)).toBe(false);
    });

    test('Deve aplicar apenas em vídeos no modo "videos_only"', () => {
        const config: MockupConfig = { mode: 'videos_only' };
        expect(shouldApplyMockup(imageAsset, config)).toBe(false);
        expect(shouldApplyMockup(videoAsset, config)).toBe(true);
    });

    test('Não deve aplicar mockup em nada no modo "none"', () => {
        const config: MockupConfig = { mode: 'none' };
        expect(shouldApplyMockup(imageAsset, config)).toBe(false);
        expect(shouldApplyMockup(videoAsset, config)).toBe(false);
    });
});
