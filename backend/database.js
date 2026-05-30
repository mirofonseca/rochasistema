'use strict';
const path = require('path');
const fs   = require('fs');

// ── Database file location ─────────────────────────────
const DB_DIR  = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DB_DIR, 'rochasistema.db');

// ── Ensure data/ folder exists ─────────────────────────
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log('[DB] Pasta /data criada.');
}

// ── Load sql.js ────────────────────────────────────────
const initSqlJs = require('sql.js');

let db = null;

/**
 * Persists in-memory DB to disk after every write.
 */
function persistDB() {
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

/**
 * Loads existing DB from disk OR creates a new one.
 * Returns the initialized sql.js Database instance.
 */
async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
    console.log('[DB] Banco carregado de:', DB_FILE);
  } else {
    db = new SQL.Database();
    console.log('[DB] Novo banco criado em:', DB_FILE);
  }

  createSchema();
  seedAdminUser();
  persistDB();
  return db;
}

/**
 * Creates all tables if they don't exist (idempotent).
 */
function createSchema() {
  db.run(`PRAGMA journal_mode=WAL;`);
  db.run(`PRAGMA foreign_keys=ON;`);

  // ── USUARIOS ───────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id           TEXT PRIMARY KEY,
      nome         TEXT NOT NULL,
      login        TEXT NOT NULL UNIQUE,
      senha_hash   TEXT NOT NULL,
      nivel        TEXT NOT NULL DEFAULT 'auxiliar' CHECK(nivel IN ('gerente','auxiliar')),
      criado_em    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      ultimo_acesso TEXT
    );
  `);

  // ── REBOQUES ───────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS reboques (
      id           TEXT PRIMARY KEY,
      nome         TEXT NOT NULL,
      tipo         TEXT NOT NULL DEFAULT 'Aberto',
      placa        TEXT,
      capacidade   TEXT,
      diaria       REAL NOT NULL DEFAULT 70,
      status       TEXT NOT NULL DEFAULT 'disponivel'
                   CHECK(status IN ('disponivel','alugado','manutencao')),
      obs          TEXT,
      criado_em    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  // ── CLIENTES ───────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id           TEXT PRIMARY KEY,
      nome         TEXT NOT NULL,
      cpf          TEXT,
      tel          TEXT NOT NULL,
      email        TEXT,
      endereco     TEXT,
      cidade       TEXT,
      cnh          TEXT,
      cat_cnh      TEXT,
      obs          TEXT,
      criado_em    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  // ── ALUGUEIS ───────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS alugueis (
      id           TEXT PRIMARY KEY,
      cliente_id   TEXT NOT NULL REFERENCES clientes(id),
      reboque_id   TEXT NOT NULL REFERENCES reboques(id),
      saida        TEXT NOT NULL,
      devolucao    TEXT NOT NULL,
      diaria       REAL NOT NULL,
      total        REAL NOT NULL,
      pagamento    TEXT NOT NULL DEFAULT 'pendente'
                   CHECK(pagamento IN ('pendente','parcial','pago')),
      status       TEXT NOT NULL DEFAULT 'ativo'
                   CHECK(status IN ('ativo','encerrado')),
      obs          TEXT,
      criado_em    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  // ── AUDITORIA ──────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS auditoria (
      id           TEXT PRIMARY KEY,
      tipo         TEXT NOT NULL,
      modulo       TEXT NOT NULL,
      descricao    TEXT NOT NULL,
      detalhes     TEXT,
      usuario_id   TEXT,
      usuario_login TEXT,
      usuario_nome TEXT,
      usuario_nivel TEXT,
      criado_em    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  // ── CONFIG ─────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `);

  // Índices para performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_alugueis_cliente ON alugueis(cliente_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_alugueis_reboque ON alugueis(reboque_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_alugueis_status  ON alugueis(status);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_auditoria_ts     ON auditoria(criado_em DESC);`);

  console.log('[DB] Schema verificado/criado com sucesso.');
}

/**
 * Seeds the default admin user if no users exist.
 */
function seedAdminUser() {
  const row = db.exec(`SELECT COUNT(*) as n FROM usuarios`);
  const count = row[0]?.values[0][0] || 0;
  if (count > 0) return;

  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update('admin123').digest('hex');
  const id = 'u-' + Date.now().toString(36);

  db.run(
    `INSERT INTO usuarios (id, nome, login, senha_hash, nivel) VALUES (?, ?, ?, ?, ?)`,
    [id, 'Administrador', 'admin', hash, 'gerente']
  );
  console.log('[DB] Usuário admin criado (login: admin / senha: admin123)');
}

// ── Query helpers ─────────────────────────────────────
function all(sql, params = []) {
  try {
    const res = db.exec(sql, params);
    if (!res.length) return [];
    const { columns, values } = res[0];
    return values.map(row =>
      Object.fromEntries(columns.map((c, i) => [c, row[i]]))
    );
  } catch (e) {
    console.error('[DB] all() error:', e.message, '\nSQL:', sql);
    throw e;
  }
}

function get(sql, params = []) {
  return all(sql, params)[0] || null;
}

function run(sql, params = []) {
  try {
    db.run(sql, params);
    persistDB();
    return { changes: db.getRowsModified() };
  } catch (e) {
    console.error('[DB] run() error:', e.message, '\nSQL:', sql);
    throw e;
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

module.exports = { initDB, all, get, run, uid, persistDB };
