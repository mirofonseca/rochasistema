/* ═══ FOTOS DE VISTORIA — captura via câmera (4 fotos, Retirada/Devolução) ═══ */

let _fvAluguelId = null;
let _fvTipo = 'retirada';
let _fvSlots = { 1: null, 2: null, 3: null, 4: null }; // File objects capturados, ainda não salvos

async function abrirFotosVistoria(aluguelId){
  try{
    const a = _alCache.find(x=>x.id===aluguelId) || await api.get(`/api/alugueis/${aluguelId}`);
    if(!a){ toast('Aluguel não encontrado','error'); return; }

    _fvAluguelId = aluguelId;
    _fvTipo = 'retirada';
    _fvSlots = { 1: null, 2: null, 3: null, 4: null };

    document.getElementById('fv-reboque-nome').textContent = a.reboque_nome || '—';
    _resetSlotsVisual();
    document.getElementById('fv-upload-erro').textContent = '';
    _atualizarBotoesTipo();

    abrirModal('modal-fotos-vistoria');
    await carregarGaleriaVistoria();
  }catch(e){ toast(e.message,'error'); }
}

function setTipoFotoVistoria(tipo){
  _fvTipo = tipo;
  _fvSlots = { 1: null, 2: null, 3: null, 4: null };
  _resetSlotsVisual();
  document.getElementById('fv-upload-erro').textContent = '';
  _atualizarBotoesTipo();
  carregarGaleriaVistoria();
}

function _atualizarBotoesTipo(){
  document.getElementById('fv-btn-retirada').className  = _fvTipo==='retirada'  ? 'btn btn-primary btn-xs' : 'btn btn-ghost btn-xs';
  document.getElementById('fv-btn-devolucao').className = _fvTipo==='devolucao' ? 'btn btn-primary btn-xs' : 'btn btn-ghost btn-xs';
}

function _resetSlotsVisual(){
  for(let n=1; n<=4; n++){
    const slot = document.getElementById(`fv-slot-${n}`);
    slot.classList.remove('filled');
    slot.innerHTML = `
      <input type="file" accept="image/*" capture="environment" id="fv-input-${n}" style="display:none" onchange="capturarFotoVistoria(${n},this)">
      <div class="fv-slot-empty">
        <svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
        <span>Foto ${n}</span>
      </div>`;
  }
  _atualizarBotaoSalvar();
}

function dispararCapturaFoto(n){
  document.getElementById(`fv-input-${n}`).click();
}

function capturarFotoVistoria(n, input){
  const f = input.files[0];
  if(!f) return;
  if(!f.type.startsWith('image/')){
    document.getElementById('fv-upload-erro').textContent = 'Selecione um arquivo de imagem válido.';
    return;
  }
  document.getElementById('fv-upload-erro').textContent = '';
  _fvSlots[n] = f;

  const url  = URL.createObjectURL(f);
  const slot = document.getElementById(`fv-slot-${n}`);
  slot.classList.add('filled');
  slot.innerHTML = `
    <img src="${url}" alt="Foto ${n}">
    <div class="fv-slot-remove" onclick="event.stopPropagation();removerSlotFoto(${n})">
      <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </div>`;
  _atualizarBotaoSalvar();
}

function removerSlotFoto(n){
  _fvSlots[n] = null;
  const slot = document.getElementById(`fv-slot-${n}`);
  slot.classList.remove('filled');
  slot.innerHTML = `
    <input type="file" accept="image/*" capture="environment" id="fv-input-${n}" style="display:none" onchange="capturarFotoVistoria(${n},this)">
    <div class="fv-slot-empty">
      <svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
      <span>Foto ${n}</span>
    </div>`;
  _atualizarBotaoSalvar();
}

function _atualizarBotaoSalvar(){
  const temAlgumaFoto = Object.values(_fvSlots).some(f => f !== null);
  document.getElementById('fv-btn-salvar').disabled = !temAlgumaFoto;
}

async function salvarFotosVistoria(){
  const arquivos = Object.values(_fvSlots).filter(f => f !== null);
  if(!arquivos.length){ toast('Tire ao menos uma foto antes de salvar','error'); return; }

  const btn = document.getElementById('fv-btn-salvar');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try{
    const fd = new FormData();
    arquivos.forEach(f => fd.append('fotos', f));
    fd.append('tipo', _fvTipo);

    const resp = await fetch(`/api/alugueis/${_fvAluguelId}/fotos-vistoria`, {
      method: 'POST',
      headers: { 'x-auth-token': _token },
      body: fd,
    });
    if(!resp.ok){ const err = await resp.json(); throw new Error(err.error || 'Erro ao enviar fotos'); }

    toast(`${arquivos.length} foto(s) salva(s) com sucesso!`,'success');
    _fvSlots = { 1: null, 2: null, 3: null, 4: null };
    _resetSlotsVisual();
    await carregarGaleriaVistoria();
  }catch(e){
    document.getElementById('fv-upload-erro').textContent = e.message;
  }finally{
    btn.textContent = 'Salvar Fotos';
    _atualizarBotaoSalvar();
  }
}

async function carregarGaleriaVistoria(){
  const galeria = document.getElementById('fv-galeria');
  galeria.innerHTML = '<div style="color:var(--muted);font-size:12px">Carregando...</div>';
  try{
    const fotos = await api.get(`/api/alugueis/${_fvAluguelId}/fotos-vistoria?tipo=${_fvTipo}`);
    if(!fotos.length){
      galeria.innerHTML = '<div style="color:var(--muted);font-size:12px">Nenhuma foto salva ainda para esta etapa.</div>';
      return;
    }
    galeria.innerHTML = `<div class="fv-galeria-grid">${fotos.map(f => `
      <div class="fv-galeria-item">
        <img src="/fotos/${f.arquivo}" onclick="window.open('/fotos/${f.arquivo}','_blank')" alt="Foto vistoria">
        <button class="fv-del" onclick="excluirFotoVistoria('${f.id}')">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`).join('')}</div>`;
  }catch(e){ galeria.innerHTML = `<div style="color:var(--red);font-size:12px">${e.message}</div>`; }
}

async function excluirFotoVistoria(id){
  confirmar('Excluir Foto','Deseja remover esta foto de vistoria?', async () => {
    try{
      await api.del(`/api/fotos-vistoria/${id}`);
      toast('Foto removida.','info');
      await carregarGaleriaVistoria();
    }catch(e){ toast(e.message,'error'); }
  });
}
