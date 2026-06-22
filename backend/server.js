'use strict';
const express = require('express');
const cors    = require('cors');
const crypto  = require('crypto');
const path    = require('path');
const fs      = require('fs');
const { initDB, all, get, run, uid, persistDB } = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── View engine (EJS) ──────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// CORS — aceita qualquer origem (necessário para Railway e acesso externo)
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','x-auth-token'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Serve static files (CSS, JS, imagens) ──────────────
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.use(express.static(path.join(__dirname, '..'), { index: false }));

// ── Página principal — renderizada via EJS partials ────
app.get('/', (req, res) => {
  res.render('index');
});

// ── Helpers ───────────────────────────────────────────
const hash   = s => crypto.createHash('sha256').update(s).digest('hex');
const now    = () => new Date().toISOString().replace('T',' ').slice(0,19);
const today  = () => new Date().toISOString().slice(0,10);

function auditoria(tipo, modulo, descricao, detalhes, usuario) {
  run(
    `INSERT INTO auditoria (id,tipo,modulo,descricao,detalhes,usuario_id,usuario_login,usuario_nome,usuario_nivel,criado_em)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [uid(), tipo, modulo, descricao, detalhes||null,
     usuario?.id||null, usuario?.login||'sistema',
     usuario?.nome||'Sistema', usuario?.nivel||null, now()]
  );
}

// ── Auth middleware (simples via header) ──────────────
function auth(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    const u = get(`SELECT * FROM usuarios WHERE id=? AND login=?`, [payload.id, payload.login]);
    if (!u) return res.status(401).json({ error: 'Sessão inválida' });
    req.user = u;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function gerente(req, res, next) {
  if (req.user?.nivel !== 'gerente')
    return res.status(403).json({ error: 'Acesso restrito a gerentes' });
  next();
}

// ═══════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════
app.post('/api/auth/login', (req, res) => {
  const { login, senha } = req.body;
  if (!login || !senha) return res.status(400).json({ error: 'Login e senha obrigatórios' });

  const u = get(`SELECT * FROM usuarios WHERE login=?`, [login]);
  if (!u || u.senha_hash !== hash(senha))
    return res.status(401).json({ error: 'Usuário ou senha incorretos' });

  run(`UPDATE usuarios SET ultimo_acesso=? WHERE id=?`, [now(), u.id]);

  const token = Buffer.from(JSON.stringify({ id: u.id, login: u.login })).toString('base64');
  auditoria('login','Sistema',`Login: ${u.nome}`,`Nível: ${u.nivel}`, u);

  res.json({
    token,
    usuario: { id:u.id, nome:u.nome, login:u.login, nivel:u.nivel }
  });
});

app.post('/api/auth/logout', auth, (req, res) => {
  auditoria('logout','Sistema',`Logout: ${req.user.nome}`,null, req.user);
  res.json({ ok: true });
});

app.put('/api/auth/senha', auth, (req, res) => {
  const { senhaAtual, novaSenha } = req.body;
  const u = get(`SELECT * FROM usuarios WHERE id=?`, [req.user.id]);
  if (u.senha_hash !== hash(senhaAtual))
    return res.status(400).json({ error: 'Senha atual incorreta' });
  if (!novaSenha || novaSenha.length < 6)
    return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });
  run(`UPDATE usuarios SET senha_hash=? WHERE id=?`, [hash(novaSenha), req.user.id]);
  auditoria('senha','Minha Conta','Senha alterada pelo próprio usuário',`@${req.user.login}`, req.user);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════
// USUÁRIOS (gerente only)
// ═══════════════════════════════════════════════════════
app.get('/api/usuarios', auth, gerente, (req, res) => {
  const rows = all(`SELECT id,nome,login,nivel,criado_em,ultimo_acesso FROM usuarios ORDER BY criado_em`);
  res.json(rows);
});

app.post('/api/usuarios', auth, gerente, (req, res) => {
  const { nome, login, senha, nivel } = req.body;
  if (!nome || !login || !senha) return res.status(400).json({ error: 'Nome, login e senha obrigatórios' });
  if (senha.length < 6) return res.status(400).json({ error: 'Senha mínimo 6 caracteres' });
  if (!['gerente','auxiliar'].includes(nivel)) return res.status(400).json({ error: 'Nível inválido' });
  if (get(`SELECT id FROM usuarios WHERE login=?`,[login]))
    return res.status(409).json({ error: 'Login já existe' });

  const id = 'u-' + uid();
  run(`INSERT INTO usuarios (id,nome,login,senha_hash,nivel) VALUES (?,?,?,?,?)`,
    [id, nome, login, hash(senha), nivel]);
  auditoria('criar','Usuários',`Novo usuário: ${nome}`,`Login: @${login} · Nível: ${nivel}`, req.user);
  res.status(201).json(get(`SELECT id,nome,login,nivel,criado_em FROM usuarios WHERE id=?`,[id]));
});

app.put('/api/usuarios/:id', auth, gerente, (req, res) => {
  const { nome, login, nivel, senha } = req.body;
  const u = get(`SELECT * FROM usuarios WHERE id=?`,[req.params.id]);
  if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (get(`SELECT id FROM usuarios WHERE login=? AND id!=?`,[login, req.params.id]))
    return res.status(409).json({ error: 'Login já existe' });

  let senhaHash = u.senha_hash;
  const changes = [];
  if (nome !== u.nome) changes.push(`Nome: ${u.nome} → ${nome}`);
  if (nivel !== u.nivel) changes.push(`Nível: ${u.nivel} → ${nivel}`);
  if (senha) {
    if (senha.length < 6) return res.status(400).json({ error: 'Senha mínimo 6 caracteres' });
    senhaHash = hash(senha);
    changes.push('Senha redefinida');
  }
  run(`UPDATE usuarios SET nome=?,login=?,nivel=?,senha_hash=? WHERE id=?`,
    [nome, login, nivel, senhaHash, req.params.id]);
  auditoria('editar','Usuários',`Usuário editado: ${nome}`, changes.join(' · '), req.user);
  res.json(get(`SELECT id,nome,login,nivel,criado_em FROM usuarios WHERE id=?`,[req.params.id]));
});

app.delete('/api/usuarios/:id', auth, gerente, (req, res) => {
  if (req.params.id === req.user.id)
    return res.status(400).json({ error: 'Não é possível excluir sua própria conta' });
  const u = get(`SELECT * FROM usuarios WHERE id=?`,[req.params.id]);
  if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });
  run(`DELETE FROM usuarios WHERE id=?`,[req.params.id]);
  auditoria('excluir','Usuários',`Usuário excluído: ${u.nome}`,`Login: @${u.login}`, req.user);
  res.json({ ok: true });
});

app.put('/api/usuarios/:id/senha', auth, gerente, (req, res) => {
  const { novaSenha } = req.body;
  const u = get(`SELECT * FROM usuarios WHERE id=?`,[req.params.id]);
  if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (!novaSenha || novaSenha.length < 6)
    return res.status(400).json({ error: 'Senha mínimo 6 caracteres' });
  run(`UPDATE usuarios SET senha_hash=? WHERE id=?`,[hash(novaSenha), req.params.id]);
  auditoria('senha','Usuários',`Senha redefinida: ${u.nome}`,`Por: ${req.user.nome}`, req.user);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════
// REBOQUES
// ═══════════════════════════════════════════════════════
app.get('/api/reboques', auth, (req, res) => {
  const rows = all(`SELECT * FROM reboques ORDER BY nome`);
  res.json(rows);
});

app.post('/api/reboques', auth, (req, res) => {
  const { nome, tipo, placa, capacidade, diaria, status, obs } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome obrigatório' });
  if (!diaria || diaria <= 0) return res.status(400).json({ error: 'Diária inválida' });
  const id = uid();
  run(`INSERT INTO reboques (id,nome,tipo,placa,capacidade,diaria,status,obs) VALUES (?,?,?,?,?,?,?,?)`,
    [id, nome, tipo||'Aberto', placa||null, capacidade||null, diaria, status||'disponivel', obs||null]);
  auditoria('criar','Reboque',`Novo reboque: ${nome}`,`Tipo: ${tipo} · Diária: R$${diaria}`, req.user);
  res.status(201).json(get(`SELECT * FROM reboques WHERE id=?`,[id]));
});

app.put('/api/reboques/:id', auth, (req, res) => {
  const r = get(`SELECT * FROM reboques WHERE id=?`,[req.params.id]);
  if (!r) return res.status(404).json({ error: 'Reboque não encontrado' });
  const { nome, tipo, placa, capacidade, diaria, status, obs } = req.body;
  run(`UPDATE reboques SET nome=?,tipo=?,placa=?,capacidade=?,diaria=?,status=?,obs=? WHERE id=?`,
    [nome||r.nome, tipo||r.tipo, placa||null, capacidade||null, diaria||r.diaria, status||r.status, obs||null, req.params.id]);
  auditoria('editar','Reboque',`Reboque editado: ${nome||r.nome}`,`Status: ${status}`, req.user);
  res.json(get(`SELECT * FROM reboques WHERE id=?`,[req.params.id]));
});

app.delete('/api/reboques/:id', auth, (req, res) => {
  const r = get(`SELECT * FROM reboques WHERE id=?`,[req.params.id]);
  if (!r) return res.status(404).json({ error: 'Reboque não encontrado' });
  const ativo = get(`SELECT id FROM alugueis WHERE reboque_id=? AND status='ativo'`,[req.params.id]);
  if (ativo) return res.status(409).json({ error: 'Reboque possui aluguel ativo' });
  run(`DELETE FROM reboques WHERE id=?`,[req.params.id]);
  auditoria('excluir','Reboque',`Reboque excluído: ${r.nome}`,`Placa: ${r.placa||'—'}`, req.user);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════
// CLIENTES
// ═══════════════════════════════════════════════════════
app.get('/api/clientes', auth, (req, res) => {
  const rows = all(`SELECT * FROM clientes ORDER BY nome`);
  res.json(rows);
});

app.post('/api/clientes', auth, (req, res) => {
  const { nome, cpf, tel, email, endereco, cidade, cnh, cat_cnh, renavan, placa_veiculo, cep, obs } = req.body;
  if (!nome || !tel) return res.status(400).json({ error: 'Nome e telefone obrigatórios' });
  const id = uid();
  run(`INSERT INTO clientes (id,nome,cpf,tel,email,endereco,cidade,cnh,cat_cnh,renavan,placa_veiculo,cep,obs) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id,nome,cpf||null,tel,email||null,endereco||null,cidade||null,cnh||null,cat_cnh||null,renavan||null,placa_veiculo||null,cep||null,obs||null]);
  auditoria('criar','Cliente',`Novo cliente: ${nome}`,`Tel: ${tel} · CPF: ${cpf||'—'}`, req.user);
  res.status(201).json(get(`SELECT * FROM clientes WHERE id=?`,[id]));
});

app.put('/api/clientes/:id', auth, (req, res) => {
  const c = get(`SELECT * FROM clientes WHERE id=?`,[req.params.id]);
  if (!c) return res.status(404).json({ error: 'Cliente não encontrado' });
  const { nome, cpf, tel, email, endereco, cidade, cnh, cat_cnh, renavan, placa_veiculo, cep, obs } = req.body;
  run(`UPDATE clientes SET nome=?,cpf=?,tel=?,email=?,endereco=?,cidade=?,cnh=?,cat_cnh=?,renavan=?,placa_veiculo=?,cep=?,obs=? WHERE id=?`,
    [nome||c.nome,cpf||null,tel||c.tel,email||null,endereco||null,cidade||null,cnh||null,cat_cnh||null,renavan||null,placa_veiculo||null,cep||null,obs||null,req.params.id]);
  auditoria('editar','Cliente',`Cliente editado: ${nome||c.nome}`,`Tel: ${tel}`, req.user);
  res.json(get(`SELECT * FROM clientes WHERE id=?`,[req.params.id]));
});

app.delete('/api/clientes/:id', auth, (req, res) => {
  const c = get(`SELECT * FROM clientes WHERE id=?`,[req.params.id]);
  if (!c) return res.status(404).json({ error: 'Cliente não encontrado' });
  const ativo = get(`SELECT id FROM alugueis WHERE cliente_id=? AND status='ativo'`,[req.params.id]);
  if (ativo) return res.status(409).json({ error: 'Cliente possui aluguel ativo' });
  run(`DELETE FROM clientes WHERE id=?`,[req.params.id]);
  auditoria('excluir','Cliente',`Cliente excluído: ${c.nome}`,`Tel: ${c.tel}`, req.user);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════
// ALUGUÉIS
// ═══════════════════════════════════════════════════════
const ALUGUEL_SELECT = `
  SELECT a.*,
    c.nome as cliente_nome, c.tel as cliente_tel,
    r.nome as reboque_nome, r.placa as reboque_placa, r.tipo as reboque_tipo
  FROM alugueis a
  JOIN clientes c ON c.id = a.cliente_id
  JOIN reboques r ON r.id = a.reboque_id
`;

app.get('/api/alugueis', auth, (req, res) => {
  const rows = all(`${ALUGUEL_SELECT} ORDER BY a.criado_em DESC`);
  res.json(rows);
});

app.get('/api/alugueis/:id', auth, (req, res) => {
  const row = get(`${ALUGUEL_SELECT} WHERE a.id=?`,[req.params.id]);
  if (!row) return res.status(404).json({ error: 'Aluguel não encontrado' });
  res.json(row);
});

app.post('/api/alugueis', auth, (req, res) => {
  const { cliente_id, reboque_id, saida, hora_saida, devolucao, hora_devolucao, diaria, total, pagamento, tipo_pagamento, status, obs } = req.body;
  if (!cliente_id || !reboque_id || !saida || !devolucao)
    return res.status(400).json({ error: 'Campos obrigatórios: cliente_id, reboque_id, saida, devolucao' });

  const c = get(`SELECT nome FROM clientes WHERE id=?`,[cliente_id]);
  if (!c) return res.status(404).json({ error: 'Cliente não encontrado' });
  const r = get(`SELECT nome,status FROM reboques WHERE id=?`,[reboque_id]);
  if (!r) return res.status(404).json({ error: 'Reboque não encontrado' });
  if (r.status === 'manutencao') return res.status(409).json({ error: 'Reboque em manutenção' });
  if (r.status === 'alugado')    return res.status(409).json({ error: 'Reboque já está alugado' });

  const id      = uid();
  const hs      = hora_saida      || '00:00';
  const hd      = hora_devolucao  || '00:00';
  const stFinal = status || 'ativo';
  run(`INSERT INTO alugueis (id,cliente_id,reboque_id,saida,hora_saida,devolucao,hora_devolucao,diaria,total,pagamento,status,tipo_pagamento,obs)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, cliente_id, reboque_id, saida, hs, devolucao, hd, diaria, total, pagamento||'pendente', stFinal, tipo_pagamento||null, obs||null]);

  // Reboque fica indisponível (alugado) somente quando o status é Ativo.
  if (stFinal === 'ativo') run(`UPDATE reboques SET status='alugado' WHERE id=?`,[reboque_id]);

  auditoria('criar','Aluguel',`Aluguel criado — ${c.nome}`,
    `Reboque: ${r.nome} · ${saida} ${hs} → ${devolucao} ${hd} · R$${total} · ${pagamento}`, req.user);
  res.status(201).json(get(`${ALUGUEL_SELECT} WHERE a.id=?`,[id]));
});

app.put('/api/alugueis/:id', auth, (req, res) => {
  const a = get(`SELECT * FROM alugueis WHERE id=?`,[req.params.id]);
  if (!a) return res.status(404).json({ error: 'Aluguel não encontrado' });
  const { cliente_id, reboque_id, saida, hora_saida, devolucao, hora_devolucao, diaria, total, pagamento, tipo_pagamento, status, obs } = req.body;

  const rbFinal = reboque_id || a.reboque_id;
  const stFinal = status || a.status;

  // Libera o reboque antigo se trocou de reboque
  if (reboque_id && reboque_id !== a.reboque_id) {
    run(`UPDATE reboques SET status='disponivel' WHERE id=?`,[a.reboque_id]);
  }

  // Sincroniza disponibilidade do reboque com o status final do aluguel.
  run(`UPDATE reboques SET status=? WHERE id=?`,[stFinal === 'ativo' ? 'alugado' : 'disponivel', rbFinal]);

  run(`UPDATE alugueis SET cliente_id=?,reboque_id=?,saida=?,hora_saida=?,devolucao=?,hora_devolucao=?,diaria=?,total=?,pagamento=?,status=?,tipo_pagamento=?,obs=? WHERE id=?`,
    [cliente_id||a.cliente_id, rbFinal,
     saida||a.saida,           hora_saida||a.hora_saida||'00:00',
     devolucao||a.devolucao,   hora_devolucao||a.hora_devolucao||'00:00',
     diaria||a.diaria, total||a.total, pagamento||a.pagamento,
     stFinal, tipo_pagamento??a.tipo_pagamento, obs??a.obs, req.params.id]);

  const c = get(`SELECT nome FROM clientes WHERE id=?`,[cliente_id||a.cliente_id]);
  auditoria('editar','Aluguel',`Aluguel editado — ${c?.nome}`,`Pag: ${pagamento} · Status: ${stFinal}`, req.user);
  res.json(get(`${ALUGUEL_SELECT} WHERE a.id=?`,[req.params.id]));
});

app.post('/api/alugueis/:id/encerrar', auth, (req, res) => {
  const a = get(`SELECT * FROM alugueis WHERE id=?`,[req.params.id]);
  if (!a) return res.status(404).json({ error: 'Aluguel não encontrado' });
  if (a.status === 'encerrado') return res.status(400).json({ error: 'Aluguel já encerrado' });
  if (a.pagamento !== 'pago') return res.status(400).json({ error: 'Aluguel deve estar com pagamento "Pago" para encerrar' });

  run(`UPDATE alugueis SET status='encerrado' WHERE id=?`,[req.params.id]);
  run(`UPDATE reboques SET status='disponivel' WHERE id=?`,[a.reboque_id]);

  const c = get(`SELECT nome FROM clientes WHERE id=?`,[a.cliente_id]);
  const r = get(`SELECT nome FROM reboques WHERE id=?`,[a.reboque_id]);
  auditoria('encerrar','Aluguel',`Aluguel encerrado — ${c?.nome}`,`Reboque ${r?.nome} liberado`, req.user);
  res.json(get(`${ALUGUEL_SELECT} WHERE a.id=?`,[req.params.id]));
});

app.delete('/api/alugueis/:id', auth, (req, res) => {
  const a = get(`SELECT * FROM alugueis WHERE id=?`,[req.params.id]);
  if (!a) return res.status(404).json({ error: 'Aluguel não encontrado' });
  if (a.status === 'ativo')
    run(`UPDATE reboques SET status='disponivel' WHERE id=?`,[a.reboque_id]);
  const c = get(`SELECT nome FROM clientes WHERE id=?`,[a.cliente_id]);
  run(`DELETE FROM alugueis WHERE id=?`,[req.params.id]);
  auditoria('excluir','Aluguel',`Aluguel excluído — ${c?.nome}`,`Total: R$${a.total}`, req.user);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════
// MANUTENÇÕES
// ═══════════════════════════════════════════════════════
const MANUTENCAO_SELECT = `
  SELECT m.*, r.nome as reboque_nome, r.placa as reboque_placa, r.tipo as reboque_tipo
  FROM manutencoes m
  JOIN reboques r ON r.id = m.reboque_id
`;

app.get('/api/manutencoes', auth, (req, res) => {
  res.json(all(`${MANUTENCAO_SELECT} ORDER BY m.criado_em DESC`));
});

app.get('/api/manutencoes/:id', auth, (req, res) => {
  const row = get(`${MANUTENCAO_SELECT} WHERE m.id=?`,[req.params.id]);
  if (!row) return res.status(404).json({ error: 'Manutenção não encontrada' });
  res.json(row);
});

app.post('/api/manutencoes', auth, (req, res) => {
  const { reboque_id, tipo, custo, obs } = req.body;
  if (!reboque_id || !tipo)
    return res.status(400).json({ error: 'Campos obrigatórios: reboque_id, tipo' });

  const r = get(`SELECT nome,status FROM reboques WHERE id=?`,[reboque_id]);
  if (!r) return res.status(404).json({ error: 'Reboque não encontrado' });
  if (r.status === 'alugado')    return res.status(409).json({ error: 'Reboque está alugado' });
  if (r.status === 'manutencao') return res.status(409).json({ error: 'Reboque já está em manutenção' });

  const id = uid();
  run(`INSERT INTO manutencoes (id,reboque_id,tipo,custo,obs) VALUES (?,?,?,?,?)`,
    [id, reboque_id, tipo, Number(custo)||0, obs||null]);
  run(`UPDATE reboques SET status='manutencao' WHERE id=?`,[reboque_id]);

  auditoria('criar','Manutenção',`Manutenção criada — ${r.nome}`,`Tipo: ${tipo} · R$${Number(custo)||0}`, req.user);
  res.status(201).json(get(`${MANUTENCAO_SELECT} WHERE m.id=?`,[id]));
});

app.put('/api/manutencoes/:id', auth, (req, res) => {
  const m = get(`SELECT * FROM manutencoes WHERE id=?`,[req.params.id]);
  if (!m) return res.status(404).json({ error: 'Manutenção não encontrada' });
  const { reboque_id, tipo, custo, status, obs } = req.body;

  // Se trocou de reboque, libera o antigo e bloqueia o novo (se não estiver concluída)
  if (reboque_id && reboque_id !== m.reboque_id) {
    run(`UPDATE reboques SET status='disponivel' WHERE id=?`,[m.reboque_id]);
    if ((status||m.status) !== 'concluida')
      run(`UPDATE reboques SET status='manutencao' WHERE id=?`,[reboque_id]);
  }

  run(`UPDATE manutencoes SET reboque_id=?,tipo=?,custo=?,status=?,obs=? WHERE id=?`,
    [reboque_id||m.reboque_id, tipo||m.tipo, custo??m.custo, status||m.status, obs??m.obs, req.params.id]);

  auditoria('editar','Manutenção',`Manutenção editada`,`Tipo: ${tipo||m.tipo} · Status: ${status||m.status}`, req.user);
  res.json(get(`${MANUTENCAO_SELECT} WHERE m.id=?`,[req.params.id]));
});

app.post('/api/manutencoes/:id/concluir', auth, (req, res) => {
  const m = get(`SELECT * FROM manutencoes WHERE id=?`,[req.params.id]);
  if (!m) return res.status(404).json({ error: 'Manutenção não encontrada' });
  if (m.status === 'concluida') return res.status(400).json({ error: 'Manutenção já concluída' });

  run(`UPDATE manutencoes SET status='concluida', data_fim=? WHERE id=?`,[today(), req.params.id]);
  run(`UPDATE reboques SET status='disponivel' WHERE id=?`,[m.reboque_id]);

  const r = get(`SELECT nome FROM reboques WHERE id=?`,[m.reboque_id]);
  auditoria('concluir','Manutenção',`Manutenção concluída`,`Reboque ${r?.nome} liberado`, req.user);
  res.json(get(`${MANUTENCAO_SELECT} WHERE m.id=?`,[req.params.id]));
});

app.delete('/api/manutencoes/:id', auth, (req, res) => {
  const m = get(`SELECT * FROM manutencoes WHERE id=?`,[req.params.id]);
  if (!m) return res.status(404).json({ error: 'Manutenção não encontrada' });
  if (m.status === 'em_andamento')
    run(`UPDATE reboques SET status='disponivel' WHERE id=?`,[m.reboque_id]);
  run(`DELETE FROM manutencoes WHERE id=?`,[req.params.id]);
  auditoria('excluir','Manutenção',`Manutenção excluída`,`Tipo: ${m.tipo} · R$${m.custo}`, req.user);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════
// RESERVAS
// ═══════════════════════════════════════════════════════
const RESERVA_SELECT = `
  SELECT res.*,
    c.nome as cliente_nome, c.tel as cliente_tel,
    r.nome as reboque_nome, r.placa as reboque_placa, r.tipo as reboque_tipo
  FROM reservas res
  JOIN clientes c ON c.id = res.cliente_id
  JOIN reboques r ON r.id = res.reboque_id
`;

app.get('/api/reservas', auth, (req, res) => {
  res.json(all(`${RESERVA_SELECT} WHERE res.status='ativa' ORDER BY res.data_inicio`));
});

app.post('/api/reservas', auth, (req, res) => {
  const { reboque_id, cliente_id, data_inicio, data_fim, obs } = req.body;
  if (!reboque_id || !cliente_id || !data_inicio || !data_fim)
    return res.status(400).json({ error: 'Campos obrigatórios: reboque_id, cliente_id, data_inicio, data_fim' });
  if (new Date(data_fim) < new Date(data_inicio))
    return res.status(400).json({ error: 'Data final deve ser igual ou posterior à data inicial' });

  const r = get(`SELECT nome FROM reboques WHERE id=?`,[reboque_id]);
  if (!r) return res.status(404).json({ error: 'Reboque não encontrado' });
  const c = get(`SELECT nome FROM clientes WHERE id=?`,[cliente_id]);
  if (!c) return res.status(404).json({ error: 'Cliente não encontrado' });

  const id = uid();
  run(`INSERT INTO reservas (id,reboque_id,cliente_id,data_inicio,data_fim,obs) VALUES (?,?,?,?,?,?)`,
    [id, reboque_id, cliente_id, data_inicio, data_fim, obs||null]);
  auditoria('criar','Reserva',`Reserva criada — ${c.nome}`,`Reboque: ${r.nome} · ${data_inicio} → ${data_fim}`, req.user);
  res.status(201).json(get(`${RESERVA_SELECT} WHERE res.id=?`,[id]));
});

app.post('/api/reservas/:id/iniciar', auth, (req, res) => {
  const resv = get(`SELECT * FROM reservas WHERE id=? AND status='ativa'`,[req.params.id]);
  if (!resv) return res.status(404).json({ error: 'Reserva não encontrada ou já cancelada' });

  const r = get(`SELECT * FROM reboques WHERE id=?`,[resv.reboque_id]);
  if (!r) return res.status(404).json({ error: 'Reboque não encontrado' });
  if (r.status === 'manutencao') return res.status(409).json({ error: 'Reboque em manutenção' });
  if (r.status === 'alugado')    return res.status(409).json({ error: 'Reboque já está alugado' });

  const c = get(`SELECT nome FROM clientes WHERE id=?`,[resv.cliente_id]);

  const dias  = Math.max(1, Math.round((new Date(resv.data_fim) - new Date(resv.data_inicio)) / 86400000) || 1);
  const total = dias * r.diaria;
  const id    = uid();

  run(`INSERT INTO alugueis (id,cliente_id,reboque_id,saida,hora_saida,devolucao,hora_devolucao,diaria,total,pagamento,status,obs)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, resv.cliente_id, resv.reboque_id, resv.data_inicio, '08:00', resv.data_fim, '08:00', r.diaria, total, 'pendente', 'ativo', resv.obs||null]);
  run(`UPDATE reboques SET status='alugado' WHERE id=?`,[resv.reboque_id]);
  run(`UPDATE reservas SET status='cancelada' WHERE id=?`,[req.params.id]);

  auditoria('criar','Aluguel',`Aluguel iniciado a partir de reserva — ${c?.nome}`,`Reboque: ${r.nome} · ${resv.data_inicio} → ${resv.data_fim}`, req.user);
  res.status(201).json(get(`${ALUGUEL_SELECT} WHERE a.id=?`,[id]));
});

app.delete('/api/reservas/:id', auth, (req, res) => {
  const r = get(`${RESERVA_SELECT} WHERE res.id=?`,[req.params.id]);
  if (!r) return res.status(404).json({ error: 'Reserva não encontrada' });
  run(`UPDATE reservas SET status='cancelada' WHERE id=?`,[req.params.id]);
  auditoria('excluir','Reserva',`Reserva cancelada — ${r.cliente_nome}`,`Reboque: ${r.reboque_nome}`, req.user);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════
// AUDITORIA
// ═══════════════════════════════════════════════════════
app.get('/api/auditoria', auth, gerente, (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit)||200, 500);
  const tipo   = req.query.tipo;
  const modulo = req.query.modulo;
  let sql = `SELECT * FROM auditoria WHERE 1=1`;
  const params = [];
  if (tipo)   { sql += ` AND tipo=?`;   params.push(tipo); }
  if (modulo) { sql += ` AND modulo=?`; params.push(modulo); }
  sql += ` ORDER BY criado_em DESC LIMIT ?`;
  params.push(limit);
  res.json(all(sql, params));
});

app.delete('/api/auditoria', auth, gerente, (req, res) => {
  run(`DELETE FROM auditoria`);
  auditoria('excluir','Auditoria','Log de auditoria limpo',null, req.user);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════
// RELATÓRIOS
// ═══════════════════════════════════════════════════════
app.get('/api/relatorios/dashboard', auth, (req, res) => {
  const mes = new Date().toISOString().slice(0,7);
  res.json({
    ativos:      get(`SELECT COUNT(*) as n FROM alugueis WHERE status='ativo'`)?.n || 0,
    atrasados:   get(`SELECT COUNT(*) as n FROM alugueis WHERE status='ativo' AND devolucao < date('now')`)?.n || 0,
    disponiveis: get(`SELECT COUNT(*) as n FROM reboques WHERE status='disponivel'`)?.n || 0,
    receitaMes:  get(`SELECT COALESCE(SUM(total),0) as n FROM alugueis WHERE pagamento='pago' AND criado_em LIKE ?`,[`${mes}%`])?.n || 0,
    aReceber:    get(`SELECT COALESCE(SUM(total),0) as n FROM alugueis WHERE pagamento IN ('pendente','parcial')`)?.n || 0,
  });
});

app.get('/api/relatorios/receita-reboque', auth, gerente, (req, res) => {
  res.json(all(`
    SELECT r.id, r.nome, r.tipo,
      COUNT(a.id) as total_alugueis,
      COALESCE(SUM(a.total),0) as receita
    FROM reboques r
    LEFT JOIN alugueis a ON a.reboque_id=r.id
    GROUP BY r.id ORDER BY receita DESC
  `));
});

app.get('/api/relatorios/top-clientes', auth, gerente, (req, res) => {
  res.json(all(`
    SELECT c.id, c.nome, c.tel,
      COUNT(a.id) as total_alugueis,
      COALESCE(SUM(a.total),0) as total_gasto
    FROM clientes c
    LEFT JOIN alugueis a ON a.cliente_id=c.id
    GROUP BY c.id ORDER BY total_gasto DESC LIMIT 10
  `));
});

// ═══════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════
app.get('/api/config', auth, gerente, (req, res) => {
  const rows = all(`SELECT chave,valor FROM config`);
  const cfg = Object.fromEntries(rows.map(r => [r.chave, r.valor]));
  res.json(cfg);
});

app.put('/api/config', auth, gerente, (req, res) => {
  for (const [k, v] of Object.entries(req.body)) {
    const exists = get(`SELECT chave FROM config WHERE chave=?`,[k]);
    if (exists) run(`UPDATE config SET valor=? WHERE chave=?`,[String(v),k]);
    else        run(`INSERT INTO config (chave,valor) VALUES (?,?)`,[k,String(v)]);
  }
  auditoria('config','Configuração','Configurações atualizadas',
    Object.entries(req.body).map(([k,v])=>`${k}=${v}`).join(' · '), req.user);
  res.json({ ok: true });
});

// ── Backup / Restore do banco ─────────────────────────
const { DB_FILE } = require('./database');

app.get('/api/admin/backup', auth, gerente, (req, res) => {
  try {
    persistDB();
    const buf = fs.readFileSync(DB_FILE);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="rochasistema-backup-${new Date().toISOString().slice(0,10)}.db"`);
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao gerar backup: ' + e.message });
  }
});

app.post('/api/admin/restore', auth, gerente, express.raw({ type: 'application/octet-stream', limit: '50mb' }), (req, res) => {
  try {
    if (!req.body || !req.body.length) return res.status(400).json({ error: 'Arquivo inválido' });
    const tmp = DB_FILE + '.restore.tmp';
    fs.writeFileSync(tmp, req.body);
    fs.renameSync(tmp, DB_FILE);
    res.json({ ok: true, msg: 'Banco restaurado. Reinicie o servidor para aplicar.' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao restaurar: ' + e.message });
  }
});

// ── Health check ──────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: now(), db: 'sqlite (sql.js)', version: '1.0.0' });
});

// ── 404 fallback ──────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/'))
    return res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
  res.render('index');
});

// ═══════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n╔═══════════════════════════════════════╗`);
    console.log(`║   Rocha Reboques — API + Servidor     ║`);
    console.log(`╠═══════════════════════════════════════╣`);
    console.log(`║  URL:  http://0.0.0.0:${PORT}             ║`);
    console.log(`║  API:  http://0.0.0.0:${PORT}/api/health  ║`);
    console.log(`║  DB:   data/rochasistema.db           ║`);
    console.log(`║  ENV:  ${process.env.NODE_ENV||'development'}                    ║`);
    console.log(`╚═══════════════════════════════════════╝\n`);
  });
});
