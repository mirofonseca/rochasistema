/* ═══ RELATÓRIOS — Receita mensal + gráficos ═══ */

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

/* Popula select de ano */
function _popularAnoSelect(){
  const sel = document.getElementById('rel-ano');
  if(!sel || sel.options.length > 0) return;
  const anoAtual = new Date().getFullYear();
  for(let y = anoAtual; y >= anoAtual - 4; y--){
    const o = document.createElement('option');
    o.value = y; o.textContent = y;
    sel.appendChild(o);
  }
}

/* Gera gráfico de barras SVG puro */
function _gerarGraficoSVG(dados, anoFiltro){
  const W = 780, H = 220, PL = 60, PR = 16, PT = 20, PB = 50;
  const gW = W - PL - PR, gH = H - PT - PB;
  const n  = dados.length;
  const bGap = 6, bW = Math.floor((gW - bGap * (n+1)) / n / 2);

  const maxVal = Math.max(...dados.map(d => d.receita), 1);
  const nTicks  = 5;
  const tickVal = Math.ceil(maxVal / nTicks / 50) * 50 || 1;

  // Grid lines e tick labels
  let gridLines = '';
  for(let i = 0; i <= nTicks; i++){
    const v = tickVal * i;
    const y = PT + gH - (v / (tickVal * nTicks)) * gH;
    gridLines += `<line class="chart-grid" x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke-width="1"/>`;
    gridLines += `<text class="chart-tick" x="${PL-6}" y="${y+3}">${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}</text>`;
  }

  // Barras
  let barras = '';
  dados.forEach((d, i) => {
    const x      = PL + bGap + i * (2*bW + bGap);
    const hBase  = ((d.receita - d.total_extra) / (tickVal * nTicks)) * gH;
    const hExtra = (d.total_extra / (tickVal * nTicks)) * gH;
    const yBase  = PT + gH - hBase - hExtra;
    const yExtra = PT + gH - hExtra;
    const mes    = MESES_PT[parseInt(d.mes.slice(5))-1];
    const ativo  = d.mes.startsWith(anoFiltro);

    if(hBase > 0)
      barras += `<rect class="chart-bar" x="${x}" y="${yBase}" width="${bW*2}" height="${hBase}"
        fill="${ativo ? 'var(--org)' : '#ddd'}" rx="2" title="${mes}: R$ ${(d.receita-d.total_extra).toFixed(0)}"/>`;
    if(hExtra > 0)
      barras += `<rect class="chart-bar" x="${x}" y="${yExtra}" width="${bW*2}" height="${hExtra}"
        fill="${ativo ? 'var(--amb)' : '#eee'}" rx="2" title="Extra: R$ ${d.total_extra.toFixed(0)}"/>`;

    // Valor acima da barra
    if(d.receita > 0){
      const yLabel = PT + gH - hBase - hExtra - 5;
      barras += `<text class="chart-val" x="${x + bW}" y="${yLabel}" text-anchor="middle">
        ${d.receita >= 1000 ? (d.receita/1000).toFixed(1)+'k' : d.receita.toFixed(0)}</text>`;
    }

    // Label do mês
    barras += `<text class="chart-label" x="${x + bW}" y="${PT+gH+18}" text-anchor="middle">${mes}</text>`;
    barras += `<text class="chart-label" x="${x + bW}" y="${PT+gH+30}" text-anchor="middle" style="font-size:8px">${d.mes.slice(0,4)}</text>`;
  });

  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${gridLines}${barras}</svg>`;
}

async function renderRelatorios(){
  _popularAnoSelect();
  const ano = document.getElementById('rel-ano')?.value || new Date().getFullYear().toString();

  try{
    const [mensal, porReboque, topCli, todosAlugueis] = await Promise.all([
      api.get('/api/relatorios/receita-mensal'),
      api.get('/api/relatorios/receita-reboque'),
      api.get('/api/relatorios/top-clientes'),
      api.get('/api/alugueis'),
    ]);

    // ── Filtra dados pelo ano selecionado ────────────────────
    const mensalAno   = mensal.filter(m => m.mes.startsWith(ano));
    const alugueisAno = todosAlugueis.filter(a => (a.saida||'').startsWith(ano));

    const receitaTotal    = mensalAno.reduce((s,m) => s + m.receita, 0);
    const extraTotal      = mensalAno.reduce((s,m) => s + m.total_extra, 0);
    const qtdEncerrados   = alugueisAno.filter(a => a.status === 'encerrado').length;
    const qtdAtivos       = alugueisAno.filter(a => a.status === 'ativo').length;
    const ticketMedio     = qtdEncerrados > 0 ? receitaTotal / qtdEncerrados : 0;

    // ── Cards de resumo ───────────────────────────────────────
    document.getElementById('rel-stats').innerHTML = `
      <div class="stat-card c-grn">
        <div class="stat-ico"><svg viewBox="0 0 24 24" stroke="currentColor"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
        <div class="stat-val">${fmt(receitaTotal)}</div>
        <div class="stat-lbl">Receita ${ano}</div>
      </div>
      <div class="stat-card c-amb">
        <div class="stat-ico"><svg viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <div class="stat-val">${fmt(extraTotal)}</div>
        <div class="stat-lbl">Valor Extra ${ano}</div>
      </div>
      <div class="stat-card c-org">
        <div class="stat-ico"><svg viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div class="stat-val">${qtdEncerrados}</div>
        <div class="stat-lbl">Aluguéis Encerrados ${ano}</div>
      </div>
      <div class="stat-card c-blu">
        <div class="stat-ico"><svg viewBox="0 0 24 24" stroke="currentColor"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5"/></svg></div>
        <div class="stat-val">${fmt(ticketMedio)}</div>
        <div class="stat-lbl">Ticket Médio ${ano}</div>
      </div>
    `;

    // ── Gráfico de barras ─────────────────────────────────────
    document.getElementById('rel-chart-subtitle').textContent =
      `Últimos 12 meses · destacado: ${ano}`;
    document.getElementById('rel-chart-mensal').innerHTML = _gerarGraficoSVG(mensal, ano);

    // ── Receita por Reboque ───────────────────────────────────
    const maxRb = Math.max(...porReboque.map(r => r.receita_total), 1);
    document.getElementById('rel-por-reboque').innerHTML = porReboque.length
      ? porReboque.slice(0,8).map(r => `
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
              <span style="font-weight:600">${r.reboque_nome}</span>
              <span style="color:var(--grn);font-weight:700">${fmt(r.receita_total)}</span>
            </div>
            <div style="height:6px;background:var(--brd);border-radius:3px">
              <div style="height:6px;background:var(--org);border-radius:3px;width:${Math.round((r.receita_total/maxRb)*100)}%"></div>
            </div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px">${r.total_alugueis} aluguel(is)</div>
          </div>`).join('')
      : '<div style="color:var(--muted);font-size:13px">Sem dados</div>';

    // ── Top Clientes ──────────────────────────────────────────
    document.getElementById('rel-top-cli').innerHTML = topCli.length
      ? topCli.slice(0,5).map((c,i) => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--brd)">
            <div style="font-size:18px;font-weight:800;color:var(--muted);width:24px;text-align:center">${i+1}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.nome}</div>
              <div style="font-size:11px;color:var(--muted)">${c.total_alugueis} aluguel(is)</div>
            </div>
            <div style="font-weight:700;color:var(--grn);font-size:13px">${fmt(c.total_gasto)}</div>
          </div>`).join('')
      : '<div style="color:var(--muted);font-size:13px;padding:10px">Sem dados</div>';

    // ── Resumo de Pagamentos ──────────────────────────────────
    const pago     = alugueisAno.filter(a => a.pagamento === 'pago').length;
    const parcial  = alugueisAno.filter(a => a.pagamento === 'parcial').length;
    const pendente = alugueisAno.filter(a => a.pagamento === 'pendente').length;
    const total    = pago + parcial + pendente || 1;
    const barPag   = (n, cor) => `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <div style="width:90px;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase">${n.label}</div>
      <div style="flex:1;height:8px;background:var(--brd);border-radius:4px">
        <div style="height:8px;background:${cor};border-radius:4px;width:${Math.round((n.v/total)*100)}%"></div>
      </div>
      <div style="font-size:12px;font-weight:700;width:40px;text-align:right">${n.v}</div>
    </div>`;
    document.getElementById('rel-pagamentos').innerHTML =
      barPag({label:'Pago',    v:pago},    'var(--grn)') +
      barPag({label:'Parcial', v:parcial}, 'var(--amb)') +
      barPag({label:'Pendente',v:pendente},'var(--red)');

  }catch(e){ toast(e.message,'error'); }
}
