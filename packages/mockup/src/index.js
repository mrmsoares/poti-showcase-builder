"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldApplyMockup = shouldApplyMockup;
const types_1 = require("./types");
/**
 * Motor de Decisão de Mockups
 * Aplica a matriz de flexibilidade para o MVP do Poti Showcase Builder.
 */
function shouldApplyMockup(asset, config) {
    const { type } = asset;
    const { mode } = config;
    switch (mode) {
        case 'all':
            return true;
        case 'images_only':
            return type === 'image';
        case 'videos_only':
            return type === 'video';
        case 'none':
            return false;
        default:
            console.warn(`[Mockup Engine] Modo desconhecido: ${mode}. Retornando raw asset.`);
            return false;
    }
}
//# sourceMappingURL=index.js.map