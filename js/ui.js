/* =========================================================
   Componentes de interface: toast, modal, confirmação,
   formulário de cliente
   ========================================================= */
const UI = {
  toast(msg, type = 'success') {
    const root = $('#toast-root');
    const el = document.createElement('div');
    const ic = { success: 'check', error: 'alert', info: 'info' }[type] || 'info';
    el.className = `toast ${type}`;
    el.innerHTML = `<div class="t-ic">${icon(ic, 16)}</div><div>${esc(msg)}</div>`;
    root.appendChild(el);
    setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 260); }, 3200);
  },

  /**
   * Abre um modal. Retorna { el, close }.
   * opts: { title, icon, body, size, actions: [{label, cls, icon, onClick(close)}], onMount(el, close) }
   */
  modal(opts) {
    const root = $('#modal-root');
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = `
      <div class="modal ${opts.size || ''}" role="dialog" aria-modal="true">
        <div class="modal-head">
          ${opts.icon ? `<div class="head-ic ${opts.iconColor || ''}">${icon(opts.icon)}</div>` : ''}
          <h3>${esc(opts.title || '')}</h3>
          <button class="icon-btn" data-close aria-label="Fechar">${icon('x')}</button>
        </div>
        <div class="modal-body">${opts.body || ''}</div>
        ${opts.actions?.length ? `<div class="modal-foot">${opts.actions.map((a, i) =>
          `<button class="btn ${a.cls || ''}" data-act="${i}">${a.icon ? icon(a.icon, 16) : ''}${esc(a.label)}</button>`).join('')}</div>` : ''}
      </div>`;
    const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
    $$('[data-close]', ov).forEach((b) => b.addEventListener('click', close));
    (opts.actions || []).forEach((a, i) => {
      $(`[data-act="${i}"]`, ov).addEventListener('click', () => (a.onClick ? a.onClick(close, ov) : close()));
    });
    document.addEventListener('keydown', onKey);
    root.appendChild(ov);
    opts.onMount?.(ov, close);
    setTimeout(() => $('input:not([type=hidden]):not([readonly]), textarea, select', $('.modal-body', ov))?.focus(), 50);
    return { el: ov, close };
  },

  confirm(title, message, { okLabel = 'Confirmar', danger = false } = {}) {
    return new Promise((resolve) => {
      let done = false;
      const m = UI.modal({
        title, size: 'sm',
        body: `<p style="margin:0;color:var(--text-2);line-height:1.6">${message}</p>`,
        actions: [
          { label: 'Cancelar', cls: 'btn-ghost', onClick: (close) => { done = true; resolve(false); close(); } },
          { label: okLabel, cls: danger ? 'btn-danger' : 'btn-primary', onClick: (close) => { done = true; resolve(true); close(); } },
        ],
      });
      const obs = new MutationObserver(() => { if (!document.body.contains(m.el)) { obs.disconnect(); if (!done) resolve(false); } });
      obs.observe($('#modal-root'), { childList: true });
    });
  },

  empty(ic, title, text, extra = '') {
    return `<div class="empty"><div class="empty-ic">${icon(ic, 28)}</div><h3>${esc(title)}</h3><p>${text}</p>${extra}</div>`;
  },
};

/* ---------- Formulário de cliente (modal reutilizável) ---------- */
const ClienteForm = {
  open(cliente, onSaved) {
    const c = Object.assign({ nome: '', documento: '', telefone: '', telefone2: '', email: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', observacoes: '' }, cliente || {});
    const f = (name, label, attrs = '', cls = '') =>
      `<div class="field ${cls}"><label for="cf-${name}">${label}</label><input class="input" id="cf-${name}" name="${name}" value="${esc(c[name])}" ${attrs}></div>`;
    UI.modal({
      title: c.id ? 'Editar cliente' : 'Cadastrar novo cliente',
      size: 'lg',
      body: `
        <form id="cliente-form" class="grid g-6" autocomplete="off">
          <div class="field span-4"><label for="cf-nome">Nome / Razão social <span class="req">*</span></label>
            <input class="input" id="cf-nome" name="nome" value="${esc(c.nome)}" required placeholder="Nome completo do cliente"></div>
          ${f('documento', 'CPF / CNPJ', 'data-mask="doc" placeholder="000.000.000-00" inputmode="numeric"', 'span-2')}
          ${f('telefone', 'Telefone / WhatsApp', 'data-mask="phone" placeholder="(00) 00000-0000" inputmode="tel"', 'span-2')}
          ${f('telefone2', 'Telefone 2', 'data-mask="phone" placeholder="(00) 0000-0000" inputmode="tel"', 'span-2')}
          ${f('email', 'E-mail', 'type="email" placeholder="cliente@email.com"', 'span-2')}
          ${f('cep', 'CEP', 'data-mask="cep" placeholder="00000-000" inputmode="numeric"', 'span-2')}
          ${f('endereco', 'Endereço', 'placeholder="Rua, avenida..."', 'span-3')}
          ${f('numero', 'Número', '', '')}
          ${f('complemento', 'Complemento', '', 'span-2')}
          ${f('bairro', 'Bairro', '', 'span-2')}
          ${f('cidade', 'Cidade', '', 'span-3')}
          ${f('uf', 'UF', 'maxlength="2" style="text-transform:uppercase"', '')}
          <div class="field span-all"><label for="cf-observacoes">Observações</label>
            <textarea class="textarea" id="cf-observacoes" name="observacoes" rows="2" style="min-height:60px">${esc(c.observacoes)}</textarea></div>
        </form>`,
      actions: [
        { label: 'Cancelar', cls: 'btn-ghost' },
        {
          label: c.id ? 'Salvar alterações' : 'Cadastrar cliente', cls: 'btn-primary', icon: 'save',
          onClick: (close, el) => {
            const form = $('#cliente-form', el);
            const fd = Object.fromEntries(new FormData(form).entries());
            if (!fd.nome.trim()) { UI.toast('Informe o nome do cliente.', 'error'); $('#cf-nome', el).focus(); return; }
            fd.nome = fd.nome.trim();
            fd.uf = (fd.uf || '').toUpperCase();
            const saved = DB.salvarCliente(Object.assign(c, fd));
            UI.toast(cliente?.id ? 'Cliente atualizado.' : 'Cliente cadastrado com sucesso.');
            close();
            onSaved?.(saved);
          },
        },
      ],
      onMount(el) {
        Mask.bind(el);
        $('#cliente-form', el).addEventListener('submit', (e) => e.preventDefault());
        // Busca automática de endereço pelo CEP (ViaCEP)
        $('#cf-cep', el).addEventListener('input', async (e) => {
          const cep = onlyDigits(e.target.value);
          if (cep.length !== 8) return;
          try {
            const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const j = await r.json();
            if (j.erro) return;
            const set = (n, v) => { const i = $(`#cf-${n}`, el); if (i && !i.value) i.value = v || ''; };
            set('endereco', j.logradouro); set('bairro', j.bairro); set('cidade', j.localidade); set('uf', j.uf);
            $('#cf-numero', el).focus();
          } catch { /* sem internet: ignora */ }
        });
      },
    });
  },
};

const enderecoCompleto = (c) => {
  if (!c) return '';
  const l1 = [c.endereco, c.numero].filter(Boolean).join(', ');
  const parts = [l1, c.complemento, c.bairro, [c.cidade, c.uf].filter(Boolean).join('/'), c.cep ? `CEP ${c.cep}` : ''].filter(Boolean);
  return parts.join(' — ');
};

/* ---------- Formulário de produto / peça (modal reutilizável) ---------- */
const ProdutoForm = {
  open(produto, onSaved) {
    const p = Object.assign({
      codigo: '',
      nome: '',
      categoria: 'Armazenamento',
      custo: '',
      margem: DB.config.margemPadrao || 30,
      estoque: 1,
      unidade: 'UN',
      observacoes: ''
    }, produto || {});

    UI.modal({
      title: p.id ? 'Editar Produto / Peça' : 'Cadastrar Novo Produto',
      icon: 'box',
      iconColor: 'orange',
      size: 'md',
      body: `
        <form id="produto-form" class="grid g-6" autocomplete="off">
          <div class="field span-4">
            <label for="pf-nome">Nome do Produto / Peça <span class="req">*</span></label>
            <input class="input" id="pf-nome" name="nome" value="${esc(p.nome)}" required placeholder="Ex: SSD 1TB Kingston NV2 M.2 NVMe">
          </div>
          <div class="field span-2">
            <label for="pf-codigo">Código / SKU / Ref.</label>
            <input class="input" id="pf-codigo" name="codigo" value="${esc(p.codigo)}" placeholder="Ex: SSD-1TB-NV2" style="text-transform:uppercase">
          </div>

          <div class="field span-3">
            <label for="pf-categoria">Categoria</label>
            <select class="input" id="pf-categoria" name="categoria">
              ${CATEGORIAS_PRODUTO.map((c) => `<option value="${esc(c)}" ${p.categoria === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
            </select>
          </div>

          <div class="field span-3">
            <label for="pf-unidade">Unidade</label>
            <select class="input" id="pf-unidade" name="unidade">
              ${['UN', 'PC', 'KIT', 'CX', 'MT', 'PAR'].map((u) => `<option value="${u}" ${p.unidade === u ? 'selected' : ''}>${u}</option>`).join('')}
            </select>
          </div>

          <div class="field span-2">
            <label for="pf-custo">Preço de Custo (R$) <span class="req">*</span></label>
            <input class="input" id="pf-custo" name="custo" type="number" step="0.01" min="0" value="${toNum(p.custo) || ''}" placeholder="0,00" required>
          </div>

          <div class="field span-2">
            <label for="pf-margem">Margem de Lucro (%)</label>
            <input class="input" id="pf-margem" name="margem" type="number" step="1" min="0" value="${p.margem != null ? p.margem : 30}" placeholder="30">
          </div>

          <div class="field span-2">
            <label for="pf-venda">Preço de Venda (R$)</label>
            <input class="input" id="pf-venda" name="precoVenda" type="number" step="0.01" min="0" value="${Calc.precoVenda(p) || ''}" placeholder="0,00" style="font-weight:700;color:var(--primary)">
          </div>

          <div class="field span-all" style="background:#181a20;border:1px solid #2a2d36;border-radius:var(--radius);padding:10px 14px;display:flex;align-items:center;justify-content:space-between">
            <span class="muted" style="font-size:12.5px">Lucro estimado por unidade:</span>
            <span id="pf-lucro-display" style="font-size:15px;font-weight:700;color:var(--success)">R$ 0,00</span>
          </div>

          <div class="field span-2">
            <label for="pf-estoque">Qtd em Estoque</label>
            <input class="input" id="pf-estoque" name="estoque" type="number" step="1" min="0" value="${p.estoque != null ? p.estoque : 1}" placeholder="1">
          </div>

          <div class="field span-4">
            <label for="pf-observacoes">Observações / Fornecedor</label>
            <input class="input" id="pf-observacoes" name="observacoes" value="${esc(p.observacoes)}" placeholder="Ex: Fornecedor, garantia, especificações técnicas">
          </div>
        </form>`,
      actions: [
        { label: 'Cancelar', cls: 'btn-ghost' },
        {
          label: p.id ? 'Salvar alterações' : 'Cadastrar produto',
          cls: 'btn-primary',
          icon: 'save',
          onClick: (close, el) => {
            const form = $('#produto-form', el);
            const fd = Object.fromEntries(new FormData(form).entries());
            if (!fd.nome.trim()) {
              UI.toast('Informe o nome do produto.', 'error');
              $('#pf-nome', el).focus();
              return;
            }
            fd.nome = fd.nome.trim();
            fd.codigo = (fd.codigo || '').trim().toUpperCase();
            fd.custo = toNum(fd.custo);
            fd.margem = toNum(fd.margem);
            fd.estoque = toNum(fd.estoque);
            const saved = DB.salvarProduto(Object.assign(p, fd));
            UI.toast(p.id ? 'Produto atualizado.' : 'Produto cadastrado com sucesso.');
            close();
            onSaved?.(saved);
          },
        },
      ],
      onMount(el) {
        const inpCusto = $('#pf-custo', el);
        const inpMargem = $('#pf-margem', el);
        const inpVenda = $('#pf-venda', el);
        const displayLucro = $('#pf-lucro-display', el);

        const recalcFromCustoMargem = () => {
          const c = toNum(inpCusto.value);
          const m = toNum(inpMargem.value);
          const v = round2(c * (1 + m / 100));
          inpVenda.value = v ? v.toFixed(2) : '';
          const l = round2(v - c);
          displayLucro.textContent = money(l);
          displayLucro.style.color = l >= 0 ? 'var(--success)' : 'var(--danger)';
        };

        const recalcFromVenda = () => {
          const c = toNum(inpCusto.value);
          const v = toNum(inpVenda.value);
          if (c > 0) {
            const m = Calc.margemDeVenda(c, v);
            inpMargem.value = m;
          }
          const l = round2(v - c);
          displayLucro.textContent = money(l);
          displayLucro.style.color = l >= 0 ? 'var(--success)' : 'var(--danger)';
        };

        inpCusto.addEventListener('input', recalcFromCustoMargem);
        inpMargem.addEventListener('input', recalcFromCustoMargem);
        inpVenda.addEventListener('input', recalcFromVenda);
        recalcFromCustoMargem();
      },
    });
  },
};

