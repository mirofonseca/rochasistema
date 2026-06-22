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
              <div class="al-meta-item"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg> De: <strong>${fmtDate(r.data_inicio)}</strong></div>
              <div class="al-meta-item"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Até: <strong>${fmtDate(r.data_fim)}</strong></div>
            </div>
            ${r.obs?`<div class="al-sub" style="margin-top:6px;font-style:italic">${r.obs}</div>`:""}
          </div>
          <div class="al-right">
            <span class="badge" style="background:rgba(32,82,149,.12);color:var(--blu-l)"><span class="bd-dot" style="background:var(--blu-l)"></span>Reservado</span>
            <div class="al-btns">
              <button class="btn btn-grn btn-xs" onclick="iniciarAluguelDaReserva('${r.id}')"><svg viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3"/></svg>Iniciar Aluguel</button>
              <button class="btn btn-red btn-xs" onclick="cancelarReserva('${r.id}')"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>Cancelar</button>
            </div>
          </div>
        </div>
      </div>`).join("");
  }catch(e){ toast(e.message,"error"); }
}

async function abrirModalReserva(reboqueId, reboqueNome){
  document.getElementById("res-reboque-id").value   = reboqueId;
  document.getElementById("res-reboque-nome").value = reboqueNome;
  document.getElementById("res-cpf-busca").value    = "";
  document.getElementById("res-cliente-sel").innerHTML = '<option value="">Carregando...</option>';
  document.getElementById("res-inicio").value = "";
  document.getElementById("res-fim").value    = "";
  document.getElementById("res-obs").value    = "";
  abrirModal("modal-reserva");
  try{
    _clCache = await api.get("/api/clientes");
    document.getElementById("res-cliente-sel").innerHTML =
      '<option value="">Selecionar cliente...</option>' +
      _clCache.map(c=>`<option value="${c.id}">${c.nome}</option>`).join("");
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
  const reboque_id  = document.getElementById("res-reboque-id").value;
  const cliente_id  = document.getElementById("res-cliente-sel").value;
  const data_inicio = document.getElementById("res-inicio").value;
  const data_fim    = document.getElementById("res-fim").value;
  const obs         = document.getElementById("res-obs").value;

  if(!cliente_id){ toast("Selecione um cliente","error"); return; }
  if(!data_inicio || !data_fim){ toast("Preencha as datas de início e fim","error"); return; }
  if(new Date(data_fim) < new Date(data_inicio)){ toast("Data fim deve ser igual ou posterior à data início","error"); return; }

  try{
    await api.post("/api/reservas", { reboque_id, cliente_id, data_inicio, data_fim, obs });
    toast("Reserva criada com sucesso!","success");
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
  const data_fim    = document.getElementById("al-devolucao").value;
  const obs         = document.getElementById("al-obs").value;

  if(!cliente_id){ toast("Selecione um cliente","error"); return; }
  if(!reboque_id){ toast("Selecione um reboque","error"); return; }
  if(!data_inicio || !data_fim){ toast("Preencha as datas","error"); return; }
  if(new Date(data_fim) < new Date(data_inicio)){ toast("Data de devolução deve ser igual ou posterior à saída","error"); return; }

  try{
    await api.post("/api/reservas", { reboque_id, cliente_id, data_inicio, data_fim, obs });
    toast("Reserva criada com sucesso!","success");
    fecharModal("modal-aluguel");
    if(currentPage === "reservas") renderReservas();
    else if(currentPage === "alugueis") renderAlugueis();
  }catch(e){ toast(e.message,"error"); }
}
