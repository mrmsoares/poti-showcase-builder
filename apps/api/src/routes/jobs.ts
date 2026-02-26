import type { FastifyInstance } from 'fastify';
import type { CreateJobInput } from '../schemas/job.schema.js';
import { CreateJobSchema } from '../schemas/job.schema.js';
import { insertJob, getJob, updateJobStatus } from '@poti/db';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export async function jobRoutes(fastify: FastifyInstance) {
    fastify.post<{ Body: CreateJobInput }>(
        '/jobs',
        async (request, reply) => {

            const parseResult = CreateJobSchema.safeParse(request.body);

            if (!parseResult.success) {
                return reply.status(400).send({
                    error: 'Validation Error',
                    details: parseResult.error.format()
                });
            }

            const { client_name, site_url, mockup_mode } = parseResult.data;
            const mockJobId = uuidv4();

            try {
                // Usa a injeção SQLite no Lifecycle Fastify
                insertJob(request.server.db, {
                    id: mockJobId,
                    client_name,
                    site_url,
                    mockup_mode,
                    status: 'queued'
                });

                return reply.status(201).send({
                    job_id: mockJobId,
                    status: 'queued',
                    message: `Job ${mockJobId} armazenado com sucesso no SQLite para \"${client_name}\". URL: ${site_url}. Modo: ${mockup_mode}.`,
                });
            } catch (dbError: any) {
                request.log.error(`Falha no SQLite: ${dbError.message}`);
                return reply.status(500).send({
                    error: 'Database Error',
                    message: 'Não foi possível armazenar o job no momento.'
                });
            }
        }
    );

    fastify.get(
        '/jobs',
        async (request, reply) => {
            try {
                // Fetch ALL jobs to debug ID formatting
                const stmt = request.server.db.prepare('SELECT id, status, client_name FROM jobs');
                const jobs = stmt.all();
                return reply.send({ count: jobs.length, jobs });
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        }
    );

    fastify.get<{ Params: { id: string } }>(
        '/jobs/:id',
        async (request, reply) => {
            try {
                const { id } = request.params;
                fastify.log.info(`[DEBUG] Recebido GET para ID: ${id}`);

                const job = getJob(request.server.db, id);

                if (!job) {
                    fastify.log.warn(`[DEBUG] Job ID ${id} não localizado no banco de dados!`);
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: `Job ${id} não encontrado na base de dados.`
                    });
                }

                return reply.send(job);
            } catch (err: any) {
                request.log.error(`Erro buscando job: ${err.message}`);
                return reply.status(500).send({
                    error: 'Database Error',
                    message: 'Erro interno ao consultar job.'
                });
            }
        }
    );

    // Endpoint: Pausar Job
    fastify.post<{ Params: { id: string } }>(
        '/jobs/:id/pause',
        async (request, reply) => {
            try {
                const { id } = request.params;
                const job = getJob(request.server.db, id);
                if (!job) return reply.status(404).send({ error: 'Not Found' });

                updateJobStatus(request.server.db, id, 'paused');
                return reply.send({ success: true, message: 'Job paused' });
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        }
    );

    // Endpoint: Retomar Job
    fastify.post<{ Params: { id: string } }>(
        '/jobs/:id/resume',
        async (request, reply) => {
            try {
                const { id } = request.params;
                const job = getJob(request.server.db, id);
                if (!job) return reply.status(404).send({ error: 'Not Found' });

                // Volta o status para queued para o Worker Polling buscar e continuar
                updateJobStatus(request.server.db, id, 'queued');
                return reply.send({ success: true, message: 'Job resumed' });
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        }
    );

    // Endpoint: Cancelar Job
    fastify.post<{ Params: { id: string } }>(
        '/jobs/:id/cancel',
        async (request, reply) => {
            try {
                const { id } = request.params;
                const job = getJob(request.server.db, id);
                if (!job) return reply.status(404).send({ error: 'Not Found' });

                updateJobStatus(request.server.db, id, 'cancelled');
                return reply.send({ success: true, message: 'Job cancelled' });
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        }
    );

    // Endpoint: Download do Pacote ZIP Finalizado
    fastify.get<{ Params: { id: string } }>(
        '/jobs/:id/download',
        async (request, reply) => {
            try {
                const { id } = request.params;
                const job = getJob(request.server.db, id);

                if (!job) return reply.status(404).send({ error: 'Not Found' });
                if (job.status !== 'done') {
                    return reply.status(400).send({ error: 'Job in progress', message: 'O arquivo final ainda não está pronto para download.' });
                }

                // Arquivos .zip são sempre atrelados ao job.id gerados pelo Worker
                const zipPath = path.resolve(process.cwd(), 'output', '_archives', `${job.id}.zip`);

                if (!fs.existsSync(zipPath)) {
                    return reply.status(404).send({ error: 'File Not Found', message: 'O arquivo ZIP não foi localizado no disco.' });
                }

                const stream = fs.createReadStream(zipPath);

                // Força o Browser a engatilhar um Download Header
                reply.header('Content-Type', 'application/zip');
                reply.header('Content-Disposition', `attachment; filename="${job.client_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_showcase.zip"`);

                return reply.send(stream);
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        }
    );

    // Endpoint: Listar Assets Gerados (Imagens e Vídeos via Mockup ou Raw)
    fastify.get<{ Params: { id: string } }>(
        '/jobs/:id/assets',
        async (request, reply) => {
            try {
                const { id } = request.params;
                const job = getJob(request.server.db, id);
                if (!job) return reply.status(404).send({ error: 'Not Found' });

                const outputDir = path.resolve(process.cwd(), 'output', id);
                if (!fs.existsSync(outputDir)) {
                    return reply.send({ assets: [] });
                }

                const views = fs.readdirSync(outputDir).filter(f => fs.statSync(path.join(outputDir, f)).isDirectory());

                const listFilesRecursive = (absoluteRoot: string, publicPrefix: string): string[] => {
                    if (!fs.existsSync(absoluteRoot)) return [];

                    const entries = fs.readdirSync(absoluteRoot, { withFileTypes: true });
                    const files: string[] = [];

                    for (const entry of entries) {
                        const absoluteEntry = path.join(absoluteRoot, entry.name);
                        if (entry.isDirectory()) {
                            files.push(...listFilesRecursive(absoluteEntry, `${publicPrefix}/${entry.name}`));
                        } else {
                            files.push(`${publicPrefix}/${entry.name}`);
                        }
                    }

                    return files;
                };

                const assets = views.map(view => {
                    const viewPath = path.join(outputDir, view);

                    const imagesMockups = listFilesRecursive(
                        path.join(viewPath, 'images', 'mockups'),
                        `/assets/${id}/${view}/images/mockups`
                    );
                    const imagesRaw = listFilesRecursive(
                        path.join(viewPath, 'images', 'raw'),
                        `/assets/${id}/${view}/images/raw`
                    );

                    const videosMockups = listFilesRecursive(
                        path.join(viewPath, 'videos', 'mockups'),
                        `/assets/${id}/${view}/videos/mockups`
                    );
                    const videosRaw = listFilesRecursive(
                        path.join(viewPath, 'videos', 'raw'),
                        `/assets/${id}/${view}/videos/raw`
                    );

                    return {
                        view,
                        images: imagesMockups.length > 0 ? imagesMockups : imagesRaw,
                        videos: videosMockups.length > 0 ? videosMockups : videosRaw
                    };
                });

                return reply.send({ assets });
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        }
    );
}
