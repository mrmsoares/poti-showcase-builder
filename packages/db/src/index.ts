import Database from 'better-sqlite3';
import { SCHEMA_V1 } from './schema';

export interface CreateJobInput {
    id: string;
    client_name: string;
    site_url: string;
    mockup_mode: string;
    status: string;
}

/**
 * Aplica pragmas de segurança e performance e roda o schema.
 */
export function setupDatabase(db: Database.Database): void {
    // Pragma recommended by SQLite Database Expert Skill
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');

    db.exec(SCHEMA_V1);
    try {
        db.exec('ALTER TABLE jobs ADD COLUMN cloud_url TEXT;');
    } catch (e) {
        // Ignore if column already exists
    }
}

/**
 * Abre conexão com o banco em arquivo (production/dev mode).
 */
export function initDb(dbPath: string): Database.Database {
    const db = new Database(dbPath);
    setupDatabase(db);
    return db;
}

/**
 * Insere um Job utilizando PREPARED STATEMENTS (SQL Injection Prevention).
 */
export function insertJob(db: Database.Database, job: CreateJobInput): void {
    const stmt = db.prepare(`
    INSERT INTO jobs (id, client_name, site_url, mockup_mode, status)
    VALUES (@id, @client_name, @site_url, @mockup_mode, @status)
  `);

    stmt.run(job);
}

/**
 * Retorna um Job pelo ID, usando safe parameters.
 */
export function getJob(db: Database.Database, id: string): any {
    const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
    return stmt.get(id);
}

/**
 * Retorna todos os Jobs do banco de dados com um status específico.
 */
export function getJobsByStatus(db: Database.Database, status: string): any[] {
    const stmt = db.prepare('SELECT * FROM jobs WHERE status = ?');
    return stmt.all(status);
}

/**
 * Atualiza o status de um Job
 */
export function updateJobStatus(db: Database.Database, id: string, status: string, errorMessage: string | null = null): void {
    const stmt = db.prepare(`
    UPDATE jobs 
    SET status = @status, 
        error_message = @errorMessage 
    WHERE id = @id
  `);
    stmt.run({ id, status, errorMessage });
}

/**
 * Atualiza o progresso numérico de um Job
 */
export function updateJobProgress(db: Database.Database, id: string, total_pages: number, processed_pages: number): void {
    const stmt = db.prepare(`
    UPDATE jobs 
    SET total_pages = @total_pages, 
        processed_pages = @processed_pages 
    WHERE id = @id
  `);
    stmt.run({ id, total_pages, processed_pages });
}

/**
 * Atualiza a URL do Google Drive de um Job
 */
export function updateJobCloudUrl(db: Database.Database, id: string, cloudUrl: string): void {
    const stmt = db.prepare(`
    UPDATE jobs 
    SET cloud_url = @cloudUrl 
    WHERE id = @id
  `);
    stmt.run({ id, cloudUrl });
}
