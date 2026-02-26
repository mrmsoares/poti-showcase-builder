"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateManifest = generateManifest;
exports.createArchive = createArchive;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const archiver_1 = __importDefault(require("archiver"));
async function generateManifest(jobId, clientName, siteUrl, outputDir, startTime, errors = []) {
    const endTime = new Date();
    const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
    let totalBytes = 0;
    let imagesGenerated = 0;
    let videosGenerated = 0;
    const viewsProcessed = [];
    const viewsData = {};
    if (fs_1.default.existsSync(outputDir)) {
        const views = fs_1.default.readdirSync(outputDir).filter(f => fs_1.default.statSync(path_1.default.join(outputDir, f)).isDirectory());
        for (const view of views) {
            viewsProcessed.push(view);
            const viewPath = path_1.default.join(outputDir, view);
            viewsData[view] = { images: [], videos: [] };
            const scanDir = (subpath, type) => {
                const fullPath = path_1.default.join(viewPath, subpath);
                if (fs_1.default.existsSync(fullPath)) {
                    const files = fs_1.default.readdirSync(fullPath).filter(f => fs_1.default.statSync(path_1.default.join(fullPath, f)).isFile());
                    for (const file of files) {
                        const stat = fs_1.default.statSync(path_1.default.join(fullPath, file));
                        totalBytes += stat.size;
                        if (type === 'images')
                            imagesGenerated++;
                        if (type === 'videos')
                            videosGenerated++;
                        viewsData[view][type].push(path_1.default.join(subpath, file).replace(/\\/g, '/'));
                    }
                }
            };
            scanDir('images/raw', 'images');
            scanDir('images/mockups', 'images');
            scanDir('videos/raw', 'videos');
            scanDir('videos/mockups', 'videos');
        }
    }
    const manifest = {
        jobId,
        clientName,
        siteUrl,
        metrics: {
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            durationSeconds,
            totalBytes,
            viewsProcessed: viewsProcessed.length,
            imagesGenerated,
            videosGenerated,
            errors
        },
        views: viewsData
    };
    const manifestPath = path_1.default.join(outputDir, 'manifest.json');
    fs_1.default.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`[Export] Manifest gerado para o Job ${jobId}: ${manifestPath}`);
}
async function createArchive(sourceDir, jobSlug) {
    return new Promise((resolve, reject) => {
        // We will output the zip file to a separate `archives` directory in the root
        const rootDir = process.cwd(); // Assume caller runs from root or we resolve it
        const archivesDir = path_1.default.resolve(rootDir, 'output', '_archives');
        if (!fs_1.default.existsSync(archivesDir)) {
            fs_1.default.mkdirSync(archivesDir, { recursive: true });
        }
        const outPath = path_1.default.join(archivesDir, `${jobSlug}.zip`);
        const output = fs_1.default.createWriteStream(outPath);
        const archive = (0, archiver_1.default)('zip', {
            zlib: { level: 9 } // Padrão máximo de compressão para arquivos locais
        });
        output.on('close', () => {
            console.log(`[Export] Zipped ${archive.pointer()} total bytes.`);
            console.log(`[Export] Pacote ZIP salvo em: ${outPath}`);
            resolve(outPath);
        });
        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn(`[Export] Aviso Archiver: ${err.message}`);
            }
            else {
                reject(err);
            }
        });
        archive.on('error', (err) => {
            reject(err);
        });
        archive.pipe(output);
        // Append files from a sub-directory, putting its contents at the root of archive
        archive.directory(sourceDir, false);
        archive.finalize();
    });
}
//# sourceMappingURL=index.js.map