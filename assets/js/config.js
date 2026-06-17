/* ═══ CONFIGURAÇÕES — backup, exportar ═══ */

async function salvarConfig(){const e={nome:document.getElementById("cfg-nome").value,tel:document.getElementById("cfg-tel").value,end:document.getElementById("cfg-end").value,cidade:document.getElementById("cfg-cidade").value,diaria:document.getElementById("cfg-diaria").value,multa:document.getElementById("cfg-multa").value};try{await api.put("/api/config",e),toast("Configurações salvas!","success")}catch(e){toast(e.message,"error")}}

async function exportarDados(){try{const[e,t,a]=await Promise.all([api.get("/api/reboques"),api.get("/api/clientes"),api.get("/api/alugueis")]),n=new Blob([JSON.stringify({reboques:e,clientes:t,alugueis:a,exportado:(new Date).toISOString()},null,2)],{type:"application/json"}),o=document.createElement("a");o.href=URL.createObjectURL(n),o.download=`rocha-reboques-${today()}.json`,o.click(),URL.revokeObjectURL(o.href),toast("Dados exportados!","success")}catch(e){toast(e.message,"error")}}

async function limparDados(){confirmar("Limpar Todos os Dados","Esta ação é irreversível. Deseja apagar TODOS os dados?",async()=>{try{toast("Funcionalidade disponível apenas via terminal no servidor.","warn")}catch(e){toast(e.message,"error")}})}

async function backupBanco(){
  try{
    const res=await fetch(API+'/api/admin/backup',{headers:{'x-auth-token':_token}});
    if(!res.ok){const d=await res.json();throw new Error(d.error);}
    const blob=await res.blob();
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='rochasistema-backup-'+new Date().toISOString().slice(0,10)+'.db';
    a.click();URL.revokeObjectURL(a.href);
    toast('Backup do banco baixado!','success');
  }catch(e){toast(e.message,'error');}
}

async function restaurarBanco(input){
  const file=input.files[0];if(!file)return;
  confirmar('Restaurar Banco','Isso substituirá TODOS os dados pelo backup selecionado. Tem certeza?',async()=>{
    try{
      const buf=await file.arrayBuffer();
      const res=await fetch(API+'/api/admin/restore',{method:'POST',headers:{'x-auth-token':_token,'Content-Type':'application/octet-stream'},body:buf});
      const d=await res.json();
      if(!res.ok)throw new Error(d.error);
      toast('Banco restaurado! Recarregando...','success');
      setTimeout(()=>location.reload(),2000);
    }catch(e){toast(e.message,'error');}
  },false);
  input.value='';
}
