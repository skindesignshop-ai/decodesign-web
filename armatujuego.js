/* Decodesign - Arma tu juego - configurador de ambientes */
(function(){
  'use strict';
  if (window.__ATJ) return; window.__ATJ = 1;
  var D = document;

  var AMB = {
    comedor: {
      label: 'Comedor',
      kicker: 'Mesa, sillas, luz y deco de mesa',
      slots: [
        {k:'mesa',  n:'La mesa',        cats:['/mesas-de-comedor/'], max:1},
        {k:'silla', n:'Las sillas',     cats:['/tulip/'],            max:12, qty:6},
        {k:'luz',   n:'La luz',         cats:['/iluminacion/lamparas-colgantes1/'], max:2},
        {k:'apar',  n:'El vajillero',   cats:['/muebles/vajilleros/'], max:1},
        {k:'deco',  n:'La mesa puesta', cats:['/bazar-cocina/platos-vajilla-de-mesa/'], max:12, qty:6}
      ]
    },
    living: {
      label: 'Living',
      kicker: 'Sillon, mesa baja, rack, luz y alfombra',
      slots: [
        {k:'sofa', n:'El sillon',       cats:['/sillones/'], max:2},
        {k:'baja', n:'La mesa baja',    cats:['/mesas-bajas/'], max:1},
        {k:'aux',  n:'La mesa auxiliar',cats:['/mesas-auxiliares/'], max:2},
        {k:'rack', n:'El rack',         cats:['/muebles/muebles-para-lcd/'], max:1},
        {k:'pie',  n:'La luz',          cats:['/iluminacion/lamparas-de-pie1/'], max:2},
        {k:'alf',  n:'La alfombra',     cats:['/deco-objetos/alfombras1/'], max:1}
      ]
    },
    exterior: {
      label: 'Exterior',
      kicker: 'Mesa, sillas, reposeras y juegos de jardin',
      slots: [
        {k:'emesa', n:'La mesa',      cats:['/jardin/mesas/'], max:1},
        {k:'esilla',n:'Las sillas',   cats:['/jardin/sillas-sillones-de-jardin/'], max:12, qty:4},
        {k:'ejuego',n:'El juego',     cats:['/jardin/juegos-de-exterior1/'], max:1},
        {k:'erepo', n:'Las reposeras',cats:['/jardin/reposeras/'], max:6, qty:2},
        {k:'ebanq', n:'Las banquetas',cats:['/jardin/banquetas/'], max:8, qty:2}
      ]
    }
  };

  var state = { amb:'comedor', pick:{}, open:null };
  var cache = {};

  /* ---------- utilidades ---------- */
  function money(n){
    if (!n && n !== 0) return '';
    var s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return '$' + s;
  }
  function toNum(txt){
    if (!txt) return 0;
    var m = String(txt).replace(/[^\d.,]/g, '');
    if (!m) return 0;
    m = m.replace(/\./g, '').replace(',', '.');
    var v = parseFloat(m);
    return isNaN(v) ? 0 : v;
  }
  function el(tag, cls, html){
    var e = D.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ---------- catalogo ---------- */
  function parseCards(html){
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var out = [];
    var cards = doc.querySelectorAll('.js-item-product');
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var id = c.getAttribute('data-product-id');
      if (!id) continue;
      var nameEl = c.querySelector('.js-item-name');
      var name = nameEl ? nameEl.textContent.replace(/\s+/g,' ').trim() : '';
      if (!name) continue;
      var a = c.querySelector('a[href*="/productos/"]');
      var href = a ? a.getAttribute('href') : '';
      var img = c.querySelector('img');
      var src = '';
      if (img) {
        src = img.getAttribute('data-srcset') || img.getAttribute('srcset') || img.getAttribute('data-src') || img.getAttribute('src') || '';
        src = src.split(',')[0].trim().split(' ')[0];
        if (src.indexOf('data:') === 0) src = '';
      }
      if (src.indexOf('//') === 0) src = 'https:' + src;
      var pEl = c.querySelector('.js-price-display');
      var tEl = c.querySelector('.js-payment-discount-price-product');
      var price = toNum(pEl ? pEl.textContent : '');
      var transf = toNum(tEl ? tEl.textContent : '');
      var hasVar = !!c.querySelector('.js-product-quickshop-variant, .js-insta-variants select');
      if (!price) continue;
      out.push({ id:id, name:name, url:href, img:src, price:price, transf:transf||price, vars:hasVar });
    }
    return out;
  }

  function fetchCat(path){
    if (cache[path]) return Promise.resolve(cache[path]);
    var sep = path.indexOf('?') >= 0 ? '&' : '?';
    return fetch(path, {credentials:'same-origin'})
      .then(function(r){ return r.text(); })
      .then(function(h){
        var one = parseCards(h);
        return fetch(path + sep + 'page=2', {credentials:'same-origin'})
          .then(function(r){ return r.text(); })
          .then(function(h2){
            var two = parseCards(h2);
            var seen = {}, all = [];
            one.concat(two).forEach(function(p){ if (!seen[p.id]) { seen[p.id] = 1; all.push(p); } });
            cache[path] = all;
            return all;
          })
          .catch(function(){ cache[path] = one; return one; });
      });
  }

  function slotOf(key){
    var s = AMB[state.amb].slots;
    for (var i = 0; i < s.length; i++) if (s[i].k === key) return s[i];
    return null;
  }

  /* ---------- estilos ---------- */
  var CSS = ''
  + '.atj{--ink:#141414;--mut:#7c7870;--ln:#e4e0d9;--bg:#faf9f7;--ac:#b3122d;'
  +   'font-family:inherit;color:var(--ink);background:var(--bg);padding:0 0 110px}'
  + '.atj *{box-sizing:border-box}'
  + '.atj-w{max-width:1180px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}'
  + '.atj-hd{padding-block:34px 18px;text-align:center}'
  + '.atj-hd h1{font-size:clamp(24px,5vw,38px);letter-spacing:.14em;text-transform:uppercase;margin:0 0 10px;font-weight:400}'
  + '.atj-hd p{margin:0;color:var(--mut);font-size:14px;max-width:46ch;margin-inline:auto;line-height:1.6}'
  + '.atj-tabs{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding-block:22px 6px}'
  + '.atj-tab{border:1px solid var(--ln);background:#fff;color:var(--mut);padding:10px 20px;border-radius:999px;'
  +   'font-size:11px;letter-spacing:.16em;text-transform:uppercase;cursor:pointer;transition:.18s}'
  + '.atj-tab:hover{border-color:var(--ink);color:var(--ink)}'
  + '.atj-tab[aria-selected="true"]{background:var(--ink);border-color:var(--ink);color:#fff}'
  + '.atj-kick{text-align:center;color:var(--mut);font-size:12px;letter-spacing:.08em;padding-bottom:22px}'
  + '.atj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(228px,1fr));gap:14px}'
  + '.atj-slot{background:#fff;border:1px solid var(--ln);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;min-width:0}'
  + '.atj-slot .ph{aspect-ratio:4/3;background:#f2efea;display:flex;align-items:center;justify-content:center;'
  +   'cursor:pointer;position:relative;overflow:hidden}'
  + '.atj-slot .ph img{width:100%;height:100%;object-fit:cover;display:block}'
  + '.atj-plus{width:38px;height:38px;border-radius:50%;border:1px solid var(--ln);background:#fff;color:var(--mut);'
  +   'display:flex;align-items:center;justify-content:center;font-size:20px;line-height:1}'
  + '.atj-slot .bd{padding:13px 14px 14px;display:flex;flex-direction:column;gap:7px;flex:1}'
  + '.atj-slot .lb{font-size:10px;letter-spacing:.17em;text-transform:uppercase;color:var(--mut)}'
  + '.atj-slot .nm{font-size:13.5px;line-height:1.35;min-height:2.7em}'
  + '.atj-slot .pr{font-size:14px;font-variant-numeric:tabular-nums}'
  + '.atj-slot .pr small{display:block;color:var(--ac);font-size:11.5px;margin-top:2px}'
  + '.atj-row{display:flex;align-items:center;gap:8px;margin-top:auto;padding-top:8px}'
  + '.atj-qty{display:flex;align-items:center;border:1px solid var(--ln);border-radius:999px;overflow:hidden}'
  + '.atj-qty button{border:0;background:#fff;width:28px;height:28px;cursor:pointer;color:var(--ink);font-size:15px;line-height:1}'
  + '.atj-qty span{min-width:26px;text-align:center;font-size:13px;font-variant-numeric:tabular-nums}'
  + '.atj-lnk{background:none;border:0;padding:0;color:var(--mut);font-size:11.5px;text-decoration:underline;cursor:pointer}'
  + '.atj-lnk:hover{color:var(--ink)}'
  + '.atj-bar{position:fixed;left:0;right:0;bottom:0;z-index:60;background:#fff;border-top:1px solid var(--ln);'
  +   'padding:12px max(16px,env(safe-area-inset-left,0px)) calc(12px + env(safe-area-inset-bottom,0px))}'
  + '.atj-bar .in{max-width:1180px;margin:0 auto;display:flex;align-items:center;gap:14px;flex-wrap:wrap}'
  + '.atj-tot{flex:1;min-width:160px;font-variant-numeric:tabular-nums}'
  + '.atj-tot b{font-size:19px;font-weight:500;display:block}'
  + '.atj-tot i{font-style:normal;color:var(--ac);font-size:12px}'
  + '.atj-tot em{font-style:normal;color:var(--mut);font-size:11px;letter-spacing:.14em;text-transform:uppercase;display:block;margin-bottom:2px}'
  + '.atj-cta{background:var(--ink);color:#fff;border:0;border-radius:999px;padding:14px 26px;font-size:11.5px;'
  +   'letter-spacing:.16em;text-transform:uppercase;cursor:pointer}'
  + '.atj-cta[disabled]{opacity:.35;cursor:default}'
  + '.atj-ghost{background:none;border:1px solid var(--ln);border-radius:999px;padding:13px 20px;font-size:11.5px;'
  +   'letter-spacing:.16em;text-transform:uppercase;cursor:pointer;color:var(--mut)}'
  + '.atj-ov{position:fixed;inset:0;z-index:70;background:rgba(20,20,20,.5);display:flex;align-items:flex-end;justify-content:center}'
  + '.atj-md{background:var(--bg);width:100%;max-width:980px;max-height:92vh;border-radius:14px 14px 0 0;display:flex;flex-direction:column;overflow:hidden}'
  + '.atj-md header{padding:16px 18px;border-bottom:1px solid var(--ln);display:flex;align-items:center;gap:12px;background:#fff}'
  + '.atj-md header h2{margin:0;font-size:12px;letter-spacing:.17em;text-transform:uppercase;font-weight:400;flex:1}'
  + '.atj-x{border:0;background:none;font-size:22px;line-height:1;cursor:pointer;color:var(--mut)}'
  + '.atj-srch{border:1px solid var(--ln);border-radius:999px;padding:9px 16px;font-size:13px;width:190px;font-family:inherit}'
  + '.atj-md .list{overflow:auto;padding:16px 18px 26px;display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:13px}'
  + '.atj-it{background:#fff;border:1px solid var(--ln);border-radius:10px;overflow:hidden;cursor:pointer;text-align:left;padding:0;font:inherit;color:inherit;display:flex;flex-direction:column}'
  + '.atj-it:hover{border-color:var(--ink)}'
  + '.atj-it img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block;background:#f2efea}'
  + '.atj-it .t{padding:9px 10px 11px;display:flex;flex-direction:column;gap:4px}'
  + '.atj-it .t span{font-size:12.5px;line-height:1.3}'
  + '.atj-it .t b{font-size:13px;font-weight:500;font-variant-numeric:tabular-nums}'
  + '.atj-msg{padding:40px 18px;text-align:center;color:var(--mut);font-size:13.5px;grid-column:1/-1}'
  + '@media(min-width:760px){.atj-ov{align-items:center}.atj-md{border-radius:14px}}'
  + '@media(max-width:480px){.atj-srch{width:120px}.atj-md .list{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}}';

  /* ---------- render ---------- */
  var root, grid, bar;

  function build(){
    root = el('div','atj');
    var w = el('div','atj-w');

    var hd = el('div','atj-hd');
    hd.appendChild(el('h1', null, 'Arma tu juego'));
    hd.appendChild(el('p', null, 'Elegi las piezas una por una con los productos de la tienda. '
      + 'Vas viendo el total mientras armas y lo mandas al carrito de una.'));
    w.appendChild(hd);

    var tabs = el('div','atj-tabs');
    Object.keys(AMB).forEach(function(k){
      var b = el('button','atj-tab', esc(AMB[k].label));
      b.type = 'button';
      b.setAttribute('role','tab');
      b.setAttribute('aria-selected', k === state.amb ? 'true' : 'false');
      b.onclick = function(){ state.amb = k; state.pick = {}; paint(); };
      tabs.appendChild(b);
    });
    w.appendChild(tabs);

    w.appendChild(el('div','atj-kick'));
    grid = el('div','atj-grid');
    w.appendChild(grid);
    root.appendChild(w);

    bar = el('div','atj-bar');
    bar.appendChild(el('div','in'));
    root.appendChild(bar);
    return root;
  }

  function paint(){
    var a = AMB[state.amb];
    var tabs = root.querySelectorAll('.atj-tab');
    Object.keys(AMB).forEach(function(k,i){
      tabs[i].setAttribute('aria-selected', k === state.amb ? 'true' : 'false');
    });
    root.querySelector('.atj-kick').textContent = a.kicker;

    grid.innerHTML = '';
    a.slots.forEach(function(s){
      var sel = state.pick[s.k];
      var card = el('div','atj-slot');

      var ph = el('div','ph');
      if (sel) {
        var im = el('img');
        im.src = sel.p.img; im.alt = sel.p.name; im.loading = 'lazy';
        ph.appendChild(im);
      } else {
        ph.appendChild(el('div','atj-plus','+'));
      }
      ph.onclick = function(){ openPicker(s.k); };
      card.appendChild(ph);

      var bd = el('div','bd');
      bd.appendChild(el('div','lb', esc(s.n)));
      bd.appendChild(el('div','nm', sel ? esc(sel.p.name) : '<span style="color:var(--mut)">Sin elegir</span>'));

      var pr = el('div','pr');
      if (sel) {
        pr.innerHTML = money(sel.p.price * sel.q)
          + (sel.p.transf && sel.p.transf < sel.p.price
              ? '<small>' + money(sel.p.transf * sel.q) + ' por transferencia</small>' : '');
      }
      bd.appendChild(pr);

      var row = el('div','atj-row');
      if (sel && s.max > 1) {
        var q = el('div','atj-qty');
        var minus = el('button', null, '−'); minus.type='button';
        var num = el('span', null, String(sel.q));
        var plus = el('button', null, '+'); plus.type='button';
        minus.onclick = function(){ if (sel.q > 1) { sel.q--; paint(); } };
        plus.onclick  = function(){ if (sel.q < s.max) { sel.q++; paint(); } };
        q.appendChild(minus); q.appendChild(num); q.appendChild(plus);
        row.appendChild(q);
      }
      var act = el('button','atj-lnk', sel ? 'Cambiar' : 'Elegir');
      act.type = 'button';
      act.onclick = function(){ openPicker(s.k); };
      row.appendChild(act);
      if (sel) {
        var rm = el('button','atj-lnk','Quitar');
        rm.type = 'button';
        rm.onclick = function(){ delete state.pick[s.k]; paint(); };
        row.appendChild(rm);
      }
      bd.appendChild(row);
      card.appendChild(bd);
      grid.appendChild(card);
    });

    paintBar();
  }

  function totals(){
    var t = 0, tr = 0, n = 0;
    Object.keys(state.pick).forEach(function(k){
      var s = state.pick[k];
      t += s.p.price * s.q;
      tr += (s.p.transf || s.p.price) * s.q;
      n += s.q;
    });
    return { list:t, transf:tr, units:n, pieces:Object.keys(state.pick).length };
  }

  function paintBar(){
    var t = totals();
    var inn = bar.querySelector('.in');
    inn.innerHTML = '';
    var tot = el('div','atj-tot');
    if (t.pieces) {
      tot.innerHTML = '<em>' + t.pieces + ' piezas &middot; ' + t.units + ' unidades</em>'
        + '<b>' + money(t.list) + '</b>'
        + (t.transf < t.list ? '<i>' + money(t.transf) + ' pagando por transferencia</i>' : '');
    } else {
      tot.innerHTML = '<em>Tu ' + esc(AMB[state.amb].label.toLowerCase()) + '</em>'
        + '<b style="color:var(--mut);font-size:14px">Todavia no elegiste nada</b>';
    }
    inn.appendChild(tot);

    if (t.pieces) {
      var clr = el('button','atj-ghost','Vaciar');
      clr.type = 'button';
      clr.onclick = function(){ state.pick = {}; paint(); };
      inn.appendChild(clr);
    }
    var cta = el('button','atj-cta', 'Agregar todo al carrito');
    cta.type = 'button';
    if (!t.pieces) cta.disabled = true;
    cta.onclick = addAll;
    inn.appendChild(cta);
  }

  /* ---------- selector ---------- */
  function openPicker(key){
    var s = slotOf(key);
    if (!s) return;
    var ov = el('div','atj-ov');
    var md = el('div','atj-md');

    var head = el('header');
    head.appendChild(el('h2', null, esc(s.n)));
    var srch = el('input','atj-srch');
    srch.type = 'search';
    srch.placeholder = 'Buscar...';
    head.appendChild(srch);
    var x = el('button','atj-x','×');
    x.type = 'button';
    x.setAttribute('aria-label','Cerrar');
    head.appendChild(x);
    md.appendChild(head);

    var list = el('div','list');
    list.appendChild(el('div','atj-msg','Cargando productos...'));
    md.appendChild(list);
    ov.appendChild(md);
    D.body.appendChild(ov);
    D.body.style.overflow = 'hidden';

    function close(){
      D.body.style.overflow = '';
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      D.removeEventListener('keydown', onKey);
    }
    function onKey(e){ if (e.key === 'Escape') close(); }
    x.onclick = close;
    ov.onclick = function(e){ if (e.target === ov) close(); };
    D.addEventListener('keydown', onKey);

    Promise.all(s.cats.map(fetchCat)).then(function(res){
      var seen = {}, all = [];
      res.forEach(function(arr){
        arr.forEach(function(p){ if (!seen[p.id]) { seen[p.id] = 1; all.push(p); } });
      });
      function draw(q){
        list.innerHTML = '';
        var f = all;
        if (q) {
          var n = q.toLowerCase();
          f = all.filter(function(p){ return p.name.toLowerCase().indexOf(n) >= 0; });
        }
        if (!f.length) {
          list.appendChild(el('div','atj-msg','No encontramos productos con ese nombre.'));
          return;
        }
        f.forEach(function(p){
          var b = el('button','atj-it');
          b.type = 'button';
          var im = el('img');
          im.src = p.img; im.alt = p.name; im.loading = 'lazy';
          b.appendChild(im);
          var t = el('div','t');
          t.appendChild(el('span', null, esc(p.name)));
          t.appendChild(el('b', null, money(p.price)));
          b.appendChild(t);
          b.onclick = function(){
            state.pick[s.k] = { p:p, q: state.pick[s.k] ? state.pick[s.k].q : (s.qty || 1) };
            close();
            paint();
          };
          list.appendChild(b);
        });
      }
      draw('');
      var tm;
      srch.oninput = function(){
        clearTimeout(tm);
        tm = setTimeout(function(){ draw(srch.value.trim()); }, 180);
      };
    }).catch(function(){
      list.innerHTML = '';
      list.appendChild(el('div','atj-msg','No pudimos cargar los productos. Proba de nuevo en un momento.'));
    });
  }

  /* ---------- carrito ---------- */
  function addOne(p, q){
    var b = new URLSearchParams();
    b.set('add_to_cart', p.id);
    b.set('quantity', String(q));
    return fetch('/comprar/', {
      method:'POST', credentials:'same-origin',
      headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'},
      body: b.toString()
    }).then(function(r){ return r.json(); })
      .then(function(j){ return !!(j && j.success); })
      .catch(function(){ return false; });
  }

  function addAll(){
    var keys = Object.keys(state.pick);
    if (!keys.length) return;
    var cta = bar.querySelector('.atj-cta');
    cta.disabled = true;
    cta.textContent = 'Agregando...';
    var fails = [];
    var chain = Promise.resolve();
    keys.forEach(function(k){
      chain = chain.then(function(){
        var s = state.pick[k];
        return addOne(s.p, s.q).then(function(ok){ if (!ok) fails.push(s.p); });
      });
    });
    chain.then(function(){
      if (fails.length === keys.length) {
        cta.disabled = false;
        cta.textContent = 'Agregar todo al carrito';
        alertBox('No pudimos agregar las piezas al carrito. Proba de nuevo o entra a cada producto.', fails);
        return;
      }
      if (fails.length) {
        alertBox('Agregamos todo menos ' + fails.length + ' pieza(s) que necesitan que elijas una opcion en su ficha:', fails);
        cta.disabled = false;
        cta.textContent = 'Ir al carrito';
        cta.onclick = function(){ location.href = '/comprar/'; };
        return;
      }
      location.href = '/comprar/';
    });
  }

  function alertBox(msg, items){
    var ov = el('div','atj-ov');
    var md = el('div','atj-md');
    md.style.maxWidth = '520px';
    var head = el('header');
    head.appendChild(el('h2', null, 'Atencion'));
    var x = el('button','atj-x','×'); x.type='button';
    head.appendChild(x);
    md.appendChild(head);
    var body = el('div','list');
    body.style.display = 'block';
    body.appendChild(el('p', null, esc(msg)));
    if (items && items.length) {
      var ul = el('ul');
      ul.style.cssText = 'margin:12px 0 0;padding-left:18px;font-size:13.5px;line-height:1.7';
      items.forEach(function(p){
        var li = el('li');
        li.innerHTML = '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.name) + '</a>';
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }
    md.appendChild(body);
    ov.appendChild(md);
    D.body.appendChild(ov);
    function close(){ if (ov.parentNode) ov.parentNode.removeChild(ov); }
    x.onclick = close;
    ov.onclick = function(e){ if (e.target === ov) close(); };
  }

  /* ---------- montaje ---------- */
  function mount(){
    var host = D.getElementById('dd-atj');
    if (!host) {
      var cands = [
        '.template-page .container-fluid',
        '.template-page .container',
        'main .container-fluid',
        'main .container',
        'main'
      ];
      for (var i = 0; i < cands.length && !host; i++) host = D.querySelector(cands[i]);
      if (!host) host = D.body;
      var h = el('div'); h.id = 'dd-atj';
      host.appendChild(h);
      host = h;
    }
    if (!D.getElementById('atj-css')) {
      var st = el('style'); st.id = 'atj-css'; st.textContent = CSS;
      D.head.appendChild(st);
    }
    host.innerHTML = '';
    host.appendChild(build());
    paint();
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
