// Floggy-Go shared "Add to Calendar" fold: Flights, Duty and Day events for UPCOMING legs only.
// Ported from Floggy-Go Pairing's calendar (Floggy's Build ICS / Write ICS Files): timed events in UTC ("Z"),
// UID = SUMMARY + DTSTART + LOCATION + "@floggyxt", so re-importing updates events instead of duplicating them.
// Needs FGOCSV (station time zones). Page calls FGOCAL.mount(el, { legs() }) once and FGOCAL.refresh(el) after each render.
// Leg: { date, flt, dep, arv, kind, std, sta, atd, depDate, arrDate, dutyS, dutySDate, dutyE, dutyEDate, pic, sic, fa1, fa2, remarks }
(function (root) {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var KEY = 'floggyGo.cal.v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) { } }

  function zt(ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function ymd(mdy) { var p = mdy.split('/'); return p[2] + p[0] + p[1]; }
  function nextYmd(mdy) { var p = mdy.split('/').map(Number), d = new Date(Date.UTC(p[2], p[0] - 1, p[1] + 1)); return d.toISOString().slice(0, 10).replace(/-/g, ''); }
  function dnum(mdy) { var p = mdy.split('/').map(Number); return p[2] * 10000 + p[0] * 100 + p[1]; }
  function today() { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function u(date, time, stn) { return time && date ? FGOCSV.utc({ date: date, time: time, stn: stn }, false) : null; }

  function dutyGroups(legs) {            // like Floggy getDutyCal: from a leg with duty on to the next leg with duty off
    var out = [], start = -1;
    legs.forEach(function (L, i) {
      if (L.dutyS) start = i;
      if (L.dutyE && start >= 0) { out.push(legs.slice(start, i + 1)); start = -1; }
    });
    return out;
  }
  function legLine(L) { return L.flt + '\n' + L.dep + ' ' + L.arv + ' ' + (L.std || '') + ' ' + (L.sta || '') + ' \n\n'; }
  function tripDesc(legs) {              // like Floggy getTripdesc
    var d = '';
    dutyGroups(legs).forEach(function (g) {
      d += g[0].date + '\n' + 'Report - ' + g[0].dutyS + '\n\n';
      g.forEach(function (L) { d += legLine(L); });
      d += 'Release - ' + g[g.length - 1].dutyE + '\n\n---------\n\n';
    });
    return d;
  }

  // returns { ev:[...], skipped: n } ; noZone collects stations with no time zone
  function events(legs, kind, noZone) {
    var ev = [];
    if (kind === 'Flights') legs.forEach(function (L) {
      if (!/\d/.test(L.flt) || !L.std || !L.sta || L.atd) return;
      var a = u(L.depDate, L.std, L.dep), b = u(L.arrDate, L.sta, L.arv);
      if (a == null || b == null) { [L.dep, L.arv].forEach(function (s) { if (!FGOCSV.hasZone(s)) noZone[s] = 1; }); return; }
      ev.push({ summary: '\u2708 ' + L.dep + ' ' + L.arv + ' AS ' + L.flt, start: zt(a), end: zt(b), allDay: false,
        location: L.dep + ' ' + L.arv, desc: 'CA- ' + (L.pic || '') + '\nFO- ' + (L.sic || '') + '\nFA- ' + (L.fa1 || '') + '\nFA- ' + (L.fa2 || ''),
        when: L.date + ' ' + L.std + '\u2013' + L.sta });
    });
    if (kind === 'Duty') dutyGroups(legs).forEach(function (g) {
      var A = g[0], B = g[g.length - 1], a = u(A.dutySDate, A.dutyS, A.dep), b = u(B.dutyEDate, B.dutyE, B.arv);
      if (a == null || b == null) { [A.dep, B.arv].forEach(function (s) { if (!FGOCSV.hasZone(s)) noZone[s] = 1; }); return; }
      ev.push({ summary: A.dep + ' ' + B.arv, start: zt(a), end: zt(b), allDay: false, location: A.dep + ' ' + B.arv,
        desc: tripDesc(g), when: A.dutySDate + ' ' + A.dutyS + '\u2013' + B.dutyE });
    });
    if (kind === 'Day') {
      // one all-day event per duty day: first departure to last arrival, or the duty code on a ground/reserve/sim-only day
      var days = [], idx = {};
      legs.forEach(function (L) { if (!idx[L.date]) days.push(idx[L.date] = { date: L.date, legs: [] }); idx[L.date].legs.push(L); });
      days.forEach(function (d) {
        var fl = d.legs.filter(function (L) { return L.kind === '0' || L.kind === '1'; });
        // first departure and last arrival, like Floggy's Duty titles ("PDX SEA"); duty code on a ground/reserve/sim-only day
        var name = fl.length ? fl[0].dep + ' ' + fl[fl.length - 1].arv : d.legs.map(function (L) { return L.flt; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(' ');
        var desc = d.legs.map(function (L) { return (L.kind === '0' || L.kind === '1') ? legLine(L) : L.flt + (L.remarks ? ' ' + L.remarks : '') + (L.std ? ' ' + L.std + '\u2013' + (L.sta || '') : '') + '\n\n'; }).join('');
        ev.push({ summary: name, start: ymd(d.date), end: nextYmd(d.date), allDay: true, location: d.legs[0].dep, desc: desc, when: d.date + ' (all day)' });
      });
    }
    return ev;
  }
  function icsEsc(t) { return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function fold(line) {                  // RFC 5545: lines over 75 octets continue on the next line after a space
    var out = '', cur = '', n = 0;
    Array.from(line).forEach(function (ch) {
      var b = unescape(encodeURIComponent(ch)).length;
      if (n + b > 75) { out += cur + '\r\n '; cur = ''; n = 1; }
      cur += ch; n += b;
    });
    return out + cur;
  }
  function ics(ev, kind) {
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FloggyXT//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + kind], stamp = zt(Date.now());
    ev.forEach(function (e) {
      L.push('BEGIN:VEVENT', 'UID:' + e.summary + e.start + e.location + '@floggyxt', 'DTSTAMP:' + stamp, 'SUMMARY:' + icsEsc(e.summary));
      if (e.allDay) L.push('DTSTART;VALUE=DATE:' + e.start, 'DTEND;VALUE=DATE:' + e.end);
      else L.push('DTSTART:' + e.start, 'DTEND:' + e.end);
      L.push('DESCRIPTION:' + icsEsc(e.desc), 'LOCATION:' + icsEsc(e.location), 'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }

  var KINDS = ['Flights', 'Duty', 'Day'];
  var touch = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  function mount(el, o) {
    var S = el._cal = { o: o, mem: load(), ev: {} };
    el.innerHTML = '<details class="fl-opts fx-fold"><summary>Add to Calendar <span class="fl-os" id="calSum"></span></summary><div class="fx-box"></div></details>';
    S.det = el.firstChild; S.body = S.det.lastChild; S.det.open = !!S.mem.open;
    S.det.addEventListener('toggle', function () { S.mem.open = S.det.open; save(S.mem); });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-calk]'); if (!b) return;
      var k = b.dataset.calk, ev = S.ev[k]; if (!ev || !ev.length) return;
      var d = new Date(), name = k + ' ' + (d.getMonth() + 1) + '-' + d.getDate() + '-' + String(d.getFullYear()).slice(2) + '.ics';
      var url = URL.createObjectURL(new Blob([ics(ev, k)], { type: 'text/calendar;charset=utf-8' }));
      if (touch) location.href = url;
      else { var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      var m = el.querySelector('#calMsg'); if (m) m.textContent = k + ': ' + ev.length + (ev.length === 1 ? ' event' : ' events') + (touch ? ' opened.' : ' saved as ' + name + '.');
    });
    refresh(el);
  }
  function refresh(el) {
    var S = el._cal; if (!S) return;
    var all = []; try { all = S.o.legs() || []; } catch (e) { all = []; }
    var t = today();
    var up = all.filter(function (L) { return dnum(L.date) >= t; }), past = all.length - up.length, noZone = {};
    var rows = '', h = '';
    KINDS.forEach(function (k) {
      var ev = S.ev[k] = events(up, k, noZone);
      ev.forEach(function (e) { rows += '<tr><td>' + esc(k) + '</td><td>' + esc(e.summary) + '</td><td>' + esc(e.when) + '</td><td>' + esc(e.location) + '</td></tr>'; });
    });
    var sum = el.querySelector('#calSum'); if (sum) sum.textContent = '· ' + up.length + ' upcoming leg' + (up.length === 1 ? '' : 's');
    h += '<p class="fx-note">Upcoming legs only (today on), from the legs checked above' + (past ? '; ' + past + ' earlier leg' + (past === 1 ? '' : 's') + ' skipped' : '') +
      '. Same events as Floggy’s Cal–ICS, so importing again updates them instead of adding copies. Flights use scheduled times; a leg already flown is left out. Day is one all-day event per duty day.</p>';
    var nz = Object.keys(noZone);
    if (nz.length) h += '<div class="fx-warn">No time zone for ' + esc(nz.join(', ')) + ': events at those stations left out. Tell Bill so the station gets added.</div>';
    var dis = ''; try { dis = S.o.disabled ? S.o.disabled() || '' : ''; } catch (e) { }
    h += '<div class="fx-act">' + KINDS.map(function (k) { var n = S.ev[k].length; return '<button type="button" class="btn" data-calk="' + k + '"' + (n && !dis ? '' : ' disabled') + '>' + k + ' (' + n + ')</button>'; }).join('') +
      '<span class="fx-msg" id="calMsg">' + esc(dis) + '</span></div>';
    h += rows ? '<details><summary class="fx-note" style="cursor:pointer">Preview events</summary><div class="fx-table" style="margin-top:6px"><table><thead><tr><th>Calendar</th><th>Event</th><th>When (local)</th><th>Location</th></tr></thead><tbody>' + rows + '</tbody></table></div></details>' : '<p class="fx-note">No upcoming events in the checked legs.</p>';
    S.body.innerHTML = h;
  }
  root.FGOCAL = { mount: mount, refresh: refresh, _t: { events: events, ics: ics } };
})(this);
