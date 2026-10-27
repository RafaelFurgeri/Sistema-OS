/* =========================================================
   Geração do documento para impressão / PDF (A4)
   Layout Executivo, Organizado, Bonito e Profissional
   ========================================================= */
const Print = {
  html(os) {
    const cfg = DB.config;
    const cli = DB.cliente(os.clienteId) || os.clienteSnapshot || {};
    const t = Calc.totais(os);
    const isOrc = os.tipo === 'orc';
    const eq = os.equipamento || {};
    const v = (x) => esc(x || '—');

    const contatoParts = [cfg.telefone, cfg.email].filter(Boolean).map(esc);
    const contato = contatoParts.join(' &bull; ');
    const linha2Parts = [cfg.cidade, cfg.cnpj ? `CNPJ: ${cfg.cnpj}` : '', cfg.site].filter(Boolean).map(esc);
    const linha2 = linha2Parts.join(' &bull; ');

    const produtos = (os.produtos || []).filter((p) => (p.nome || '').trim() || toNum(p.custo));
    const servicos = (os.servicos || []).filter((s) => (s.descricao || '').trim() || toNum(s.valor));

    // Diagnóstico condicional baseado nas escolhas do usuário
    const diagItems = [];
    if (os.imprimirInformado !== false && (os.problemaInformado || '').trim()) {
      diagItems.push(`
        <div class="doc-diag-block">
          <div class="doc-diag-head">
            <span class="doc-diag-bullet"></span>
            <span class="doc-diag-label">PROBLEMA INFORMADO PELO CLIENTE</span>
          </div>
          <div class="doc-diag-content">${esc(os.problemaInformado)}</div>
        </div>`);
    }
    if (os.imprimirConstatado !== false && (os.problemaConstatado || '').trim()) {
      diagItems.push(`
        <div class="doc-diag-block">
          <div class="doc-diag-head">
            <span class="doc-diag-bullet"></span>
            <span class="doc-diag-label">CONSTATAÇÃO / DIAGNÓSTICO TÉCNICO</span>
          </div>
          <div class="doc-diag-content">${esc(os.problemaConstatado)}</div>
        </div>`);
    }
    if (os.imprimirExecutado !== false && (os.servicoExecutado || '').trim()) {
      diagItems.push(`
        <div class="doc-diag-block">
          <div class="doc-diag-head">
            <span class="doc-diag-bullet"></span>
            <span class="doc-diag-label">SERVIÇOS &amp; SOLUÇÃO EXECUTADA</span>
          </div>
          <div class="doc-diag-content">${esc(os.servicoExecutado)}</div>
        </div>`);
    }

    const blocoDiagnostico = diagItems.length ? `
      <div class="doc-card" style="margin-bottom:7px">
        <div class="doc-card-title">
          <span class="doc-title-bar"></span>
          <span>LAUDO TÉCNICO &amp; DETALHAMENTO</span>
        </div>
        <div class="doc-card-body doc-diag-container">
          ${diagItems.join('')}
        </div>
      </div>` : '';

    const tabelaProdutos = produtos.length ? `
      <div class="doc-card" style="margin-bottom:7px">
        <div class="doc-card-title">
          <span class="doc-title-bar"></span>
          <span>PEÇAS E MATERIAIS UTILIZADOS</span>
        </div>
        <table class="doc-table">
          <thead>
            <tr>
              <th style="width:28px" class="c">#</th>
              <th>DESCRIÇÃO DO ITEM / PEÇA</th>
              <th style="width:45px" class="c">QTD</th>
              <th style="width:110px" class="r">VALOR UNIT.</th>
              <th style="width:110px" class="r">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${produtos.map((p, i) => {
              const un = Calc.precoVenda(p);
              return `<tr>
                <td class="c text-muted">${i + 1}</td>
                <td class="bold">${esc(p.nome)}</td>
                <td class="c">${toNum(p.qtd)}</td>
                <td class="r">${money(un)}</td>
                <td class="r bold">${money(un * toNum(p.qtd))}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="r doc-tfoot-lbl">SUBTOTAL PEÇAS:</td>
              <td class="r doc-tfoot-val">${money(t.totalProdutos)}</td>
            </tr>
          </tfoot>
        </table>
      </div>` : '';

    const tabelaServicos = servicos.length ? `
      <div class="doc-card" style="margin-bottom:7px">
        <div class="doc-card-title">
          <span class="doc-title-bar"></span>
          <span>SERVIÇOS ESPECIALIZADOS PRESTADOS</span>
        </div>
        <table class="doc-table">
          <thead>
            <tr>
              <th style="width:28px" class="c">#</th>
              <th>DESCRIÇÃO DO SERVIÇO</th>
              <th style="width:45px" class="c">QTD</th>
              <th style="width:110px" class="r">VALOR UNIT.</th>
              <th style="width:110px" class="r">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${servicos.map((s, i) => `<tr>
              <td class="c text-muted">${i + 1}</td>
              <td class="bold">${esc(s.descricao)}</td>
              <td class="c">${toNum(s.qtd)}</td>
              <td class="r">${money(s.valor)}</td>
              <td class="r bold">${money(toNum(s.valor) * toNum(s.qtd))}</td>
            </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="r doc-tfoot-lbl">SUBTOTAL SERVIÇOS:</td>
              <td class="r doc-tfoot-val">${money(t.totalServicos)}</td>
            </tr>
          </tfoot>
        </table>
      </div>` : '';

    const validade = isOrc && cfg.validadeOrcamento
      ? `<strong>Validade da Proposta:</strong> Este orçamento é válido por ${esc(cfg.validadeOrcamento)} dias corridos a partir da data de emissão.`
      : '';

    let dataPorExtenso = '';
    try {
      dataPorExtenso = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    } catch {
      dataPorExtenso = fmtDate(new Date());
    }
    const localEData = [cfg.cidade, dataPorExtenso].filter(Boolean).join(', ');

    const acessoriosECondicoes = [
      eq.acessorios ? `Acessórios: ${eq.acessorios}` : '',
      eq.estado ? `Estado / Avarias: ${eq.estado}` : ''
    ].filter(Boolean).join(' | ') || 'Nenhum acessório ou avaria relatada na entrada';

    return `
    <div class="doc">
      <!-- 1. Topo: Banner elegante de ponta a ponta com logo integrada -->
      <header class="doc-header">
        <div class="doc-banner-full">
          <div class="doc-banner-logo">
            <img src="${esc(logoSrc())}" alt="${esc(cfg.empresa)}">
          </div>
          <div class="doc-banner-company">
            <h1 class="doc-company-name">${esc(cfg.empresa)}</h1>
            <div class="doc-company-details">
              <span class="doc-meta-item">${esc(cfg.endereco || 'Rua Padre Antonio de Souza Lima, 140, sala 05')}</span>
              ${contato ? `<span class="doc-meta-item">${contato}</span>` : ''}
              ${linha2 ? `<span class="doc-meta-item">${linha2}</span>` : ''}
            </div>
          </div>
          <div class="doc-banner-badge ${isOrc ? 'orc' : ''}">
            <span class="doc-badge-type">${isOrc ? 'PROPOSTA / ORÇAMENTO' : 'ORDEM DE SERVIÇO'}</span>
            <span class="doc-badge-num">Nº ${padNum(os.numero)}</span>
            <span class="doc-badge-meta">Emissão: ${fmtDate(new Date())}</span>
            <span class="doc-badge-status">${esc(STATUS[os.status]?.label || os.status)}</span>
          </div>
        </div>
      </header>

      <!-- 2. Estrutura em 2 Colunas Paralelas: Cliente & Equipamento -->
      <div class="doc-two-cols">
        <!-- Coluna 1: Dados do Cliente -->
        <div class="doc-card">
          <div class="doc-card-title">
            <span class="doc-title-bar"></span>
            <span>DADOS DO CLIENTE</span>
          </div>
          <div class="doc-card-body doc-grid-body">
            <div class="doc-cell full">
              <span class="doc-lbl">CLIENTE / RAZÃO SOCIAL</span>
              <span class="doc-val bold doc-val-primary">${v(cli.nome)}</span>
            </div>
            <div class="doc-cell-group g2">
              <div class="doc-cell">
                <span class="doc-lbl">CPF / CNPJ</span>
                <span class="doc-val">${v(cli.documento)}</span>
              </div>
              <div class="doc-cell">
                <span class="doc-lbl">TELEFONE / WHATSAPP</span>
                <span class="doc-val">${v([cli.telefone, cli.telefone2].filter(Boolean).join(' / '))}</span>
              </div>
            </div>
            <div class="doc-cell full">
              <span class="doc-lbl">E-MAIL DE CONTATO</span>
              <span class="doc-val">${v(cli.email)}</span>
            </div>
            <div class="doc-cell full">
              <span class="doc-lbl">ENDEREÇO COMPLETO</span>
              <span class="doc-val">${v(enderecoCompleto(cli))}</span>
            </div>
          </div>
        </div>

        <!-- Coluna 2: Dados do Equipamento & Prazos -->
        <div class="doc-card">
          <div class="doc-card-title">
            <span class="doc-title-bar"></span>
            <span>DADOS DO EQUIPAMENTO &amp; PRAZOS</span>
          </div>
          <div class="doc-card-body doc-grid-body">
            <div class="doc-cell-group g2">
              <div class="doc-cell">
                <span class="doc-lbl">EQUIPAMENTO / MARCA</span>
                <span class="doc-val bold">${v([eq.tipo, eq.marca].filter(Boolean).join(' &bull; '))}</span>
              </div>
              <div class="doc-cell">
                <span class="doc-lbl">MODELO</span>
                <span class="doc-val bold">${v(eq.modelo)}</span>
              </div>
            </div>
            <div class="doc-cell-group g2">
              <div class="doc-cell">
                <span class="doc-lbl">Nº DE SÉRIE / SERVICE TAG</span>
                <span class="doc-val mono bold doc-highlight-val">${v(eq.serie)}</span>
              </div>
              <div class="doc-cell">
                <span class="doc-lbl">TÉCNICO RESPONSÁVEL</span>
                <span class="doc-val">${v(os.tecnico)}</span>
              </div>
            </div>
            <div class="doc-cell-group g3 doc-dates-group">
              <div class="doc-cell">
                <span class="doc-lbl">ENTRADA</span>
                <span class="doc-val">${fmtDate(os.dataEntrada)}</span>
              </div>
              <div class="doc-cell">
                <span class="doc-lbl">PREVISÃO</span>
                <span class="doc-val">${fmtDate(os.dataPrevisao)}</span>
              </div>
              <div class="doc-cell">
                <span class="doc-lbl">SAÍDA / CONCLUSÃO</span>
                <span class="doc-val">${fmtDate(os.dataSaida)}</span>
              </div>
            </div>
            <div class="doc-cell full">
              <span class="doc-lbl">ACESSÓRIOS &amp; CONDIÇÕES DE ENTRADA</span>
              <span class="doc-val">${esc(acessoriosECondicoes)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Diagnóstico e Serviço Técnico -->
      ${blocoDiagnostico}

      <!-- 4. Tabelas de Itens -->
      ${tabelaProdutos}
      ${tabelaServicos}

      <!-- 5. Fechamento Comercial & Totais -->
      <div class="doc-closure">
        <div class="doc-terms-side">
          <div class="doc-card-title">
            <span class="doc-title-bar"></span>
            <span>CONDIÇÕES COMERCIAIS &amp; GARANTIA</span>
          </div>
          <div class="doc-closure-info">
            <div class="doc-terms-chips">
              <div class="doc-term-chip">
                <span class="doc-term-k">FORMA DE PAGAMENTO:</span>
                <span class="doc-term-v">${esc(os.formaPagamento) || 'A combinar'}</span>
              </div>
              <div class="doc-term-chip">
                <span class="doc-term-k">PRAZO DE GARANTIA:</span>
                <span class="doc-term-v">${esc(os.garantia) || '90 dias legais'}</span>
              </div>
            </div>
            ${validade ? `<div class="doc-validity-box">${validade}</div>` : ''}
            ${os.observacoes ? `
              <div class="doc-closure-obs">
                <span class="doc-lbl">OBSERVAÇÕES:</span>
                <p>${esc(os.observacoes)}</p>
              </div>` : ''}
            ${cfg.termos ? `
              <div class="doc-legal-terms">
                <span class="doc-legal-title">TERMOS GERAIS DE GARANTIA E RESPONSABILIDADE:</span>
                <p>${esc(cfg.termos)}</p>
              </div>` : ''}
          </div>
        </div>

        <div class="doc-totals-side">
          <div class="doc-totals-title">RESUMO FINANCEIRO</div>
          <div class="doc-tot-row">
            <span>Subtotal Peças:</span>
            <b>${money(t.totalProdutos)}</b>
          </div>
          <div class="doc-tot-row">
            <span>Subtotal Serviços:</span>
            <b>${money(t.totalServicos)}</b>
          </div>
          ${t.desconto ? `
            <div class="doc-tot-row discount">
              <span>Desconto Concedido:</span>
              <b>- ${money(t.desconto)}</b>
            </div>` : ''}
          <div class="doc-tot-grand ${isOrc ? 'orc' : ''}">
            <span class="doc-grand-lbl">${isOrc ? 'TOTAL DO ORÇAMENTO' : 'VALOR TOTAL A PAGAR'}</span>
            <span class="doc-grand-val">${money(t.total)}</span>
          </div>
        </div>
      </div>

      <!-- 6. Assinaturas Formais e Aceite -->
      <div class="doc-sign-wrapper">
        <div class="doc-acceptance-clause">
          ${isOrc
            ? 'Autorizo a execução dos serviços e o fornecimento de peças acima discriminados conforme os valores, prazos e condições comerciais descritos nesta proposta.'
            : 'Declaro ter recebido o equipamento acima discriminado em perfeitas condições de funcionamento e conferência, estando de acordo com os serviços prestados e peças aplicadas.'}
        </div>
        <div class="doc-date-city">
          ${esc(localEData)}
        </div>
        <div class="doc-sign-boxes">
          <div class="doc-sign-box">
            <div class="doc-sign-line"></div>
            <span class="doc-sign-name">${esc(cli.nome || 'CLIENTE / RESPONSÁVEL')}</span>
            <span class="doc-sign-sub">${cli.documento ? `CPF/CNPJ: ${esc(cli.documento)}` : 'Assinatura do Cliente'}</span>
          </div>
          <div class="doc-sign-box">
            <div class="doc-sign-line"></div>
            <span class="doc-sign-name">${esc(cfg.empresa)}</span>
            <span class="doc-sign-sub">${os.tecnico ? `Técnico: ${esc(os.tecnico)}` : 'Responsável Técnico / Sigasec'}</span>
          </div>
        </div>
      </div>

      <!-- 7. Rodapé -->
      <footer class="doc-page-footer">
        <span>${esc(cfg.empresa)} &bull; ${esc(cfg.endereco || 'Rua Padre Antonio de Souza Lima, 140, sala 05')} &bull; ${esc(cfg.email || 'suporte@sigasec.com.br')}</span>
        <span>${tipoLabel(os.tipo)} Nº ${padNum(os.numero)} &bull; Documento emitido em ${fmtDateTime(new Date())}</span>
      </footer>
    </div>`;
  },

  modal(osOrId, onDone) {
    const os = typeof osOrId === 'string' ? DB.ordem(osOrId) : osOrId;
    if (!os) return UI.toast('OS não encontrada.', 'error');
    UI.modal({
      title: `Imprimir ${tipoLabel(os.tipo)} Nº ${padNum(os.numero)}`,
      icon: 'printer',
      iconColor: 'orange',
      size: 'sm',
      body: `
        <div style="font-size:13px;color:var(--text-2);margin-bottom:14px">
          Selecione os campos técnicos a serem exibidos no PDF impresso:
        </div>
        <div class="print-options-list">
          <label class="print-opt-item">
            <input type="checkbox" id="pm-informado" ${os.imprimirInformado !== false ? 'checked' : ''}>
            <div>
              <b>Problema Informado pelo Cliente</b>
              <small>${esc(os.problemaInformado ? os.problemaInformado.slice(0, 65) + (os.problemaInformado.length > 65 ? '...' : '') : '(não preenchido)')}</small>
            </div>
          </label>
          <label class="print-opt-item">
            <input type="checkbox" id="pm-constatado" ${os.imprimirConstatado !== false ? 'checked' : ''}>
            <div>
              <b>Problema Constatado na Análise</b>
              <small>${esc(os.problemaConstatado ? os.problemaConstatado.slice(0, 65) + (os.problemaConstatado.length > 65 ? '...' : '') : '(não preenchido)')}</small>
            </div>
          </label>
          <label class="print-opt-item">
            <input type="checkbox" id="pm-executado" ${os.imprimirExecutado !== false ? 'checked' : ''}>
            <div>
              <b>Serviço Executado</b>
              <small>${esc(os.servicoExecutado ? os.servicoExecutado.slice(0, 65) + (os.servicoExecutado.length > 65 ? '...' : '') : '(não preenchido)')}</small>
            </div>
          </label>
        </div>`,
      actions: [
        { label: 'Cancelar', cls: 'btn-ghost' },
        {
          label: 'Gerar PDF', cls: 'btn-primary', icon: 'printer',
          onClick: (close, el) => {
            os.imprimirInformado = $('#pm-informado', el).checked;
            os.imprimirConstatado = $('#pm-constatado', el).checked;
            os.imprimirExecutado = $('#pm-executado', el).checked;
            DB.salvarOrdem(os);
            close();
            this.print(os);
            onDone?.();
          }
        }
      ]
    });
  },

  async print(osOrId) {
    const os = typeof osOrId === 'string' ? DB.ordem(osOrId) : osOrId;
    if (!os) return UI.toast('OS não encontrada.', 'error');
    const area = $('#print-area');
    area.innerHTML = this.html(os);
    const cli = DB.cliente(os.clienteId);
    await Promise.all($$('img', area).map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
    setTimeout(() => {
      const prevTitle = document.title;
      // O título vira o nome sugerido do arquivo PDF
      document.title = `${os.tipo === 'orc' ? 'Orcamento' : 'OS'} ${padNum(os.numero)}${cli ? ' - ' + cli.nome : ''}`;
      const actionBar = $('#action-bar');
      const prevBarDisplay = actionBar ? actionBar.style.display : null;
      if (actionBar) actionBar.style.display = 'none';

      const restore = () => {
        document.title = prevTitle;
        area.innerHTML = '';
        if (actionBar && prevBarDisplay !== null) actionBar.style.display = prevBarDisplay;
        window.removeEventListener('afterprint', restore);
      };
      window.addEventListener('afterprint', restore);
      window.print();
    }, 120);
  },
};
