"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const index_1 = require("../src/index");
describe('SQLite DB Interface', () => {
    let db;
    beforeEach(() => {
        // In-memory database for fast and isolated testing
        db = new better_sqlite3_1.default(':memory:');
        (0, index_1.setupDatabase)(db);
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
        (0, index_1.insertJob)(db, {
            id: jobId,
            client_name: 'Agencia Poti',
            site_url: 'https://exemplo.com',
            mockup_mode: 'all',
            status: 'queued'
        });
        const job = (0, index_1.getJob)(db, jobId);
        expect(job).toBeDefined();
        expect(job.client_name).toBe('Agencia Poti');
        expect(job.mockup_mode).toBe('all');
        expect(job.status).toBe('queued');
    });
});
//# sourceMappingURL=db.test.js.map