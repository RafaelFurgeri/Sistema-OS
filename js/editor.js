/* =========================================================
   Editor de OS / Orçamento (nova + alterar)
   ========================================================= */
const Editor = {
  os: null,
  dirty: false,

  render(id, query) {
    const existing = id ? DB.ordem(id) : null;
    if (id && !existing) {
      UI.toast('OS não encontrada.', 'error');
      location.hash = '#/consultar';
      return;
    }
    this.os = existing ? JSON.parse(JSON.stringify(existing)) : DB.novaOrdem();
    this.dirty = false;
    const os = this.os;
    const isNew = !os.id;

    if (isNew && query) {
      if (query.get('tipo') === 'orc') os.tipo = 'orc';
      if (query.get('cliente') && DB.cliente(query.get('cliente'))) os.clienteId = query.get('cliente');
      if (query.get('produto')) {
        const pr = DB.produto(query.get('produto'));
        if (pr) {
          os.produtos.push({
            id: DB.uid(),
            nome: pr.nome,
            qtd: 1,
            custo: toNum(pr.custo),
            margem: toNum(pr.margem),
          });
        }
      }
    }

    App.setHeader(
      isNew ? 'Nova OS / Orçamento' : `${tipoLabel(os.tipo)} Nº ${padNum(os.numero)}`,
      isNew ? 'Preencha os dados para abrir um novo chamado ou orçamento' : `Criada em ${fmtDateTime(os.criadoEm)} • Última alteração em ${fmtDateTime(os.atualizadoEm)}`,
      `<a class="btn btn-ghost" href="#/consultar" id="btn-voltar">${icon('arrowLeft', 16)} Voltar</a>` +
      (!isNew ? `<button class="btn btn-danger" id="btn-excluir">${icon('trash', 16)} Excluir</button>` : '')
    );

    const fld = (path, label, { type = 'text', cls = '', ph = '', attrs = '' } = {}) =>
      `<div class="field ${cls}"><label for="f-${path}">${label}</label>
        <input class="input" id="f-${path}" data-f="${path}" type="${type}" value="${esc(getPath(os, path))}" placeholder="${esc(ph)}" ${attrs}></div>`;
    const txt = (path, label, { rows = 5, ph = '', cls = '' } = {}) =>
      `<div class="field ${cls}"><label for="f-${path}">${label}</label>
        <textarea class="textarea" id="f-${path}" data-f="${path}" rows="${rows}" placeholder="${esc(ph)}">${esc(getPath(os, path))}</textarea></div>`;

    App.view.innerHTML = `
      <datalist id="dl-margens">${MARGENS.map((m) => `<option value="${m}">`).join('')}</datalist>
      <datalist id="dl-produtos-cadastrados">${DB.produtos().map((p) => `<option value="${esc(p.nome)}">${p.codigo ? `[${esc(p.codigo)}] ` : ''}Custo: ${money(p.custo)} • Venda: ${money(Calc.precoVenda(p))}</option>`).join('')}</datalist>

      <!-- Identificação -->
      <section class="card">
        <div class="card-head">
          <div class="head-ic">${icon('file')}</div>
          <div><h2>Identificação</h2><small>Número, tipo, situação e datas</small></div>
          <div class="spacer"></div>
          <div class="segmented" id="seg-tipo">
            <button type="button" data-tipo="os" id="tipo-os">${icon('tool', 15)} Ordem de Serviço</button>
            <button type="button" data-tipo="orc" id="tipo-orc">${icon('clipboard', 15)} Orçamento</button>
          </div>
        </div>
        <div class="card-body">
          <div class="grid g-6">
            <div class="field"><span class="label">Número</span>
              <div class="os-number" style="padding-top:6px">${padNum(isNew ? DB.peekNumero() : os.numero)}${isNew ? '<small>prévia</small>' : ''}</div></div>
            <div class="field"><label for="f-status">Situação</label>
              <select class="select" id="f-status" data-f="status">
                ${Object.entries(STATUS).map(([k, s]) => `<option value="${k}" ${os.status === k ? 'selected' : ''}>${s.label}</option>`).join('')}
              </select></div>
            ${fld('dataEntrada', 'Data de entrada', { type: 'datetime-local' })}
            ${fld('dataPrevisao', 'Previsão de entrega', { type: 'datetime-local' })}
            ${fld('dataSaida', 'Data de saída', { type: 'datetime-local' })}
            ${fld('tecnico', 'Técnico responsável', { ph: 'Nome do técnico' })}
          </div>
        </div>
      </section>

      <!-- Cliente -->
      <section class="card" id="card-cliente">
        <div class="card-head">
          <div class="head-ic orange">${icon('user')}</div>
          <div><h2>Cliente</h2><small>Selecione um cliente cadastrado ou cadastre um novo</small></div>
        </div>
        <div class="card-body" id="cli-area"></div>
      </section>

      <!-- Equipamento -->
      <section class="card">
        <div class="card-head">
          <div class="head-ic orange">${icon('laptop')}</div>
          <div><h2>Dados do equipamento</h2><small>Identificação e condições do equipamento recebido</small></div>
        </div>
        <div class="card-body">
          <div class="grid g-4">
            <div class="field"><label for="f-equipamento.tipo">Tipo</label>
              <select class="select" id="f-equipamento.tipo" data-f="equipamento.tipo">
                ${TIPOS_EQUIP.map((t) => `<option ${os.equipamento.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
              </select></div>
            ${fld('equipamento.marca', 'Marca', { ph: 'Ex.: Dell, HP, Lenovo' })}
            ${fld('equipamento.modelo', 'Modelo', { ph: 'Ex.: Inspiron 15 3520' })}
            <div class="field"><label for="f-equipamento.serie">Nº de série</label>
              <input class="input" id="f-equipamento.serie" data-f="equipamento.serie" value="${esc(os.equipamento.serie)}" placeholder="S/N do equipamento" style="text-transform:uppercase">
              <div class="hint" id="serie-hint"></div></div>
            ${fld('equipamento.acessorios', 'Acessórios deixados', { cls: 'span-2', ph: 'Ex.: carregador, bolsa, mouse' })}
            ${fld('equipamento.estado', 'Estado / condições', { ph: 'Ex.: riscos na tampa' })}
            ${fld('equipamento.senha', 'Senha do equipamento', { ph: 'Não sai no PDF' })}
          </div>
        </div>
      </section>

      <!-- Diagnóstico -->
      <section class="card">
        <div class="card-head">
          <div class="head-ic green">${icon('stethoscope')}</div>
          <div><h2>Diagnóstico e serviço</h2><small>Relato do cliente, análise técnica e o que foi feito</small></div>
        </div>
        <div class="card-body">
          <div class="grid g-3">
            ${txt('problemaInformado', 'Problema informado', { ph: 'O que o cliente relatou...' })}
            ${txt('problemaConstatado', 'Problema constatado', { ph: 'O que foi identificado na análise técnica...' })}
            ${txt('servicoExecutado', 'Serviço executado', { ph: 'Descreva o serviço realizado...' })}
          </div>
        </div>
      </section>

      <!-- Produtos / Serviços / Valores -->
      <section class="card" id="card-itens">
        <div class="tabs" role="tablist">
          <button class="tab active" data-tab="produtos" id="tab-produtos">${icon('box', 16)} Produtos / Peças <span class="tab-val" data-t="totalProdutos"></span></button>
          <button class="tab" data-tab="servicos" id="tab-servicos">${icon('tool', 16)} Serviços <span class="tab-val" data-t="totalServicos"></span></button>
          <button class="tab" data-tab="valores" id="tab-valores">${icon('dollar', 16)} Valores <span class="tab-val" data-t="total"></span></button>
        </div>

        <div class="tab-panel active" data-panel="produtos">
          <div class="margin-bar">
            <span class="label row" style="gap:6px">${icon('percent', 15)} Margem de lucro padrão:</span>
            <div class="chips" id="margin-chips">${MARGENS.map((m) => `<button type="button" class="chip" data-m="${m}">${m}%</button>`).join('')}</div>
            <div class="input-group" style="width:125px">
              <input class="input num margin-input" id="margem-padrao" type="number" min="0" step="1" value="${toNum(os.margemPadrao)}" placeholder="0" aria-label="Margem padrão">
              <span class="addon">%</span></div>
            <button type="button" class="btn btn-sm" id="btn-aplicar-margem" title="Aplica a margem padrão em todos os produtos desta OS">${icon('check', 14)} Aplicar a todos</button>
          </div>
          <div class="table-wrap">
            <table class="table items-table">
              <thead><tr>
                <th>Produto / peça</th><th class="w-qtd c">Qtd</th><th class="w-money r">Custo unit.</th>
                <th class="w-margin c">Margem</th><th class="w-out r">Venda unit.</th><th class="w-out r">Total</th><th class="w-act"></th>
              </tr></thead>
              <tbody id="prod-body"></tbody>
            </table>
          </div>
          <div class="items-foot">
            <div class="row" style="gap:8px">
              <button type="button" class="btn btn-primary btn-sm" id="btn-add-prod">${icon('plus', 15)} Adicionar item avulso</button>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-catalogo-prod">${icon('box', 15)} Inserir do catálogo</button>
            </div>
            <div class="mini-stats">
              <div class="mini-stat"><small>Custo total</small><b data-t="custoProdutos"></b></div>
              <div class="mini-stat green"><small>Lucro nas peças</small><b data-t="lucroProdutos"></b></div>
              <div class="mini-stat orange"><small>Valor produtos</small><b data-t="totalProdutos"></b></div>
            </div>
          </div>
        </div>

        <div class="tab-panel" data-panel="servicos">
          <div class="table-wrap">
            <table class="table items-table">
              <thead><tr>
                <th>Descrição do serviço</th><th class="w-qtd c">Qtd</th><th class="w-money r">Valor unit.</th><th class="w-out r">Total</th><th class="w-act"></th>
              </tr></thead>
              <tbody id="serv-body"></tbody>
            </table>
          </div>
          <div class="items-foot">
            <button type="button" class="btn btn-primary btn-sm" id="btn-add-serv">${icon('plus', 15)} Adicionar serviço</button>
            <div class="mini-stats"><div class="mini-stat orange"><small>Valor serviços</small><b data-t="totalServicos"></b></div></div>
          </div>
        </div>

        <div class="tab-panel" data-panel="valores">
          <div class="card-body">
            <div class="totals-grid">
              <div class="total-card"><small>${icon('box', 13)} Valor produtos</small><b data-t="totalProdutos"></b></div>
              <div class="total-card"><small>${icon('tool', 13)} Valor serviços</small><b data-t="totalServicos"></b></div>
              <div class="total-card"><small>Desconto</small>
                <div class="input-group"><span class="addon left">R$</span>
                  <input class="input num big" id="f-desconto" type="number" min="0" step="0.01" value="${toNum(os.desconto) || ''}" placeholder="0,00"></div></div>
              <div class="total-card highlight"><small>Total a cobrar</small><b data-t="total"></b></div>
            </div>
            <div class="internal-box">
              <h4>${icon('eye', 15)} Informações internas — não aparecem no PDF</h4>
              <div class="mini-stats">
                <div class="mini-stat"><small>Custo das peças</small><b data-t="custoProdutos"></b></div>
                <div class="mini-stat green"><small>Lucro nas peças</small><b data-t="lucroProdutos"></b></div>
                <div class="mini-stat"><small>Margem média peças</small><b id="margem-media"></b></div>
                <div class="mini-stat green"><small>Lucro total (peças + serviços − desc.)</small><b data-t="lucroTotal"></b></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Informações complementares -->
      <section class="card">
        <div class="card-head">
          <div class="head-ic yellow">${icon('info')}</div>
          <div><h2>Informações complementares</h2><small>Saem no PDF</small></div>
        </div>
        <div class="card-body">
          <div class="grid g-3">
            ${fld('formaPagamento', 'Forma de pagamento', { ph: 'Ex.: PIX, cartão 3x, dinheiro' })}
            ${fld('garantia', 'Garantia', { cls: 'span-2' })}
            ${txt('observacoes', 'Observações', { rows: 3, cls: 'span-all', ph: 'Observações gerais para o cliente...' })}
          </div>
        </div>
      </section>`;

    // Barra fixa de totais e ações
    const bar = document.createElement('div');
    bar.className = 'action-bar';
    bar.id = 'action-bar';
    bar.innerHTML = `
      <div class="ab-stat"><small>Produtos</small><b data-t="totalProdutos"></b></div>
      <div class="ab-stat"><small>Serviços</small><b data-t="totalServicos"></b></div>
      <div class="sep"></div>
      <div class="ab-stat ab-total"><small>Total</small><b data-t="total"></b></div>
      <div class="ab-actions">
        ${!isNew && !isFinal(os) ? `<button class="btn" id="btn-finalizar">${icon('checkCircle', 16)} Finalizar</button>` : ''}
        <button class="btn" id="btn-salvar-imprimir">${icon('printer', 16)} Salvar e gerar PDF</button>
        <button class="btn btn-primary" id="btn-salvar">${icon('save', 16)} ${isNew ? 'Abrir OS' : 'Salvar alterações'}</button>
      </div>`;
    document.body.appendChild(bar);

    this.renderTipo();
    this.renderCliente();
    this.renderProdutos();
    this.renderServicos();
    this.renderMarginChips();
    this.checkSerie();
    this.refresh();
    this.bind();
  },

  /* ---------- Renderizações parciais ---------- */
  renderTipo() {
    $$('#seg-tipo button').forEach((b) => {
      b.classList.toggle('active', b.dataset.tipo === this.os.tipo);
      b.classList.toggle('orc', b.dataset.tipo === 'orc');
    });
    const btn = $('#btn-salvar');
    if (btn && !this.os.id) btn.innerHTML = `${icon('save', 16)} ${this.os.tipo === 'orc' ? 'Criar orçamento' : 'Abrir OS'}`;
  },

  renderMarginChips() {
    const m = toNum(this.os.margemPadrao);
    $$('#margin-chips .chip').forEach((c) => c.classList.toggle('active', toNum(c.dataset.m) === m));
  },

  renderCliente() {
    const area = $('#cli-area');
    const c = DB.cliente(this.os.clienteId);
    if (c) {
      const qtd = DB.ordensDoCliente(c.id).filter((o) => o.id !== this.os.id).length;
      area.innerHTML = `
        <div class="client-card">
          <div class="avatar lg">${esc(initials(c.nome))}</div>
          <div class="info">
            <h3>${esc(c.nome)}</h3>
            <div class="client-meta">
              ${c.documento ? `<span>${icon('idcard', 14)} ${esc(c.documento)}</span>` : ''}
              ${c.telefone ? `<span>${icon('phone', 14)} ${esc(c.telefone)}</span>` : ''}
              ${c.email ? `<span>${icon('mail', 14)} ${esc(c.email)}</span>` : ''}
              ${enderecoCompleto(c) ? `<span>${icon('pin', 14)} ${esc(enderecoCompleto(c))}</span>` : ''}
              <span>${icon('file', 14)} ${qtd} atendimento(s) anterior(es)</span>
            </div>
          </div>
          <div class="row">
            <button type="button" class="btn btn-sm" id="cli-editar">${icon('edit', 14)} Editar</button>
            <button type="button" class="btn btn-sm btn-ghost" id="cli-trocar">${icon('swap', 14)} Trocar</button>
          </div>
        </div>`;
      $('#cli-editar').onclick = () => ClienteForm.open(c, () => this.renderCliente());
      $('#cli-trocar').onclick = () => {
        this.os.clienteId = ''; this.dirty = true; this.renderCliente(); $('#cli-search')?.focus();
      };
      return;
    }

    area.innerHTML = `
      <div class="row" style="align-items:flex-start">
        <div class="combo">
          <div class="search-box">${icon('search')}
            <input class="input" id="cli-search" placeholder="Buscar cliente por nome, CPF/CNPJ ou telefone..." autocomplete="off"></div>
          <div class="combo-list" id="cli-list"></div>
        </div>
        <button type="button" class="btn btn-primary" id="cli-novo">${icon('userPlus', 16)} Cadastrar novo cliente</button>
      </div>`;

    const input = $('#cli-search');
    const list = $('#cli-list');
    let hl = 0, results = [];
    const draw = () => {
      const q = normalize(input.value.trim());
      const qd = onlyDigits(input.value);
      results = DB.clientes().filter((c) => !q ||
        normalize(c.nome).includes(q) ||
        (qd && (onlyDigits(c.documento).includes(qd) || onlyDigits(c.telefone).includes(qd))) ||
        normalize(c.email).includes(q)).slice(0, 8);
      hl = Math.min(hl, Math.max(results.length - 1, 0));
      list.innerHTML = results.length ? results.map((c, i) => `
        <div class="combo-item ${i === hl ? 'hl' : ''}" data-id="${c.id}">
          <div class="avatar">${esc(initials(c.nome))}</div>
          <div><div style="font-weight:600">${esc(c.nome)}</div>
          <div class="meta">${[c.documento, c.telefone, c.cidade].filter(Boolean).map(esc).join(' • ') || 'Sem dados adicionais'}</div></div>
        </div>`).join('')
        : `<div class="combo-empty">${DB.clientes().length ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}<br>
           <button type="button" class="btn btn-sm btn-primary" style="margin-top:10px" data-novo>${icon('userPlus', 14)} Cadastrar "${esc(input.value.trim() || 'novo cliente')}"</button></div>`;
      list.classList.add('open');
    };
    const select = (id) => {
      this.os.clienteId = id; this.dirty = true; this.renderCliente();
    };
    const novo = () => {
      const nome = input.value.trim();
      list.classList.remove('open');
      ClienteForm.open(nome ? { nome } : null, (c) => select(c.id));
    };
    input.addEventListener('focus', draw);
    input.addEventListener('input', () => { hl = 0; draw(); });
    input.addEventListener('blur', () => setTimeout(() => list.classList.remove('open'), 180));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { hl = Math.min(hl + 1, results.length - 1); draw(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { hl = Math.max(hl - 1, 0); draw(); e.preventDefault(); }
      if (e.key === 'Enter') { e.preventDefault(); if (results[hl]) select(results[hl].id); else novo(); }
      if (e.key === 'Escape') list.classList.remove('open');
    });
    list.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (e.target.closest('[data-novo]')) return novo();
      const it = e.target.closest('.combo-item');
      if (it) select(it.dataset.id);
    });
    $('#cli-novo').onclick = novo;
  },

  prodRow(p) {
    return `<tr data-id="${p.id}">
      <td><input class="input" data-p="nome" list="dl-produtos-cadastrados" value="${esc(p.nome)}" placeholder="Ex.: SSD 1TB Kingston NV2 (ou selecione do catálogo)" aria-label="Produto"></td>
      <td><input class="input num" type="number" min="0" step="1" data-p="qtd" value="${toNum(p.qtd)}" aria-label="Quantidade"></td>
      <td><div class="input-group"><span class="addon left">R$</span>
        <input class="input num" type="number" min="0" step="0.01" data-p="custo" value="${toNum(p.custo) || ''}" placeholder="0,00" aria-label="Custo"></div></td>
      <td><div class="input-group" style="min-width:98px"><input class="input num margin-input" type="number" min="0" step="1" data-p="margem" value="${toNum(p.margem)}" placeholder="0" aria-label="Margem"><span class="addon">%</span></div></td>
      <td class="ro" data-o="venda">${money(Calc.precoVenda(p))}</td>
      <td class="ro strong" data-o="total">${money(Calc.precoVenda(p) * toNum(p.qtd))}</td>
      <td><button type="button" class="icon-btn danger" data-del title="Remover">${icon('trash', 16)}</button></td>
    </tr>`;
  },

  servRow(s) {
    return `<tr data-id="${s.id}">
      <td><input class="input" data-s="descricao" value="${esc(s.descricao)}" placeholder="Ex.: Formatação com backup, limpeza interna..." aria-label="Serviço"></td>
      <td><input class="input num" type="number" min="0" step="1" data-s="qtd" value="${toNum(s.qtd)}" aria-label="Quantidade"></td>
      <td><div class="input-group"><span class="addon left">R$</span>
        <input class="input num" type="number" min="0" step="0.01" data-s="valor" value="${toNum(s.valor) || ''}" placeholder="0,00" aria-label="Valor"></div></td>
      <td class="ro strong" data-o="total">${money(toNum(s.valor) * toNum(s.qtd))}</td>
      <td><button type="button" class="icon-btn danger" data-del title="Remover">${icon('trash', 16)}</button></td>
    </tr>`;
  },

  renderProdutos() {
    const body = $('#prod-body');
    body.innerHTML = this.os.produtos.length
      ? this.os.produtos.map((p) => this.prodRow(p)).join('')
      : `<tr><td colspan="7"><div class="items-empty">${icon('box', 34)}<div>Nenhum produto adicionado.</div>
         <small>Cadastre a peça com o preço de custo — o preço de venda é calculado pela margem.</small></div></td></tr>`;
  },

  renderServicos() {
    const body = $('#serv-body');
    body.innerHTML = this.os.servicos.length
      ? this.os.servicos.map((s) => this.servRow(s)).join('')
      : `<tr><td colspan="5"><div class="items-empty">${icon('tool', 34)}<div>Nenhum serviço adicionado.</div>
         <small>Ex.: mão de obra, formatação, limpeza, instalação de software.</small></div></td></tr>`;
  },

  addProduto() {
    this.os.produtos.push({ id: DB.uid(), nome: '', qtd: 1, custo: 0, margem: toNum(this.os.margemPadrao) });
    this.dirty = true;
    this.renderProdutos();
    this.refresh();
    $$('#prod-body tr').pop()?.querySelector('[data-p="nome"]')?.focus();
  },

  addServico() {
    this.os.servicos.push({ id: DB.uid(), descricao: '', qtd: 1, valor: 0 });
    this.dirty = true;
    this.renderServicos();
    this.refresh();
    $$('#serv-body tr').pop()?.querySelector('[data-s="descricao"]')?.focus();
  },

  refresh() {
    const t = Calc.totais(this.os);
    $$('[data-t]').forEach((el) => { el.textContent = money(t[el.dataset.t]); });
    const mm = $('#margem-media');
    if (mm) mm.textContent = t.custoProdutos ? pct((t.lucroProdutos / t.custoProdutos) * 100) : '—';
  },

  checkSerie() {
    const hint = $('#serie-hint');
    if (!hint) return;
    const raw = (this.os.equipamento.serie || '').trim();
    const s = normalize(raw);
    if (!s) { hint.innerHTML = ''; return; }
    const prev = DB.ordens().filter((o) => o.id !== this.os.id && normalize(o.equipamento?.serie).trim() === s);
    hint.innerHTML = prev.length
      ? `<span style="color:var(--warning)">${icon('alert', 13)} ${prev.length} atendimento(s) anterior(es) com esta série — <a href="#/consultar?q=${encodeURIComponent(raw)}">ver atendimentos</a></span>`
      : '';
  },

  catalogoModal() {
    const prods = DB.produtos();
    UI.modal({
      title: 'Catálogo de Peças & Produtos',
      icon: 'box',
      iconColor: 'orange',
      size: 'lg',
      body: `
        <div style="margin-bottom:12px">
          <input class="input" id="cat-search" placeholder="Buscar peça por nome, código ou categoria..." autocomplete="off">
        </div>
        <div style="max-height:360px;overflow-y:auto">
          <table class="table">
            <thead>
              <tr>
                <th style="width:110px">Código</th>
                <th>Produto / Descrição</th>
                <th>Categoria</th>
                <th class="r">Custo</th>
                <th class="c">Margem</th>
                <th class="r">Venda</th>
                <th class="c">Estoque</th>
                <th style="width:90px"></th>
              </tr>
            </thead>
            <tbody id="cat-modal-body"></tbody>
          </table>
        </div>`,
      actions: [
        { label: 'Fechar', cls: 'btn-ghost' },
        {
          label: '+ Cadastrar novo produto', cls: 'btn-secondary', icon: 'plus',
          onClick: (close) => {
            close();
            ProdutoForm.open(null, () => this.catalogoModal());
          }
        }
      ],
      onMount: (el) => {
        const drawModal = () => {
          const q = normalize($('#cat-search', el).value).trim();
          const list = prods.filter((p) => !q || normalize([p.nome, p.codigo, p.categoria].join(' ')).includes(q));
          $('#cat-modal-body', el).innerHTML = list.length ? list.map((p) => `
            <tr>
              <td><span class="badge no-dot" style="font-family:monospace">${esc(p.codigo || '—')}</span></td>
              <td class="bold">${esc(p.nome)}</td>
              <td><span class="badge no-dot">${esc(p.categoria || 'Geral')}</span></td>
              <td class="r text-muted">${money(p.custo)}</td>
              <td class="c">${p.margem}%</td>
              <td class="r bold" style="color:var(--primary)">${money(Calc.precoVenda(p))}</td>
              <td class="c">${p.estoque || 1} ${esc(p.unidade || 'UN')}</td>
              <td>
                <button type="button" class="btn btn-sm btn-primary" data-sel-prod="${p.id}">
                  ${icon('plus', 13)} Inserir
                </button>
              </td>
            </tr>
          `).join('') : `<tr><td colspan="8" class="c muted" style="padding:20px">Nenhum produto encontrado.</td></tr>`;
        };
        $('#cat-search', el).addEventListener('input', drawModal);
        $('#cat-modal-body', el).addEventListener('click', (e) => {
          const btn = e.target.closest('[data-sel-prod]');
          if (!btn) return;
          const pr = DB.produto(btn.dataset.selProd);
          if (pr) {
            this.os.produtos.push({
              id: DB.uid(),
              nome: pr.nome,
              qtd: 1,
              custo: toNum(pr.custo),
              margem: toNum(pr.margem)
            });
            this.dirty = true;
            this.renderProdutos();
            this.refresh();
            UI.toast(`"${pr.nome}" inserido na OS.`);
          }
        });
        drawModal();
        $('#cat-search', el).focus();
      }
    });
  },

  /* ---------- Eventos ---------- */
  bind() {
    const view = App.view;

    // Campos simples
    $$('[data-f]', view).forEach((el) => {
      const handler = () => {
        let val = el.value;
        if (el.dataset.f === 'equipamento.serie') val = val.toUpperCase();
        setPath(this.os, el.dataset.f, val);
        this.dirty = true;
        if (el.dataset.f === 'equipamento.serie') this.checkSerieDebounced();
      };
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    });
    this.checkSerieDebounced = debounce(() => this.checkSerie(), 300);

    // Tipo OS / Orçamento
    $$('#seg-tipo button').forEach((b) => b.addEventListener('click', () => {
      this.os.tipo = b.dataset.tipo; this.dirty = true; this.renderTipo();
    }));

    // Abas
    $$('.tab', view).forEach((tab) => tab.addEventListener('click', () => {
      $$('.tab', view).forEach((t) => t.classList.toggle('active', t === tab));
      $$('.tab-panel', view).forEach((p) => p.classList.toggle('active', p.dataset.panel === tab.dataset.tab));
    }));

    // Margem padrão
    $('#margin-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      this.os.margemPadrao = toNum(chip.dataset.m);
      $('#margem-padrao').value = this.os.margemPadrao;
      this.dirty = true;
      this.renderMarginChips();
    });
    $('#margem-padrao').addEventListener('input', (e) => {
      this.os.margemPadrao = toNum(e.target.value); this.dirty = true; this.renderMarginChips();
    });
    $('#btn-aplicar-margem').addEventListener('click', () => {
      if (!this.os.produtos.length) return UI.toast('Adicione produtos primeiro.', 'info');
      this.os.produtos.forEach((p) => { p.margem = toNum(this.os.margemPadrao); });
      this.dirty = true;
      this.renderProdutos(); this.refresh();
      UI.toast(`Margem de ${pct(this.os.margemPadrao)} aplicada a ${this.os.produtos.length} produto(s).`);
    });

    // Produtos
    $('#btn-add-prod').addEventListener('click', () => this.addProduto());
    $('#btn-catalogo-prod')?.addEventListener('click', () => this.catalogoModal());
    const prodBody = $('#prod-body');
    prodBody.addEventListener('input', (e) => {
      const tr = e.target.closest('tr[data-id]');
      const key = e.target.dataset.p;
      if (!tr || !key) return;
      const p = this.os.produtos.find((x) => x.id === tr.dataset.id);
      p[key] = key === 'nome' ? e.target.value : toNum(e.target.value);

      // Auto-preenchimento inteligente se o nome bater com item do catálogo
      if (key === 'nome') {
        const val = e.target.value.trim().toLowerCase();
        const matched = DB.produtos().find((pr) => pr.nome.toLowerCase() === val || (pr.codigo && pr.codigo.toLowerCase() === val));
        if (matched) {
          p.custo = toNum(matched.custo);
          p.margem = toNum(matched.margem);
          const inpCusto = tr.querySelector('[data-p="custo"]');
          const inpMargem = tr.querySelector('[data-p="margem"]');
          if (inpCusto) inpCusto.value = p.custo ? p.custo.toFixed(2) : '';
          if (inpMargem) inpMargem.value = p.margem;
        }
      }

      $('[data-o="venda"]', tr).textContent = money(Calc.precoVenda(p));
      $('[data-o="total"]', tr).textContent = money(Calc.precoVenda(p) * toNum(p.qtd));
      this.dirty = true;
      this.refresh();
    });
    prodBody.addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]');
      if (!del) return;
      const id = del.closest('tr').dataset.id;
      this.os.produtos = this.os.produtos.filter((x) => x.id !== id);
      this.dirty = true;
      this.renderProdutos(); this.refresh();
    });
    prodBody.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); this.addProduto(); }
    });

    // Serviços
    $('#btn-add-serv').addEventListener('click', () => this.addServico());
    const servBody = $('#serv-body');
    servBody.addEventListener('input', (e) => {
      const tr = e.target.closest('tr[data-id]');
      const key = e.target.dataset.s;
      if (!tr || !key) return;
      const s = this.os.servicos.find((x) => x.id === tr.dataset.id);
      s[key] = key === 'descricao' ? e.target.value : toNum(e.target.value);
      $('[data-o="total"]', tr).textContent = money(toNum(s.valor) * toNum(s.qtd));
      this.dirty = true;
      this.refresh();
    });
    servBody.addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]');
      if (!del) return;
      const id = del.closest('tr').dataset.id;
      this.os.servicos = this.os.servicos.filter((x) => x.id !== id);
      this.dirty = true;
      this.renderServicos(); this.refresh();
    });
    servBody.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); this.addServico(); }
    });

    // Desconto
    $('#f-desconto').addEventListener('input', (e) => {
      this.os.desconto = toNum(e.target.value); this.dirty = true; this.refresh();
    });

    // Ações
    $('#btn-salvar').addEventListener('click', () => this.save());
    $('#btn-salvar-imprimir').addEventListener('click', () => this.save({ print: true }));
    $('#btn-finalizar')?.addEventListener('click', () => {
      const saved = this.save({ silent: true, stay: true });
      if (saved) Views.finalizarModal(saved.id, () => this.render(saved.id));
    });
    $('#btn-excluir')?.addEventListener('click', async () => {
      const ok = await UI.confirm('Excluir OS', `Tem certeza que deseja excluir a <b>${tipoLabel(this.os.tipo)} Nº ${padNum(this.os.numero)}</b>? Esta ação não pode ser desfeita.`, { okLabel: 'Excluir', danger: true });
      if (!ok) return;
      DB.excluirOrdem(this.os.id);
      this.dirty = false;
      UI.toast('OS excluída.');
      App.updateBadges();
      location.hash = '#/consultar';
    });
  },

  save({ print = false, silent = false, stay = false } = {}) {
    const os = this.os;
    if (!os.clienteId || !DB.cliente(os.clienteId)) {
      UI.toast('Selecione ou cadastre um cliente antes de salvar.', 'error');
      $('#card-cliente').scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => $('#cli-search')?.focus(), 400);
      return null;
    }
    if (!os.dataEntrada) os.dataEntrada = nowLocal();
    os.produtos = os.produtos.filter((p) => (p.nome || '').trim() || toNum(p.custo));
    os.servicos = os.servicos.filter((s) => (s.descricao || '').trim() || toNum(s.valor));
    if (isFinal(os) && !os.dataSaida) os.dataSaida = nowLocal();
    os.clienteSnapshot = { ...DB.cliente(os.clienteId) };

    const isNew = !os.id;
    const saved = DB.salvarOrdem(os);
    this.dirty = false;
    App.updateBadges();
    if (!silent) UI.toast(isNew ? `${tipoLabel(saved.tipo)} Nº ${padNum(saved.numero)} criada com sucesso!` : 'Alterações salvas.');
    if (print) Print.print(saved.id);
    if (stay) return saved;
    if (isNew) location.hash = `#/editar/${saved.id}`;
    else this.render(saved.id);
    return saved;
  },
};
