/* ═══ RELATÓRIOS — Receita mensal + gráficos ═══ */

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

/* Inicializa datas padrão ao abrir a página */
function _initFiltros(){
  const fimEl   = document.getElementById('rel-fim');
  const inEl    = document.getElementById('rel-inicio');
  if(!fimEl || !inEl || inEl.value) return;
  const hoje = new Date();
  const ini  = new Date(); ini.setFullYear(ini.getFullYear() - 1); ini.setDate(1);
  fimEl.value = hoje.toISOString().slice(0,10);
  inEl.value  = ini.toISOString().slice(0,10);
}

function filtrarRelatorio(){ renderRelatorios(); }

function limparFiltroRelatorio(){
  document.getElementById('rel-inicio').value = '';
  document.getElementById('rel-fim').value    = '';
  renderRelatorios();
}

/* Gera gráfico de barras SVG puro */
function _gerarGraficoSVG(dados){
  if(!dados.length) return '<div style="color:var(--muted);text-align:center;padding:40px 0;font-size:13px">Nenhum dado no período</div>';
  const W = 760, H = 230, PL = 58, PR = 16, PT = 22, PB = 50;
  const gW = W - PL - PR, gH = H - PT - PB;
  const n  = dados.length;
  const gap = Math.max(4, Math.floor(gW / n / 8));
  const bW  = Math.max(8, Math.floor((gW - gap*(n+1)) / n));

  const maxVal  = Math.max(...dados.map(d => Number(d.receita)||0), 100);
  const nTicks  = 5;
  const rawTick = maxVal / nTicks;
  const mag     = Math.pow(10, Math.floor(Math.log10(rawTick)));
  const tickVal = Math.ceil(rawTick / mag) * mag;
  const scale   = tickVal * nTicks;

  let svg = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;

  // Grid + tick labels
  for(let i = 0; i <= nTicks; i++){
    const v = tickVal * i;
    const y = PT + gH - (v / scale) * gH;
    svg += `<line class="chart-grid" x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke-width="1"/>`;
    const label = v >= 1000 ? (v/1000).toFixed(1).replace('.0','')+'k' : v.toFixed(0);
    svg += `<text class="chart-tick" x="${PL-5}" y="${y+3}">${label}</text>`;
  }

  dados.forEach((d, i) => {
    const receita = Number(d.receita)     || 0;
    const extra   = Number(d.total_extra) || 0;
    const base    = receita - extra;
    const x       = PL + gap + i * (bW + gap);

    const hTot   = (receita / scale) * gH;
    const hExtra = (extra   / scale) * gH;
    const hBase  = hTot - hExtra;

    // Barra base (laranja)
    if(hBase > 0){
      const y = PT + gH - hTot;
      svg += `<rect class="chart-bar" x="${x}" y="${y}" width="${bW}" height="${hBase}" fill="var(--org)" rx="2"
        title="${d.mes}: R$ ${base.toFixed(0)}"/>`;
    }
    // Barra extra (âmbar) empilhada acima
    if(hExtra > 0){
      const y = PT + gH - hExtra;
      svg += `<rect class="chart-bar" x="${x}" y="${y}" width="${bW}" height="${hExtra}" fill="var(--amb)" rx="2"
        title="Extra: R$ ${extra.toFixed(0)}"/>`;
    }
    // Valor total acima
    if(receita > 0){
      const yLabel = PT + gH - hTot - 5;
      const label  = receita >= 1000 ? (receita/1000).toFixed(1).replace('.0','')+'k' : receita.toFixed(0);
      svg += `<text class="chart-val" x="${x+bW/2}" y="${yLabel}" text-anchor="middle">${label}</text>`;
    }
    // Labels do mês (e ano se filtro customizado)
    const partes = d.mes.split('-');
    const mesStr = MESES_PT[parseInt(partes[1])-1];
    svg += `<text class="chart-label" x="${x+bW/2}" y="${PT+gH+16}" text-anchor="middle">${mesStr}</text>`;
    if(n <= 14)
      svg += `<text class="chart-label" x="${x+bW/2}" y="${PT+gH+28}" text-anchor="middle" style="font-size:8px">${partes[0]}</text>`;
  });

  svg += '</svg>';
  return svg;
}

async function renderRelatorios(){
  _initFiltros();

  const ini = document.getElementById('rel-inicio')?.value || '';
  const fim = document.getElementById('rel-fim')?.value    || '';

  let qs = '';
  if(ini || fim){
    const parts = [];
    if(ini) parts.push('inicio='+ini);
    if(fim) parts.push('fim='+fim);
    qs = '?' + parts.join('&');
  }

  const subtitle = ini && fim
    ? `${fmtDate(ini)} → ${fmtDate(fim)}`
    : 'Últimos 12 meses';
  document.getElementById('rel-chart-subtitle').textContent = subtitle;

  try{
    const [mensal, porReboque, topCli, todosAlugueis] = await Promise.all([
      api.get('/api/relatorios/receita-mensal'+qs),
      api.get('/api/relatorios/receita-reboque'+qs),
      api.get('/api/relatorios/top-clientes'+qs),
      api.get('/api/alugueis'),
    ]);

    // Filtra alugueis pelo período para os painéis de pagamento
    const alugueisPeríodo = todosAlugueis.filter(a => {
      if(!ini && !fim) return true;
      const d = (a.saida||'').slice(0,10);
      return (!ini || d >= ini) && (!fim || d <= fim);
    });

    const recTotal  = mensal.reduce((s,m) => s + (Number(m.receita)||0), 0);
    const extTotal  = mensal.reduce((s,m) => s + (Number(m.total_extra)||0), 0);
    const qtdEnc    = alugueisPeríodo.filter(a => a.status==='encerrado').length;
    const ticket    = qtdEnc > 0 ? recTotal / qtdEnc : 0;

    // ── Cards de resumo ───────────────────────────────────────
    document.getElementById('rel-stats').innerHTML = `
      <div class="stat-card c-grn">
        <div class="stat-ico"><svg viewBox="0 0 24 24" stroke="currentColor"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
        <div class="stat-val">${fmt(recTotal)}</div>
        <div class="stat-lbl">Receita Total</div>
      </div>
      <div class="stat-card c-amb">
        <div class="stat-ico"><svg viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
        <div class="stat-val">${fmt(extTotal)}</div>
        <div class="stat-lbl">Valor Extra</div>
      </div>
      <div class="stat-card c-org">
        <div class="stat-ico"><svg viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div class="stat-val">${qtdEnc}</div>
        <div class="stat-lbl">Aluguéis Encerrados</div>
      </div>
      <div class="stat-card c-blu">
        <div class="stat-ico"><svg viewBox="0 0 24 24" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
        <div class="stat-val">${fmt(ticket)}</div>
        <div class="stat-lbl">Ticket Médio</div>
      </div>
    `;

    // ── Gráfico de barras ─────────────────────────────────────
    const dadosComDados = mensal.filter(m => (Number(m.receita)||0) > 0);
    document.getElementById('rel-chart-mensal').innerHTML = _gerarGraficoSVG(mensal.length ? mensal : dadosComDados);

    // ── Receita por Reboque ───────────────────────────────────
    const rbComDados = porReboque.filter(r => (Number(r.receita_total)||0) > 0);
    const maxRb = Math.max(...rbComDados.map(r => Number(r.receita_total)||0), 1);
    document.getElementById('rel-por-reboque').innerHTML = rbComDados.length
      ? rbComDados.slice(0,8).map(r => `
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
              <span style="font-weight:600">${r.reboque_nome}</span>
              <span style="color:var(--grn);font-weight:700">${fmt(r.receita_total)}</span>
            </div>
            <div style="height:6px;background:var(--brd);border-radius:3px">
              <div style="height:6px;background:var(--org);border-radius:3px;width:${Math.round((Number(r.receita_total)/maxRb)*100)}%"></div>
            </div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px">${r.total_alugueis} aluguel(is)</div>
          </div>`).join('')
      : '<div style="color:var(--muted);font-size:13px">Sem dados no período</div>';

    // ── Top Clientes ──────────────────────────────────────────
    const cliComDados = topCli.filter(c => (Number(c.total_gasto)||0) > 0);
    document.getElementById('rel-top-cli').innerHTML = cliComDados.length
      ? cliComDados.slice(0,5).map((c,i) => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--brd)">
            <div style="font-size:18px;font-weight:800;color:var(--muted);width:24px;text-align:center">${i+1}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.nome}</div>
              <div style="font-size:11px;color:var(--muted)">${c.total_alugueis} aluguel(is)</div>
            </div>
            <div style="font-weight:700;color:var(--grn);font-size:13px">${fmt(c.total_gasto)}</div>
          </div>`).join('')
      : '<div style="color:var(--muted);font-size:13px;padding:10px">Sem dados no período</div>';

    // ── Resumo de Pagamentos ──────────────────────────────────
    const pago    = alugueisPeríodo.filter(a => a.pagamento==='pago').length;
    const parcial = alugueisPeríodo.filter(a => a.pagamento==='parcial').length;
    const pend    = alugueisPeríodo.filter(a => a.pagamento==='pendente').length;
    const total   = pago + parcial + pend || 1;
    const barH = (label, v, cor) => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="width:80px;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted)">${label}</div>
        <div style="flex:1;height:8px;background:var(--brd);border-radius:4px">
          <div style="height:8px;background:${cor};border-radius:4px;width:${Math.round((v/total)*100)}%;transition:width .3s"></div>
        </div>
        <div style="font-size:12px;font-weight:700;min-width:28px;text-align:right">${v}</div>
        <div style="font-size:11px;color:var(--muted);min-width:32px">${Math.round((v/total)*100)}%</div>
      </div>`;
    document.getElementById('rel-pagamentos').innerHTML =
      barH('Pago',     pago,    'var(--grn)') +
      barH('Parcial',  parcial, 'var(--amb)') +
      barH('Pendente', pend,    'var(--red)');

  }catch(e){ toast(e.message,'error'); }
}
