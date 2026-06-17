/* ══════════════════════════════════════════════════════════════
   app.js — API client, variáveis globais e inicialização
   Carregado PRIMEIRO. Define API, helpers e inicia o sistema.
══════════════════════════════════════════════════════════════ */

const API=window.location.origin;let _token=sessionStorage.getItem("rr_token")||null,usuarioAtual=null;const api={async req(e,t,a){const n={method:e,headers:{"Content-Type":"application/json"}};let o,i;_token&&(n.headers["x-auth-token"]=_token),void 0!==a&&(n.body=JSON.stringify(a));try{o=await fetch(API+t,n)}catch(e){throw new Error("Sem conexão com o servidor. Verifique se o backend está rodando.")}try{i=await o.json()}catch{i={}}if(!o.ok)throw new Error(i.error||`Erro ${o.status}`);return i},get:e=>api.req("GET",e),post:(e,t)=>api.req("POST",e,t),put:(e,t)=>api.req("PUT",e,t),del:e=>api.req("DELETE",e)},today=()=>(new Date).toISOString().slice(0,10),fmt=e=>"R$ "+Number(e).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0}),fmtDate=e=>{if(!e)return"—";const[t,a,n]=e.slice(0,10).split("-");return`${n}/${a}/${t}`},diasEnteTotal=(e,t)=>{try{return Math.max(1,Math.round((new Date(t)-new Date(e))/864e5))}catch{return 1}},initials=e=>e.split(" ").slice(0,2).map(e=>e[0]||"").join("").toUpperCase(),isAtrasado=e=>"ativo"===e.status&&e.devolucao<today(),statusReal=e=>isAtrasado(e)?"atrasado":e.status,tipoBg={Aberto:"#0A2647",Fechado:"#144272",Plataforma:"#1A5C9A","Carga Animal":"#133A5E","Asa Delta":"#0F4C81",Personalizado:"#C4540A"},tipoIconSVG={Aberto:'<svg viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',Fechado:'<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><line x1="12" y1="22" x2="12" y2="12"/></svg>',Plataforma:'<svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',"Carga Animal":'<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',"Asa Delta":'<svg viewBox="0 0 24 24"><path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2"/></svg>',Personalizado:'<svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>'};

/* ── Variáveis de estado (não existem no bundle original) ── */
const _allPages = ['dashboard','alugueis','devolucoes','reboques','manutencao',
                   'clientes','relatorios','configuracoes','usuarios','minha-conta','historico'];
let currentPage = 'dashboard';
let _audFiltro  = '';
let _alCache = [], _rbCache = [], _clCache = [], _usrCache = [], _mnCache = [];

const AUDIT_TIPO = {
  criar:   {label:'Criado',    cls:'criar',   icon:'<polyline points="12 5 12 19"/><polyline points="5 12 12 19 19 12"/>'},
  editar:  {label:'Editado',   cls:'editar',  icon:'<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>'},
  excluir: {label:'Excluído',  cls:'excluir', icon:'<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>'},
  encerrar:{label:'Encerrado', cls:'encerrar',icon:'<polyline points="20 6 9 17 4 12"/>'},
  login:   {label:'Login',     cls:'login',   icon:'<path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/>'},
  logout:  {label:'Logout',    cls:'logout',  icon:'<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/>'},
  senha:   {label:'Senha',     cls:'senha',   icon:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>'},
  config:  {label:'Config',    cls:'config',  icon:'<circle cx="12" cy="12" r="3"/>'},
};

/* ── Spinner CSS ── */
(function(){
  const s = document.createElement('style');
  s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(s);
})();

/* ── Init: roda após todos os <script> módulos carregarem ── */
window.addEventListener("DOMContentLoaded", async function(){try{await fetch(API+"/api/health")}catch{return void(document.getElementById("login-screen").innerHTML='\n      <div class="login-box">\n        <div class="login-top" style="background:#DC2626;border-bottom-color:#DC2626">\n          <div class="login-logo"><img src="logo.png" alt="Rocha Reboques" style="height:60px;mix-blend-mode:lighten"/></div>\n          <div class="login-welcome" style="margin-top:10px">Servidor Offline</div>\n          <div class="login-welcome-sub">Não foi possível conectar ao servidor.</div>\n        </div>\n        <div class="login-body">\n          <div style="background:rgba(220,38,38,.08);border-left:3px solid #DC2626;padding:14px;font-size:13px;line-height:1.7;color:var(--txt)">\n            <strong>Para iniciar o sistema:</strong><br/>\n            1. Abra o terminal na pasta do projeto<br/>\n            2. Execute: <code style="background:var(--bg);padding:2px 6px;font-family:monospace">npm start</code><br/>\n            3. Recarregue esta página\n          </div>\n          <button class="login-btn" style="margin-top:16px" onclick="location.reload()">\n            <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:#fff;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.38"/></svg>\n            Tentar Novamente\n          </button>\n        </div>\n      </div>')}const e=sessionStorage.getItem("rr_token"),t=sessionStorage.getItem("rr_usuario");if(e&&t)try{return _token=e,await api.get("/api/relatorios/dashboard"),usuarioAtual=JSON.parse(t),document.getElementById("login-screen").classList.add("hidden"),void iniciarSistema()}catch{sessionStorage.removeItem("rr_token"),sessionStorage.removeItem("rr_usuario"),_token=null}document.getElementById("login-user").focus()});