/* ═══ UTILITÁRIOS — helpers, toast, confirm, navegação ═══ */

function loadingHTML(e="Carregando..."){return`<div style="text-align:center;padding:40px;color:var(--muted)">\n    <div style="width:28px;height:28px;border:3px solid var(--brd);border-top-color:var(--org);border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 12px"></div>\n    <div style="font-size:13px">${e}</div>\n  </div>`}const spinnerCSS=document.createElement("style");

function setLoading(e,t){const a=document.getElementById(e);a&&(a.innerHTML=loadingHTML(t))}

function toast(e,t="info"){const a={success:'<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',error:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',info:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',warn:'<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'},n=document.createElement("div");n.className=`toast ${{success:"t-grn",error:"t-red",warn:"t-amb",info:""}[t]||""}`,n.innerHTML=`${a[t]||a.info}<span>${e}</span>`,document.getElementById("toast-wrap").appendChild(n),setTimeout(()=>{n.style.opacity="0",n.style.transition="opacity .3s",setTimeout(()=>n.remove(),300)},3500)}spinnerCSS.textContent="@keyframes spin{to{transform:rotate(360deg)}}",document.head.appendChild(spinnerCSS);let _confirmCb=null;

function confirmar(e,t,a,n=!0){document.getElementById("confirm-title").textContent=e,document.getElementById("confirm-msg").textContent=t;const o=document.getElementById("confirm-ok-btn");o.className="btn "+(n?"btn-red":"btn-primary"),o.textContent=n?"Excluir":"Confirmar",_confirmCb=a,document.getElementById("confirm-overlay").classList.add("show")}

function confirmarSim(){document.getElementById("confirm-overlay").classList.remove("show"),_confirmCb&&_confirmCb()}

function confirmarNao(){document.getElementById("confirm-overlay").classList.remove("show")}

function badgeSt(e){const[t,a]={ativo:["bd-ativo","Ativo"],atrasado:["bd-atrasado","Atrasado"],encerrado:["bd-encerrado","Encerrado"],disponivel:["bd-disponivel","Disponível"],alugado:["bd-ativo","Alugado"],manutencao:["bd-manutencao","Manutenção"]}[e]||["bd-encerrado",e];return`<span class="badge ${t}"><span class="bd-dot"></span>${a}</span>`}

function badgePag(e){const[t,a]={pago:["bd-pago","Pago"],pendente:["bd-pendente","Pendente"],parcial:["bd-parcial","Parcial"]}[e]||["bd-encerrado",e];return`<span class="badge ${t}">${a}</span>`}

function abrirModal(e){document.getElementById(e).classList.add("open")}

function fecharModal(e){document.getElementById(e).classList.remove("open")}

function fecharSeOverlay(e,t){e.target===document.getElementById(t)&&fecharModal(t)}

function toggleSidebar(){const e=document.getElementById("sidebar"),t=document.getElementById("hamburger"),a=document.getElementById("overlay"),n=e.classList.toggle("open");t.classList.toggle("open",n),a.classList.toggle("show",n)}

function closeSidebar(){document.getElementById("sidebar").classList.remove("open"),document.getElementById("hamburger").classList.remove("open"),document.getElementById("overlay").classList.remove("show")}

function goTo(e){if(["relatorios","configuracoes","usuarios","historico"].includes(e)&&"auxiliar"===usuarioAtual?.nivel)return void toast("Acesso restrito a gerentes.","error");_allPages.forEach(t=>{document.getElementById("page-"+t)?.classList.toggle("active",t===e),document.getElementById("nav-"+t)?.classList.toggle("active",t===e)}),currentPage=e,closeSidebar(),document.getElementById("user-dropdown")?.classList.remove("show");const t={dashboard:renderDashboard,alugueis:renderAlugueis,reservas:renderReservas,devolucoes:renderDevolucoes,reboques:renderReboques,manutencao:renderManutencao,clientes:renderClientes,relatorios:renderRelatorios,usuarios:renderUsuarios,historico:renderHistorico,"minha-conta":renderMinhaConta};t[e]&&t[e]()}

async function updateNavBadges(){try{const e=await api.get("/api/relatorios/dashboard"),t=document.getElementById("badge-atrasados"),a=document.getElementById("badge-hoje");t&&(t.style.display=e.atrasados>0?"flex":"none",t.textContent=e.atrasados);const n=(await api.get("/api/alugueis")).filter(e=>"ativo"===e.status&&e.devolucao===today()).length;a&&(a.style.display=n>0?"flex":"none",a.textContent=n)}catch{}}
