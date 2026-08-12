/* ═══ RESERVAS — lista de reboques reservados para datas futuras ═══ */

let _resCache = [];

async function renderReservas(){
  setLoading("lista-reservas","Carregando reservas...");
  try{
    _resCache = await api.get("/api/reservas");
    const el = document.getElementById("lista-reservas");
    if(!_resCache.length){
      el.innerHTML = `<div class="empty"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><div class="empty-t">Nenhuma Reserva</div><div class="empty-s">Reserve um reboque a partir de um aluguel ativo na aba Aluguéis</div></div>`;
      return;
    }
    el.innerHTML = _resCache.map(r=>`
      <div class="al-card" style="border-left-color:var(--blu-l)">
        <div class="al-card-inner">
          <div>
            <div class="al-name">${r.cliente_nome}</div>
            <div class="al-sub">${r.reboque_nome}${r.reboque_placa?" · "+r.reboque_placa:""} · Tel: ${r.cliente_tel||"—"}</div>
            <div class="al-meta">
              <div class="al-meta-item"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg> De: <strong>${fmtDate(r.data_inicio)} ${r.hora_inicio||""}</strong></div>
              <div class="al-meta-item"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Até: <strong>${fmtDate(r.data_fim)} ${r.hora_fim||""}</strong></div>
              <div class="al-meta-item"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> Valor: <strong>${fmt(r.valor||0)}</strong></div>
            </div>
            ${r.obs?`<div class="al-sub" style="margin-top:6px;font-style:italic">${r.obs}</div>`:""}
          </div>
          <div class="al-right">
            <span class="badge" style="background:rgba(32,82,149,.12);color:var(--blu-l)"><span class="bd-dot" style="background:var(--blu-l)"></span>Reservado</span>
            <div class="al-btns">
              <button class="btn btn-ghost btn-xs" onclick="abrirModalEditarReserva('${r.id}')"><svg viewBox="0 0 24 24" style="width:13px;height:13px"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Editar</button>
              <button class="btn btn-grn btn-xs" onclick="iniciarAluguelDaReserva('${r.id}')"><svg viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3"/></svg>Iniciar Aluguel</button>
              <button class="btn btn-ghost btn-xs" onclick="imprimirContratoReserva('${r.id}')"><svg viewBox="0 0 24 24" style="width:13px;height:13px"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Imprimir Contrato</button>
              <button class="btn btn-red btn-xs" onclick="cancelarReserva('${r.id}')"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>Cancelar</button>
            </div>
          </div>
        </div>
      </div>`).join("");
  }catch(e){ toast(e.message,"error"); }
}

/* Calcula o valor da reserva automaticamente (dias × diária do reboque).
   O usuário pode editar o valor manualmente depois — só recalcula quando as datas mudam. */
function calcValorReserva(){
  const inicio = document.getElementById("res-inicio").value;
  const fim    = document.getElementById("res-fim").value;
  const diaria = Number(document.getElementById("res-diaria").value) || 0;
  if(!inicio || !fim || diaria <= 0) return;
  const dias = diasEnteTotal(inicio, fim);
  document.getElementById("res-valor").value = (dias * diaria).toFixed(0);
}

async function abrirModalReserva(reboqueId, reboqueNome){
  document.getElementById("res-id").value           = "";
  document.getElementById("res-modal-titulo").textContent = "Nova Reserva";
  document.getElementById("res-btn-salvar").innerHTML = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Reservar';
  document.getElementById("res-reboque-id").value   = reboqueId;
  document.getElementById("res-reboque-nome").value = reboqueNome;
  document.getElementById("res-diaria").value       = "0";
  document.getElementById("res-cpf-busca").value    = "";
  document.getElementById("res-cliente-sel").innerHTML = '<option value="">Carregando...</option>';
  document.getElementById("res-inicio").value = "";
  document.getElementById("res-hora-inicio").value = "08:00";
  document.getElementById("res-fim").value    = "";
  document.getElementById("res-hora-fim").value = "08:00";
  document.getElementById("res-valor").value  = "0";
  document.getElementById("res-obs").value    = "";
  abrirModal("modal-reserva");
  try{
    const [clientes, reboques] = await Promise.all([api.get("/api/clientes"), api.get("/api/reboques")]);
    _clCache = clientes;
    document.getElementById("res-cliente-sel").innerHTML =
      '<option value="">Selecionar cliente...</option>' +
      _clCache.map(c=>`<option value="${c.id}">${c.nome}</option>`).join("");
    const rb = reboques.find(x=>x.id===reboqueId);
    if(rb) document.getElementById("res-diaria").value = rb.diaria;
  }catch(e){ toast(e.message,"error"); }
}

async function abrirModalEditarReserva(reservaId){
  const r = _resCache.find(x=>x.id===reservaId);
  if(!r){ toast("Reserva não encontrada","error"); return; }

  document.getElementById("res-id").value            = r.id;
  document.getElementById("res-modal-titulo").textContent = "Editar Reserva";
  document.getElementById("res-btn-salvar").innerHTML = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Salvar Alterações';
  document.getElementById("res-reboque-id").value    = r.reboque_id;
  document.getElementById("res-reboque-nome").value  = r.reboque_nome;
  document.getElementById("res-diaria").value        = "0";
  document.getElementById("res-cpf-busca").value     = "";
  document.getElementById("res-cliente-sel").innerHTML = '<option value="">Carregando...</option>';
  document.getElementById("res-inicio").value = r.data_inicio;
  document.getElementById("res-hora-inicio").value = r.hora_inicio || "08:00";
  document.getElementById("res-fim").value    = r.data_fim;
  document.getElementById("res-hora-fim").value = r.hora_fim || "08:00";
  document.getElementById("res-valor").value  = r.valor || 0;
  document.getElementById("res-obs").value    = r.obs || "";
  abrirModal("modal-reserva");
  try{
    const [clientes, reboques] = await Promise.all([api.get("/api/clientes"), api.get("/api/reboques")]);
    _clCache = clientes;
    document.getElementById("res-cliente-sel").innerHTML =
      '<option value="">Selecionar cliente...</option>' +
      _clCache.map(c=>`<option value="${c.id}"${c.id===r.cliente_id?" selected":""}>${c.nome}</option>`).join("");
    const rb = reboques.find(x=>x.id===r.reboque_id);
    if(rb) document.getElementById("res-diaria").value = rb.diaria;
  }catch(e){ toast(e.message,"error"); }
}

function buscarClienteParaReserva(){
  const inp = document.getElementById("res-cpf-busca");
  const cpfDigitado = inp.value.replace(/\D/g,"");
  if(!cpfDigitado) return;
  if(cpfDigitado.length !== 11){ toast("CPF inválido — deve ter 11 dígitos","error"); return; }
  inp.value = cpfDigitado.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

  if(!_clCache || !_clCache.length){ toast("Lista de clientes ainda não carregada, aguarde...","error"); return; }
  const cliente = _clCache.find(c => (c.cpf||"").replace(/\D/g,"") === cpfDigitado);
  if(!cliente){ toast("Nenhum cliente encontrado com este CPF","error"); return; }

  document.getElementById("res-cliente-sel").value = cliente.id;
  toast(`Cliente encontrado: ${cliente.nome}`,"success");
}

async function salvarReserva(){
  const id          = document.getElementById("res-id").value;
  const reboque_id  = document.getElementById("res-reboque-id").value;
  const cliente_id  = document.getElementById("res-cliente-sel").value;
  const data_inicio = document.getElementById("res-inicio").value;
  const hora_inicio = document.getElementById("res-hora-inicio").value || "08:00";
  const data_fim    = document.getElementById("res-fim").value;
  const hora_fim    = document.getElementById("res-hora-fim").value || "08:00";
  const valor       = Number(document.getElementById("res-valor").value) || 0;
  const obs         = document.getElementById("res-obs").value;

  if(!cliente_id){ toast("Selecione um cliente","error"); return; }
  if(!data_inicio || !data_fim){ toast("Preencha as datas de início e fim","error"); return; }
  if(new Date(data_fim) < new Date(data_inicio)){ toast("Data fim deve ser igual ou posterior à data início","error"); return; }
  if(valor < 0){ toast("Valor não pode ser negativo","error"); return; }

  try{
    if(id){
      await api.put(`/api/reservas/${id}`, { reboque_id, cliente_id, data_inicio, hora_inicio, data_fim, hora_fim, valor, obs });
      toast("Reserva atualizada com sucesso!","success");
    }else{
      await api.post("/api/reservas", { reboque_id, cliente_id, data_inicio, hora_inicio, data_fim, hora_fim, valor, obs });
      toast("Reserva criada com sucesso!","success");
    }
    fecharModal("modal-reserva");
    if(currentPage === "reservas") renderReservas();
  }catch(e){ toast(e.message,"error"); }
}

async function cancelarReserva(id){
  confirmar("Cancelar Reserva","Deseja realmente cancelar esta reserva?", async ()=>{
    try{
      await api.del(`/api/reservas/${id}`);
      toast("Reserva cancelada.","info");
      renderReservas();
    }catch(e){ toast(e.message,"error"); }
  });
}

/* Valida a reserva, transformando-a em um aluguel ativo real */
async function iniciarAluguelDaReserva(id){
  confirmar("Iniciar Aluguel","Confirma o início do aluguel para esta reserva? O reboque será marcado como alugado e a reserva será encerrada.", async ()=>{
    try{
      await api.post(`/api/reservas/${id}/iniciar`);
      toast("Aluguel iniciado com sucesso!","success");
      renderReservas();
      if(typeof renderDashboard === "function") renderDashboard();
    }catch(e){ toast(e.message,"error"); }
  }, false);
}

/* Cria uma reserva diretamente a partir do formulário de Novo Aluguel,
   reaproveitando os mesmos campos (cliente, reboque, datas, obs) */
async function salvarComoReserva(){
  const cliente_id  = document.getElementById("al-cliente-sel").value;
  const reboque_id  = document.getElementById("al-reboque-sel").value;
  const data_inicio = document.getElementById("al-saida").value;
  const hora_inicio = document.getElementById("al-hora-saida").value || "08:00";
  const data_fim    = document.getElementById("al-devolucao").value;
  const hora_fim    = document.getElementById("al-hora-devolucao").value || "08:00";
  const obs         = document.getElementById("al-obs").value;

  if(!cliente_id){ toast("Selecione um cliente","error"); return; }
  if(!reboque_id){ toast("Selecione um reboque","error"); return; }
  if(!data_inicio || !data_fim){ toast("Preencha as datas","error"); return; }
  if(new Date(data_fim) < new Date(data_inicio)){ toast("Data de devolução deve ser igual ou posterior à saída","error"); return; }

  try{
    await api.post("/api/reservas", { reboque_id, cliente_id, data_inicio, hora_inicio, data_fim, hora_fim, obs });
    toast("Reserva criada com sucesso!","success");
    fecharModal("modal-aluguel");
    if(currentPage === "reservas") renderReservas();
    else if(currentPage === "alugueis") renderAlugueis();
  }catch(e){ toast(e.message,"error"); }
}

/* ═══ IMPRIMIR CONTRATO (PRÉ-CONTRATO) A PARTIR DA RESERVA ═══ */

async function imprimirContratoReserva(reservaId){
  try{
    const r = _resCache.find(x=>x.id===reservaId) || (await api.get('/api/reservas')).find(x=>x.id===reservaId);
    if(!r){ toast('Reserva não encontrada','error'); return; }

    const empresa = await api.get('/api/config/empresa');
    const dias    = diasEnteTotal(r.data_inicio, r.data_fim);
    const diaria  = Number(r.reboque_diaria) || 0;

    // Monta um objeto no mesmo formato esperado pelo gerador de contrato (gerarHtmlContrato)
    const aluguelLike = {
      id:                   r.id,
      cliente_nome:         r.cliente_nome,
      cliente_tel:          r.cliente_tel,
      cliente_cpf:          r.cliente_cpf,
      cliente_rg:           r.cliente_rg,
      cliente_cnh:          r.cliente_cnh,
      cliente_cat_cnh:      r.cliente_cat_cnh,
      cliente_endereco:     r.cliente_endereco,
      cliente_cidade:       r.cliente_cidade,
      cliente_renavan:      r.cliente_renavan,
      cliente_placa_veiculo:r.cliente_placa_veiculo,
      reboque_nome:         r.reboque_nome,
      reboque_placa:        r.reboque_placa,
      reboque_tipo:         r.reboque_tipo,
      reboque_capacidade:   r.reboque_capacidade,
      saida:                r.data_inicio,
      hora_saida:           r.hora_inicio || '08:00',
      devolucao:            r.data_fim,
      hora_devolucao:       r.hora_fim || '08:00',
      diaria:               diaria,
      total:                (r.valor && r.valor > 0) ? r.valor : dias * diaria,
      pagamento:            'pendente',
      tipo_pagamento:       null,
      status:               'ativo',
      obs:                  r.obs,
    };

    const html = gerarHtmlContrato(aluguelLike, empresa, [], []);
    const janela = window.open('', '_blank');
    if(!janela){
      toast('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está ativo.','error');
      return;
    }
    janela.document.open();
    janela.document.write(html);
    janela.document.close();
  }catch(e){
    toast(e.message || 'Erro ao gerar o pré-contrato','error');
  }
}
