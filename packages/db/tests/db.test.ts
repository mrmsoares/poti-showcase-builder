import Database from 'better-sqlite3';
import { setupDatabase, insertJob, getJob } from '../src/index';

describe('SQLite DB Interface', () => {
    let db: Database.Database;

    beforeEach(() => {
        // In-memory database for fast and isolated testing
        db = new Database(':memory:');
        setupDatabase(db);
    });

    afterEach(() => {
        db.close();
    });

    test('Deve criar as tabelas jobs, pages e assets', () => {
        const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('jobs', 'pages', 'assets')");
        const tables = tableCheck.all();
        expect(tables.length).toBe(3);
    });

    test('Deve inserir e recuperar um Job via queries seguras (Parameterized Queries)', () => {
        const jobId = 'test-job-id-123';
        insertJob(db, {
            id: jobId,
            client_name: 'Agencia Poti',
            site_url: 'https://exemplo.com',
            mockup_mode: 'all',
            status: 'queued'
        });

        const job = getJob(db, jobId);
        expect(job).toBeDefined();
        expect(job.client_name).toBe('Agencia Poti');
        expect(job.mockup_mode).toBe('all');
        expect(job.status).toBe('queued');
    });
});
