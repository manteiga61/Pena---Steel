/* Camada de dados da Pena Steel: usa Supabase se configurado; senão, localStorage (modo teste). */
(function () {
  'use strict';
  var C = window.PS_SUPABASE || {}, on = !!(C.url && C.key && window.supabase);
  var sb = on ? window.supabase.createClient(C.url, C.key) : null, BUCKET = 'produtos';
  function lget(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } }
  function lset(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function ok(r) { if (r.error) throw r.error; return r.data; }
  var fromRow = function (r) { return { id: r.id, name: r.name, category: r.category, price: +r.price, promoPrice: +r.promo_price || 0, stock: r.stock, description: r.description || '', features: r.features || [], image: r.image_url || '', featured: !!r.featured }; };
  var toRow = function (p) { return { id: p.id, name: p.name, category: p.category, price: p.price, promo_price: p.promoPrice || null, stock: p.stock, description: p.description, features: p.features, image_url: p.image || null, featured: !!p.featured }; };
  var ordFrom = function (r) { return { id: r.id, date: r.created_at, customer: r.customer, items: r.items, total: +r.total, status: r.status }; };

  window.DB = {
    remote: on,
    products: function () {
      if (!on) return Promise.resolve(lget('ps_products'));
      return sb.from('products').select('*').order('created_at', { ascending: false }).then(ok).then(function (d) { return d.map(fromRow); });
    },
    saveProduct: function (p) {
      if (!on) { var l = lget('ps_products'), i = l.map(function (x) { return x.id; }).indexOf(p.id); if (i > -1) l[i] = p; else l.unshift(p); lset('ps_products', l); return Promise.resolve(); }
      var up = Promise.resolve(p.image);
      if (p.image && p.image.indexOf('data:') === 0) {
        up = fetch(p.image).then(function (r) { return r.blob(); }).then(function (b) {
          var path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
          return sb.storage.from(BUCKET).upload(path, b, { contentType: 'image/jpeg', cacheControl: '31536000' }).then(ok).then(function () { return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl; });
        });
      }
      return up.then(function (url) { p.image = url; return sb.from('products').upsert(toRow(p)).then(ok); });
    },
    deleteProduct: function (id) {
      if (!on) { lset('ps_products', lget('ps_products').filter(function (x) { return x.id !== id; })); return Promise.resolve(); }
      return sb.from('products').delete().eq('id', id).then(ok);
    },
    saveOrder: function (o) {
      if (!on) { var l = lget('ps_orders'); l.unshift(o); lset('ps_orders', l); return Promise.resolve(); }
      return sb.from('orders').insert({ id: o.id, customer: o.customer, items: o.items, total: o.total, status: o.status }).then(ok);
    },
    orders: function () {
      if (!on) return Promise.resolve(lget('ps_orders'));
      return sb.from('orders').select('*').order('created_at', { ascending: false }).then(ok).then(function (d) { return d.map(ordFrom); });
    },
    setStatus: function (id, status) {
      if (!on) { var l = lget('ps_orders'); l.forEach(function (o) { if (o.id === id) o.status = status; }); lset('ps_orders', l); return Promise.resolve(); }
      return sb.from('orders').update({ status: status }).eq('id', id).then(ok);
    },
    session: function () { return on ? sb.auth.getSession().then(function (r) { return r.data.session; }) : Promise.resolve(null); },
    signIn: function (email, pass) { return sb.auth.signInWithPassword({ email: email, password: pass }).then(ok); },
    signOut: function () { return on ? sb.auth.signOut() : Promise.resolve(); }
  };
})();
