/* ═══ CLIENTES — cadastro ═══ */

async function renderClientes(){setLoading("lista-clientes","Carregando clientes...");try{const[e,t]=await Promise.all([api.get("/api/clientes"),api.get("/api/alugueis")]);_clCache=e;const a=(document.getElementById("cl-search")?.value||"").toLowerCase();let n=[...e];a&&(n=n.filter(e=>e.nome.toLowerCase().includes(a)||(e.tel||"").includes(a)||(e.cpf||"").includes(a)));const o=document.getElementById("lista-clientes");if(!n.length)return void(o.innerHTML='<div class="empty"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><div class="empty-t">Nenhum Cliente</div></div>');o.innerHTML=n.map(e=>{const a=t.filter(t=>t.cliente_id===e.id),n=a.reduce((e,t)=>e+Number(t.total),0),o=a.find(e=>"ativo"===e.status);return`\n      <div class="cli-row">\n        <div class="cli-av">${initials(e.nome)}</div>\n        <div class="cli-info">\n          <div class="cli-name">${e.nome}</div>\n          <div class="cli-detail">${e.tel}${e.cidade?" · "+e.cidade:""}${e.cpf?" · "+e.cpf:""}</div>\n          ${o?'<div style="font-size:11px;color:var(--org);font-weight:600;margin-top:2px">Com reboque ativo</div>':""}\n        </div>\n        <div class="cli-stats"><div class="cli-n">${a.length} alug.</div><div class="cli-t">${fmt(n)}</div></div>\n        <div class="cli-btns">\n          <button class="btn btn-ghost btn-xs" onclick="abrirModalCliente('${e.id}')"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Editar</button>\n          <button class="btn btn-red btn-xs" onclick="excluirCliente('${e.id}')"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>\n        </div>\n      </div>`}).join("")}catch(e){toast(e.message,"error")}}

async function abrirModalCliente(e){if(document.getElementById("cl-id").value="",document.getElementById("modal-cliente-titulo").textContent="Novo Cliente",["cl-nome","cl-cpf","cl-tel","cl-rg","cl-cep","cl-end","cl-cidade","cl-cnh","cl-obs","cl-renavan","cl-placa-veiculo"].forEach(e=>document.getElementById(e).value=""),document.getElementById("cl-cat").value="",e){const t=_clCache.find(t=>t.id===e);t&&(document.getElementById("cl-id").value=e,document.getElementById("modal-cliente-titulo").textContent="Editar Cliente",document.getElementById("cl-nome").value=t.nome||"",document.getElementById("cl-cpf").value=t.cpf||"",document.getElementById("cl-tel").value=t.tel||"",document.getElementById("cl-rg").value=t.rg||"",document.getElementById("cl-cep").value=t.cep||"",document.getElementById("cl-end").value=t.endereco||"",document.getElementById("cl-cidade").value=t.cidade||"",document.getElementById("cl-cnh").value=t.cnh||"",document.getElementById("cl-cat").value=t.cat_cnh||"",document.getElementById("cl-renavan").value=t.renavan||"",document.getElementById("cl-placa-veiculo").value=t.placa_veiculo||"",document.getElementById("cl-obs").value=t.obs||"")}abrirModal("modal-cliente")}

/* Busca automática de endereço via CEP (ViaCEP) */
async function buscarCEP(){
  const inp = document.getElementById('cl-cep');
  const cepLimpo = inp.value.replace(/\D/g,'');
  if(cepLimpo.length !== 8){ if(cepLimpo.length>0) toast('CEP inválido — deve ter 8 dígitos','error'); return; }
  inp.value = cepLimpo.replace(/(\d{5})(\d{3})/, '$1-$2');
  inp.disabled = true;
  const original = inp.style.background;
  inp.style.background = 'repeating-linear-gradient(45deg,#f3f3f3,#f3f3f3 10px,#eaeaea 10px,#eaeaea 20px)';
  try{
    const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await res.json();
    if(data.erro){ toast('CEP não encontrado','error'); return; }
    const ruaAtual = document.getElementById('cl-end').value.trim();
    const novaRua = [data.logradouro, data.bairro].filter(Boolean).join(' — ');
    if(!ruaAtual && novaRua) document.getElementById('cl-end').value = novaRua;
    if(data.localidade) document.getElementById('cl-cidade').value = data.uf ? `${data.localidade} - ${data.uf}` : data.localidade;
    toast('Endereço preenchido automaticamente!','success');
  }catch(e){
    toast('Não foi possível buscar o CEP. Verifique sua conexão.','error');
  }finally{
    inp.disabled = false;
    inp.style.background = original;
  }
}

async function salvarCliente(){const e=document.getElementById("cl-nome").value.trim(),t=document.getElementById("cl-tel").value.trim();if(!e)return void toast("Informe o nome","error");if(!t)return void toast("Informe o telefone","error");const a={nome:e,cpf:document.getElementById("cl-cpf").value.trim(),tel:t,rg:document.getElementById("cl-rg").value.trim(),endereco:document.getElementById("cl-end").value.trim(),cidade:document.getElementById("cl-cidade").value.trim(),cep:document.getElementById("cl-cep").value.trim(),cnh:document.getElementById("cl-cnh").value.trim(),cat_cnh:document.getElementById("cl-cat").value,renavan:document.getElementById("cl-renavan").value.trim(),placa_veiculo:document.getElementById("cl-placa-veiculo").value.trim(),obs:document.getElementById("cl-obs").value},n=document.getElementById("cl-id").value;try{n?(await api.put(`/api/clientes/${n}`,a),toast("Cliente atualizado!","success")):(await api.post("/api/clientes",a),toast("Cliente cadastrado!","success")),fecharModal("modal-cliente"),await renderClientes()}catch(e){toast(e.message,"error")}}

async function excluirCliente(e){confirmar("Excluir Cliente","Tem certeza? O histórico de aluguéis será mantido.",async()=>{try{await api.del(`/api/clientes/${e}`),toast("Cliente excluído.","info"),await renderClientes()}catch(e){toast(e.message,"error")}})}
