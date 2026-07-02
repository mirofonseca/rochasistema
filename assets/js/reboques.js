/* ═══ REBOQUES — frota ═══ */

async function renderReboques(){setLoading("lista-reboques","Carregando reboques...");try{const[e,t]=await Promise.all([api.get("/api/reboques"),api.get("/api/alugueis")]);_rbCache=e;const a=(document.getElementById("rb-search")?.value||"").toLowerCase(),n=document.getElementById("rb-filter")?.value||"";let o=[...e];a&&(o=o.filter(e=>e.nome.toLowerCase().includes(a)||(e.placa||"").toLowerCase().includes(a))),n&&(o=o.filter(e=>e.status===n));const i=document.getElementById("lista-reboques");if(!o.length)return void(i.innerHTML='<div class="empty" style="grid-column:1/-1"><svg viewBox="0 0 24 24"><rect x="1" y="8" width="13" height="9" rx="1"/><path d="M14 10h4l3 3v4h-7V10z"/></svg><div class="empty-t">Nenhum Reboque</div></div>');i.innerHTML=o.map(e=>{const a=tipoBg[e.tipo]||"#0A2647",n=tipoIconSVG[e.tipo]||tipoIconSVG.Aberto,o=t.find(t=>t.reboque_id===e.id&&"ativo"===t.status);return`\n      <div class="rb-card">\n        <div class="rb-card-top" style="background:${a}">${n}<div class="rb-top-badge">${badgeSt(e.status)}</div></div>\n        <div class="rb-body">\n          <div class="rb-name">${e.nome}</div>\n          <div class="rb-placa">${e.tipo}${e.placa?" · "+e.placa:""}</div>\n          ${o?`<div class="rb-locatario">Com: ${o.cliente_nome||"—"}</div>`:""}\n          ${e.capacidade?`<div style="font-size:11px;color:var(--muted);margin-top:2px">Cap: ${e.capacidade}kg</div>`:""}\n          <div class="rb-price-lbl">Diária</div>\n          <div class="rb-price">${fmt(e.diaria)}</div>\n          <div class="rb-btns">\n            ${"disponivel"===e.status?`<button class="btn btn-primary btn-xs" onclick="abrirModalAluguel('${e.id}')"><svg viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778"/></svg>Alugar</button>`:""}\n            <button class="btn btn-ghost btn-xs" onclick="abrirModalReboque('${e.id}')"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Editar</button>\n            <button class="btn btn-red btn-xs" onclick="excluirReboque('${e.id}')"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>\n              <button class="btn btn-ghost btn-xs" onclick="abrirDocsReboque('${e.id}','${(e.nome||'').replace(/'/g,'')}')"><svg viewBox="0 0 24 24" style="width:14px;height:14px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Docs</button>\n          </div>\n        </div>\n      </div>`}).join("")}catch(e){toast(e.message,"error")}}

async function abrirModalReboque(e){if(document.getElementById("rb-id").value="",document.getElementById("modal-reboque-titulo").textContent="Novo Reboque",["rb-nome","rb-placa","rb-obs"].forEach(e=>document.getElementById(e).value=""),document.getElementById("rb-cap").value="",document.getElementById("rb-diaria").value=70,document.getElementById("rb-tipo").value="Aberto",document.getElementById("rb-status").value="disponivel",e){const t=_rbCache.find(t=>t.id===e)||await api.get("/api/reboques").then(t=>t.find(t=>t.id===e)).catch(()=>null);t&&(document.getElementById("rb-id").value=e,document.getElementById("modal-reboque-titulo").textContent="Editar Reboque",document.getElementById("rb-nome").value=t.nome,document.getElementById("rb-tipo").value=t.tipo,document.getElementById("rb-placa").value=t.placa||"",document.getElementById("rb-cap").value=t.capacidade||"",document.getElementById("rb-diaria").value=t.diaria,document.getElementById("rb-status").value=t.status,document.getElementById("rb-obs").value=t.obs||"")}abrirModal("modal-reboque")}

async function salvarReboque(){const e=document.getElementById("rb-nome").value.trim(),t=Number(document.getElementById("rb-diaria").value);if(!e)return void toast("Informe o nome do reboque","error");if(!t)return void toast("Informe a diária","error");const a={nome:e,tipo:document.getElementById("rb-tipo").value,placa:document.getElementById("rb-placa").value.trim(),capacidade:document.getElementById("rb-cap").value,diaria:t,status:document.getElementById("rb-status").value,obs:document.getElementById("rb-obs").value},n=document.getElementById("rb-id").value;try{n?(await api.put(`/api/reboques/${n}`,a),toast("Reboque atualizado!","success")):(await api.post("/api/reboques",a),toast("Reboque adicionado!","success")),fecharModal("modal-reboque"),await renderReboques(),renderDashboard()}catch(e){toast(e.message,"error")}}

async function excluirReboque(e){confirmar("Excluir Reboque","Tem certeza que deseja excluir este reboque?",async()=>{try{await api.del(`/api/reboques/${e}`),toast("Reboque excluído.","info"),await renderReboques(),renderDashboard()}catch(e){toast(e.message,"error")}})}

/* ═══ DOCUMENTOS PDF POR REBOQUE ═══ */

async function abrirDocsReboque(reboqueId, reboqueNome) {
  document.getElementById("docs-reboque-id").value = reboqueId;
  document.getElementById("docs-reboque-nome").textContent = reboqueNome;
  document.getElementById("docs-nome-arquivo").value = "";
  document.getElementById("docs-file-input").value  = "";
  document.getElementById("docs-file-label").textContent = "Selecionar PDF...";
  document.getElementById("docs-upload-erro").textContent = "";
  abrirModal("modal-docs");
  await carregarDocs(reboqueId);
}

async function carregarDocs(reboqueId) {
  const id = reboqueId || document.getElementById("docs-reboque-id").value;
  const lista = document.getElementById("docs-lista");
  lista.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px 0">Carregando...</div>';
  try {
    const docs = await api.get(`/api/reboques/${id}/docs`);
    if (!docs.length) {
      lista.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhum documento anexado ainda.</div>';
      return;
    }
    lista.innerHTML = docs.map(d => `
      <div class="doc-item">
        <a class="doc-nome" href="/docs/${d.arquivo}" target="_blank" title="Abrir PDF">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          ${d.nome}
        </a>
        <span class="doc-tam">${(d.tamanho/1024).toFixed(0)} KB</span>
        <button class="btn btn-red btn-xs" onclick="excluirDoc('${d.id}')">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
        </button>
      </div>`).join("");
  } catch(e) {
    lista.innerHTML = `<div style="color:var(--red);font-size:13px">${e.message}</div>`;
  }
}

function selecionarArquivo(input) {
  const f = input.files[0];
  if (!f) return;
  if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
    document.getElementById("docs-upload-erro").textContent = "Apenas arquivos PDF são aceitos.";
    input.value = ""; return;
  }
  if (f.size > 20 * 1024 * 1024) {
    document.getElementById("docs-upload-erro").textContent = "Arquivo deve ter no máximo 20 MB.";
    input.value = ""; return;
  }
  document.getElementById("docs-upload-erro").textContent = "";
  document.getElementById("docs-file-label").textContent = f.name;
  if (!document.getElementById("docs-nome-arquivo").value)
    document.getElementById("docs-nome-arquivo").value = f.name.replace(/\.pdf$/i,"");
}

async function enviarDoc() {
  const reboqueId = document.getElementById("docs-reboque-id").value;
  const fileInput = document.getElementById("docs-file-input");
  const nome      = document.getElementById("docs-nome-arquivo").value.trim();
  const erroEl    = document.getElementById("docs-upload-erro");
  if (!fileInput.files[0]) { erroEl.textContent = "Selecione um arquivo PDF."; return; }
  if (!nome)               { erroEl.textContent = "Informe um nome para o documento."; return; }
  erroEl.textContent = "";
  const btn = document.querySelector("#modal-docs .btn-primary");
  btn.disabled = true; btn.textContent = "Enviando...";
  try {
    const fd = new FormData();
    fd.append("arquivo", fileInput.files[0]);
    fd.append("nome", nome);
    const resp = await fetch(`/api/reboques/${reboqueId}/docs`, {
      method: "POST",
      headers: { "x-auth-token": _token },
      body: fd,
    });
    if (!resp.ok) { const err = await resp.json(); throw new Error(err.error || "Erro ao enviar"); }
    toast("Documento enviado com sucesso!","success");
    document.getElementById("docs-nome-arquivo").value = "";
    fileInput.value = "";
    document.getElementById("docs-file-label").textContent = "Selecionar PDF...";
    await carregarDocs(reboqueId);
  } catch(e) { erroEl.textContent = e.message; }
  finally { btn.disabled = false; btn.textContent = "Enviar"; }
}

async function excluirDoc(id) {
  confirmar("Excluir Documento","Deseja remover este documento? A ação não pode ser desfeita.", async () => {
    try {
      await api.del(`/api/docs/${id}`);
      toast("Documento removido.","info");
      await carregarDocs();
    } catch(e) { toast(e.message,"error"); }
  });
}
