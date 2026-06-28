/* ═══════════════════════════════════════════════════════════════
   CONTRATO DE LOCAÇÃO — geração e impressão

   AVISO IMPORTANTE: a minuta abaixo é um modelo padrão de contrato
   de locação de bem móvel, baseado nas disposições gerais do
   Código Civil brasileiro sobre locação de coisas (arts. 565 a
   578). Não substitui a orientação de um advogado. Recomenda-se
   revisão jurídica antes do uso comercial efetivo com clientes.
═══════════════════════════════════════════════════════════════ */

function fmtDataExtensa(iso){
  if(!iso) return "—";
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const [y,m,d] = iso.slice(0,10).split("-").map(Number);
  return `${d} de ${meses[m-1]} de ${y}`;
}

function gerarHtmlContrato(a, empresa){
  const dias = diasEnteTotal(a.saida, a.devolucao);
  const hoje = new Date();
  const hojeFmt = hoje.toLocaleDateString("pt-BR");

  const pagamentoLabel = { pendente:"Pendente", parcial:"Parcial", pago:"Pago" }[a.pagamento] || a.pagamento;
  const tipoPgtoLabel  = { pix_maquina:"PIX Máquina", pix_jonatas:"PIX Jonatas", cartao:"Cartão" }[a.tipo_pagamento] || "Não informado";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Contrato de Locação — ${a.cliente_nome} — Aluguel ${a.id}</title>
<style>
  @page { size: A4; margin: 2cm 2cm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Georgia, serif;
    font-size: 12.5pt;
    line-height: 1.55;
    color: #111;
    max-width: 820px;
    margin: 0 auto;
    padding: 20px;
  }
  h1 {
    text-align: center;
    font-size: 16pt;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .subtitulo {
    text-align: center;
    font-size: 10.5pt;
    color: #555;
    margin-bottom: 28px;
  }
  .clausula-titulo {
    font-weight: bold;
    margin-top: 22px;
    margin-bottom: 6px;
    text-transform: uppercase;
    font-size: 12pt;
  }
  p { margin: 0 0 10px; text-align: justify; }
  .qualificacao { margin-bottom: 6px; }
  .qualificacao strong { font-weight: bold; }
  table.dados {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 11.5pt;
  }
  table.dados td {
    border: 1px solid #888;
    padding: 6px 10px;
  }
  table.dados td.label {
    background: #eee;
    font-weight: bold;
    width: 38%;
  }
  .assinaturas {
    margin-top: 60px;
    display: flex;
    justify-content: space-between;
    gap: 40px;
  }
  .assinatura-bloco {
    flex: 1;
    text-align: center;
  }
  .linha-assinatura {
    border-top: 1px solid #111;
    margin-top: 50px;
    padding-top: 6px;
    font-size: 11pt;
  }
  .local-data {
    margin-top: 30px;
    text-align: right;
    font-size: 11.5pt;
  }
  .rodape-aviso {
    margin-top: 40px;
    font-size: 8.5pt;
    color: #999;
    text-align: center;
    border-top: 1px solid #ddd;
    padding-top: 8px;
  }
  @media print {
    .no-print { display: none !important; }
    body { padding: 0; }
  }
  .no-print {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 10;
  }
  .no-print button {
    background: #F76C0C;
    color: #fff;
    border: none;
    padding: 10px 18px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    border-radius: 3px;
    font-family: Arial, sans-serif;
  }
</style>
</head>
<body>

  <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar PDF</button></div>

  <h1>Contrato de Locação de Bem Móvel</h1>
  <div class="subtitulo">Reboque / Trailer — Locação por Prazo Determinado</div>

  <p class="qualificacao">
    <strong>LOCADOR:</strong> ${empresa.nome}, ${empresa.end ? "com endereço em " + empresa.end + ", " : ""}${empresa.cidade}${empresa.tel ? ", telefone " + empresa.tel : ""}, doravante denominado simplesmente <strong>LOCADOR</strong>.
  </p>

  <p class="qualificacao">
    <strong>LOCATÁRIO:</strong> ${a.cliente_nome}${a.cliente_cpf ? ", portador(a) do CPF nº " + a.cliente_cpf : ""}${a.cliente_cnh ? ", CNH nº " + a.cliente_cnh + (a.cliente_cat_cnh ? " categoria " + a.cliente_cat_cnh : "") : ""}, telefone ${a.cliente_tel || "não informado"}${a.cliente_endereco ? ", residente em " + a.cliente_endereco : ""}${a.cliente_cidade ? ", " + a.cliente_cidade : ""}, doravante denominado simplesmente <strong>LOCATÁRIO</strong>.
  </p>

  <p>As partes acima qualificadas têm, entre si, justo e acertado o presente Contrato de Locação de Bem Móvel, que se regerá pelas cláusulas seguintes e pelas disposições do Código Civil Brasileiro aplicáveis à locação de coisas (arts. 565 a 578).</p>

  <div class="clausula-titulo">Cláusula 1ª — Do Objeto</div>
  <p>O presente contrato tem por objeto a locação do seguinte bem móvel, de propriedade do LOCADOR:</p>
  <table class="dados">
    <tr><td class="label">Equipamento</td><td>${a.reboque_nome}</td></tr>
    <tr><td class="label">Tipo</td><td>${a.reboque_tipo || "—"}</td></tr>
    <tr><td class="label">Placa</td><td>${a.reboque_placa || "Não emplacado / não informado"}</td></tr>
    <tr><td class="label">Capacidade</td><td>${a.reboque_capacidade ? a.reboque_capacidade + " kg" : "Não informado"}</td></tr>
  </table>
  <p>O LOCATÁRIO declara, neste ato, ter vistoriado o bem e recebê-lo em perfeitas condições de uso e funcionamento, comprometendo-se a devolvê-lo no mesmo estado, salvo o desgaste natural decorrente do uso regular.</p>

  <div class="clausula-titulo">Cláusula 2ª — Do Prazo de Locação</div>
  <table class="dados">
    <tr><td class="label">Data e horário de saída</td><td>${fmtDate(a.saida)} às ${a.hora_saida || "08:00"}</td></tr>
    <tr><td class="label">Data e horário de devolução</td><td>${fmtDate(a.devolucao)} às ${a.hora_devolucao || "08:00"}</td></tr>
    <tr><td class="label">Período total</td><td>${dias} diária(s)</td></tr>
  </table>
  <p>O prazo acima é fixo e improrrogável, salvo prévia e expressa anuência do LOCADOR, sujeita à disponibilidade do bem e a eventual reajuste de valores.</p>

  <div class="clausula-titulo">Cláusula 3ª — Do Valor e Forma de Pagamento</div>
  <table class="dados">
    <tr><td class="label">Valor da diária</td><td>${fmt(a.diaria)}</td></tr>
    <tr><td class="label">Valor total da locação</td><td>${fmt(a.total)}</td></tr>
    <tr><td class="label">Forma de pagamento</td><td>${tipoPgtoLabel}</td></tr>
    <tr><td class="label">Situação do pagamento</td><td>${pagamentoLabel}</td></tr>
  </table>
  <p>O não pagamento integral do valor ajustado autoriza o LOCADOR a reter o bem até a devida regularização e/ou recusar-se a celebrar novas locações com o LOCATÁRIO.</p>

  <div class="clausula-titulo">Cláusula 4ª — Das Obrigações do Locatário</div>
  <p>O LOCATÁRIO se obriga a: (a) utilizar o bem exclusivamente para os fins a que se destina, com prudência e cuidado, como se fosse seu; (b) não sublocar, ceder, emprestar ou transferir o bem a terceiros sem autorização expressa do LOCADOR; (c) responder por multas de trânsito ou infrações administrativas decorrentes do uso do bem durante o período de locação; (d) zelar pela conservação do bem, comunicando imediatamente ao LOCADOR qualquer avaria, sinistro ou defeito constatado; (e) devolver o bem na data, horário e local previamente acordados, no mesmo estado em que o recebeu.</p>

  <div class="clausula-titulo">Cláusula 5ª — Das Obrigações do Locador</div>
  <p>O LOCADOR se obriga a entregar o bem locado em condições adequadas de uso, funcionamento e segurança, prestando ao LOCATÁRIO as informações técnicas necessárias para sua correta utilização.</p>

  <div class="clausula-titulo">Cláusula 6ª — Da Devolução em Atraso</div>
  <p>Caso a devolução do bem não ocorra na data e horário estipulados na Cláusula 2ª, fica o LOCATÁRIO sujeito à cobrança de diária(s) adicional(is) proporcional(is) ao atraso verificado, calculada(s) com base no valor unitário fixado na Cláusula 3ª, sem prejuízo de eventuais perdas e danos comprovados pelo LOCADOR.</p>

  <div class="clausula-titulo">Cláusula 7ª — Dos Danos e Avarias</div>
  <p>O LOCATÁRIO responderá integralmente por quaisquer danos, avarias, perdas ou subtrações ocorridas no bem locado durante o período de vigência deste contrato, comprometendo-se a ressarcir o LOCADOR pelo valor de reparo ou, em caso de perda total, pelo valor de mercado do bem, no prazo a ser acordado entre as partes.</p>

  <div class="clausula-titulo">Cláusula 8ª — Da Rescisão</div>
  <p>O presente contrato poderá ser rescindido antecipadamente por qualquer das partes, mediante comunicação prévia, hipótese em que será devida a parte proporcional do valor já utilizado, sem prejuízo de eventuais penalidades aplicáveis em caso de descumprimento contratual.</p>

  <div class="clausula-titulo">Cláusula 9ª — Do Foro</div>
  <p>As partes eleger o foro da comarca de ${empresa.cidade || "Pelotas/RS"} para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>

  <p>E por estarem assim justas e contratadas, as partes firmam o presente instrumento, em duas vias de igual teor e forma.</p>

  <div class="local-data">${empresa.cidade || "Pelotas/RS"}, ${fmtDataExtensa(a.saida)}.</div>

  <div class="assinaturas">
    <div class="assinatura-bloco">
      <div class="linha-assinatura">
        ${empresa.nome}<br>LOCADOR
      </div>
    </div>
    <div class="assinatura-bloco">
      <div class="linha-assinatura">
        ${a.cliente_nome}<br>LOCATÁRIO
      </div>
    </div>
  </div>

  <div class="rodape-aviso">
    Documento gerado automaticamente pelo sistema de gestão Rocha Reboques em ${hojeFmt} · Aluguel nº ${a.id}<br>
    Este é um modelo padrão de contrato; recomenda-se revisão jurídica conforme a necessidade de cada operação.
  </div>

</body>
</html>`;
}

async function imprimirContrato(aluguelId){
  try{
    const [aluguel, empresa] = await Promise.all([
      api.get(`/api/alugueis/${aluguelId}`),
      api.get('/api/config/empresa'),
    ]);

    const html = gerarHtmlContrato(aluguel, empresa);
    const janela = window.open('', '_blank');
    if(!janela){
      toast('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está ativo.','error');
      return;
    }
    janela.document.open();
    janela.document.write(html);
    janela.document.close();
  }catch(e){
    toast(e.message || 'Erro ao gerar o contrato','error');
  }
}
