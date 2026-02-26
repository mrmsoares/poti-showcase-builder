"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDatabase = setupDatabase;
exports.initDb = initDb;
exports.insertJob = insertJob;
exports.getJob = getJob;
exports.getJobsByStatus = getJobsByStatus;
exports.updateJobStatus = updateJobStatus;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const schema_1 = require("./schema");
/**
 * Aplica pragmas de segurança e performance e roda o schema.
 */
function setupDatabase(db) {
    // Pragma recommended by SQLite Database Expert Skill
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
    db.exec(schema_1.SCHEMA_V1);
}
/**
 * Abre conexão com o banco em arquivo (production/dev mode).
 */
function initDb(dbPath) {
    const db = new better_sqlite3_1.default(dbPath);
    setupDatabase(db);
    return db;
}
/**
 * Insere um Job utilizando PREPARED STATEMENTS (SQL Injection Prevention).
 */
function insertJob(db, job) {
    const stmt = db.prepare(`
    INSERT INTO jobs (id, client_name, site_url, mockup_mode, status)
    VALUES (@id, @client_name, @site_url, @mockup_mode, @status)
  `);
    stmt.run(job);
}
/**
 * Retorna um Job pelo ID, usando safe parameters.
 */
function getJob(db, id) {
    const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
    return stmt.get(id);
}
/**
 * Retorna todos os Jobs do banco de dados com um status específico.
 */
function getJobsByStatus(db, status) {
    const stmt = db.prepare('SELECT * FROM jobs WHERE status = ?');
    return stmt.all(status);
}
/**
 * Atualiza o status de um Job
 */
function updateJobStatus(db, id, status, errorMessage = null) {
    const stmt = db.prepare(`
    UPDATE jobs 
    SET status = @status, 
        error_message = @errorMessage 
    WHERE id = @id
  `);
    stmt.run({ id, status, errorMessage });
}
