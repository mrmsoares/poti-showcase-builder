import { Asset, MockupConfig } from './types';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

/**
 * Motor de Decisão de Mockups
 * Aplica a matriz de flexibilidade para o MVP do Poti Showcase Builder.
 */
export function shouldApplyMockup(asset: Asset, config: MockupConfig): boolean {
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

/**
 * Mescla um Screenshot PNG Cru com um Device Frame usando Sharp (C++ Bindings).
 * 
 * @param rawImagePath Caminho absoluto da imagem da dobra gerada pelo Chromium.
 * @param frameImagePath Caminho absoluto da moldura PNG (deve ter a tela transparente).
 * @param destinationPath Caminho de saída do Mockup final.
 */
export async function applyImageMockup(rawImagePath: string, frameImagePath: string, destinationPath: string): Promise<void> {
    if (!fs.existsSync(rawImagePath)) throw new Error(`[Mockup] RAW não encontrado: ${rawImagePath}`);
    if (!fs.existsSync(frameImagePath)) throw new Error(`[Mockup] Frame não encontrado: ${frameImagePath}`);

    const dir = path.dirname(destinationPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    try {
        console.log(`[Mockup Engine] Compondo (Sharp): ${path.basename(rawImagePath)}...`);

        // 1. Lemos o frame estático para ditar as regras da tela
        const frameMeta = await sharp(frameImagePath).metadata();
        const rwWidth = frameMeta.width || 1440;
        const rwHeight = frameMeta.height || 900;

        // 2. Lemos o Screenshot do Cliente
        const rawLayer = sharp(rawImagePath);

        // 3. Ajustamos a imagem do site para caber exatamente DENTRO da moldura 
        const resizedRaw = await rawLayer
            .resize({
                width: rwWidth,
                height: rwHeight,
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .toBuffer();

        // 4. Overpass: O Device Frame PNG desce por CIMA rasgando o centro transparente mostrando a arte redimensionada.
        await sharp(resizedRaw)
            .composite([{ input: frameImagePath, gravity: 'centre' }])
            .jpeg({ quality: 85, progressive: true })
            .toFile(destinationPath.replace('.png', '.jpg'));

        console.log(`[Mockup Engine] Foto Otimizada Gerada: ${destinationPath.replace('.png', '.jpg')}`);
    } catch (err: any) {
        console.error(`[Mockup Engine] Falha Sharp em ${rawImagePath}: ${err.message}`);
        throw err;
    }
}

/**
 * Mescla um Vídeo WEBM contínuo com um Device Frame via FFmpeg, exportando como MP4.
 *  
 * @param rawVideoPath Caminho absoluto do vídeo cru gerado pelo Scroll.
 * @param frameImagePath Caminho da moldura estática PNG (Macbook vazio).
 * @param destinationPath Caminho do resultado .mp4.
 */
export async function applyVideoMockup(rawVideoPath: string, frameImagePath: string, destinationPath: string): Promise<void> {
    if (!fs.existsSync(rawVideoPath)) throw new Error(`Video não achado: ${rawVideoPath}`);
    if (!fs.existsSync(frameImagePath)) throw new Error(`Moldura não achada: ${frameImagePath}`);

    const dir = path.dirname(destinationPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    return new Promise((resolve, reject) => {
        console.log(`[Mockup Engine] Iniciando Encode e Composição FFmpeg FFmpeg em ${path.basename(rawVideoPath)}`);

        ffmpeg()
            .input(rawVideoPath)
            .input(frameImagePath)
            .complexFilter([
                // Filtro Complexo de Renderização do C++
                '[0:v]scale=-1:-1[raw]',
                '[raw][1:v]overlay=main_w/2-overlay_w/2:main_h/2-overlay_h/2'
            ])
            // Encoder rápido de rede e conversão de webm para mp4, H.264 Otimizado
            .outputOptions([
                '-c:v libx264',
                '-preset fast',
                '-crf 28',         // Qualidade otimizada para Web (Lower is better, 28 é ótimo pra custo/benfício web)
                '-r 30',           // Estabiliza o Framerate de captura livre do Browser para 30FPS cravados
                '-pix_fmt yuv420p',
                '-c:a aac',
                '-b:a 128k'
            ])
            .output(destinationPath)
            .on('end', () => {
                console.log(`[Mockup Engine] Encode de Vídeo Concluído: ${destinationPath}`);
                resolve();
            })
            .on('error', (err) => {
                console.error(`[Mockup Engine] FFmpeg explodiu o Encode: ${err.message}`);
                reject(err);
            })
            .run();
    });
}
