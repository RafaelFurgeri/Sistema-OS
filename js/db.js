/* =========================================================
   Banco de dados local (localStorage) + regras de negócio
   ========================================================= */
const STATUS = {
  aberta:    { label: 'Aberta',               final: false },
  analise:   { label: 'Em análise',           final: false },
  aprovacao: { label: 'Aguardando aprovação', final: false },
  aprovado:  { label: 'Orçamento aprovado',   final: false },
  pecas:     { label: 'Aguardando peças',     final: false },
  execucao:  { label: 'Em execução',          final: false },
  concluida: { label: 'Concluída',            final: true },
  entregue:  { label: 'Entregue',             final: true },
  reprovado: { label: 'Orçamento reprovado',  final: true },
  cancelada: { label: 'Cancelada',            final: true },
};
const STATUS_FINAIS = Object.keys(STATUS).filter((k) => STATUS[k].final);
const isFinal = (os) => !!STATUS[os.status]?.final;
const statusBadge = (st) => `<span class="badge st-${esc(st)}">${esc(STATUS[st]?.label || st)}</span>`;
const tipoLabel = (t) => (t === 'orc' ? 'Orçamento' : 'Ordem de Serviço');
const tipoBadge = (t) => `<span class="badge no-dot tipo-${t === 'orc' ? 'orc' : 'os'}">${t === 'orc' ? 'Orçamento' : 'OS'}</span>`;

const TIPOS_EQUIP = ['Notebook', 'Desktop', 'All-in-One', 'Impressora', 'Monitor', 'Servidor', 'Celular', 'Tablet', 'Roteador / Rede', 'Nobreak', 'Outro'];
const MARGENS = [0, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100];

const CATEGORIAS_PRODUTO = [
  'Armazenamento',
  'Memória RAM',
  'Processador',
  'Placa-Mãe',
  'Fonte / Energia',
  'Cooler / Refrigeração',
  'Cabos & Conectores',
  'Periférico',
  'Consumível',
  'Acessório',
  'Outro',
];

/* ---------- Cálculos ---------- */
const Calc = {
  precoVenda(p) {
    return round2(toNum(p.custo) * (1 + toNum(p.margem) / 100));
  },
  margemDeVenda(custo, venda) {
    const c = toNum(custo);
    const v = toNum(venda);
    if (!c || c <= 0) return 0;
    return round2(((v - c) / c) * 100);
  },
  totais(os) {
    let custoProdutos = 0, totalProdutos = 0, totalServicos = 0;
    (os.produtos || []).forEach((p) => {
      const q = toNum(p.qtd);
      custoProdutos += q * toNum(p.custo);
      totalProdutos += q * Calc.precoVenda(p);
    });
    (os.servicos || []).forEach((s) => { totalServicos += toNum(s.qtd) * toNum(s.valor); });
    custoProdutos = round2(custoProdutos);
    totalProdutos = round2(totalProdutos);
    totalServicos = round2(totalServicos);
    const subtotal = round2(totalProdutos + totalServicos);
    const desconto = round2(Math.min(toNum(os.desconto), subtotal));
    const total = round2(subtotal - desconto);
    const lucroProdutos = round2(totalProdutos - custoProdutos);
    const lucroTotal = round2(total - custoProdutos);
    return { custoProdutos, totalProdutos, totalServicos, subtotal, desconto, total, lucroProdutos, lucroTotal };
  },
};

/* ---------- Persistência ---------- */
const DB = (() => {
  const KEY = 'sigasec_os_v1';

  const defaultConfig = () => ({
    empresa: 'Sigasec IT Consulting',
    endereco: 'Rua Padre Antonio de Souza Lima, 140, sala 05',
    cidade: 'São Paulo - SP',
    telefone: '(11) 98765-4321',
    email: 'suporte@sigasec.com.br',
    cnpj: '',
    site: 'www.sigasec.com.br',
    logo: '', // dataURL de logo personalizada (vazio = assets/logo.png)
    margemPadrao: 30,
    validadeOrcamento: 7,
    garantiaPadrao: '90 dias para serviços executados. Peças conforme garantia do fabricante.',
    termos: 'A garantia não cobre danos causados por mau uso, quedas, contato com líquidos, oscilações elétricas ou violação do lacre de segurança. ' +
      'Equipamentos não retirados em até 90 dias após notificação estarão sujeitos a taxa de armazenamento. ' +
      'Recomendamos backup prévio antes do envio de equipamentos contendo arquivos críticos.',
  });

  const produtosIniciais = () => [
    { id: 'p_ssd_1tb', codigo: 'SSD-1TB-NV2', nome: 'SSD 1TB Kingston NV2 M.2 NVMe', categoria: 'Armazenamento', custo: 260.00, margem: 35, estoque: 6, unidade: 'UN', observacoes: 'PCIe 4.0 NVMe, 3500MB/s' },
    { id: 'p_ssd_500g', codigo: 'SSD-500G-NV2', nome: 'SSD 500GB Kingston NV2 M.2 NVMe', categoria: 'Armazenamento', custo: 175.00, margem: 40, estoque: 8, unidade: 'UN', observacoes: 'PCIe 4.0 NVMe, 3000MB/s' },
    { id: 'p_ram_16g', codigo: 'RAM-16G-D4', nome: 'Memória RAM 16GB DDR4 3200MHz Kingston Fury', categoria: 'Memória RAM', custo: 180.00, margem: 35, estoque: 5, unidade: 'UN', observacoes: 'DDR4 3200MHz CL16' },
    { id: 'p_ram_8g', codigo: 'RAM-8G-D4', nome: 'Memória RAM 8GB DDR4 3200MHz Crucial Basics', categoria: 'Memória RAM', custo: 95.00, margem: 40, estoque: 10, unidade: 'UN', observacoes: 'DDR4 3200MHz' },
    { id: 'p_fonte_500w', codigo: 'FON-500W-80P', nome: 'Fonte 500W 80 Plus Bronze PFC Ativo', categoria: 'Fonte / Energia', custo: 210.00, margem: 30, estoque: 4, unidade: 'UN', observacoes: 'Bivolt Automático' },
    { id: 'p_pasta_term', codigo: 'PAS-TERM-AG', nome: 'Pasta Térmica Prata Arctic Silver 5 (3.5g)', categoria: 'Consumível', custo: 35.00, margem: 50, estoque: 15, unidade: 'UN', observacoes: 'Alta condutividade térmica' },
    { id: 'p_cabo_hdmi', codigo: 'CAB-HDMI-20', nome: 'Cabo HDMI 2.0 4K Ultra HD 1.8m Blindado', categoria: 'Cabos & Conectores', custo: 18.00, margem: 70, estoque: 12, unidade: 'UN', observacoes: 'Conectores banhados a ouro' },
  ];

  const defaults = () => ({
    seq: { os: 1 },
    clientes: [],
    produtos: produtosIniciais(),
    ordens: [],
    config: defaultConfig(),
  });

  let data = null;

  function load() {
    try { data = JSON.parse(localStorage.getItem(KEY)); } catch { data = null; }
    if (!data || typeof data !== 'object') data = defaults();
    data.seq = Object.assign({ os: 1 }, data.seq);
    data.clientes = data.clientes || [];
    data.produtos = Array.isArray(data.produtos) && data.produtos.length ? data.produtos : produtosIniciais();
    data.ordens = data.ordens || [];
    data.config = Object.assign(defaultConfig(), data.config || {});
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(e);
      UI.toast('Não foi possível salvar: armazenamento do navegador cheio.', 'error');
      return false;
    }
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const nowIso = () => new Date().toISOString();

  load();

  return {
    uid,
    get config() { return data.config; },
    saveConfig(cfg) { data.config = Object.assign(data.config, cfg); return save(); },

    /* Numeração */
    peekNumero() { return data.seq.os; },
    setProximoNumero(n) {
      const max = data.ordens.reduce((m, o) => Math.max(m, o.numero || 0), 0);
      data.seq.os = Math.max(parseInt(n, 10) || 1, max + 1);
      save();
      return data.seq.os;
    },

    /* Clientes */
    clientes() { return [...data.clientes].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')); },
    cliente(id) { return data.clientes.find((c) => c.id === id) || null; },
    salvarCliente(c) {
      if (!c.id) { c.id = uid(); c.criadoEm = nowIso(); data.clientes.push(c); }
      else {
        const i = data.clientes.findIndex((x) => x.id === c.id);
        if (i >= 0) data.clientes[i] = c; else data.clientes.push(c);
      }
      c.atualizadoEm = nowIso();
      save();
      return c;
    },
    excluirCliente(id) {
      if (data.ordens.some((o) => o.clienteId === id)) return false;
      data.clientes = data.clientes.filter((c) => c.id !== id);
      save();
      return true;
    },
    ordensDoCliente(id) { return data.ordens.filter((o) => o.clienteId === id); },

    /* Produtos */
    produtos() {
      return [...(data.produtos || [])].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    },
    produto(id) {
      return (data.produtos || []).find((p) => p.id === id) || null;
    },
    salvarProduto(p) {
      data.produtos = data.produtos || [];
      p.custo = round2(toNum(p.custo));
      p.margem = round2(toNum(p.margem));
      p.precoVenda = Calc.precoVenda(p);
      p.estoque = toNum(p.estoque);
      p.unidade = (p.unidade || 'UN').toUpperCase().trim();
      if (!p.id) {
        p.id = 'p_' + uid();
        p.criadoEm = nowIso();
        data.produtos.push(p);
      } else {
        const i = data.produtos.findIndex((x) => x.id === p.id);
        if (i >= 0) data.produtos[i] = p; else data.produtos.push(p);
      }
      p.atualizadoEm = nowIso();
      save();
      return p;
    },
    excluirProduto(id) {
      data.produtos = (data.produtos || []).filter((p) => p.id !== id);
      save();
      return true;
    },
    buscarProdutos(termo) {
      if (!termo) return this.produtos();
      const n = normalize(termo).trim();
      return this.produtos().filter((p) =>
        normalize([p.nome, p.codigo, p.categoria, p.observacoes].join(' ')).includes(n)
      );
    },

    /* Ordens */
    novaOrdem() {
      return {
        id: null, numero: null, tipo: 'os', status: 'aberta', clienteId: '',
        dataEntrada: nowLocal(), dataPrevisao: '', dataSaida: '', tecnico: '',
        equipamento: { tipo: 'Notebook', marca: '', modelo: '', serie: '', acessorios: '', senha: '', estado: '' },
        problemaInformado: '', problemaConstatado: '', servicoExecutado: '',
        imprimirInformado: true, imprimirConstatado: true, imprimirExecutado: true,
        produtos: [], servicos: [],
        margemPadrao: data.config.margemPadrao, desconto: 0,
        formaPagamento: '', garantia: data.config.garantiaPadrao, observacoes: '',
      };
    },
    ordens() { return [...data.ordens].sort((a, b) => (b.numero || 0) - (a.numero || 0)); },
    ordem(id) { return data.ordens.find((o) => o.id === id) || null; },
    ordemPorNumero(n) { return data.ordens.find((o) => o.numero === parseInt(n, 10)) || null; },
    salvarOrdem(o) {
      if (!o.id) {
        o.id = uid();
        o.numero = data.seq.os++;
        o.criadoEm = nowIso();
        data.ordens.push(o);
      } else {
        const i = data.ordens.findIndex((x) => x.id === o.id);
        if (i >= 0) data.ordens[i] = o; else data.ordens.push(o);
      }
      o.atualizadoEm = nowIso();
      o.totais = Calc.totais(o); // cache para listagens
      save();
      return o;
    },
    excluirOrdem(id) {
      data.ordens = data.ordens.filter((o) => o.id !== id);
      save();
    },

    /* Backup */
    exportar() {
      return JSON.stringify({
        app: 'sigasec-os',
        versao: 2,
        exportadoEm: nowIso(),
        dados: data
      }, null, 2);
    },
    importar(json) {
      const parsed = JSON.parse(json);
      const d = parsed.dados || parsed;
      if (!Array.isArray(d.ordens) || !Array.isArray(d.clientes)) throw new Error('Arquivo de backup inválido.');
      d.produtos = Array.isArray(d.produtos) ? d.produtos : produtosIniciais();
      localStorage.setItem(KEY, JSON.stringify(d));
      load();
    },
    limparTudo() { localStorage.removeItem(KEY); load(); },
  };
})();

const logoSrc = () => DB.config.logo || 'assets/logo.png';
const logoIsCustom = () => !!DB.config.logo;
