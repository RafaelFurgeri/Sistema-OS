/* =========================================================
   Telas: início, listas, finalizar, rastrear série,
   clientes e configurações
   ========================================================= */
const Views = {};

/* ---------- Helpers comuns ---------- */
const equipLabel = (eq) => [eq?.tipo, eq?.marca, eq?.modelo].filter(Boolean).join(' • ') || '—';
const clienteNome = (o) => DB.cliente(o.clienteId)?.nome || o.clienteSnapshot?.nome || '—';
const totalOS = (o) => (o.totais || Calc.totais(o)).total;

const matchOS = (o, q) => {
  if (!q) return true;
  const n = normalize(q).trim();
  const digits = onlyDigits(q);
  const c = DB.cliente(o.clienteId) || o.clienteSnapshot || {};
  if (digits && (padNum(o.numero).includes(digits) || String(o.numero) === digits)) return true;
  const hay = normalize([
    c.nome, c.documento, c.telefone, c.email,
    o.equipamento?.tipo, o.equipamento?.marca, o.equipamento?.modelo, o.equipamento?.serie,
    o.problemaInformado, o.problemaConstatado, o.tecnico,
  ].join(' '));
  if (hay.includes(n)) return true;
  if (digits.length >= 4 && (onlyDigits(c.documento).includes(digits) || onlyDigits(c.telefone).includes(digits))) return true;
  return false;
};

const osActions = (o, { finalizar = true } = {}) => `
  <div class="actions">
    <button class="icon-btn primary" data-act="edit" data-id="${o.id}" title="Abrir / alterar">${icon('edit', 16)}</button>
    <button class="icon-btn" data-act="print" data-id="${o.id}" title="Gerar PDF">${icon('printer', 16)}</button>
    ${finalizar && !isFinal(o) ? `<button class="icon-btn success" data-act="finish" data-id="${o.id}" title="Finalizar / concluir">${icon('checkCircle', 16)}</button>` : ''}
  </div>`;

const bindOSActions = (root, onChange) => {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (btn) {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (btn.dataset.act === 'edit') location.hash = `#/editar/${id}`;
      if (btn.dataset.act === 'print') Print.modal(id);
      if (btn.dataset.act === 'finish') Views.finalizarModal(id, onChange);
      return;
    }
    const tr = e.target.closest('tr[data-row]');
    if (tr) location.hash = `#/editar/${tr.dataset.row}`;
  });
};

/* =========================================================
   Início (dashboard)
   ========================================================= */
Views.dashboard = () => {
  App.setHeader('Início', `Bem-vindo(a)! Hoje é ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}.`,
    `<a class="btn btn-primary" href="#/nova">${icon('plus', 16)} Nova OS / Orçamento</a>`);

  const ordens = DB.ordens();
  const pend = ordens.filter((o) => !isFinal(o));
  const aguard = ordens.filter((o) => o.status === 'aprovacao');
  const now = new Date();
  const doMes = ordens.filter((o) => ['concluida', 'entregue'].includes(o.status) && o.dataSaida &&
    new Date(o.dataSaida).getMonth() === now.getMonth() && new Date(o.dataSaida).getFullYear() === now.getFullYear());
  const fat = doMes.reduce((s, o) => s + totalOS(o), 0);
  const recentes = [...ordens].sort((a, b) => (b.atualizadoEm || '').localeCompare(a.atualizadoEm || '')).slice(0, 8);

  App.view.innerHTML = `
    <div class="stats">
      <a class="stat orange" href="#/pendentes"><div class="stat-ic">${icon('clock', 22)}</div><small>Pendentes</small><b>${pend.length}</b></a>
      <a class="stat yellow" href="#/pendentes?status=aprovacao"><div class="stat-ic">${icon('clipboard', 22)}</div><small>Aguardando aprovação</small><b>${aguard.length}</b></a>
      <a class="stat green" href="#/finalizados"><div class="stat-ic">${icon('checkCircle', 22)}</div><small>Concluídas no mês</small><b>${doMes.length}</b></a>
      <div class="stat orange-alt"><div class="stat-ic">${icon('trending', 22)}</div><small>Faturamento no mês</small><b>${money(fat)}</b></div>
    </div>

    <section class="card">
      <div class="card-head"><div class="head-ic orange">${icon('plus')}</div><div><h2>Ações rápidas</h2><small>Menu OS</small></div></div>
      <div class="card-body">
        <div class="quick-actions">
          <a class="qa" href="#/nova"><div class="qa-ic">${icon('tool')}</div><div><b>Nova Ordem de Serviço</b><small>Abrir chamado técnico</small></div></a>
          <a class="qa" href="#/nova?tipo=orc"><div class="qa-ic" style="background:var(--primary-soft);color:var(--primary)">${icon('clipboard')}</div><div><b>Novo Orçamento</b><small>Criar orçamento para cliente</small></div></a>
          <a class="qa" href="#/finalizar"><div class="qa-ic" style="background:var(--success-soft);color:var(--success)">${icon('checkCircle')}</div><div><b>Finalizar / Concluir</b><small>Encerrar OS pendentes</small></div></a>
          <a class="qa" href="#/consultar"><div class="qa-ic">${icon('search')}</div><div><b>Alterar / Consultar</b><small>Buscar qualquer OS</small></div></a>
          <a class="qa" href="#/produtos"><div class="qa-ic" style="background:var(--primary-soft);color:var(--primary)">${icon('box')}</div><div><b>Cadastrar Produtos</b><small>Peças, margens e estoque</small></div></a>
          <a class="qa" href="#/clientes?novo=1"><div class="qa-ic" style="background:var(--warning-soft);color:var(--warning)">${icon('userPlus')}</div><div><b>Cadastrar cliente</b><small>Novo cadastro</small></div></a>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><div class="head-ic orange">${icon('clock')}</div><div><h2>Movimentações recentes</h2><small>Últimas OS e orçamentos alterados</small></div>
        <div class="spacer"></div><a class="btn btn-sm btn-ghost" href="#/consultar">Ver todas</a></div>
      ${recentes.length ? `<div class="table-wrap"><table class="table" id="tbl-recentes">
        <thead><tr><th>Nº</th><th>Tipo</th><th>Cliente</th><th>Equipamento</th><th>Entrada</th><th>Situação</th><th class="r">Total</th><th></th></tr></thead>
        <tbody>${recentes.map((o) => `
          <tr class="clickable" data-row="${o.id}">
            <td class="os-num">${padNum(o.numero)}</td><td>${tipoBadge(o.tipo)}</td>
            <td class="cell-main">${esc(clienteNome(o))}</td>
            <td>${esc(equipLabel(o.equipamento))}</td>
            <td class="nowrap">${fmtDate(o.dataEntrada)}</td><td>${statusBadge(o.status)}</td>
            <td class="r money">${money(totalOS(o))}</td><td>${osActions(o)}</td>
          </tr>`).join('')}</tbody></table></div>`
        : UI.empty('file', 'Nenhuma OS cadastrada ainda', 'Comece abrindo sua primeira ordem de serviço ou orçamento.',
          `<a class="btn btn-primary" href="#/nova" style="margin-top:14px">${icon('plus', 16)} Nova OS / Orçamento</a>`)}
    </section>`;

  const tbl = $('#tbl-recentes');
  if (tbl) bindOSActions(tbl, () => Views.dashboard());
};

/* =========================================================
   Listas: consultar / pendentes / finalizados
   ========================================================= */
const OSList = {
  state: {},
  config: {
    todos: {
      title: 'Alterar / Consultar', sub: 'Pesquise qualquer OS ou orçamento por número, cliente, equipamento ou série',
      filter: () => true, statuses: Object.keys(STATUS), dateField: 'dataEntrada', dateLabel: 'Entrada',
    },
    pendentes: {
      title: 'Pesquisar Pendentes', sub: 'OS e orçamentos em aberto, em análise, aguardando ou em execução',
      filter: (o) => !isFinal(o), statuses: Object.keys(STATUS).filter((k) => !STATUS[k].final), dateField: 'dataEntrada', dateLabel: 'Entrada',
    },
    finalizados: {
      title: 'Pesquisar Finalizados', sub: 'OS concluídas, entregues, reprovadas ou canceladas',
      filter: (o) => isFinal(o), statuses: STATUS_FINAIS, dateField: 'dataSaida', dateLabel: 'Saída',
    },
  },

  render(mode, query) {
    const cfg = this.config[mode];
    const st = this.state[mode] = Object.assign({ q: '', tipo: '', status: '', de: '', ate: '' }, this.state[mode] || {});
    if (query?.get('status')) st.status = query.get('status');
    App.setHeader(cfg.title, cfg.sub, `<a class="btn btn-primary" href="#/nova">${icon('plus', 16)} Nova OS / Orçamento</a>`);

    App.view.innerHTML = `
      <section class="card">
        <div class="filters">
          <div class="field" style="flex:1;min-width:260px"><label for="fl-q">Pesquisar</label>
            <div class="search-box">${icon('search')}<input class="input" id="fl-q" value="${esc(st.q)}" placeholder="Nº da OS, cliente, CPF, telefone, marca, modelo, série..."></div></div>
          <div class="field"><label for="fl-tipo">Tipo</label>
            <select class="select" id="fl-tipo"><option value="">Todos</option>
              <option value="os" ${st.tipo === 'os' ? 'selected' : ''}>Ordem de Serviço</option>
              <option value="orc" ${st.tipo === 'orc' ? 'selected' : ''}>Orçamento</option></select></div>
          <div class="field"><label for="fl-status">Situação</label>
            <select class="select" id="fl-status"><option value="">Todas</option>
              ${cfg.statuses.map((k) => `<option value="${k}" ${st.status === k ? 'selected' : ''}>${STATUS[k].label}</option>`).join('')}</select></div>
          <div class="field"><label for="fl-de">${cfg.dateLabel} de</label><input class="input" type="date" id="fl-de" value="${st.de}"></div>
          <div class="field"><label for="fl-ate">até</label><input class="input" type="date" id="fl-ate" value="${st.ate}"></div>
          <button class="btn btn-ghost" id="fl-limpar" title="Limpar filtros">${icon('x', 16)} Limpar</button>
        </div>
        <div id="list-body"></div>
      </section>`;

    const draw = () => {
      const de = st.de ? new Date(st.de + 'T00:00') : null;
      const ate = st.ate ? new Date(st.ate + 'T23:59:59') : null;
      const list = DB.ordens().filter((o) => {
        if (!cfg.filter(o)) return false;
        if (st.tipo && o.tipo !== st.tipo) return false;
        if (st.status && o.status !== st.status) return false;
        const d = o[cfg.dateField] ? new Date(o[cfg.dateField]) : null;
        if (de && (!d || d < de)) return false;
        if (ate && (!d || d > ate)) return false;
        return matchOS(o, st.q);
      });
      const soma = list.reduce((s, o) => s + totalOS(o), 0);
      const body = $('#list-body');
      if (!list.length) {
        body.innerHTML = UI.empty('search', 'Nenhum resultado', DB.ordens().length ? 'Ajuste os filtros ou o termo da pesquisa.' : 'Ainda não há OS cadastradas.');
        return;
      }
      body.innerHTML = `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Nº</th><th>Tipo</th><th>Cliente</th><th>Equipamento</th><th>Entrada</th>
            <th>${mode === 'finalizados' ? 'Saída' : 'Previsão'}</th><th>Situação</th><th class="r">Total</th><th></th></tr></thead>
          <tbody>${list.map((o) => {
            const c = DB.cliente(o.clienteId) || o.clienteSnapshot || {};
            const atrasada = !isFinal(o) && o.dataPrevisao && new Date(o.dataPrevisao) < new Date();
            return `<tr class="clickable" data-row="${o.id}">
              <td class="os-num">${padNum(o.numero)}</td>
              <td>${tipoBadge(o.tipo)}</td>
              <td><div class="cell-main">${esc(c.nome || '—')}</div><div class="cell-sub">${esc(c.telefone || c.documento || '')}</div></td>
              <td><div>${esc(equipLabel(o.equipamento))}</div><div class="cell-sub">${o.equipamento?.serie ? 'S/N ' + esc(o.equipamento.serie) : ''}</div></td>
              <td class="nowrap">${fmtDate(o.dataEntrada)}</td>
              <td class="nowrap" ${atrasada ? 'style="color:var(--danger);font-weight:600" title="Previsão vencida"' : ''}>${fmtDate(mode === 'finalizados' ? o.dataSaida : o.dataPrevisao)}</td>
              <td>${statusBadge(o.status)}</td>
              <td class="r money">${money(totalOS(o))}</td>
              <td>${osActions(o)}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
        <div class="result-count"><span>${list.length} registro(s) encontrado(s)</span><span>Soma: <b style="color:var(--text)">${money(soma)}</b></span></div>`;
    };

    const bindF = (id, key, ev = 'input') => $(id).addEventListener(ev, debounce((e) => { st[key] = e.target.value; draw(); }, 120));
    bindF('#fl-q', 'q'); bindF('#fl-tipo', 'tipo', 'change'); bindF('#fl-status', 'status', 'change');
    bindF('#fl-de', 'de', 'change'); bindF('#fl-ate', 'ate', 'change');
    $('#fl-limpar').onclick = () => { this.state[mode] = null; this.render(mode); };
    bindOSActions($('#list-body'), () => { draw(); App.updateBadges(); });
    draw();
    $('#fl-q').focus();
  },
};

/* =========================================================
   Finalizar / Concluir
   ========================================================= */
Views.finalizar = (id) => {
  App.setHeader('Finalizar / Concluir', 'Selecione uma OS pendente para registrar o serviço executado e a data de saída');
  App.view.innerHTML = `
    <section class="card">
      <div class="filters">
        <div class="field" style="flex:1"><label for="fz-q">Localizar OS pendente</label>
          <div class="search-box">${icon('search')}<input class="input" id="fz-q" placeholder="Nº da OS, cliente, equipamento ou série..."></div></div>
      </div>
      <div id="fz-body"></div>
    </section>`;

  const draw = () => {
    const q = $('#fz-q').value;
    const list = DB.ordens().filter((o) => !isFinal(o) && matchOS(o, q));
    $('#fz-body').innerHTML = list.length ? `
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Nº</th><th>Tipo</th><th>Cliente</th><th>Equipamento</th><th>Entrada</th><th>Situação</th><th class="r">Total</th><th class="r">Ação</th></tr></thead>
        <tbody>${list.map((o) => `
          <tr>
            <td class="os-num">${padNum(o.numero)}</td><td>${tipoBadge(o.tipo)}</td>
            <td class="cell-main">${esc(clienteNome(o))}</td>
            <td>${esc(equipLabel(o.equipamento))}<div class="cell-sub">${o.equipamento?.serie ? 'S/N ' + esc(o.equipamento.serie) : ''}</div></td>
            <td class="nowrap">${fmtDate(o.dataEntrada)}</td><td>${statusBadge(o.status)}</td>
            <td class="r money">${money(totalOS(o))}</td>
            <td class="r"><div class="actions">
              <button class="icon-btn primary" data-open="${o.id}" title="Abrir OS">${icon('edit', 16)}</button>
              <button class="btn btn-success btn-sm" data-finish="${o.id}">${icon('check', 14)} Finalizar</button></div></td>
          </tr>`).join('')}</tbody>
      </table></div>
      <div class="result-count"><span>${list.length} OS pendente(s)</span></div>`
      : UI.empty('checkCircle', 'Nada pendente por aqui', q ? 'Nenhuma OS pendente corresponde à pesquisa.' : 'Todas as OS estão finalizadas. 🎉');
  };
  $('#fz-q').addEventListener('input', debounce(draw, 120));
  $('#fz-body').addEventListener('click', (e) => {
    const f = e.target.closest('[data-finish]');
    const o = e.target.closest('[data-open]');
    if (f) Views.finalizarModal(f.dataset.finish, draw);
    if (o) location.hash = `#/editar/${o.dataset.open}`;
  });
  draw();
  if (id) Views.finalizarModal(id, draw);
};

Views.finalizarModal = (id, onDone) => {
  const os = DB.ordem(id);
  if (!os) return UI.toast('OS não encontrada.', 'error');
  const t = Calc.totais(os);
  const opcoes = os.tipo === 'orc'
    ? ['concluida', 'entregue', 'reprovado', 'cancelada']
    : ['concluida', 'entregue', 'cancelada'];

  const finish = (close, el, print) => {
    const status = $('#fm-status', el).value;
    os.status = status;
    os.servicoExecutado = $('#fm-servico', el).value;
    os.dataSaida = $('#fm-saida', el).value || nowLocal();
    os.formaPagamento = $('#fm-pagto', el).value;
    os.clienteSnapshot = { ...(DB.cliente(os.clienteId) || os.clienteSnapshot || {}) };
    DB.salvarOrdem(os);
    App.updateBadges();
    UI.toast(`${tipoLabel(os.tipo)} Nº ${padNum(os.numero)} finalizada como "${STATUS[status].label}".`);
    close();
    if (print) Print.print(os.id);
    onDone?.();
  };

  UI.modal({
    title: `Finalizar ${tipoLabel(os.tipo)} Nº ${padNum(os.numero)}`,
    icon: 'checkCircle', iconColor: 'green',
    body: `
      <div class="client-card" style="margin-bottom:18px">
        <div class="avatar">${esc(initials(clienteNome(os)))}</div>
        <div class="info"><h3 style="font-size:15px;margin-bottom:4px">${esc(clienteNome(os))}</h3>
          <div class="client-meta"><span>${icon('laptop', 14)} ${esc(equipLabel(os.equipamento))}</span>
          ${os.equipamento?.serie ? `<span>${icon('barcode', 14)} ${esc(os.equipamento.serie)}</span>` : ''}
          <span>${icon('calendar', 14)} Entrada ${fmtDateTime(os.dataEntrada)}</span></div></div>
      </div>
      <div class="grid g-2">
        <div class="field"><label for="fm-status">Finalizar como</label>
          <select class="select" id="fm-status">${opcoes.map((k) => `<option value="${k}">${STATUS[k].label}</option>`).join('')}</select></div>
        <div class="field"><label for="fm-saida">Data de saída</label>
          <input class="input" type="datetime-local" id="fm-saida" value="${os.dataSaida || nowLocal()}"></div>
        <div class="field span-all"><label for="fm-servico">Serviço executado</label>
          <textarea class="textarea" id="fm-servico" rows="4" placeholder="Descreva o serviço realizado...">${esc(os.servicoExecutado)}</textarea></div>
        <div class="field span-all"><label for="fm-pagto">Forma de pagamento</label>
          <input class="input" id="fm-pagto" value="${esc(os.formaPagamento)}" placeholder="Ex.: PIX, dinheiro, cartão"></div>
      </div>
      <div class="totals-grid" style="grid-template-columns:repeat(3,1fr);margin-top:18px">
        <div class="total-card"><small>Produtos</small><b style="font-size:18px">${money(t.totalProdutos)}</b></div>
        <div class="total-card"><small>Serviços</small><b style="font-size:18px">${money(t.totalServicos)}</b></div>
        <div class="total-card highlight"><small>Total</small><b style="font-size:20px">${money(t.total)}</b></div>
      </div>
      <p class="muted" style="font-size:12px;margin:12px 0 0">Para alterar produtos ou valores, abra a OS completa.</p>`,
    actions: [
      { label: 'Cancelar', cls: 'btn-ghost' },
      { label: 'Concluir e gerar PDF', icon: 'printer', onClick: (c, el) => finish(c, el, true) },
      { label: 'Concluir', cls: 'btn-success', icon: 'check', onClick: (c, el) => finish(c, el, false) },
    ],
  });
};

/* =========================================================
   Produtos & Peças (Catálogo)
   ========================================================= */
Views.produtos = (query) => {
  App.setHeader(
    'Produtos & Peças',
    'Catálogo de produtos, peças e componentes para aplicação em Ordens de Serviço e Orçamentos',
    `<button class="btn btn-primary" id="btn-novo-produto">${icon('plus', 16)} Novo produto</button>`
  );

  App.view.innerHTML = `
    <!-- 1. Indicadores de Estoque e Margem -->
    <div class="stats" id="prod-metrics" style="margin-bottom:14px"></div>

    <!-- 2. Filtros e Pesquisa -->
    <section class="card">
      <div class="filters">
        <div class="field" style="flex:1">
          <label for="prod-q">Pesquisar produto</label>
          <div class="search-box">
            ${icon('search')}
            <input class="input" id="prod-q" placeholder="Nome, código/SKU, categoria ou observações...">
          </div>
        </div>
        <div class="field" style="width:200px">
          <label for="prod-cat">Categoria</label>
          <select class="input" id="prod-cat">
            <option value="">Todas as categorias</option>
            ${CATEGORIAS_PRODUTO.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="prod-body"></div>
    </section>`;

  const draw = () => {
    const q = normalize($('#prod-q').value).trim();
    const cat = $('#prod-cat').value;
    const all = DB.produtos();

    // Atualiza KPIs
    const totalItens = all.reduce((s, p) => s + (toNum(p.estoque) || 0), 0);
    const totalCusto = all.reduce((s, p) => s + ((toNum(p.estoque) || 1) * toNum(p.custo)), 0);
    const totalVenda = all.reduce((s, p) => s + ((toNum(p.estoque) || 1) * Calc.precoVenda(p)), 0);
    const mediaMargem = all.length ? Math.round(all.reduce((s, p) => s + toNum(p.margem), 0) / all.length) : 0;

    $('#prod-metrics').innerHTML = `
      <div class="stat orange">
        <div class="stat-ic">${icon('box', 22)}</div>
        <small>Produtos Cadastrados</small>
        <b>${all.length} <span style="font-size:12px;font-weight:400;color:var(--text-2)">(${totalItens} un)</span></b>
      </div>
      <div class="stat">
        <div class="stat-ic">${icon('dollar', 22)}</div>
        <small>Custo Total em Estoque</small>
        <b>${money(totalCusto)}</b>
      </div>
      <div class="stat green">
        <div class="stat-ic">${icon('trending', 22)}</div>
        <small>Valor Estimado Venda</small>
        <b>${money(totalVenda)}</b>
      </div>
      <div class="stat yellow">
        <div class="stat-ic">${icon('percent', 22)}</div>
        <small>Margem Média</small>
        <b>${mediaMargem}%</b>
      </div>`;

    const list = all.filter((p) => {
      if (cat && p.categoria !== cat) return false;
      if (!q) return true;
      return normalize([p.nome, p.codigo, p.categoria, p.observacoes].join(' ')).includes(q);
    });

    $('#prod-body').innerHTML = list.length ? `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th style="width:110px">Código / SKU</th>
              <th>Produto / Descrição</th>
              <th style="width:130px">Categoria</th>
              <th class="r" style="width:115px">Preço Custo</th>
              <th class="c" style="width:90px">Margem</th>
              <th class="r" style="width:125px">Preço Venda</th>
              <th class="c" style="width:85px">Estoque</th>
              <th style="width:140px"></th>
            </tr>
          </thead>
          <tbody>
            ${list.map((p) => {
              const unVenda = Calc.precoVenda(p);
              const lucro = round2(unVenda - toNum(p.custo));
              const baixoEstoque = toNum(p.estoque) <= 2;
              return `
              <tr>
                <td>
                  ${p.codigo ? `<span class="badge no-dot" style="font-family:monospace;letter-spacing:.03em">${esc(p.codigo)}</span>` : '<span class="text-muted">—</span>'}
                </td>
                <td>
                  <div class="cell-main bold">${esc(p.nome)}</div>
                  ${p.observacoes ? `<div class="cell-sub">${esc(p.observacoes)}</div>` : ''}
                </td>
                <td>
                  <span class="badge no-dot">${esc(p.categoria || 'Geral')}</span>
                </td>
                <td class="r nowrap text-muted">${money(p.custo)}</td>
                <td class="c nowrap">
                  <span class="badge no-dot" style="color:var(--text);font-weight:700">${toNum(p.margem)}%</span>
                </td>
                <td class="r nowrap">
                  <span class="bold" style="color:var(--primary);font-size:13.5px">${money(unVenda)}</span>
                  <div class="cell-sub" style="color:var(--success);font-size:11px">+${money(lucro)} un</div>
                </td>
                <td class="c nowrap">
                  <span class="badge no-dot ${baixoEstoque ? 'st-analise' : ''}">
                    ${toNum(p.estoque)} ${esc(p.unidade || 'UN')}
                  </span>
                </td>
                <td>
                  <div class="actions">
                    <a class="btn btn-sm btn-ghost" href="#/nova?produto=${p.id}" title="Abrir nova OS com este produto">${icon('plus', 13)} OS</a>
                    <button class="icon-btn primary" data-edit="${p.id}" title="Editar produto">${icon('edit', 16)}</button>
                    <button class="icon-btn danger" data-del="${p.id}" title="Excluir produto">${icon('trash', 16)}</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="result-count"><span>${list.length} produto(s) exibido(s)</span></div>`
      : UI.empty('box', all.length ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado',
          all.length ? 'Tente outro termo de pesquisa ou altere a categoria.' : 'Cadastre suas peças e produtos para agilizar o preenchimento de Ordens de Serviço.');
  };

  $('#prod-q').addEventListener('input', debounce(draw, 120));
  $('#prod-cat').addEventListener('change', draw);
  $('#btn-novo-produto').onclick = () => ProdutoForm.open(null, draw);

  $('#prod-body').addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (ed) {
      const p = DB.produto(ed.dataset.edit);
      if (p) ProdutoForm.open(p, draw);
    }
    if (del) {
      const p = DB.produto(del.dataset.del);
      if (!p) return;
      const ok = await UI.confirm('Excluir produto', `Deseja excluir o produto <b>${esc(p.nome)}</b> do catálogo?`, { okLabel: 'Excluir', danger: true });
      if (ok) {
        DB.excluirProduto(p.id);
        UI.toast('Produto excluído com sucesso.');
        draw();
      }
    }
  });

  draw();
  if (query?.get('novo')) ProdutoForm.open(null, draw);
};


/* =========================================================
   Clientes
   ========================================================= */
Views.clientes = (query) => {
  App.setHeader('Clientes', 'Cadastro de clientes', `<button class="btn btn-primary" id="btn-novo-cliente">${icon('userPlus', 16)} Novo cliente</button>`);
  App.view.innerHTML = `
    <section class="card">
      <div class="filters">
        <div class="field" style="flex:1"><label for="cl-q">Pesquisar</label>
          <div class="search-box">${icon('search')}<input class="input" id="cl-q" placeholder="Nome, CPF/CNPJ, telefone, e-mail ou cidade..."></div></div>
      </div>
      <div id="cl-body"></div>
    </section>`;

  const draw = () => {
    const q = normalize($('#cl-q').value).trim();
    const qd = onlyDigits($('#cl-q').value);
    const list = DB.clientes().filter((c) => !q || normalize([c.nome, c.email, c.cidade, c.documento, c.telefone].join(' ')).includes(q) ||
      (qd && (onlyDigits(c.documento).includes(qd) || onlyDigits(c.telefone).includes(qd))));
    $('#cl-body').innerHTML = list.length ? `
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Cliente</th><th>CPF / CNPJ</th><th>Telefone</th><th>Cidade</th><th class="c">OS</th><th></th></tr></thead>
        <tbody>${list.map((c) => {
          const n = DB.ordensDoCliente(c.id).length;
          return `<tr>
            <td><div class="row" style="flex-wrap:nowrap"><div class="avatar">${esc(initials(c.nome))}</div>
              <div><div class="cell-main">${esc(c.nome)}</div><div class="cell-sub">${esc(c.email || '')}</div></div></div></td>
            <td class="nowrap">${esc(c.documento || '—')}</td>
            <td class="nowrap">${esc(c.telefone || '—')}</td>
            <td>${esc([c.cidade, c.uf].filter(Boolean).join('/') || '—')}</td>
            <td class="c"><span class="badge no-dot">${n}</span></td>
            <td><div class="actions">
              <a class="btn btn-sm" href="#/nova?cliente=${c.id}" title="Abrir nova OS para este cliente">${icon('plus', 14)} Nova OS</a>
              <button class="icon-btn primary" data-edit="${c.id}" title="Editar">${icon('edit', 16)}</button>
              <button class="icon-btn danger" data-del="${c.id}" title="Excluir">${icon('trash', 16)}</button></div></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
      <div class="result-count"><span>${list.length} cliente(s)</span></div>`
      : UI.empty('users', DB.clientes().length ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado',
        DB.clientes().length ? 'Tente outro termo de pesquisa.' : 'Cadastre seu primeiro cliente para começar.');
  };

  $('#cl-q').addEventListener('input', debounce(draw, 120));
  $('#btn-novo-cliente').onclick = () => ClienteForm.open(null, draw);
  $('#cl-body').addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (ed) ClienteForm.open(DB.cliente(ed.dataset.edit), draw);
    if (del) {
      const c = DB.cliente(del.dataset.del);
      if (DB.ordensDoCliente(c.id).length) return UI.toast('Este cliente possui OS vinculadas e não pode ser excluído.', 'error');
      const ok = await UI.confirm('Excluir cliente', `Deseja excluir <b>${esc(c.nome)}</b>?`, { okLabel: 'Excluir', danger: true });
      if (ok && DB.excluirCliente(c.id)) { UI.toast('Cliente excluído.'); draw(); }
    }
  });
  draw();
  if (query?.get('novo')) ClienteForm.open(null, draw);
};

/* =========================================================
   Configurações
   ========================================================= */
Views.config = () => {
  const cfg = DB.config;
  App.setHeader('Configurações', 'Dados da empresa, logo do PDF, padrões e backup');
  const f = (name, label, attrs = '', cls = '') =>
    `<div class="field ${cls}"><label for="cfg-${name}">${label}</label><input class="input" id="cfg-${name}" name="${name}" value="${esc(cfg[name])}" ${attrs}></div>`;

  App.view.innerHTML = `
    <div class="two-col">
      <div>
        <section class="card">
          <div class="card-head"><div class="head-ic">${icon('building')}</div><div><h2>Dados da empresa</h2><small>Aparecem no topo do PDF</small></div></div>
          <form class="card-body grid g-2" id="form-empresa">
            ${f('empresa', 'Nome da empresa', '', 'span-all')}
            ${f('endereco', 'Endereço', '', 'span-all')}
            ${f('cidade', 'Cidade / UF / CEP', 'placeholder="Ex.: São Paulo/SP — CEP 00000-000"')}
            ${f('telefone', 'Telefone / WhatsApp', 'data-mask="phone"')}
            ${f('email', 'E-mail', 'type="email"')}
            ${f('cnpj', 'CNPJ', 'data-mask="doc"')}
            ${f('site', 'Site', 'placeholder="www.sigasec.com.br"', 'span-all')}
          </form>
        </section>

        <section class="card">
          <div class="card-head"><div class="head-ic orange">${icon('image')}</div><div><h2>Logo</h2><small>Usada no menu e no cabeçalho do PDF</small></div></div>
          <div class="card-body">
            <div class="logo-preview ${logoIsCustom() ? 'custom' : ''}" id="logo-preview"><img src="${esc(logoSrc())}" alt="Logo"></div>
            <div class="row" style="margin-top:14px">
              <input type="file" accept="image/*" class="file-input" id="logo-file">
              <button class="btn" id="btn-logo">${icon('upload', 16)} Enviar outra logo</button>
              ${logoIsCustom() ? `<button class="btn btn-ghost" id="btn-logo-reset">Restaurar logo padrão</button>` : ''}
            </div>
          </div>
        </section>
      </div>

      <div>
        <section class="card">
          <div class="card-head"><div class="head-ic green">${icon('percent')}</div><div><h2>Padrões das OS</h2><small>Valores sugeridos ao abrir uma nova OS</small></div></div>
          <form class="card-body grid g-2" id="form-padroes">
            <div class="field"><label for="cfg-margemPadrao">Margem de lucro padrão</label>
              <div class="input-group"><input class="input num" type="number" min="0" step="1" id="cfg-margemPadrao" name="margemPadrao" value="${toNum(cfg.margemPadrao)}"><span class="addon">%</span></div></div>
            <div class="field"><label for="cfg-validadeOrcamento">Validade do orçamento</label>
              <div class="input-group"><input class="input num" type="number" min="0" step="1" id="cfg-validadeOrcamento" name="validadeOrcamento" value="${toNum(cfg.validadeOrcamento)}"><span class="addon">dias</span></div></div>
            <div class="field"><label for="cfg-proximo">Próximo número de OS</label>
              <input class="input num" type="number" min="1" step="1" id="cfg-proximo" value="${DB.peekNumero()}">
              <span class="hint">Útil para continuar a numeração de um sistema antigo.</span></div>
            <div class="field"><span class="label">&nbsp;</span></div>
            ${f('garantiaPadrao', 'Garantia padrão', '', 'span-all')}
            <div class="field span-all"><label for="cfg-termos">Termos / condições (rodapé do PDF)</label>
              <textarea class="textarea" id="cfg-termos" name="termos" rows="5">${esc(cfg.termos)}</textarea></div>
          </form>
        </section>

        <section class="card">
          <div class="card-head"><div class="head-ic orange">${icon('database')}</div><div><h2>Backup dos dados</h2><small>Os dados ficam salvos neste navegador — faça backups periódicos</small></div></div>
          <div class="card-body">
            <div class="row">
              <button class="btn" id="btn-export">${icon('download', 16)} Exportar backup</button>
              <input type="file" accept="application/json,.json" class="file-input" id="import-file">
              <button class="btn" id="btn-import">${icon('upload', 16)} Restaurar backup</button>
              <button class="btn btn-danger" id="btn-clear" style="margin-left:auto">${icon('trash', 16)} Apagar tudo</button>
            </div>
            <p class="muted" style="font-size:12.5px;margin:14px 0 0">${DB.ordens().length} OS/orçamento(s) e ${DB.clientes().length} cliente(s) armazenados.</p>
          </div>
        </section>
      </div>
    </div>
    <div class="row end"><button class="btn btn-primary btn-lg" id="btn-salvar-config">${icon('save', 16)} Salvar configurações</button></div>`;

  Mask.bind(App.view);
  $$('form', App.view).forEach((fm) => fm.addEventListener('submit', (e) => e.preventDefault()));

  $('#btn-salvar-config').onclick = () => {
    const data = {
      ...Object.fromEntries(new FormData($('#form-empresa')).entries()),
      ...Object.fromEntries(new FormData($('#form-padroes')).entries()),
    };
    data.margemPadrao = toNum(data.margemPadrao);
    data.validadeOrcamento = toNum(data.validadeOrcamento);
    DB.saveConfig(data);
    const prox = parseInt($('#cfg-proximo').value, 10);
    if (prox && prox !== DB.peekNumero()) {
      const real = DB.setProximoNumero(prox);
      if (real !== prox) UI.toast(`O próximo número foi ajustado para ${padNum(real)} (já existem OS com números maiores).`, 'info');
    }
    App.renderBrand();
    UI.toast('Configurações salvas.');
  };

  // Logo
  $('#btn-logo').onclick = () => $('#logo-file').click();
  $('#logo-file').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 900;
        const scale = Math.min(1, max / img.width);
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * scale);
        cv.height = Math.round(img.height * scale);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        DB.saveConfig({ logo: cv.toDataURL('image/png') });
        App.renderBrand();
        UI.toast('Logo atualizada.');
        Views.config();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };
  $('#btn-logo-reset')?.addEventListener('click', () => {
    DB.saveConfig({ logo: '' }); App.renderBrand(); UI.toast('Logo padrão restaurada.'); Views.config();
  });

  // Backup
  $('#btn-export').onclick = () => {
    const blob = new Blob([DB.exportar()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup-sigasec-os-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    UI.toast('Backup exportado.');
  };
  $('#btn-import').onclick = () => $('#import-file').click();
  $('#import-file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ok = await UI.confirm('Restaurar backup', 'Os dados atuais serão <b>substituídos</b> pelos dados do arquivo. Deseja continuar?', { okLabel: 'Restaurar', danger: true });
    if (!ok) return;
    try {
      DB.importar(await file.text());
      App.renderBrand(); App.updateBadges();
      UI.toast('Backup restaurado com sucesso.');
      Views.config();
    } catch (err) {
      UI.toast(err.message || 'Arquivo inválido.', 'error');
    }
  };
  $('#btn-clear').onclick = async () => {
    const ok = await UI.confirm('Apagar todos os dados', 'Todas as OS, clientes e configurações serão <b>apagados permanentemente</b>. Recomendamos exportar um backup antes. Continuar?', { okLabel: 'Apagar tudo', danger: true });
    if (!ok) return;
    DB.limparTudo(); App.renderBrand(); App.updateBadges();
    UI.toast('Dados apagados.');
    Views.config();
  };
};
