#!/usr/bin/env python3
"""Wire the shared CSV export (all four pages) and Calendar fold (Schedule) into the Floggy-Go import pages.
Run from the go/ folder on the pages as they are in the repo (each page is patched once; rerunning on a
patched page refreshes the inlined shared blocks only)."""
import re, sys

CSS = open('shared/fgo-csv.css', encoding='utf-8').read()
CSV = open('shared/fgo-csv.js', encoding='utf-8').read()
CAL = open('shared/fgo-cal.js', encoding='utf-8').read()


def rep(s, a, b, page):
    n = s.count(a)
    if n != 1:
        sys.exit(f'{page}: expected 1 match, found {n}: {a[:70]!r}')
    return s.replace(a, b)


def inline_blocks(s, page, cal=False):
    """Insert (or refresh) the shared style/script blocks."""
    if 'id="fgo-csv-css"' in s:
        s = re.sub(r'<style id="fgo-csv-css">.*?</style>', lambda m: '<style id="fgo-csv-css">\n' + CSS + '</style>', s, flags=re.S)
        s = re.sub(r'<script id="fgo-csv-js">.*?</script>', lambda m: '<script id="fgo-csv-js">\n' + CSV + '</script>', s, flags=re.S)
        if cal:
            s = re.sub(r'<script id="fgo-cal-js">.*?</script>', lambda m: '<script id="fgo-cal-js">\n' + CAL + '</script>', s, flags=re.S)
        return s, False
    s = rep(s, '<div class="wrap">', '<style id="fgo-csv-css">\n' + CSS + '</style>\n<div class="wrap">', page)
    i = s.index('<script id="fgo-ui-js">')
    j = s.index('</script>', i) + len('</script>')
    blocks = '\n<script id="fgo-csv-js">\n' + CSV + '</script>'
    if cal:
        blocks += '\n<script id="fgo-cal-js">\n' + CAL + '</script>'
    return s[:j] + blocks + s[j:], True


def schedule(s):
    s, fresh = inline_blocks(s, 'schedule', cal=True)
    if not fresh:
        return s
    s = rep(s, '<span class="ver">beta v1.0 · 11/01/26</span>', '<span class="ver">beta v1.1 · 11/01/26</span>', 'schedule')
    s = rep(s, '''  </details>

  <p class="foot">''', '''  </details>

  <div id="csvBox"></div>
  <div id="calBox"></div>

  <p class="foot">''', 'schedule')
    s = rep(s, '''      url: part => 'logten://v2/addEntities?package=' + encodeURIComponent(JSON.stringify(S.buildPackage(part, { duty: st.duty === 'send', capacity: st.cap === 'send' }))) });
  }''', '''      url: part => 'logten://v2/addEntities?package=' + encodeURIComponent(JSON.stringify(S.buildPackage(part, { duty: st.duty === 'send', capacity: st.cap === 'send' }))) });
    FGOCSV.refresh($('csvBox')); FGOCAL.refresh($('calBox'));
  }
  // checked legs -> export rows (Schedule times are station local)
  const checked = () => (st.result && st.result.header.ok) ? st.result.legs.filter((L, i) => !st.off.has(i)) : [];
  function csvRows() {
    const at = (d, t, s) => t ? { date: d, time: t, stn: s } : null;
    return checked().map(L => ({
      date: L.date, flt: L.fltSend, dep: L.dep, arv: L.arv, kind: L.ftype, tail: '', type: L.typeRaw || '',
      pic: L.pic || '', sic: L.sic || '', fa1: L.fa1 || '', fa2: L.fa2 || '', p1: !!L.p1, p2: !!L.p2, pt121: null,
      out: at(L.depDate, L.atd, L.dep), inn: at(L.arrDate, L.ata, L.arv), sOut: at(L.depDate, L.std, L.dep), sIn: at(L.arrDate, L.sta, L.arv),
      dOn: at(L.dutySDate, L.dutyS, L.dep), dOff: at(L.dutyEDate, L.dutyE, L.arv),
      zulu: false, remarks: L.remarks || '', trg: L.trg || '', key: L.key }));
  }
  // checked legs -> calendar legs (bare flight number, as Floggy's events use)
  function calLegs() {
    return checked().map(L => ({ date: L.date, flt: L.fltOut, dep: L.dep, arv: L.arv, kind: L.ftype, std: L.std || '', sta: L.sta || '', atd: L.atd || '',
      depDate: L.depDate, arrDate: L.arrDate, dutyS: L.dutyS, dutySDate: L.dutySDate, dutyE: L.dutyE, dutyEDate: L.dutyEDate,
      pic: L.pic, sic: L.sic, fa1: L.fa1, fa2: L.fa2, remarks: L.remarks || '' }));
  }
  // what the schedule report can't supply, per target
  const LIMITS = {
    foreflight: 'No tail numbers, which ForeFlight requires: enter one tail for every leg, or fix them in ForeFlight after import. No Part 121/91. P1/P2 only where the crew list is clear. Legs not yet flown have no times.',
    logbookpro: 'No tail numbers: enter one for every leg, or leave Aircraft Ident unmapped. No Part 121/91. P1/P2 only where the crew list is clear. Legs not yet flown have no times.',
    myflightbook: 'No tail numbers, which MyFlightbook requires: enter one tail for every leg, or use your anonymous aircraft ID (#123456, shown in MyFlightbook’s aircraft details). No Part 121/91. P1/P2 only where the crew list is clear. Legs not yet flown have no times.',
    sheet: 'No tail numbers or Part 121/91. P1/P2 only where the crew list is clear. For tails and Part 121, export from Floggy-Go Logbook too.'
  };''', 'schedule')
    s = rep(s, '''  run(false);
})();''', '''  FGOCSV.mount($('csvBox'), { page: 'schedule', rows: csvRows, header: () => st.result.header, has121: false, hasTail: false, limits: id => LIMITS[id] });
  FGOCAL.mount($('calBox'), { legs: calLegs });
  run(false);
})();''', 'schedule')
    return s


def logbook(s):
    s, fresh = inline_blocks(s, 'logbook')
    if not fresh:
        return s
    s = re.sub(r'(<span class="ver">beta v)([\d.]+)( · )[\d/]+', lambda m: m.group(1) + bump(m.group(2)) + m.group(3) + '11/01/26', s, count=1)
    s = rep(s, '''  </details>

  <p class="foot">''', '''  </details>

  <div id="csvBox"></div>

  <p class="foot">''', 'logbook')
    s = rep(s, '''      url: part => 'logten://v2/addEntities?package=' + encodeURIComponent(JSON.stringify(G.buildPackage(part, opts))) });
  }''', '''      url: part => 'logten://v2/addEntities?package=' + encodeURIComponent(JSON.stringify(G.buildPackage(part, opts))) });
    FGOCSV.refresh($('csvBox'));
  }
  // checked legs -> export rows (Logbook times are already UTC; sims count their scheduled times, as LogTen does)
  function csvRows() {
    const r = st.result; if (!r || !r.header.ok || !r.legs) return [];
    const at = (v, s) => v ? { date: v.slice(0, 10), time: v.slice(11), stn: s } : null;
    return r.legs.filter((L, i) => !st.off.has(i)).map(L => {
      const act = L.actual || L.ftype === 3;
      return { date: L.date, flt: L.fltSend || L.fltOut, dep: L.dep, arv: L.arv, kind: String(L.ftype), tail: L.tail || '', type: L.typeRaw || '',
        pic: L.pic || '', sic: '', fa1: '', fa2: '', p1: !!L.p1, p2: !!L.p2, pt121: L.ftype === 3 ? null : !!L.pt121,
        out: act ? at(L.utcOut, L.dep) : null, inn: act ? at(L.utcIn, L.arv) : null,
        sOut: act ? null : at(L.utcOut, L.dep), sIn: act ? null : at(L.utcIn, L.arv), dOn: null, dOff: null,
        zulu: true, remarks: L.remarks || '', trg: '', key: L.key };
    });
  }
  const LIMITS = {
    foreflight: 'PIC name only (no SIC or flight attendant names), no duty times or training codes. Tails only on flown legs. Legs not yet flown have no times.',
    logbookpro: 'PIC name only (no SIC or flight attendant names), no duty times or training codes. Tails only on flown legs. Legs not yet flown have no times.',
    myflightbook: 'PIC name only (no SIC or flight attendant names), no duty times or training codes. Tails only on flown legs; legs not yet flown have no times and no tail.',
    sheet: 'PIC name only, no duty times or training codes. For crew and duty times, export from Floggy-Go Schedule too.'
  };''', 'logbook')
    s = rep(s, '''  run();
})();''', '''  FGOCSV.mount($('csvBox'), { page: 'logbook', rows: csvRows, header: () => st.result.header, has121: true, hasTail: true, limits: id => LIMITS[id] });
  run();
})();''', 'logbook')
    return s


def pairing(s):
    s, fresh = inline_blocks(s, 'pairing')
    if not fresh:
        return s
    s = re.sub(r'(<span class="ver">beta v)([\d.]+)( · )[\d/]+', lambda m: m.group(1) + bump(m.group(2)) + m.group(3) + '11/01/26', s, count=1)
    s = rep(s, '''    </section>

    <section id="cal">''', '''    </section>

    <div id="csvBox"></div>

    <section id="cal">''', 'pairing')
    s = rep(s, '''    calRender();
  }''', '''    calRender();
    FGOCSV.refresh($('csvBox'));
  }''', 'pairing')
    s = rep(s, '''  // ---------- Add to Calendar ----------''', '''  // ---------- Export CSV ----------
  // checked legs -> export rows; duty on/off on the first/last checked leg of each duty; tails per the Tail option
  function csvRows() {
    if (!IM.res || !IM.res.ok) return [];
    var at = function (d, t, s) { return t ? { date: d, time: t, stn: s } : null; };
    var sel = IM.res.legs.filter(function (L, i) { return !IM.off[i]; }), first = {}, last = {};
    sel.forEach(function (L, i) { var k = L.dutySDate + ' ' + L.dutyS; if (!L.dutyS) return; if (first[k] == null) first[k] = i; last[k] = i; });
    return sel.map(function (L, i) {
      var k = L.dutySDate + ' ' + L.dutyS, flown = !!L.atd;
      var tail = IM.o.tail === 'none' ? '' : (IM.o.tail === 'flown' && !flown ? '' : (L.tail || ''));
      return { date: L.date, flt: L.fltSend, dep: L.dep, arv: L.arv, kind: L.ftype, tail: tail, type: L.ac || '',
        pic: L.pic, sic: L.sic, fa1: L.fa1, fa2: L.fa2, p1: !!L.p1, p2: !!L.p2, pt121: null,
        out: at(L.actDepDate, L.atd, L.dep), inn: at(L.actArrDate, L.ata, L.arv),
        sOut: flown ? null : at(L.depDate, L.std, L.dep), sIn: flown ? null : at(L.arrDate, L.sta, L.arv),
        dOn: L.dutyS && first[k] === i ? at(L.dutySDate, L.dutyS, L.dep) : null, dOff: L.dutyE && last[k] === i ? at(L.dutyEDate, L.dutyE, L.arv) : null,
        zulu: false, remarks: L.remarks || '', trg: '', key: L.key };
    });
  }
  var LIMITS = {
    foreflight: 'One trip per file: export each pairing once, or flights repeat. Tails follow the Tail option above (when flown, by default). Crew lists only for the current schedule month. No Part 121/91. Legs not yet flown have no times.',
    logbookpro: 'One trip per file: export each pairing once, or flights repeat. Tails follow the Tail option above. Crew lists only for the current schedule month. No Part 121/91. Legs not yet flown have no times.',
    myflightbook: 'One trip per file: export each pairing once, or flights repeat. Tails follow the Tail option above (MyFlightbook requires one on every leg). Crew lists only for the current schedule month. No Part 121/91. Legs not yet flown have no times.',
    sheet: 'One trip per file. Crew lists only for the current schedule month. No Part 121/91.'
  };
  FGOCSV.mount($('csvBox'), { page: 'pairing', rows: csvRows, header: function () { var m = IM.res && IM.res.me || {}; return { name: m.name || '', crewId: m.id || '' }; }, has121: false, hasTail: true, limits: function (id) { return LIMITS[id]; } });

  // ---------- Add to Calendar ----------''', 'pairing')
    return s


def flighty(s):
    s, fresh = inline_blocks(s, 'flighty')
    if not fresh:
        return s
    s = re.sub(r'(<span class="ver">beta v)([\d.]+)( · )[\d/]+', lambda m: m.group(1) + bump(m.group(2)) + m.group(3) + '11/01/26', s, count=1)
    s = rep(s, '''    </section>
  </div>

  <p class="foot">''', '''    </section>

    <div id="csvBox"></div>
  </div>

  <p class="foot">''', 'flighty')
    s = rep(s, '''    FGO.send($('sendBox'), { legs: sel, msgEl: $('sendMsg'), url: function (part) { return 'logten://v2/addEntities?package=' + encodeURIComponent(JSON.stringify(FloggyFlighty.buildPackage(part, S.o))); } });
  }''', '''    FGO.send($('sendBox'), { legs: sel, msgEl: $('sendMsg'), url: function (part) { return 'logten://v2/addEntities?package=' + encodeURIComponent(JSON.stringify(FloggyFlighty.buildPackage(part, S.o))); } });
    FGOCSV.refresh($('csvBox'));
  }
  // checked legs -> export rows (Flighty times are station local with their own dates)
  function csvRows() {
    if (!S.res) return [];
    var all = S.res.legs, at = function (d, t, s) { return t ? { date: d || '', time: t, stn: s } : null; };
    return pool().filter(function (L) { return !S.off[all.indexOf(L)]; }).map(function (L) {
      var flown = !!L.atd;
      return { date: L.date, flt: L.fltSend || L.fltOut, dep: L.dep, arv: L.arv, kind: L.ftype, tail: L.tail || '', type: L.typeCode || '',
        pic: '', sic: '', fa1: '', fa2: '', p1: false, p2: false, pt121: null,
        out: at(L.atdDate, L.atd, L.dep), inn: at(L.ataDate, L.ata, L.arv), sOut: flown ? null : at(L.stdDate, L.std, L.dep), sIn: flown ? null : at(L.staDate, L.sta, L.arv),
        dOn: null, dOff: null, zulu: false, remarks: L.remarks || '', trg: '', key: L.key };
    });
  }
  var LIMITS = {
    foreflight: 'No crew names or P1/P2 (PIC and SIC time left blank), no duty times. Horizon and Alaska flights count as flown flights even if eCrew had them as deadheads. Scheduled times are the airline’s public times.',
    logbookpro: 'No crew names or P1/P2 (PIC and SIC time left blank), no duty times. Horizon and Alaska flights count as flown flights even if eCrew had them as deadheads.',
    myflightbook: 'No crew names or P1/P2 (PIC and SIC time left blank), no duty times. Horizon and Alaska flights count as flown flights even if eCrew had them as deadheads. Scheduled times are the airline’s public times.',
    sheet: 'No crew names, P1/P2 or duty times. Scheduled times are the airline’s public times, not IBT times.'
  };''', 'flighty')
    s = rep(s, '''  $('dh').addEventListener('change', function () { S.o.dh = this.checked; render(); });''', '''  $('dh').addEventListener('change', function () { S.o.dh = this.checked; render(); });
  FGOCSV.mount($('csvBox'), { page: 'flighty', rows: csvRows, header: function () { return { name: 'Flighty', crewId: '' }; }, has121: false, hasTail: true, limits: function (id) { return LIMITS[id]; } });''', 'flighty')
    return s


def bump(v):
    p = v.split('.')
    p[-1] = str(int(p[-1]) + 1)
    return '.'.join(p)


for name, fn in [('schedule', schedule), ('logbook', logbook), ('pairing', pairing), ('flighty', flighty)]:
    path = f'{name}/index.html'
    src = open(path, encoding='utf-8').read()
    open(path, 'w', encoding='utf-8').write(fn(src))
    print('patched', path)
