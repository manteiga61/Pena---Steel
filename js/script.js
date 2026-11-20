/* Pena Steel — loja: catálogo, carrinho e pedido pelo WhatsApp. Dados em localStorage, compartilhados com /admin. */
(function () {
  'use strict';
  var CFG = { whats: '553399506119', cidade: 'Itaobim — MG', instagram: '' }; // TROQUE pelo número real (55 + DDD + número)
  var CATS = { masculino: 'Relógios masculinos', feminino: 'Relógios femininos', pulseiras: 'Pulseiras', correntes: 'Correntes', aneis: 'Anéis', outros: 'Outros acessórios' };
  var GROUPS = { relogios: ['masculino', 'feminino'], acessorios: ['pulseiras', 'correntes', 'aneis', 'outros'] };
  /* FOTOS DAS CATEGORIAS: coloque as imagens em assets/images/categorias/ (ideal 800x1000, vertical). Sem foto, aparece um ícone elegante. */
  var CAT_IMG = { masculino: 'assets/images/categorias/masculino.jpg', feminino: 'assets/images/categorias/feminino.jpg', pulseiras: 'assets/images/categorias/pulseiras.jpg', correntes: 'assets/images/categorias/correntes.jpg', aneis: 'assets/images/categorias/aneis.jpg', outros: 'assets/images/categorias/outros.jpg' };
  var W = '<circle cx="32" cy="32" r="13"/><path d="M32 24v8l5 3M26 6h12l2 12H24zM26 58h12l2-12H24z"/>';
  var CAT_ICON = { masculino: W, feminino: '<circle cx="32" cy="32" r="10"/><path d="M32 26v6l4 2M28 8h8l1 14H27zM28 56h8l1-14H27z"/>',
    pulseiras: '<ellipse cx="32" cy="32" rx="22" ry="13"/><ellipse cx="32" cy="32" rx="17" ry="9"/><circle cx="10" cy="32" r="2"/><circle cx="54" cy="32" r="2"/><circle cx="32" cy="19" r="2"/>',
    correntes: '<rect x="4" y="24" width="22" height="16" rx="8"/><rect x="21" y="24" width="22" height="16" rx="8"/><rect x="38" y="24" width="22" height="16" rx="8"/>',
    aneis: '<circle cx="32" cy="40" r="15"/><path d="M24 20l5-8h6l5 8-8 10z"/>',
    outros: '<path d="M18 20h28l8 11-22 24L10 31z"/><path d="M10 31h44M26 20l6 35M38 20l-6 35"/>' };
  var CHIPS = [['todos', 'Todos'], ['relogios', 'Relógios'], ['masculino', 'Masculinos'], ['feminino', 'Femininos'], ['pulseiras', 'Pulseiras'], ['correntes', 'Correntes'], ['aneis', 'Anéis'], ['outros', 'Outros']];
  var $ = function (s) { return document.querySelector(s); };
  var money = function (n) { return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast('Não foi possível salvar neste navegador.'); } }
  var tt; function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('on'); }, 2400); }

  function ph() { return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c1c1e"/><stop offset="1" stop-color="#070707"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><text x="200" y="206" fill="#6d6f73" font-family="Georgia,serif" font-size="22" letter-spacing="9" text-anchor="middle">PENA STEEL</text></svg>'); }
  var PH = ph();

  if (!DB.remote && localStorage.getItem('ps_products') === null) {
    var S = function (id, name, category, price, promo, desc, feat, featured) { return { id: id, name: name, category: category, price: price, promoPrice: promo, stock: 5, description: desc, features: feat, image: '', featured: featured }; };
    save('ps_products', [
      S('p1', 'Relógio Steel Classic', 'masculino', 289.9, 249.9, 'Caixa e pulseira em aço inoxidável, mostrador escuro com acabamento texturizado.', ['Aço inoxidável', 'Cor prata', 'Resistente à água'], true),
      S('p2', 'Relógio Lady Silver', 'feminino', 259.9, 0, 'Modelo delicado em aço, pensado para o dia a dia.', ['Aço inoxidável', 'Fecho de segurança'], true),
      S('p3', 'Pulseira Tennis Steel', 'pulseiras', 149.9, 0, 'Pulseira com pedras cravejadas e fecho reforçado.', ['Aço inoxidável', 'Pedras zircônia'], true),
      S('p4', 'Corrente Cubana 8 mm', 'correntes', 189.9, 169.9, 'Elos cubanos em aço, com fecho tipo caixa.', ['Aço inoxidável', '8 mm', '50 cm'], false),
      S('p5', 'Anel Aço Polido', 'aneis', 79.9, 0, 'Anel liso com acabamento polido espelhado.', ['Aço inoxidável', 'Não escurece'], false),
      S('p6', 'Brinco Argola Steel', 'outros', 59.9, 0, 'Argola fina em aço, leve e discreta.', ['Aço inoxidável', 'Hipoalergênico'], false)
    ]);
  }
  var loading = DB.remote, products = DB.remote ? [] : load('ps_products', []), pending = null;
  var cart = load('ps_cart', []);
  var state = { cat: 'todos', q: '', sort: 'default' };
  var cur = null, curQty = 1, orderId = null;

  var eff = function (p) { return p.promoPrice > 0 && p.promoPrice < p.price ? p.promoPrice : p.price; };
  var byId = function (id) { return products.filter(function (p) { return p.id === id; })[0]; };
  function priceHtml(p) { return eff(p) < p.price ? '<s>' + money(p.price) + '</s><strong>' + money(eff(p)) + '</strong>' : '<strong>' + money(p.price) + '</strong>'; }
  function cardHtml(p) {
    var out = p.stock <= 0;
    return '<article class="card" data-id="' + esc(p.id) + '"><button class="card-img" data-open aria-label="Ver ' + esc(p.name) + '"><img src="' + esc(p.image || PH) + '" alt="' + esc(p.name) + '" loading="lazy"></button>' +
      (out ? '<span class="tag">Esgotado</span>' : eff(p) < p.price ? '<span class="tag">Oferta</span>' : '') +
      '<div class="card-b"><h3>' + esc(p.name) + '</h3><div class="price">' + priceHtml(p) + '</div><button class="btn btn-ghost btn-sm" data-add' + (out ? ' disabled' : '') + '>' + (out ? 'Indisponível' : 'Adicionar') + '</button></div></article>';
  }

  function renderCats() {
    $('#catGrid').innerHTML = Object.keys(CATS).map(function (k) {
      var n = products.filter(function (p) { return p.category === k; }).length;
      return '<button class="cat" data-cat="' + k + '"><span class="cat-media"><span class="cat-ph"><svg viewBox="0 0 64 64" aria-hidden="true">' + CAT_ICON[k] + '</svg></span><img src="' + esc(CAT_IMG[k]) + '" alt="" loading="lazy" draggable="false"></span>' +
        '<span class="cat-info"><strong>' + CATS[k] + '</strong><span>' + n + (n === 1 ? ' produto' : ' produtos') + '</span><em>Ver peças</em></span></button>';
    }).join('');
    document.querySelectorAll('#catGrid img').forEach(function (im) { if (im.complete && !im.naturalWidth) im.remove(); });
    $('#chips').innerHTML = CHIPS.map(function (c) { return '<button class="btn btn-sm" data-cat="' + c[0] + '" aria-pressed="' + (state.cat === c[0]) + '">' + c[1] + '</button>'; }).join('');
    $('#footCats').innerHTML = Object.keys(CATS).map(function (k) { return '<li><a href="#catalogo" data-cat="' + k + '">' + CATS[k] + '</a></li>'; }).join('');
  }
  function renderGrid() {
    var list = products.filter(function (p) {
      var cats = GROUPS[state.cat] || (state.cat === 'todos' ? null : [state.cat]);
      var okCat = !cats || cats.indexOf(p.category) > -1;
      var q = state.q.trim().toLowerCase();
      return okCat && (!q || (p.name + ' ' + p.description + ' ' + (CATS[p.category] || '')).toLowerCase().indexOf(q) > -1);
    });
    if (state.sort === 'asc') list.sort(function (a, b) { return eff(a) - eff(b); });
    else if (state.sort === 'desc') list.sort(function (a, b) { return eff(b) - eff(a); });
    else list.sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); });
    $('#productGrid').innerHTML = loading ? '<p class="empty">Carregando produtos…</p>' : list.length ? list.map(cardHtml).join('') : '<p class="empty">Nenhum produto encontrado. Tente outra categoria ou outra busca.</p>';
    $('#resultCount').textContent = list.length + (list.length === 1 ? ' produto' : ' produtos');
    document.querySelectorAll('#chips [data-cat]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.cat === state.cat); b.classList.toggle('is-on', b.dataset.cat === state.cat); });
    var offers = products.filter(function (p) { return eff(p) < p.price; });
    $('#offerGrid').innerHTML = offers.length ? offers.map(cardHtml).join('') : '<p class="empty">Nenhuma oferta no momento. Volte em breve.</p>';
  }
  function setCat(c, scroll) { state.cat = c; renderGrid(); if (scroll) $('#catalogo').scrollIntoView({ behavior: 'smooth' }); }

  /* carrinho */
  function cartLines() { return cart.map(function (i) { var p = byId(i.id); return p ? { p: p, qty: i.qty } : null; }).filter(Boolean); }
  function addToCart(id, q) {
    var p = byId(id); if (!p || p.stock <= 0) return;
    var it = cart.filter(function (c) { return c.id === id; })[0];
    var n = (it ? it.qty : 0) + q;
    if (n > p.stock) { n = p.stock; toast('Estoque disponível: ' + p.stock); } else toast('Adicionado ao carrinho');
    if (it) it.qty = n; else cart.push({ id: id, qty: n });
    renderCart();
  }
  function renderCart() {
    var L = cartLines(); cart = L.map(function (l) { return { id: l.p.id, qty: l.qty }; }); save('ps_cart', cart);
    var n = L.reduce(function (s, l) { return s + l.qty; }, 0), sum = L.reduce(function (s, l) { return s + eff(l.p) * l.qty; }, 0);
    var b = $('#cartCount'); b.textContent = n; b.dataset.n = n;
    $('#cartItems').innerHTML = L.length ? L.map(function (l) {
      return '<div class="ci" data-id="' + esc(l.p.id) + '"><img src="' + esc(l.p.image || PH) + '" alt=""><div><h3>' + esc(l.p.name) + '</h3><p>' + money(eff(l.p)) + '</p><button class="link" data-act="del">Remover</button></div><div class="qty"><button data-act="dec" aria-label="Diminuir">−</button><output>' + l.qty + '</output><button data-act="inc" aria-label="Aumentar">+</button></div></div>';
    }).join('') : '<p class="muted" style="padding:1.5rem 0">Seu carrinho está vazio. Escolha um produto no catálogo.</p>';
    $('#cartFoot').hidden = !L.length; $('#cartSub').textContent = money(sum); $('#cartTotal').textContent = money(sum);
  }
  function overlay(on) { $('#scrim').classList.toggle('on', on); document.body.classList.toggle('lock', on); }
  function openCart() { closeMenu(); var d = $('#drawer'); d.classList.add('open'); d.setAttribute('aria-hidden', 'false'); overlay(true); }
  function closeCart() { var d = $('#drawer'); d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); overlay(false); }
  function closeMenu() { $('#nav').classList.remove('open'); $('#btnMenu').setAttribute('aria-expanded', 'false'); if (!$('#drawer').classList.contains('open')) overlay(false); }

  /* detalhe do produto */
  function openProduct(id) {
    var p = byId(id); if (!p) return; cur = p; curQty = 1;
    $('#pdImg').innerHTML = '<img src="' + esc(p.image || PH) + '" alt="' + esc(p.name) + '">';
    $('#pdName').textContent = p.name; $('#pdPrice').innerHTML = priceHtml(p);
    $('#pdDesc').textContent = p.description || '';
    $('#pdFeat').innerHTML = (p.features || []).map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('');
    $('#pdQty').textContent = 1; $('#pdAdd').disabled = p.stock <= 0; $('#pdAdd').textContent = p.stock <= 0 ? 'Esgotado' : 'Adicionar ao carrinho';
    $('#productDlg').showModal();
  }

  /* pedido */
  function showForm(on) { $('#coForm').hidden = !on; $('#coConfirm').hidden = on; }
  function buildMessage(f, L, sum, id) {
    var rec = f.recebimento === 'Entrega' ? 'Entrega — ' + f.endereco : 'Retirada';
    return '*Novo pedido — Pena Steel* (nº ' + id + ')\n\nCliente: ' + f.nome + '\nTelefone: ' + f.telefone + '\nCidade: ' + f.cidade + '\nRecebimento: ' + rec + '\nPagamento: ' + f.pagamento + '\n\n*Itens*\n' +
      L.map(function (l) { return '• ' + l.qty + 'x ' + l.p.name + ' — ' + money(eff(l.p) * l.qty); }).join('\n') + '\n\nSubtotal: ' + money(sum) + '\nFrete: a combinar\n*Total: ' + money(sum) + '*' + (f.obs ? '\n\nObservações: ' + f.obs : '');
  }
  function submitOrder(e) {
    e.preventDefault();
    var fd = new FormData($('#coForm')), f = {}; fd.forEach(function (v, k) { f[k] = String(v).trim(); });
    var err = $('#coError'), L = cartLines();
    if (!L.length) { err.textContent = 'Seu carrinho está vazio.'; err.hidden = false; return; }
    if (!f.nome || !f.telefone || !f.cidade) { err.textContent = 'Preencha nome, telefone e cidade.'; err.hidden = false; return; }
    if (f.recebimento === 'Entrega' && !f.endereco) { err.textContent = 'Informe o endereço de entrega.'; err.hidden = false; return; }
    if (f.telefone.replace(/\D/g, '').length < 10) { err.textContent = 'Informe um telefone com DDD.'; err.hidden = false; return; }
    err.hidden = true;
    var sum = L.reduce(function (s, l) { return s + eff(l.p) * l.qty; }, 0);
    if (pending && pending.sent) orderId = null;
    orderId = orderId || 'PS' + Date.now().toString(36).toUpperCase().slice(-6);
    pending = { id: orderId, customer: f, items: L.map(function (l) { return { id: l.p.id, name: l.p.name, qty: l.qty, price: eff(l.p) }; }), total: sum, status: 'Aguardando confirmação', sent: false };
    var msg = buildMessage(f, L, sum, orderId);
    $('#coPreview').textContent = msg;
    $('#coSend').href = 'https://wa.me/' + CFG.whats + '?text=' + encodeURIComponent(msg);
    showForm(false);
  }

  /* eventos */
  document.addEventListener('click', function (e) {
    var t = e.target, el;
    if ((el = t.closest('[data-cat]'))) { e.preventDefault(); setCat(el.dataset.cat, true); closeMenu(); return; }
    if ((el = t.closest('[data-filter]'))) { e.preventDefault(); setCat(el.dataset.filter, true); closeMenu(); return; }
    if ((el = t.closest('.card'))) {
      if (t.closest('[data-add]')) addToCart(el.dataset.id, 1); else if (t.closest('[data-open]')) openProduct(el.dataset.id);
      return;
    }
    if ((el = t.closest('.ci [data-act]'))) {
      var id = el.closest('.ci').dataset.id, it = cart.filter(function (c) { return c.id === id; })[0]; if (!it) return;
      if (el.dataset.act === 'del') it.qty = 0; else if (el.dataset.act === 'dec') it.qty--; else addToCart(id, 1);
      cart = cart.filter(function (c) { return c.qty > 0; }); renderCart(); return;
    }
    if (t.closest('[data-close]')) { var d = t.closest('dialog'); if (d) d.close(); return; }
    if (t.tagName === 'DIALOG') t.close();
  });
  $('#btnCart').onclick = openCart; $('#closeCart').onclick = closeCart; $('#btnContinue').onclick = closeCart;
  $('#scrim').onclick = function () { closeCart(); closeMenu(); };
  $('#btnMenu').onclick = function () { var o = $('#nav').classList.toggle('open'); this.setAttribute('aria-expanded', o); overlay(o); };
  $('#btnSearch').onclick = function () { var s = $('#searchbar'); s.hidden = !s.hidden; if (!s.hidden) $('#searchInput').focus(); };
  $('#searchInput').oninput = function () { state.q = this.value; renderGrid(); if (this.value) $('#catalogo').scrollIntoView({ behavior: 'smooth' }); };
  $('#sortSel').onchange = function () { state.sort = this.value; renderGrid(); };
  $('#pdMinus').onclick = function () { curQty = Math.max(1, curQty - 1); $('#pdQty').textContent = curQty; };
  $('#pdPlus').onclick = function () { curQty = Math.min(cur ? Math.max(cur.stock, 1) : 99, curQty + 1); $('#pdQty').textContent = curQty; };
  $('#pdAdd').onclick = function () { addToCart(cur.id, curQty); $('#productDlg').close(); };
  $('#btnCheckout').onclick = function () { closeCart(); showForm(true); $('#coError').hidden = true; $('#checkoutDlg').showModal(); };
  $('#coForm').addEventListener('submit', submitOrder);
  $('#coSend').addEventListener('click', function () {
    if (!pending || pending.sent) return; pending.sent = true;
    var o = { id: pending.id, date: new Date().toISOString(), customer: pending.customer, items: pending.items, total: pending.total, status: pending.status };
    DB.saveOrder(o).catch(function () { toast('O WhatsApp abriu, mas o pedido não foi registrado no painel.'); });
  });
  $('#coBack').onclick = function () { showForm(true); };
  $('#coClear').onclick = function () { cart = []; orderId = null; pending = null; renderCart(); $('#coForm').reset(); $('#addrWrap').hidden = false; $('#checkoutDlg').close(); toast('Carrinho limpo'); };
  document.querySelectorAll('input[name="recebimento"]').forEach(function (r) { r.onchange = function () { $('#addrWrap').hidden = r.value === 'Retirada' && r.checked; }; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeCart(); closeMenu(); } });

  /* rodapé e contato */
  var num = CFG.whats.replace(/^55/, ''), fmt = '(' + num.slice(0, 2) + ') ' + num.slice(2, -4) + '-' + num.slice(-4);
  var wa = 'https://wa.me/' + CFG.whats + '?text=' + encodeURIComponent('Olá! Vim pelo site da Pena Steel.');
  $('#footContact').innerHTML = '<li>' + esc(CFG.cidade) + '</li><li>WhatsApp: ' + fmt + '</li>';
  $('#footWa').href = wa; $('#waFloat').href = wa;
  if (CFG.instagram) $('#social').innerHTML = '<a href="' + esc(CFG.instagram) + '" target="_blank" rel="noopener">Instagram</a>';
  $('#copy').textContent = '© ' + new Date().getFullYear() + ' Pena Steel. Todos os direitos reservados.';

  /* carrossel de categorias */
  var sc = $('#catGrid'), bar = $('#catBar'), pv = $('#catPrev'), nx = $('#catNext');
  sc.addEventListener('error', function (e) { if (e.target.tagName === 'IMG') e.target.remove(); }, true);
  function upd() {
    var max = sc.scrollWidth - sc.clientWidth;
    bar.style.width = (sc.scrollWidth ? sc.clientWidth / sc.scrollWidth * 100 : 100) + '%';
    bar.style.transform = 'translateX(' + (sc.clientWidth ? sc.scrollLeft / sc.clientWidth * 100 : 0) + '%)';
    pv.disabled = sc.scrollLeft < 4; nx.disabled = sc.scrollLeft > max - 4;
  }
  function go(d) { var c = sc.querySelector('.cat'); sc.scrollBy({ left: d * (c ? c.offsetWidth + 16 : 300), behavior: 'smooth' }); }
  sc.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd);
  pv.onclick = function () { go(-1); }; nx.onclick = function () { go(1); };

  renderCats(); renderGrid(); if (!loading) renderCart(); showForm(true); upd();
  if (DB.remote) DB.products().then(function (l) { products = l; }).catch(function () { toast('Não foi possível carregar os produtos.'); })
    .then(function () { loading = false; renderCats(); renderGrid(); renderCart(); upd(); });
})();
