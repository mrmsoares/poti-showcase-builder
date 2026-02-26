import Fastify from 'fastify';
import { jobRoutes } from './routes/jobs.js';
import cors from '@fastify/cors';
import { initDb } from '@poti/db';
import fastifyStatic from '@fastify/static';
import path from 'path';

declare module 'fastify' {
    interface FastifyInstance {
        db: any;
    }
}

const fastify = Fastify({
    logger: {
        level: 'trace'
    }
});

fastify.register(cors, {
    origin: true
});

fastify.register(fastifyStatic, {
    root: path.resolve(process.cwd(), 'output'),
    prefix: '/assets/', // Arquivos serão acessíveis via http://localhost:3001/assets/<jobId>/<view>/images/raw/xxx.png
});


const start = async () => {
    try {
        // Garantindo que resolve a partir da raiz do monorepo CWD onde o npm foi rodado
        const dbPath = path.resolve(process.cwd(), 'data', 'showcase.db');
        const dbInstance = initDb(dbPath);
        fastify.decorate('db', dbInstance);

        fastify.register(jobRoutes);
        await fastify.listen({ port: 3001, host: '0.0.0.0' });
        fastify.log.info(`API Mock Orchestration server em http://127.0.0.1:3001`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
