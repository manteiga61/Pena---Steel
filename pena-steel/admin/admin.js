/* Pena Steel — painel administrativo. Usa o mesmo localStorage da loja (chaves ps_products e ps_orders). */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var money = function (n) { return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var CATS = { masculino: 'Relógios masculinos', feminino: 'Relógios femininos', pulseiras: 'Pulseiras', correntes: 'Correntes', aneis: 'Anéis', outros: 'Outros acessórios' };
  var STATUS = ['Aguardando confirmação', 'Confirmado', 'Entregue', 'Cancelado'];
  var TITLES = { dashboard: 'Visão geral', products: 'Produtos', orders: 'Pedidos' };
  function load(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('Sem espaço para salvar. Use uma foto menor.'); return false; } }
  var tt; function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('on'); }, 2500); }
  var fmtDate = function (d) { return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); };

  var products = [], orders = [], img = '';
  var form = $('#productForm'), dlg = $('#productModal');

  function view(v) {
    document.querySelectorAll('.view').forEach(function (s) { s.classList.toggle('active', s.id === 'view-' + v); });
    document.querySelectorAll('.nav-link').forEach(function (b) { b.classList.toggle('active', b.dataset.view === v); });
    $('#pageTitle').textContent = TITLES[v]; $('#sidebar').classList.remove('open'); window.scrollTo(0, 0);
  }
  function pill(s) { return '<span class="pill ' + (s === 'Cancelado' ? 'no' : s === 'Aguardando confirmação' ? 'wait' : 'ok') + '">' + esc(s) + '</span>'; }

  function ordersTable(list, edit) {
    if (!list.length) return '<p class="empty">Nenhum pedido ainda. Os pedidos aparecem aqui quando o cliente revisa o pedido na loja.</p>';
    return '<table><thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Total</th><th>Situação</th></tr></thead><tbody>' + list.map(function (o) {
      return '<tr><td data-label="Pedido">' + esc(o.id) + '<small>' + fmtDate(o.date) + '</small></td><td data-label="Cliente">' + esc(o.customer.nome) + '<small>' + esc(o.customer.telefone) + ' · ' + esc(o.customer.cidade) + '</small></td><td data-label="Itens">' +
        o.items.map(function (i) { return i.qty + 'x ' + esc(i.name); }).join('<br>') + '</td><td data-label="Total">' + money(o.total) + '</td><td data-label="Situação">' +
        (edit ? '<select data-order="' + esc(o.id) + '" aria-label="Situação do pedido">' + STATUS.map(function (s) { return '<option' + (s === o.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' : pill(o.status)) + '</td></tr>';
    }).join('') + '</tbody></table>';
  }
  function render() {
    $('#statProducts').textContent = products.length; $('#statOrders').textContent = orders.length;
    $('#statPending').textContent = orders.filter(function (o) { return o.status === 'Aguardando confirmação'; }).length;
    $('#statRevenue').textContent = money(orders.filter(function (o) { return o.status !== 'Cancelado'; }).reduce(function (s, o) { return s + o.total; }, 0));
    $('#recentOrders').innerHTML = ordersTable(orders.slice(0, 5), false);
    $('#ordersList').innerHTML = ordersTable(orders, true);
    $('#productList').innerHTML = products.length ? products.map(function (p) {
      return '<article class="pcard" data-id="' + esc(p.id) + '">' + (p.image ? '<img src="' + esc(p.image) + '" alt="" style="aspect-ratio:1;object-fit:cover">' : '<div style="aspect-ratio:1;background:#000"></div>') +
        '<div class="pinfo"><h3>' + esc(p.name) + '</h3><p>' + esc(CATS[p.category] || '') + '</p><p>' + money(p.price) + (p.promoPrice > 0 ? ' · promoção ' + money(p.promoPrice) : '') + ' · estoque ' + p.stock + '</p></div>' +
        '<div class="pact"><button class="text-button" data-edit>Editar</button><button class="text-button danger" data-del>Excluir</button></div></article>';
    }).join('') : '<p class="empty">Nenhum produto cadastrado. Clique em “Novo produto” para começar.</p>';
  }

  /* produtos */
  function setImg(src) { img = src || ''; var p = $('#imagePreview'); p.hidden = !img; if (img) p.src = img; $('#removeImage').hidden = !img; }
  function openForm(p) {
    form.reset(); $('#formMessage').textContent = ''; $('#formTitle').textContent = p ? 'Editar produto' : 'Adicionar produto';
    var e = form.elements; e.id.value = p ? p.id : '';
    if (p) { e.name.value = p.name; e.category.value = p.category; e.price.value = p.price; e.promoPrice.value = p.promoPrice || ''; e.stock.value = p.stock; e.description.value = p.description || ''; e.features.value = (p.features || []).join('\n'); e.featured.checked = !!p.featured; }
    setImg(p && p.image); dlg.showModal();
  }
  function resize(file, cb) {
    var r = new FileReader();
    r.onload = function () { var im = new Image(); im.onload = function () {
      var m = 900, k = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', .82));
    }; im.onerror = function () { toast('Não foi possível ler essa imagem.'); }; im.src = r.result; };
    r.readAsDataURL(file);
  }
  $('#productImage').onchange = function () { if (this.files[0]) resize(this.files[0], setImg); };
  $('#removeImage').onclick = function () { setImg(''); $('#productImage').value = ''; };
  $('#newProduct').onclick = function () { openForm(null); };
  form.addEventListener('submit', function (ev) {
    ev.preventDefault(); var e = form.elements, msg = $('#formMessage');
    var price = parseFloat(e.price.value), promo = parseFloat(e.promoPrice.value) || 0;
    if (!e.name.value.trim()) { msg.textContent = 'Informe o nome do produto.'; return; }
    if (!(price >= 0) || isNaN(price)) { msg.textContent = 'Informe o preço.'; return; }
    if (promo && promo >= price) { msg.textContent = 'O preço promocional deve ser menor que o preço normal.'; return; }
    var p = { id: e.id.value || 'p' + Date.now().toString(36), name: e.name.value.trim(), category: e.category.value, price: price, promoPrice: promo, stock: Math.max(0, parseInt(e.stock.value, 10) || 0), description: e.description.value.trim(),
      features: e.features.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean), image: img, featured: e.featured.checked };
    var btn = form.querySelector('[type=submit]'); btn.disabled = true; msg.textContent = 'Salvando…';
    DB.saveProduct(p).then(refresh).then(function () { dlg.close(); toast('Produto salvo'); })
      .catch(function (err) { msg.textContent = 'Não foi possível salvar: ' + (err.message || err); })
      .then(function () { btn.disabled = false; });
  });
  $('#productList').addEventListener('click', function (e) {
    var card = e.target.closest('.pcard'); if (!card) return;
    var p = products.filter(function (x) { return x.id === card.dataset.id; })[0];
    if (e.target.closest('[data-edit]')) openForm(p);
    else if (e.target.closest('[data-del]') && confirm('Excluir “' + p.name + '”? Essa ação não pode ser desfeita.')) {
      DB.deleteProduct(p.id).then(refresh).then(function () { toast('Produto excluído'); }).catch(fail);
    }
  });
  $('#ordersList').addEventListener('change', function (e) {
    var id = e.target.dataset.order; if (!id) return;
    DB.setStatus(id, e.target.value).then(refresh).then(function () { toast('Situação atualizada'); }).catch(fail);
  });

  /* navegação */
  document.querySelectorAll('.nav-link').forEach(function (b) { b.onclick = function () { view(b.dataset.view); }; });
  document.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { view(b.dataset.go); }; });
  $('#mobileMenu').onclick = function () { $('#sidebar').classList.toggle('open'); };
  dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
  document.addEventListener('click', function (e) { if (!e.target.closest('#sidebar') && !e.target.closest('#mobileMenu')) $('#sidebar').classList.remove('open'); });
  function fail(err) { toast('Erro: ' + (err && err.message || err)); }
  function refresh() { return Promise.all([DB.products(), DB.orders()]).then(function (r) { products = r[0]; orders = r[1]; render(); }); }
  function login() {
    var d = $('#loginDlg'); d.addEventListener('cancel', function (e) { e.preventDefault(); }); d.showModal();
    $('#loginForm').onsubmit = function (e) {
      e.preventDefault(); var f = e.target, m = $('#loginMsg'); m.textContent = 'Entrando…';
      DB.signIn(f.email.value.trim(), f.password.value).then(function () { d.close(); return refresh(); }).catch(function (err) { var t = String(err && err.message || err); console.error('Login:', err);
        m.textContent = /invalid login/i.test(t) ? 'E-mail ou senha incorretos.' : /not confirmed/i.test(t) ? 'E-mail ainda não confirmado. No Supabase, confirme o usuário (veja o guia).' : /fetch|network/i.test(t) ? 'Sem conexão. Tente de novo.' : 'Erro: ' + t; });
    };
  }
  $('#logout').onclick = function () { DB.signOut().then(function () { location.reload(); }); };
  $('#logout').hidden = !DB.remote;
  document.querySelector('.notice').hidden = DB.remote;
  if (!DB.remote) refresh(); else DB.session().then(function (s) { if (s) refresh().catch(fail); else login(); });
})();