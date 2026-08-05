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

function gerarHtmlContrato(a, empresa, fotosRetirada, fotosDevolucao){
  fotosRetirada  = fotosRetirada  || [];
  fotosDevolucao = fotosDevolucao || [];
  const dias = diasEnteTotal(a.saida, a.devolucao);
  const hoje = new Date();
  const hojeFmt = hoje.toLocaleDateString("pt-BR");

  const pagamentoLabel = { pendente:"Pendente", parcial:"Parcial", pago:"Pago" }[a.pagamento] || a.pagamento;
  const tipoPgtoLabel  = { pix_maquina:"PIX Máquina", pix_jonatas:"PIX Jonatas", cartao:"Cartão", dinheiro:"Dinheiro" }[a.tipo_pagamento] || "Não informado";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${a.status==="reservado"?"Pré-Contrato (Reserva)":"Contrato de Locação"} — ${a.cliente_nome} — ${a.id}</title>
<style>
  @page { size: A4; margin: 1.3cm 1.5cm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Georgia, serif;
    font-size: 9pt;
    line-height: 1.32;
    color: #111;
    max-width: 820px;
    margin: 0 auto;
    padding: 12px;
  }
  h1 {
    text-align: center;
    font-size: 9pt;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 3px;
  }
  .subtitulo {
    text-align: center;
    font-size: 9pt;
    color: #555;
    margin-bottom: 14px;
  }
  .clausula-titulo {
    font-weight: bold;
    margin-top: 11px;
    margin-bottom: 3px;
    text-transform: uppercase;
    font-size: 9pt;
  }
  p { margin: 0 0 5px; text-align: justify; }
  .qualificacao { margin-bottom: 3px; }
  .qualificacao strong { font-weight: bold; }
  table.dados {
    width: 100%;
    border-collapse: collapse;
    margin: 7px 0;
    font-size: 9pt;
  }
  table.dados td {
    border: 1px solid #888;
    padding: 3px 8px;
  }
  table.dados td.label {
    background: #eee;
    font-weight: bold;
    width: 38%;
  }
  .assinaturas {
    margin-top: 30px;
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
    margin-top: 25px;
    padding-top: 4px;
    font-size: 9pt;
  }
  .local-data {
    margin-top: 15px;
    text-align: right;
    font-size: 9pt;
  }
  .rodape-aviso {
    margin-top: 18px;
    font-size: 9pt;
    color: #999;
    text-align: center;
    border-top: 1px solid #ddd;
    padding-top: 5px;
  }

  .vistoria-page { padding-top: 12px; margin-top: 12px; border-top: 1px dashed #ccc; }
  .vistoria-titulo {
    text-align: center;
    font-size: 9pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 3px;
  }
  .vistoria-nota {
    font-size: 9pt;
    color: #555;
    text-align: center;
    margin-bottom: 10px;
  }
  .vistoria-datas {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }
  .vistoria-data-bloco {
    flex: 1;
    border: 1px solid #888;
    padding: 5px 10px;
  }
  .vistoria-data-bloco .rot {
    font-weight: bold;
    font-size: 9pt;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .vistoria-data-bloco .campo {
    font-size: 9pt;
    margin-bottom: 2px;
  }
  .vistoria-ciente {
    font-size: 9pt;
    margin-bottom: 10px;
  }
  .vistoria-ciente .linha {
    display: inline-block;
    border-bottom: 1px solid #111;
    min-width: 260px;
    margin-left: 8px;
  }
  .vistoria-check-titulo {
    font-weight: bold;
    font-size: 9pt;
    margin-bottom: 5px;
    text-transform: uppercase;
  }
  .vistoria-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px 30px;
  }
  .vistoria-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 9pt;
    padding: 1px 0;
  }
  .vistoria-box {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 1.5px solid #111;
    flex-shrink: 0;
  }
  .vistoria-fotos-titulo {
    font-weight: bold;
    font-size: 9pt;
    text-transform: uppercase;
    margin: 8px 0 4px;
    color: #333;
  }
  .vistoria-fotos-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 5px;
  }
  .vistoria-fotos-grid img {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border: 1px solid #888;
  }
  .vistoria-fotos-vazio {
    font-size: 9pt;
    color: #999;
    font-style: italic;
    margin-bottom: 5px;
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

  ${a.status==="reservado"
    ? `<h1>Pré-Contrato de Locação — Reserva</h1><div class="subtitulo">Reboque / Trailer — Reserva de Data (sujeita a confirmação na retirada)</div>`
    : `<h1>Contrato de Locação de Bem Móvel</h1><div class="subtitulo">Reboque / Trailer — Locação por Prazo Determinado</div>`}

  <p class="qualificacao">
    <strong>LOCADOR:</strong> Rocha Reboques, CNPJ nº 60.117.050/0001-85, com endereço na Rua Bernardo José de Souza, 244, Bairro Fragata, Pelotas/RS, CEP 96040-230, neste ato representado por Bruna Horner Floor de Oliveira, portadora do RG nº 2107078897, telefone (53) 9 9962-7279, doravante denominado simplesmente <strong>LOCADOR</strong>.
  </p>

  <p class="qualificacao">
    <strong>LOCATÁRIO:</strong> ${a.cliente_nome}${a.cliente_cpf ? ", portador(a) do CPF nº " + a.cliente_cpf : ""}${a.cliente_rg ? ", RG nº " + a.cliente_rg : ""}${a.cliente_cnh ? ", CNH nº " + a.cliente_cnh + (a.cliente_cat_cnh ? " categoria " + a.cliente_cat_cnh : "") : ""}, telefone ${a.cliente_tel || "não informado"}${a.cliente_endereco ? ", residente em " + a.cliente_endereco : ""}${a.cliente_cidade ? ", " + a.cliente_cidade : ""}${a.cliente_placa_veiculo ? ", proprietário(a) do veículo de placa " + a.cliente_placa_veiculo : ""}${a.cliente_renavan ? " e Renavam nº " + a.cliente_renavan : ""}, doravante denominado simplesmente <strong>LOCATÁRIO</strong>.
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
  <p>O REBOQUE, objeto deste contrato, será utilizado exclusivamente pelo LOCATÁRIO, sendo o condutor da mesma, não sendo permitido o seu uso por terceiros.</p>

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

  <div class="clausula-titulo">Cláusula 9ª — Da Identificação do Locador</div>
  <p>O LOCADOR é a empresa Rocha Reboques, inscrita no CNPJ sob o nº 60.117.050/0001-85, com sede na Rua Bernardo José de Souza, nº 244, Bairro Fragata, na cidade de Pelotas, Estado do Rio Grande do Sul, CEP 96040-230, podendo o LOCADOR, neste ato e para todos os fins, ser representado por Bruna Horner Floor de Oliveira, portadora do RG nº 2107078897, contato telefônico (53) 9 9962-7279.</p>

  <div class="clausula-titulo">Cláusula 10ª — Do Foro</div>
  <p>As partes eleger o foro da comarca de Pelotas/RS para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>

  <p>E por estarem assim justas e contratadas, as partes firmam o presente instrumento, em duas vias de igual teor e forma.</p>

  <div class="local-data">Pelotas/RS, ${fmtDataExtensa(a.saida)}.</div>

  <div class="vistoria-page">
    <div class="vistoria-titulo">Termo de Vistoria de Retirada e Devolução</div>
    <div class="vistoria-nota">Nota: 1. A Locação rege-se pelo previsto nos Arts. 1192, 1196, e do 1188 ao 1215, todos do Código Civil.</div>

    <div class="vistoria-datas">
      <div class="vistoria-data-bloco">
        <div class="rot">Retirada (Vistoria)</div>
        <div class="campo">Data: ____/____/______ às _____:_____ HS</div>
      </div>
      <div class="vistoria-data-bloco">
        <div class="rot">Devolução (Vistoria)</div>
        <div class="campo">Data: ____/____/______ às _____:_____ HS</div>
      </div>
    </div>

    <div class="vistoria-ciente">Ciente Locatário: <span class="linha"></span></div>

    <div class="vistoria-check-titulo">Itens Verificados</div>
    <div class="vistoria-grid">
      <div class="vistoria-item"><span class="vistoria-box"></span> Ligação elétrica</div>
      <div class="vistoria-item"><span class="vistoria-box"></span> Documento Renavan</div>
      <div class="vistoria-item"><span class="vistoria-box"></span> Estepe</div>
      <div class="vistoria-item"><span class="vistoria-box"></span> Chave de rodas</div>
      <div class="vistoria-item"><span class="vistoria-box"></span> Cadeado com chave</div>
      <div class="vistoria-item"><span class="vistoria-box"></span> Lanternas perfeitas</div>
      <div class="vistoria-item"><span class="vistoria-box"></span> Catraca / lona / corda</div>
      <div class="vistoria-item"><span class="vistoria-box"></span> Irá trafegar em estrada de terra</div>
      <div class="vistoria-item"><span class="vistoria-box"></span> Lataria perfeita</div>
      <div class="vistoria-item"><span class="vistoria-box"></span> Para-lama D — laterais madeira</div>
      <div class="vistoria-item"><span class="vistoria-box"></span> Limite de velocidade igual caminhão</div>
      <div class="vistoria-item"><span class="vistoria-box"></span> Para-lama E — laterais madeira</div>
      <div class="vistoria-item"><span class="vistoria-box"></span> Corrente Ferro/mosquetão</div>
    </div>

    <div class="vistoria-fotos-titulo">Fotos — Retirada</div>
    ${fotosRetirada.length
      ? `<div class="vistoria-fotos-grid">${fotosRetirada.slice(0,4).map(f => `<img src="/fotos/${f.arquivo}" alt="Foto retirada">`).join("")}</div>`
      : `<div class="vistoria-fotos-vazio">Nenhuma foto registrada na retirada.</div>`}

    <div class="vistoria-fotos-titulo">Fotos — Devolução</div>
    ${fotosDevolucao.length
      ? `<div class="vistoria-fotos-grid">${fotosDevolucao.slice(0,4).map(f => `<img src="/fotos/${f.arquivo}" alt="Foto devolução">`).join("")}</div>`
      : `<div class="vistoria-fotos-vazio">Nenhuma foto registrada na devolução.</div>`}
  </div>


  <div class="assinaturas">
    <div class="assinatura-bloco">
      <div class="linha-assinatura">
        Rocha Reboques<br>Bruna Horner Floor de Oliveira — LOCADOR
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
    const [aluguel, empresa, fotosRetirada, fotosDevolucao] = await Promise.all([
      api.get(`/api/alugueis/${aluguelId}`),
      api.get('/api/config/empresa'),
      api.get(`/api/alugueis/${aluguelId}/fotos-vistoria?tipo=retirada`).catch(()=>[]),
      api.get(`/api/alugueis/${aluguelId}/fotos-vistoria?tipo=devolucao`).catch(()=>[]),
    ]);

    const html = gerarHtmlContrato(aluguel, empresa, fotosRetirada, fotosDevolucao);
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
