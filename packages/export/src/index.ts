import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

export interface JobManifest {
    jobId: string;
    clientName: string;
    siteUrl: string;
    metrics: {
        startTime: string;
        endTime: string;
        durationSeconds: number;
        totalBytes: number;
        viewsProcessed: number;
        imagesGenerated: number;
        videosGenerated: number;
        errors: string[];
    };
    views: Record<string, any>;
}

export async function generateManifest(
    jobId: string,
    clientName: string,
    siteUrl: string,
    outputDir: string,
    startTime: Date,
    errors: string[] = []
): Promise<void> {
    const endTime = new Date();
    const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

    let totalBytes = 0;
    let imagesGenerated = 0;
    let videosGenerated = 0;
    const viewsProcessed: string[] = [];
    const viewsData: Record<string, any> = {};

    if (fs.existsSync(outputDir)) {
        const views = fs.readdirSync(outputDir).filter(f => fs.statSync(path.join(outputDir, f)).isDirectory());

        for (const view of views) {
            viewsProcessed.push(view);
            const viewPath = path.join(outputDir, view);
            viewsData[view] = { images: [], videos: [] };

            const scanDir = (subpath: string, type: 'images' | 'videos') => {
                const fullPath = path.join(viewPath, subpath);
                if (fs.existsSync(fullPath)) {
                    const files = fs.readdirSync(fullPath).filter(f => fs.statSync(path.join(fullPath, f)).isFile());
                    for (const file of files) {
                        const stat = fs.statSync(path.join(fullPath, file));
                        totalBytes += stat.size;
                        if (type === 'images') imagesGenerated++;
                        if (type === 'videos') videosGenerated++;
                        viewsData[view][type].push(path.join(subpath, file).replace(/\\/g, '/'));
                    }
                }
            };

            scanDir('images/raw', 'images');
            scanDir('images/mockups', 'images');
            scanDir('videos/raw', 'videos');
            scanDir('videos/mockups', 'videos');
        }
    }

    const manifest: JobManifest = {
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

    const manifestPath = path.join(outputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`[Export] Manifest gerado para o Job ${jobId}: ${manifestPath}`);
}

export async function createArchive(sourceDir: string, jobSlug: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // We will output the zip file to a separate `archives` directory in the root
        const rootDir = process.cwd(); // Assume caller runs from root or we resolve it
        const archivesDir = path.resolve(rootDir, 'output', '_archives');

        if (!fs.existsSync(archivesDir)) {
            fs.mkdirSync(archivesDir, { recursive: true });
        }

        const outPath = path.join(archivesDir, `${jobSlug}.zip`);
        const output = fs.createWriteStream(outPath);
        const archive = archiver('zip', {
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
            } else {
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
