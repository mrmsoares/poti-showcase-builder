import Fastify from 'fastify';
import jobRoutes from './routes/jobs.js';
const fastify = Fastify({
    logger: true
});
fastify.register(jobRoutes);
const start = async () => {
    try {
        await fastify.listen({ port: 3001 });
        fastify.log.info(`API Mock Orchestration server em http://localhost:3001`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map