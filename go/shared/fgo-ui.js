// Floggy-Go shared UI (leg cards, day tree, options summary, send-in-parts). Source: go/shared/fgo-ui.js, inlined into each import page.
(function (root) {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // one leg card (checkbox, summary line, details); S holds the open state
  function legHtml(it, m, S) {
    var on = m.on(it.i), hasW = it.warn && it.warn.length;
    var open = S.leg[it.key] != null ? S.leg[it.key] : !!hasW;
    return '<div class="fl-leg' + (on ? '' : ' off') + (open ? ' open' : '') + '">' +
      '<input type="checkbox" data-i="' + it.i + '"' + (on ? ' checked' : '') + ' aria-label="Include ' + esc(it.date + ' ' + it.flt) + '">' +
      '<button type="button" class="fl-sum" data-k="' + esc(it.key) + '" aria-expanded="' + open + '">' +
      '<span class="fl-d">' + esc(it.date) + '</span><span class="fl-f">' + esc(it.flt) + '</span><span class="fl-r">' + esc(it.route) + '</span>' +
      '<span class="fl-t">' + (it.times || '') + '</span>' +
      (it.chip ? '<span class="chip ' + esc(it.chip.cls || '') + '">' + esc(it.chip.text) + '</span>' : '') +
      (hasW ? '<span class="fl-w" title="Warning">⚠</span>' : '') + '<span class="fl-chev">▸</span></button>' +
      '<div class="fl-det">' + (it.details || []).filter(function (d) { return d[1] !== '' && d[1] != null; }).map(function (d) { return '<div><span class="fl-dl">' + esc(d[0]) + '</span><span class="fl-dv">' + d[1] + '</span></div>'; }).join('') +
      (hasW ? '<p class="fl-wt">' + esc(it.warn.join(' ')) + '</p>' : '') + '</div></div>';
  }

  // ---- day tree: [Month ›] Block › Day › legs ----
  // el: container. m: { nodes:[{id,title,sub,level,children:[...] | items:[...]}], levels:['month'?,'block'?,'day'], show?, on(i), toggle(idxs,on) }
  // The Show switch sets how far the tree is open: Blocks · Days · All (every leg), offering only the levels the tree has;
  // it starts at m.show, else the first one offered. Any header can still be tapped.
  var SHOW = [['blocks', 'Blocks'], ['days', 'Days'], ['all', 'All']];
  function tree(el, m) {
    var S = el._fgt || (el._fgt = { leg: {}, open: {}, show: m.show || '' });
    S.m = m;
    var shows = SHOW.filter(function (x) { return x[0] === 'all' || m.levels.indexOf(x[0] === 'blocks' ? 'block' : 'day') >= 0; });
    if (!shows.some(function (x) { return x[0] === S.show; })) S.show = shows[0][0];
    var depthOf = { blocks: m.levels.indexOf('block'), days: m.levels.indexOf('day'), all: 99 };
    var all = [], onN = 0;
    function items(n) { return n.items || [].concat.apply([], n.children.map(items)); }
    m.nodes.forEach(function (n) { items(n).forEach(function (it) { all.push(it.i); if (m.on(it.i)) onN++; }); });
    var h = '<div class="fl-top"><label class="fl-all"><input type="checkbox" data-all' + (onN && onN === all.length ? ' checked' : '') + '> All</label>' +
      '<span class="fl-count">' + onN + ' of ' + all.length + ' checked</span>' +
      '<span class="fl-show"><span class="fl-showl">Show</span><span class="seg" role="group" aria-label="Show">' + shows.map(function (x) {
        return '<button type="button" data-show="' + x[0] + '" aria-pressed="' + (S.show === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</span></span></div>';
    if (!all.length) h += '<p class="fl-empty">No legs to show.</p>';
    var ind = [];
    function node(n, depth) {
      var its = items(n), nOn = its.filter(function (it) { return m.on(it.i); }).length, w = its.some(function (it) { return it.warn && it.warn.length; });
      var open = S.open[n.id] != null ? S.open[n.id] : depth < depthOf[S.show];
      if (nOn > 0 && nOn < its.length) ind.push(n.id);
      var r = '<div class="fl-grp fl-' + n.level + (open ? ' open' : '') + (w ? ' fl-hw' : '') + '" data-nid="' + esc(n.id) + '"><div class="fl-gh">' +
        '<input type="checkbox" data-n="' + esc(n.id) + '"' + (nOn === its.length && nOn ? ' checked' : '') + ' aria-label="Check all in ' + esc(n.title) + '">' +
        '<button type="button" class="fl-gt" data-nt="' + esc(n.id) + '" aria-expanded="' + open + '"><span class="fl-chev">▸</span> <strong>' + esc(n.title) + '</strong>' +
        (n.sub ? ' <span class="fl-gs">' + esc(n.sub) + '</span>' : '') + ' <span class="fl-gs">· ' + nOn + '/' + its.length + '</span>' + (w ? ' <span class="fl-w" title="Has warnings">⚠</span>' : '') + '</button></div><div class="fl-gb">';
      if (n.children) n.children.forEach(function (c) { r += node(c, depth + 1); });
      else n.items.forEach(function (it) { r += legHtml(it, m, S); });
      return r + '</div></div>';
    }
    m.nodes.forEach(function (n) { h += node(n, 0); });
    el.innerHTML = h;
    var a = el.querySelector('[data-all]'); if (a) a.indeterminate = onN > 0 && onN < all.length;
    ind.forEach(function (id) { var c = el.querySelector('[data-n="' + id.replace(/"/g, '\\"') + '"]'); if (c) c.indeterminate = true; });
    if (S.bound) return;
    S.bound = true;
    function find(list, id) { for (var k = 0; k < list.length; k++) { if (list[k].id === id) return list[k]; if (list[k].children) { var f = find(list[k].children, id); if (f) return f; } } return null; }
    el.addEventListener('change', function (e) {
      var t = e.target, M = S.m;
      if (t.dataset.i != null) M.toggle([+t.dataset.i], t.checked);
      else if (t.dataset.n != null) { var n = find(M.nodes, t.dataset.n); if (n) M.toggle(items(n).map(function (it) { return it.i; }), t.checked); }
      else if (t.hasAttribute('data-all')) { var ids = []; M.nodes.forEach(function (n) { items(n).forEach(function (it) { ids.push(it.i); }); }); M.toggle(ids, t.checked); }
    });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !el.contains(b)) return;
      if (b.dataset.k != null) { var leg = b.parentNode, o = !leg.classList.contains('open'); leg.classList.toggle('open', o); b.setAttribute('aria-expanded', o); S.leg[b.dataset.k] = o; }
      else if (b.dataset.nt != null) { var g = b.closest('.fl-grp'), go = !g.classList.contains('open'); g.classList.toggle('open', go); b.setAttribute('aria-expanded', go); S.open[b.dataset.nt] = go; }
      else if (b.dataset.show) { S.show = b.dataset.show; S.open = {}; S.leg = {}; tree(el, S.m); }
    });
  }

  // Build the tree from leg items: a day is one date; a block is consecutive days, ending after a day off or a day
  // that ends at base (so back-to-back turns are separate blocks); months on top when asked (Logbook).
  // item needs: _date 'MM/DD/YYYY', _dep, _arv, _kind (e.g. 'Flight', 'Deadhead', 'Ground').
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function dayTree(items, base, withMonths) {
    var days = [], byDate = {};
    items.forEach(function (it) { if (!byDate[it._date]) days.push(byDate[it._date] = { date: it._date, items: [] }); byDate[it._date].items.push(it); });
    var dn = function (mdy) { var p = mdy.split('/').map(Number); return Date.UTC(p[2], p[0] - 1, p[1]) / 864e5; };
    days.sort(function (a, b) { return dn(a.date) - dn(b.date); });
    var blocks = [], cur = null;
    days.forEach(function (d) {
      var last = d.items[d.items.length - 1];
      d.home = !base || last._arv === base;
      if (!cur || cur.closed || dn(d.date) !== dn(cur.days[cur.days.length - 1].date) + 1) blocks.push(cur = { days: [] });
      cur.days.push(d); cur.closed = d.home;
    });
    var dayNode = function (d) {
      var p = d.date.split('/').map(Number), wd = WD[new Date(Date.UTC(p[2], p[0] - 1, p[1])).getUTCDay()];
      var kinds = []; d.items.forEach(function (it) { if (kinds.indexOf(it._kind) < 0) kinds.push(it._kind); });
      return { id: 'd' + d.date, level: 'day', title: wd + ' ' + d.date.slice(0, 5), sub: d.items.length + ' leg' + (d.items.length === 1 ? '' : 's') + ' · ' + kinds.join(', '), items: d.items };
    };
    var blockNode = function (b) {
      var a = b.days[0].date, z = b.days[b.days.length - 1].date, its = [].concat.apply([], b.days.map(function (d) { return d.items; }));
      var fl = its.filter(function (it) { return it._kind === 'Flight' || it._kind === 'Deadhead'; }), st = [];
      fl.forEach(function (it) { if (it._dep !== st[st.length - 1]) st.push(it._dep); st.push(it._arv); });
      var sub = st.length ? (st.length > 6 ? st.slice(0, 3).join('–') + '…' + st[st.length - 1] : st.join('–')) : its.map(function (it) { return it.flt; }).filter(function (x, i, l) { return l.indexOf(x) === i; }).join(' ');
      return { id: 'b' + a, level: 'block', title: a.slice(0, 5) + (z !== a ? '–' + z.slice(0, 5) : '') + ' · ' + b.days.length + ' day' + (b.days.length === 1 ? '' : 's'), sub: sub, children: b.days.map(dayNode) };
    };
    var nodes = blocks.map(blockNode);
    if (!withMonths) return nodes;
    var months = [], byM = {};
    blocks.forEach(function (b, k) {
      var p = b.days[0].date.split('/'), key = p[2] + p[0];
      if (!byM[key]) months.push(byM[key] = { id: 'm' + key, level: 'month', title: MONTHS[+p[0] - 1] + ' ' + p[2], sub: '', children: [] });
      byM[key].children.push(nodes[k]);
    });
    return months;
  }

  // ---- leg cards ----
  // el: container. m: { groups:[{id,title,sub,items:[...]}], on(i)->bool, toggle(idxs, on) }
  // item: { i, key, date, flt, route, sched, actual, chip:{text,cls}, warn:[...], details:[[label, html]] }
  function legs(el, m) {
    var S = el._fgo || (el._fgo = { leg: {}, grp: {} });
    S.m = m;
    var all = [], onN = 0;
    m.groups.forEach(function (g) { g.items.forEach(function (it) { all.push(it.i); if (m.on(it.i)) onN++; }); });
    var h = '<div class="fl-top"><label class="fl-all"><input type="checkbox" data-all' + (onN && onN === all.length ? ' checked' : '') + '> All</label>' +
      '<span class="fl-count">' + onN + ' of ' + all.length + ' checked</span>' +
      '<button type="button" class="fl-link" data-expand="1">Open all</button><button type="button" class="fl-link" data-expand="0">Close all</button></div>';
    if (!all.length) h += '<p class="fl-empty">No legs to show.</p>';
    m.groups.forEach(function (g) {
      var gOn = g.items.filter(function (it) { return m.on(it.i); }).length;
      var gOpen = S.grp[g.id] !== false;
      var gw = g.items.filter(function (it) { return it.warn && it.warn.length; }).length;
      h += '<div class="fl-grp' + (gOpen ? ' open' : '') + '" data-gid="' + esc(g.id) + '"><div class="fl-gh">' +
        '<input type="checkbox" data-g="' + esc(g.id) + '"' + (gOn === g.items.length && gOn ? ' checked' : '') + ' aria-label="Check all in ' + esc(g.title) + '">' +
        '<button type="button" class="fl-gt" data-gt="' + esc(g.id) + '" aria-expanded="' + gOpen + '"><span class="fl-chev">▸</span> <strong>' + esc(g.title) + '</strong>' +
        (g.sub ? ' <span class="fl-gs">' + esc(g.sub) + '</span>' : '') + ' <span class="fl-gs">· ' + gOn + '/' + g.items.length + '</span>' + (gw ? ' <span class="fl-w" title="Has warnings">⚠</span>' : '') + '</button></div><div class="fl-gb">';
      g.items.forEach(function (it) { h += legHtml(it, m, S); });
      h += '</div></div>';
    });
    el.innerHTML = h;
    var a = el.querySelector('[data-all]'); if (a) a.indeterminate = onN > 0 && onN < all.length;
    m.groups.forEach(function (g) {
      var gOn = g.items.filter(function (it) { return m.on(it.i); }).length, c = el.querySelector('[data-g="' + g.id.replace(/"/g, '\\"') + '"]');
      if (c) c.indeterminate = gOn > 0 && gOn < g.items.length;
    });
    if (S.bound) return;
    S.bound = true;
    el.addEventListener('change', function (e) {
      var t = e.target, M = S.m;
      if (t.dataset.i != null) M.toggle([+t.dataset.i], t.checked);
      else if (t.dataset.g != null) { var g = M.groups.filter(function (x) { return x.id === t.dataset.g; })[0]; if (g) M.toggle(g.items.map(function (it) { return it.i; }), t.checked); }
      else if (t.hasAttribute('data-all')) { var ids = []; M.groups.forEach(function (g) { g.items.forEach(function (it) { ids.push(it.i); }); }); M.toggle(ids, t.checked); }
    });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !el.contains(b)) return;
      if (b.dataset.k != null) { var leg = b.parentNode, o = !leg.classList.contains('open'); leg.classList.toggle('open', o); b.setAttribute('aria-expanded', o); S.leg[b.dataset.k] = o; }
      else if (b.dataset.gt != null) { var g = b.closest('.fl-grp'), go = !g.classList.contains('open'); g.classList.toggle('open', go); b.setAttribute('aria-expanded', go); S.grp[b.dataset.gt] = go; }
      else if (b.dataset.expand != null) {
        var o2 = b.dataset.expand === '1';
        Array.prototype.forEach.call(el.querySelectorAll('.fl-leg'), function (l) { l.classList.toggle('open', o2); var s = l.querySelector('.fl-sum'); s.setAttribute('aria-expanded', o2); S.leg[s.dataset.k] = o2; });
        if (o2) Array.prototype.forEach.call(el.querySelectorAll('.fl-grp'), function (g) { g.classList.add('open'); S.grp[g.dataset.gid] = true; });
      }
    });
  }

  // ---- grouping ----
  // trips: a trip starts when a flying leg leaves base and ends when one arrives at base; other duties group alone.
  // trips: a trip starts when a flying leg leaves base and ends with the duty in which it gets back to base;
  // other duties (ground, reserve, sim) inside a trip stay with it, otherwise they group alone.
  function groupTrips(items, base, isFlying, label) {
    var out = [], cur = null;
    items.forEach(function (it) {
      if (cur && cur.home != null && it._duty !== cur.home) cur.closed = true;   // the duty that brought us home has ended
      var fly = isFlying(it);
      if (!fly && (!cur || cur.closed)) { out.push({ id: 'g' + out.length, items: [it], title: label(it), sub: '', closed: true }); cur = null; return; }
      if (fly && (!cur || cur.closed)) { cur = { id: 'g' + out.length, items: [], first: it.date, closed: false, home: null }; out.push(cur); }
      cur.items.push(it); cur.end = it.date;
      if (fly && it._arv === base) cur.home = it._duty; else if (fly) cur.home = null;
    });
    out.forEach(function (g) {
      if (g.title) return;
      var fl = g.items.filter(isFlying), stops = [fl[0]._dep];
      fl.forEach(function (it) { if (it._dep !== stops[stops.length - 1]) stops.push(it._dep); stops.push(it._arv); });
      g.title = 'Trip ' + g.first.slice(0, 5) + (g.end && g.end !== g.first ? '–' + g.end.slice(0, 5) : '');
      g.sub = stops.length > 7 ? stops.slice(0, 3).join('–') + '…' + stops[stops.length - 1] : stops.join('–');
    });
    return out;
  }
  function groupMonths(items) {
    var out = [], idx = {};
    items.forEach(function (it) {
      var p = it.date.split('/'), k = p[2] + p[0];
      if (!idx[k]) { idx[k] = { id: 'm' + k, title: MONTHS[+p[0] - 1] + ' ' + p[2], items: [] }; out.push(idx[k]); }
      idx[k].items.push(it);
    });
    return out;
  }
  function groupBy(items, keyFn, titleFn) {
    var out = [], idx = {};
    items.forEach(function (it) { var k = keyFn(it); if (!idx[k]) { idx[k] = { id: 'k' + out.length, title: titleFn(it, out.length), items: [] }; out.push(idx[k]); } idx[k].items.push(it); });
    return out;
  }

  // ---- options summary ----
  function optSum(el, parts) { var t = parts.filter(Boolean); el.textContent = t.length ? '· ' + t.join(', ') : '· defaults'; }

  // ---- send in parts ----
  // el: container. o: { legs, url(partLegs), max, noun, disabledText, msg(el) }
  function send(el, o) {
    var max = o.max || 100, legs = o.legs, noun = o.noun || 'flight';
    var plural = function (n) { return n + ' ' + (n === 1 ? noun : /[^aeiou]y$/.test(noun) ? noun.slice(0, -1) + 'ies' : noun + 's'); };
    el.innerHTML = '';
    var msg = o.msgEl;
    if (o.disabledText || !legs.length) {
      el.innerHTML = '<span class="btn send" aria-disabled="true">' + esc(o.disabledText || 'Nothing checked') + '</span>';
      if (msg) msg.textContent = ''; return;
    }
    var n = Math.ceil(legs.length / max);
    for (var b = 0; b < n; b++) {
      var part = legs.slice(b * max, (b + 1) * max), url = o.url(part);
      var row = document.createElement('div'); row.className = 'fl-part';
      var a = document.createElement('a'); a.className = 'btn send'; a.href = url;
      a.innerHTML = n === 1 ? 'Send ' + plural(part.length) + ' to LogTen' : 'Send part ' + (b + 1) + ' of ' + n + '<small>' + esc(part[0].date + ' – ' + part[part.length - 1].date) + ' · ' + plural(part.length) + '</small>';
      var c = document.createElement('button'); c.type = 'button'; c.className = 'btn ghost'; c.textContent = n === 1 ? 'Copy LogTen URL' : 'Copy URL';
      (function (u, btn) {
        a.addEventListener('click', function () { if (msg) { msg.textContent = 'Opening LogTen…'; setTimeout(function () { msg.textContent = 'If LogTen didn’t open, use Copy' + (n === 1 ? ' LogTen URL' : ' URL') + ' and paste it into Safari’s address bar.'; }, 2500); } });
        btn.addEventListener('click', function () {
          var done = function () { if (msg) msg.textContent = 'URL copied. Paste it into Safari’s address bar and tap Go.'; };
          if (navigator.clipboard) navigator.clipboard.writeText(u).then(done, fallback); else fallback();
          function fallback() { var ta = document.createElement('textarea'); ta.value = u; ta.readOnly = true; ta.rows = 2; ta.style.width = '100%'; row.appendChild(ta); ta.focus(); ta.select(); if (msg) msg.textContent = 'Selected. Use Copy, then paste into Safari.'; }
        });
      })(url, c);
      row.appendChild(a); row.appendChild(c); el.appendChild(row);
    }
    if (msg) msg.textContent = n > 1 ? plural(legs.length) + ' in ' + n + ' parts of up to ' + max + '. Send each part in turn, letting LogTen finish before the next.' : '';
  }

  // ---- shared aircraft type names ----
  // eCrew-style short code -> "E170" mode name (same as Floggy-Go Schedule/Logbook mapType)
  function typeName(code, mode) {
    if (mode === 'none' || !code) return '';
    if (mode === 'raw') return code;
    return { E75: 'E170', DH4: 'DH8D' }[code] || code;
  }

  root.FGO = { legs: legs, tree: tree, dayTree: dayTree, groupTrips: groupTrips, groupMonths: groupMonths, groupBy: groupBy, optSum: optSum, send: send, typeName: typeName, esc: esc };
})(this);
