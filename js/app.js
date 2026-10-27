/* =========================================================
   App: navegação (rotas por hash), menu e inicialização
   ========================================================= */
const NAV = [
  { section: 'Geral' },
  { key: 'inicio', href: '#/inicio', icon: 'home', label: 'Início' },
  { section: 'Menu OS' },
  { key: 'nova', href: '#/nova', icon: 'plus', label: 'Nova OS / Orçamento', cta: true },
  { key: 'consultar', href: '#/consultar', icon: 'search', label: 'Alterar / Consultar' },
  { key: 'finalizar', href: '#/finalizar', icon: 'checkCircle', label: 'Finalizar / Concluir' },
  { key: 'pendentes', href: '#/pendentes', icon: 'clock', label: 'Pesquisar Pendentes', badge: 'badge-pendentes' },
  { key: 'finalizados', href: '#/finalizados', icon: 'archive', label: 'Pesquisar Finalizados' },
  { section: 'Cadastros' },
  { key: 'clientes', href: '#/clientes', icon: 'users', label: 'Clientes' },
  { key: 'produtos', href: '#/produtos', icon: 'box', label: 'Produtos' },
  { key: 'config', href: '#/config', icon: 'settings', label: 'Configurações' },
];

const App = {
  view: null,
  lastHash: '',
  skipNext: false,
  currentRoute: '',

  routes: {
    inicio: () => Views.dashboard(),
    nova: (p, q) => Editor.render(null, q),
    editar: (p) => Editor.render(p[0]),
    consultar: (p, q) => OSList.render('todos', q),
    pendentes: (p, q) => OSList.render('pendentes', q),
    finalizados: (p, q) => OSList.render('finalizados', q),
    finalizar: (p) => Views.finalizar(p[0]),
    serie: () => location.replace('#/consultar'),
    clientes: (p, q) => Views.clientes(q),
    produtos: (p, q) => Views.produtos(q),
    config: () => Views.config(),
  },

  navKey(route) {
    return { editar: 'consultar' }[route] || route;
  },

  init() {
    this.view = $('#view');
    this.renderNav();
    this.renderBrand();
    this.updateBadges();

    window.addEventListener('hashchange', () => this.route());
    window.addEventListener('beforeunload', (e) => {
      if (this.currentRoute.match(/^(nova|editar)$/) && Editor.dirty) { e.preventDefault(); e.returnValue = ''; }
    });
    $('#menu-toggle')?.addEventListener('click', () => $('#sidebar')?.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 960 && !e.target.closest('#sidebar') && !e.target.closest('#menu-toggle')) $('#sidebar')?.classList.remove('open');
    });

    if (!location.hash) location.replace('#/inicio');
    this.route();
  },

  renderNav() {
    $('#nav').innerHTML = NAV.map((n) => n.section
      ? `<span class="nav-section-tag">${n.section}</span>`
      : `<a href="${n.href}" data-key="${n.key}" id="nav-${n.key}" class="${n.cta ? 'nav-cta' : ''}">${icon(n.icon)}<span>${n.label}</span>${n.badge ? `<span class="badge count" id="${n.badge}" hidden></span>` : ''}</a>`
    ).join('');
    $('#nav').addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      if (a.getAttribute('href') === location.hash) { e.preventDefault(); this.route(true); }
    });
  },

  renderBrand() {
    const box = $('#brand-logo');
    if (box) {
      box.classList.toggle('custom', logoIsCustom());
      box.innerHTML = `<img src="${esc(logoSrc())}" alt="${esc(DB.config.empresa)}">`;
    }
    const foot = $('#banner-foot') || $('#sidebar-foot');
    if (foot) foot.innerHTML = `${esc(DB.config.endereco)} &bull; ${esc(DB.config.email)}`;
  },

  updateBadges() {
    const n = DB.ordens().filter((o) => !isFinal(o)).length;
    const b = $('#badge-pendentes');
    if (b) { b.textContent = n; b.hidden = !n; }
  },

  setHeader(title, sub = '', actions = '') {
    $('#page-title').textContent = title;
    $('#page-sub').textContent = sub;
    $('#topbar-actions').innerHTML = actions;
    document.title = `${title} — Sigasec OS`;
  },

  route(force = false) {
    if (this.skipNext) { this.skipNext = false; return; }
    const hash = location.hash || '#/inicio';

    // Proteção contra perda de alterações no editor
    if (!force && hash !== this.lastHash && /^(nova|editar)$/.test(this.currentRoute) && Editor.dirty) {
      if (!confirm('Existem alterações não salvas nesta OS. Deseja sair sem salvar?')) {
        this.skipNext = true;
        location.hash = this.lastHash;
        return;
      }
    }
    if (force && /^(nova|editar)$/.test(this.currentRoute) && Editor.dirty &&
        !confirm('Existem alterações não salvas nesta OS. Deseja descartar?')) return;
    Editor.dirty = false;

    const [pathPart, queryPart] = hash.replace(/^#\/?/, '').split('?');
    const [name, ...params] = pathPart.split('/');
    const handler = this.routes[name] || this.routes.inicio;
    this.currentRoute = this.routes[name] ? name : 'inicio';
    this.lastHash = hash;

    $('#action-bar')?.remove();
    $('#modal-root').innerHTML = '';
    const key = this.navKey(this.currentRoute);
    $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.key === key));

    this.view.style.animation = 'none';
    void this.view.offsetWidth; // reinicia a animação de entrada
    this.view.style.animation = '';
    window.scrollTo({ top: 0 });
    handler(params, new URLSearchParams(queryPart || ''));
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
