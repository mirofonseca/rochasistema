'use strict';
const path = require('path');
const fs   = require('fs');

// ── Resolução do diretório de dados ──────────────────────
// Prioridade:
// 1. DATA_DIR (definido no railway.toml → aponta para o Volume)
// 2. RAILWAY_VOLUME_MOUNT_PATH (injetado automaticamente pelo Railway)
// 3. /data (path padrão do Volume Railway)
// 4. ./data (fallback local para desenvolvimento)
const DATA_DIR = process.env.DATA_DIR
  || process.env.RAILWAY_VOLUME_MOUNT_PATH
  || (fs.existsSync('/data') ? '/data' : null)
  || path.join(__dirname, '..', 'data');

const DB_FILE = path.join(DATA_DIR, 'rochasistema.db');

// Garante que o diretório existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log('[DB] Diretório de dados:', DATA_DIR);
console.log('[DB] Arquivo do banco:  ', DB_FILE);
console.log('[DB] Banco existente:   ', fs.existsSync(DB_FILE) ? 'SIM ✓' : 'NÃO — criando novo');

const initSqlJs = require('sql.js');
let db = null;

function persistDB() {
  try {
    const data = db.export();
    const buf  = Buffer.from(data);
    // Escrita atômica: grava em .tmp e renomeia para evitar corrupção
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, DB_FILE);
  } catch (e) {
    console.error('[DB] Erro ao persistir banco:', e.message);
  }
}

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const buf = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buf);
    console.log('[DB] Banco carregado com sucesso ✓');
  } else {
    db = new SQL.Database();
    console.log('[DB] Novo banco criado.');
  }

  createSchema();
  seedAdminUser();
  persistDB();

  // Auto-save periódico a cada 60s como segurança extra
  setInterval(persistDB, 60 * 1000);

  // Salva ao encerrar o processo
  process.on('SIGTERM', () => { persistDB(); process.exit(0); });
  process.on('SIGINT',  () => { persistDB(); process.exit(0); });

  return db;
}

function createSchema() {
  db.run(`PRAGMA journal_mode=WAL;`);
  db.run(`PRAGMA foreign_keys=ON;`);

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id            TEXT PRIMARY KEY,
      nome          TEXT NOT NULL,
      login         TEXT NOT NULL UNIQUE,
      senha_hash    TEXT NOT NULL,
      nivel         TEXT NOT NULL DEFAULT 'auxiliar' CHECK(nivel IN ('gerente','auxiliar')),
      criado_em     TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      ultimo_acesso TEXT
    );`);

  db.run(`
    CREATE TABLE IF NOT EXISTS reboques (
      id          TEXT PRIMARY KEY,
      nome        TEXT NOT NULL,
      tipo        TEXT NOT NULL DEFAULT 'Aberto',
      placa       TEXT,
      capacidade  TEXT,
      diaria      REAL NOT NULL DEFAULT 70,
      status      TEXT NOT NULL DEFAULT 'disponivel'
                  CHECK(status IN ('disponivel','alugado','manutencao')),
      obs         TEXT,
      criado_em   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );`);

  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id            TEXT PRIMARY KEY,
      nome          TEXT NOT NULL,
      cpf           TEXT,
      tel           TEXT NOT NULL,
      email         TEXT,
      endereco      TEXT,
      cidade        TEXT,
      cnh           TEXT,
      cat_cnh       TEXT,
      renavan       TEXT,
      placa_veiculo TEXT,
      obs           TEXT,
      criado_em     TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );`);

  db.run(`
    CREATE TABLE IF NOT EXISTS alugueis (
      id          TEXT PRIMARY KEY,
      cliente_id  TEXT NOT NULL REFERENCES clientes(id),
      reboque_id  TEXT NOT NULL REFERENCES reboques(id),
      saida       TEXT NOT NULL,
      devolucao   TEXT NOT NULL,
      diaria      REAL NOT NULL,
      total       REAL NOT NULL,
      pagamento   TEXT NOT NULL DEFAULT 'pendente'
                  CHECK(pagamento IN ('pendente','parcial','pago')),
      status      TEXT NOT NULL DEFAULT 'ativo'
                  CHECK(status IN ('ativo','encerrado')),
      obs         TEXT,
      criado_em   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );`);

  db.run(`
    CREATE TABLE IF NOT EXISTS auditoria (
      id            TEXT PRIMARY KEY,
      tipo          TEXT NOT NULL,
      modulo        TEXT NOT NULL,
      descricao     TEXT NOT NULL,
      detalhes      TEXT,
      usuario_id    TEXT,
      usuario_login TEXT,
      usuario_nome  TEXT,
      usuario_nivel TEXT,
      criado_em     TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );`);

  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );`);

  // Índices
  db.run(`CREATE INDEX IF NOT EXISTS idx_al_cliente  ON alugueis(cliente_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_al_reboque  ON alugueis(reboque_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_al_status   ON alugueis(status);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_aud_ts      ON auditoria(criado_em DESC);`);

  // Migrações para bancos existentes (silencioso se coluna já existir)
  [
    `ALTER TABLE clientes ADD COLUMN renavan TEXT`,
    `ALTER TABLE clientes ADD COLUMN placa_veiculo TEXT`,
  ].forEach(sql => { try { db.run(sql); } catch(e) {} });

  console.log('[DB] Schema OK ✓');
}

function seedAdminUser() {
  const row   = db.exec(`SELECT COUNT(*) as n FROM usuarios`);
  const count = row[0]?.values[0][0] || 0;
  if (count > 0) return;
  const crypto = require('crypto');
  const hash   = crypto.createHash('sha256').update('admin123').digest('hex');
  const id     = 'u-' + Date.now().toString(36);
  db.run(`INSERT INTO usuarios (id,nome,login,senha_hash,nivel) VALUES (?,?,?,?,?)`,
    [id, 'Administrador', 'admin', hash, 'gerente']);
  console.log('[DB] Usuário admin criado (admin/admin123)');
}

// Helpers de query
function all(sql, params = []) {
  try {
    const res = db.exec(sql, params);
    if (!res.length) return [];
    const { columns, values } = res[0];
    return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
  } catch (e) {
    console.error('[DB] all() error:', e.message);
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
    console.error('[DB] run() error:', e.message);
    throw e;
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

module.exports = { initDB, all, get, run, uid, persistDB, DB_FILE };
