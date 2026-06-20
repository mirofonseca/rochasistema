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

// Diagnóstico de persistência: avisa se está rodando no Railway sem Volume.
// O Railway só injeta RAILWAY_VOLUME_MOUNT_PATH quando há um Volume montado de verdade.
const noRailway = !process.env.RAILWAY_ENVIRONMENT;
const hasVolume = !!process.env.RAILWAY_VOLUME_MOUNT_PATH;
if (noRailway) {
  console.log('[DB] Persistência:        LOCAL (dev)');
} else if (hasVolume) {
  console.log('[DB] Persistência:        VOLUME ✓ (' + process.env.RAILWAY_VOLUME_MOUNT_PATH + ') — dados sobrevivem a deploys');
} else {
  console.warn('[DB] ⚠️  ATENÇÃO: rodando no Railway SEM Volume montado.');
  console.warn('[DB] ⚠️  O banco será PERDIDO no próximo deploy. Monte um Volume em /data.');
}

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
      cep           TEXT,
      obs           TEXT,
      criado_em     TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );`);

  db.run(`
    CREATE TABLE IF NOT EXISTS alugueis (
      id             TEXT PRIMARY KEY,
      cliente_id     TEXT NOT NULL REFERENCES clientes(id),
      reboque_id     TEXT NOT NULL REFERENCES reboques(id),
      saida          TEXT NOT NULL,
      hora_saida     TEXT NOT NULL DEFAULT '00:00',
      devolucao      TEXT NOT NULL,
      hora_devolucao TEXT NOT NULL DEFAULT '00:00',
      diaria         REAL NOT NULL,
      total          REAL NOT NULL,
      pagamento      TEXT NOT NULL DEFAULT 'pendente'
                     CHECK(pagamento IN ('pendente','parcial','pago')),
      status         TEXT NOT NULL DEFAULT 'ativo'
                     CHECK(status IN ('ativo','reservado','encerrado')),
      obs            TEXT,
      criado_em      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );`);

  db.run(`
    CREATE TABLE IF NOT EXISTS manutencoes (
      id          TEXT PRIMARY KEY,
      reboque_id  TEXT NOT NULL REFERENCES reboques(id),
      tipo        TEXT NOT NULL,
      custo       REAL NOT NULL DEFAULT 0,
      status      TEXT NOT NULL DEFAULT 'em_andamento'
                  CHECK(status IN ('em_andamento','concluida')),
      obs         TEXT,
      data_inicio TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      data_fim    TEXT,
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
  db.run(`CREATE INDEX IF NOT EXISTS idx_man_reboque ON manutencoes(reboque_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_man_status  ON manutencoes(status);`);

  // Migrações para bancos existentes (silencioso se coluna já existir)
  [
    `ALTER TABLE clientes ADD COLUMN renavan TEXT`,
    `ALTER TABLE clientes ADD COLUMN placa_veiculo TEXT`,
    `ALTER TABLE clientes ADD COLUMN cep TEXT`,
    `ALTER TABLE alugueis ADD COLUMN hora_saida TEXT DEFAULT '00:00'`,
    `ALTER TABLE alugueis ADD COLUMN hora_devolucao TEXT DEFAULT '00:00'`,
  ].forEach(sql => { try { db.run(sql); } catch(e) {} });

  // Migração: permite status 'reservado' em bancos criados antes desta versão
  // (SQLite não suporta ALTER de CHECK constraint, então recriamos a tabela)
  migrarStatusReservado();

  console.log('[DB] Schema OK ✓');
}

function migrarStatusReservado() {
  try {
    const row = db.exec(`SELECT sql FROM sqlite_master WHERE type='table' AND name='alugueis'`);
    const ddl = row[0]?.values[0]?.[0] || '';
    if (ddl.includes('reservado')) return; // já migrado

    db.run(`
      CREATE TABLE alugueis_new (
        id             TEXT PRIMARY KEY,
        cliente_id     TEXT NOT NULL REFERENCES clientes(id),
        reboque_id     TEXT NOT NULL REFERENCES reboques(id),
        saida          TEXT NOT NULL,
        hora_saida     TEXT NOT NULL DEFAULT '00:00',
        devolucao      TEXT NOT NULL,
        hora_devolucao TEXT NOT NULL DEFAULT '00:00',
        diaria         REAL NOT NULL,
        total          REAL NOT NULL,
        pagamento      TEXT NOT NULL DEFAULT 'pendente'
                       CHECK(pagamento IN ('pendente','parcial','pago')),
        status         TEXT NOT NULL DEFAULT 'ativo'
                       CHECK(status IN ('ativo','reservado','encerrado')),
        obs            TEXT,
        criado_em      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
    `);
    db.run(`INSERT INTO alugueis_new SELECT * FROM alugueis;`);
    db.run(`DROP TABLE alugueis;`);
    db.run(`ALTER TABLE alugueis_new RENAME TO alugueis;`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_al_cliente  ON alugueis(cliente_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_al_reboque  ON alugueis(reboque_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_al_status   ON alugueis(status);`);
    console.log("[DB] Migração: status 'reservado' habilitado em alugueis ✓");
  } catch (e) {
    console.error('[DB] Erro na migração de status reservado:', e.message);
  }
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
