import Database from 'better-sqlite3';
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
export declare function setupDatabase(db: Database.Database): void;
/**
 * Abre conexão com o banco em arquivo (production/dev mode).
 */
export declare function initDb(dbPath: string): Database.Database;
/**
 * Insere um Job utilizando PREPARED STATEMENTS (SQL Injection Prevention).
 */
export declare function insertJob(db: Database.Database, job: CreateJobInput): void;
/**
 * Retorna um Job pelo ID, usando safe parameters.
 */
export declare function getJob(db: Database.Database, id: string): any;
//# sourceMappingURL=index.d.ts.map