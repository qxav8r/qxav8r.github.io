// Floggy-Go shared CSV export (target presets, preview, download). Inlined into each import page.
// Page calls FGOCSV.mount(el, { page, header, rows() }) once and FGOCSV.refresh(el) after every render.
// Row shape (one per checked leg), all strings unless noted:
//   date 'MM/dd/yyyy', flt, dep, arv, kind ('0' flight,'1' deadhead,'2' ground,'3' sim,'4' other,'6' reserve)
//   tail, type ('E75' style), pic, sic, fa1, fa2, p1 (bool), p2 (bool), pt121 (bool|null when unknown)
//   out/inn/sOut/sIn/dOn/dOff: { date:'MM/dd/yyyy', time:'HH:mm', stn } or null — actual, scheduled, duty
//   zulu (bool): times are already UTC (Logbook page) instead of station local (Schedule page)
//   remarks, trg, key
(function (root) {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var pad = function (n) { return String(n).padStart(2, '0'); };

  // ---------- station time zones (browser applies DST rules) ----------
  var ZONE = {};
  function z(name, list) { list.split(' ').forEach(function (c) { ZONE[c] = name; }); }
  z('America/Los_Angeles', 'PDX SEA GEG PAE BLI EUG MFR RDM PSC YKM ALW LWS PUW EAT SFO OAK SJC SMF STS MRY FAT SBA SBP SAN LAX BUR ONT SNA LGB PSP LAS RNO ACV CEC RDD OTH');
  z('America/Boise', 'BOI SUN TWF');
  z('America/Denver', 'MSO BZN BIL GTF HLN FCA SLC IDA ABQ ELP DEN COS ASE JAC GJT');
  z('America/Phoenix', 'PHX TUS FLG');
  z('America/Chicago', 'ICT OKC TUL OMA MCI STL MSP DFW AUS ORD IAH MKE');
  z('America/New_York', 'ATL JFK EWR BOS DCA IAD MCO TPA FLL');
  z('America/Anchorage', 'ANC FAI JNU KTN SIT');
  z('America/Vancouver', 'YVR YLW YYJ');
  z('America/Edmonton', 'YYC YEG');
  z('Pacific/Honolulu', 'HNL OGG KOA LIH');
  // more stations from Floggy's airportdata v2.7 (11/10/26; checked against its offsets and DST dates 2007-2030)
  z('America/Los_Angeles', 'BFI HIO MMH PDT VCV');
  z('America/Denver', 'HDN');
  z('America/Chicago', 'AMA BNA DAL DTN FAR GCK MDW ODX OSH RFD SAT');
  z('America/New_York', 'CVG HVN MCN MIA PHL RDU');
  z('America/Detroit', 'DTW CIU PLN');
  z('America/Indiana/Indianapolis', 'IND');
  z('America/Toronto', 'YAM YCE YOW YTZ YUL YXU YYB YYZ');
  z('America/Anchorage', 'ADQ AKN BET BRW CDV DLG ENA OME OTZ SCC YAK');
  z('America/Puerto_Rico', 'SJU');
  z('America/Manaus', 'MAO');
  z('Europe/Amsterdam', 'AMS');
  z('Europe/Warsaw', 'WAW');
  z('Europe/Lisbon', 'LIS');
  // BC and Alberta stay on daylight time from 11/01/2026 (Floggy airportdata); fixed here in case the browser's tables are older
  var PERM = { 'America/Vancouver': { from: Date.UTC(2026, 10, 1, 9), off: -420 }, 'America/Edmonton': { from: Date.UTC(2026, 10, 1, 8), off: -360 } };
  var fmts = {};
  function tzOff(zone, ms) {
    if (PERM[zone] && ms >= PERM[zone].from) return PERM[zone].off;
    var f = fmts[zone] || (fmts[zone] = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }));
    var p = {}; f.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute) - Math.floor(ms / 60000) * 60000) / 60000);
  }
  // { date, time, stn } -> ms (UTC) or null when the station isn't in the list
  function ms(t, zulu) {
    if (!t || !t.date || !t.time) return null;
    var d = t.date.split('/').map(Number), h = t.time.split(':').map(Number);
    var wall = Date.UTC(d[2], d[0] - 1, d[1], h[0], h[1]);
    if (zulu) return wall;
    var zone = ZONE[t.stn]; if (!zone) return null;
    var o = tzOff(zone, wall), u = wall - o * 60000, o2 = tzOff(zone, u);
    return o2 === o ? u : wall - o2 * 60000;
  }

  // ---------- formatting ----------
  function dParts(mdY) { var p = mdY.split('/'); return { m: +p[0], d: +p[1], y: +p[2] }; }
  function fDate(mdY, f) {
    if (!mdY) return ''; var p = dParts(mdY);
    if (f === 'iso') return p.y + '-' + pad(p.m) + '-' + pad(p.d);
    if (f === 'dmy') return p.d + '/' + p.m + '/' + p.y;
    return p.m + '/' + p.d + '/' + p.y;
  }
  function msDate(v) { var t = new Date(v); return pad(t.getUTCMonth() + 1) + '/' + pad(t.getUTCDate()) + '/' + t.getUTCFullYear(); }
  function msTime(v) { var t = new Date(v); return pad(t.getUTCHours()) + ':' + pad(t.getUTCMinutes()); }
  // clock time in the chosen zone: returns { date, time } or null
  function clock(t, row, zone) {
    if (!t || !t.time) return null;
    if (zone === 'utc') { var v = ms(t, row.zulu); return v == null ? null : { date: msDate(v), time: msTime(v) }; }
    if (row.zulu) { var v2 = ms(t, true), zn = ZONE[t.stn]; if (!zn) return null; var lo = v2 + tzOff(zn, v2) * 60000; return { date: msDate(lo), time: msTime(lo) }; }
    return { date: t.date, time: t.time };
  }
  function fTime(c, f) { if (!c) return ''; return f === 'hhmm' ? c.time.replace(':', '') : c.time; }
  function fDur(min, f) {
    if (min == null) return '';
    if (f === 'dec') return (min / 60).toFixed(2);
    if (f === 'min') return String(min);
    return Math.floor(min / 60) + ':' + pad(min % 60);
  }
  function block(row) { var a = ms(row.out, row.zulu), b = ms(row.inn, row.zulu); if (a == null || b == null) return null; var m = Math.round((b - a) / 60000); return m >= 0 && m < 24 * 60 ? m : null; }
  var MODEL = { E75: 'ERJ-175', E7W: 'ERJ-175', E170: 'ERJ-175', DH4: 'DHC-8-400', DH8D: 'DHC-8-400', CR7: 'CRJ-700', CRJ7: 'CRJ-700' };
  var ICAOTYPE = { E75: 'E75L', E7W: 'E75L', E170: 'E75L', DH4: 'DH8D', DH8D: 'DH8D', CR7: 'CRJ7', CRJ7: 'CRJ7' };
  var MAKE = { E: 'Embraer', D: 'De Havilland', C: 'Bombardier' };

  // ---------- targets ----------
  // col: { h: header, v: function(row, c), opt: switch key (optional) }
  // c (context per row): { blk, ctx (settings), tail }
  var TARGETS = {
    foreflight: {
      name: 'ForeFlight', tag: 'ForeFlight',
      note: 'Draft layout from ForeFlight’s published field list. Compare with the template from ForeFlight on the Web (Logbook › Import) before a real import. Dates YYYY-MM-DD, clock times hhmm, total time decimal.',
      fixed: { date: 'iso', dur: 'dec', clock: 'hhmm' }, zone: 'utc', zoneChoice: true, needsTail: true,
      opts: [['flt', 'Flight number (custom field)', true], ['crew', 'Crew names (Person fields)', true], ['dh', 'Deadhead flag (custom field)', true], ['duty', 'Duty on/off', true], ['trg', 'Training code in comments', true]],
      cols: [
        { h: 'Date', v: function (r, c) { return fDate(r.date, 'iso'); } },
        { h: 'AircraftID', v: function (r, c) { return c.tail; } },
        { h: 'From', v: function (r) { return r.dep; } },
        { h: 'To', v: function (r) { return r.arv; } },
        { h: 'Route' }, { h: 'TimeOut', v: function (r, c) { return fTime(clock(r.out, r, c.ctx.zone), 'hhmm'); } },
        { h: 'TimeOff' }, { h: 'TimeOn' },
        { h: 'TimeIn', v: function (r, c) { return fTime(clock(r.inn, r, c.ctx.zone), 'hhmm'); } },
        { h: 'OnDuty', opt: 'duty', v: function (r, c) { return fTime(clock(r.dOn, r, c.ctx.zone), 'hhmm'); } },
        { h: 'OffDuty', opt: 'duty', v: function (r, c) { return fTime(clock(r.dOff, r, c.ctx.zone), 'hhmm'); } },
        { h: 'TotalTime', v: function (r, c) { return r.kind === '1' ? '0.00' : fDur(c.blk, 'dec'); } },
        { h: 'PIC', v: function (r, c) { return r.p1 && r.kind === '0' ? fDur(c.blk, 'dec') : ''; } },
        { h: 'SIC', v: function (r, c) { return r.p2 && r.kind === '0' ? fDur(c.blk, 'dec') : ''; } },
        { h: 'Night' }, { h: 'Solo' }, { h: 'CrossCountry' }, { h: 'PICUS' },
        { h: 'MultiPilot', v: function (r, c) { return r.kind === '0' ? fDur(c.blk, 'dec') : ''; } },
        { h: 'IFR' }, { h: 'Examiner' }, { h: 'NVG' }, { h: 'NVGOps' }, { h: 'Distance' },
        { h: 'DayTakeoffs' }, { h: 'DayLandingsFullStop' }, { h: 'NightTakeoffs' }, { h: 'NightLandingsFullStop' }, { h: 'AllLandings' },
        { h: 'ActualInstrument' }, { h: 'SimulatedInstrument' }, { h: 'GroundTraining' }, { h: 'GroundTrainingGiven' },
        { h: 'HobbsStart' }, { h: 'HobbsEnd' }, { h: 'TachStart' }, { h: 'TachEnd' }, { h: 'Holds' },
        { h: 'Approach1' }, { h: 'Approach2' }, { h: 'Approach3' }, { h: 'Approach4' }, { h: 'Approach5' }, { h: 'Approach6' },
        { h: 'DualGiven' }, { h: 'DualReceived' },
        { h: 'SimulatedFlight', v: function (r, c) { return r.kind === '3' ? fDur(c.blk, 'dec') : ''; } },
        { h: 'InstructorName' }, { h: 'InstructorComments' },
        { h: 'Person1', opt: 'crew', v: function (r, c) { return person(r.pic, 'PIC', c.ctx); } },
        { h: 'Person2', opt: 'crew', v: function (r, c) { return person(r.sic, 'SIC', c.ctx); } },
        { h: 'Person3', opt: 'crew', v: function (r, c) { return person(r.fa1, 'Flight Attendant', c.ctx); } },
        { h: 'Person4', opt: 'crew', v: function (r, c) { return person(r.fa2, 'Flight Attendant', c.ctx); } },
        { h: 'Person5' }, { h: 'Person6' },
        { h: 'PilotComments', v: function (r, c) { return comments(r, c.ctx); } },
        { h: 'FlightReview' }, { h: 'IPC' }, { h: 'CheckRide' }, { h: 'FAA61.58' }, { h: 'NVGProficiency' },
        { h: '[Text]FlightNumber', opt: 'flt', v: function (r) { return r.flt; } },
        { h: '[Text]Deadhead', opt: 'dh', v: function (r) { return r.kind === '1' ? 'Yes' : ''; } }
      ],
      aircraft: ['AircraftID', 'EquipmentType', 'TypeCode', 'Year', 'Make', 'Model', 'Category / Class', 'GearType', 'EngineType', 'Complex', 'HighPerformance', 'Pressurized', 'TAA']
    },
    logbookpro: {
      name: 'Logbook Pro', tag: 'LogbookPro',
      note: 'No fixed column names: map each column once in Logbook Pro’s Import Wizard (File › Import Wizard) and save the mapping as a template. Create custom fields first for anything beyond the standard ones (flight number, crew, deadhead), and make sure the aircraft type exists in Options.',
      fixed: {}, zone: 'local', zoneChoice: true, needsTail: true,
      fmts: { dur: 'hm', date: 'mdy' },
      opts: [['flt', 'Flight number', false], ['crew', 'Crew names', false], ['dh', 'Deadhead', false], ['duty', 'Duty on/off', false], ['trg', 'Training code in remarks', true]],
      cols: [
        { h: 'Date', v: function (r, c) { return fDate(r.date, c.ctx.date); } },
        { h: 'Aircraft Ident', v: function (r, c) { return c.tail; } },
        { h: 'Aircraft Type', v: function (r) { return r.type; } },
        { h: 'Route', v: function (r) { return r.dep + '-' + r.arv; } },
        { h: 'Out', v: function (r, c) { return fTime(clock(r.out, r, c.ctx.zone), 'hh:mm'); } },
        { h: 'In', v: function (r, c) { return fTime(clock(r.inn, r, c.ctx.zone), 'hh:mm'); } },
        { h: 'Duration', v: function (r, c) { return r.kind === '1' ? '' : fDur(c.blk, c.ctx.dur); } },
        { h: 'PIC', v: function (r, c) { return r.p1 && r.kind === '0' ? fDur(c.blk, c.ctx.dur) : ''; } },
        { h: 'SIC', v: function (r, c) { return r.p2 && r.kind === '0' ? fDur(c.blk, c.ctx.dur) : ''; } },
        { h: 'Simulator', v: function (r, c) { return r.kind === '3' ? fDur(c.blk, c.ctx.dur) : ''; } },
        { h: 'Flight Number', opt: 'flt', v: function (r) { return r.flt; } },
        { h: 'Captain', opt: 'crew', v: function (r) { return r.pic; } },
        { h: 'First Officer', opt: 'crew', v: function (r) { return r.sic; } },
        { h: 'Flight Attendants', opt: 'crew', v: function (r) { return [r.fa1, r.fa2].filter(Boolean).join('; '); } },
        { h: 'Deadhead', opt: 'dh', v: function (r) { return r.kind === '1' ? 'Yes' : ''; } },
        { h: 'Duty On', opt: 'duty', v: function (r, c) { var k = clock(r.dOn, r, c.ctx.zone); return k ? fDate(k.date, c.ctx.date) + ' ' + k.time : ''; } },
        { h: 'Duty Off', opt: 'duty', v: function (r, c) { var k = clock(r.dOff, r, c.ctx.zone); return k ? fDate(k.date, c.ctx.date) + ' ' + k.time : ''; } },
        { h: 'Remarks', v: function (r, c) { return comments(r, c.ctx); } }
      ]
    },
    myflightbook: {
      name: 'MyFlightbook', tag: 'MyFlightbook',
      note: 'Column names match MyFlightbook’s import list exactly (Logbook › Import). Block, scheduled and duty times are UTC; total time decimal. Importing adds new flights only, so export each month once.',
      fixed: { date: 'mdy', dur: 'dec' }, zone: 'utc', zoneChoice: false, needsTail: true,
      opts: [['flt', 'Flight Number', true], ['crew', 'Name of PIC / SIC', true], ['fa', 'Flight Attendant Name(s)', true], ['dh', 'Deadhead', true], ['sched', 'Scheduled times', true], ['duty', 'Duty times', true], ['pt121', 'Part 121 Flight', true], ['trg', 'Training code in comments', true]],
      cols: [
        { h: 'Date', v: function (r) { return fDate(r.date, 'mdy'); } },
        { h: 'Tail Number', v: function (r, c) { return c.tail; } },
        { h: 'Model', v: function (r) { return MODEL[r.type] || r.type; } },
        { h: 'From', v: function (r) { return r.dep; } },
        { h: 'To', v: function (r) { return r.arv; } },
        { h: 'Total Flight Time', v: function (r, c) { return r.kind === '1' ? '0' : fDur(c.blk, 'dec'); } },
        { h: 'PIC', v: function (r, c) { return r.p1 && r.kind === '0' ? fDur(c.blk, 'dec') : ''; } },
        { h: 'SIC', v: function (r, c) { return r.p2 && r.kind === '0' ? fDur(c.blk, 'dec') : ''; } },
        { h: 'Ground Simulator', v: function (r, c) { return r.kind === '3' ? fDur(c.blk, 'dec') : ''; } },
        { h: 'Block Out Time', v: function (r) { return mfbStamp(r.out, r); } },
        { h: 'Block In Time', v: function (r) { return mfbStamp(r.inn, r); } },
        { h: 'Flight Number', opt: 'flt', v: function (r) { return r.flt; } },
        { h: 'Name of PIC', opt: 'crew', v: function (r) { return r.pic; } },
        { h: 'Name of SIC', opt: 'crew', v: function (r) { return r.sic; } },
        { h: 'Flight Attendant Name(s)', opt: 'fa', v: function (r) { return [r.fa1, r.fa2].filter(Boolean).join('; '); } },
        { h: 'Deadhead', opt: 'dh', v: function (r) { return r.kind === '1' ? 'Yes' : ''; } },
        { h: 'Scheduled Departure Time', opt: 'sched', v: function (r) { return mfbStamp(r.sOut, r); } },
        { h: 'Scheduled Arrival Time', opt: 'sched', v: function (r) { return mfbStamp(r.sIn, r); } },
        { h: 'Duty Time Start (UTC)', opt: 'duty', v: function (r) { return mfbStamp(r.dOn, r); } },
        { h: 'Duty Time End (UTC)', opt: 'duty', v: function (r) { return mfbStamp(r.dOff, r); } },
        { h: 'Part 121 Flight', opt: 'pt121', v: function (r) { return r.pt121 === true && r.kind === '0' ? 'Yes' : ''; } },
        { h: 'Comments', v: function (r, c) { return comments(r, c.ctx); } }
      ]
    },
    sheet: {
      name: 'Spreadsheet', tag: 'Spreadsheet',
      note: 'Plain columns for Excel, Numbers or any logbook with a column-mapping import (Safelog, mccPilotLog and others).',
      fixed: {}, zone: 'local', zoneChoice: true, needsTail: false, fmts: { dur: 'hm', date: 'iso' },
      opts: [['crew', 'Crew names', true], ['duty', 'Duty on/off', true], ['sched', 'Scheduled times', true], ['key', 'LogTen match key', false]],
      cols: [
        { h: 'Date', v: function (r, c) { return fDate(r.date, c.ctx.date); } },
        { h: 'Flight', v: function (r) { return r.flt; } },
        { h: 'From', v: function (r) { return r.dep; } },
        { h: 'To', v: function (r) { return r.arv; } },
        { h: 'Kind', v: function (r) { return KIND[r.kind] || ''; } },
        { h: 'Type', v: function (r) { return r.type; } },
        { h: 'Tail', v: function (r) { return r.tail; } },
        { h: 'Sched Out', opt: 'sched', v: function (r, c) { return stamp(r.sOut, r, c.ctx); } },
        { h: 'Sched In', opt: 'sched', v: function (r, c) { return stamp(r.sIn, r, c.ctx); } },
        { h: 'Out', v: function (r, c) { return stamp(r.out, r, c.ctx); } },
        { h: 'In', v: function (r, c) { return stamp(r.inn, r, c.ctx); } },
        { h: 'Block', v: function (r, c) { return fDur(c.blk, c.ctx.dur); } },
        { h: 'P1', v: function (r) { return r.p1 ? 'Yes' : ''; } },
        { h: 'P2', v: function (r) { return r.p2 ? 'Yes' : ''; } },
        { h: 'Part 121', v: function (r) { return r.pt121 === true ? 'Yes' : r.pt121 === false ? 'No' : ''; } },
        { h: 'Captain', opt: 'crew', v: function (r) { return r.pic; } },
        { h: 'First Officer', opt: 'crew', v: function (r) { return r.sic; } },
        { h: 'FA1', opt: 'crew', v: function (r) { return r.fa1; } },
        { h: 'FA2', opt: 'crew', v: function (r) { return r.fa2; } },
        { h: 'Duty On', opt: 'duty', v: function (r, c) { return stamp(r.dOn, r, c.ctx); } },
        { h: 'Duty Off', opt: 'duty', v: function (r, c) { return stamp(r.dOff, r, c.ctx); } },
        { h: 'Training', v: function (r) { return r.trg; } },
        { h: 'Remarks', v: function (r) { return r.remarks; } },
        { h: 'Match Key', opt: 'key', v: function (r) { return r.key; } }
      ]
    }
  };
  var KIND = { '0': 'Flight', '1': 'Deadhead', '2': 'Ground', '3': 'Sim', '4': 'Other', '6': 'Reserve' };
  function mfbStamp(t, r) { var k = clock(t, r, 'utc'); return k ? fDate(k.date, 'mdy') + ' ' + k.time : ''; }
  function stamp(t, r, ctx) { var k = clock(t, r, ctx.zone); return k ? fDate(k.date, ctx.date) + ' ' + k.time : ''; }
  // ForeFlight Person fields are the OTHER people on board, so the pilot exporting is left out
  function person(name, role, ctx) { return name && name.trim().replace(/\s+/g, ' ').toUpperCase() !== ctx.self ? name + ';' + role + ';' : ''; }
  function comments(r, ctx) {
    var p = [];
    if (r.remarks && r.remarks !== 'Dead Head') p.push(r.remarks);
    if (ctx.on.trg && r.trg) p.push('Training: ' + r.trg);
    return p.join('; ');
  }

  // ---------- settings memory (this device only) ----------
  var KEY = 'floggyGo.csv.v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) { /* storage off: settings just aren't kept */ } }

  function settings(mem, id) {
    var T = TARGETS[id], s = (mem.t && mem.t[id]) || {}, on = {};
    T.opts.forEach(function (o) { on[o[0]] = s.on && s.on[o[0]] != null ? s.on[o[0]] : o[2]; });
    var rowsDef = id === 'sheet' ? { dh: true, sim: true, gnd: true } : { dh: true, sim: false, gnd: false };
    return {
      on: on,
      zone: T.zoneChoice ? (s.zone || T.zone) : T.zone,
      dur: T.fixed.dur || s.dur || (T.fmts && T.fmts.dur) || 'hm',
      date: T.fixed.date || s.date || (T.fmts && T.fmts.date) || 'mdy',
      rows: Object.assign(rowsDef, s.rows || {})
    };
  }

  // ---------- build ----------
  function build(id, rows, ctx, tail) {
    var T = TARGETS[id], warn = { zone: {}, unflown: 0, tail: 0, cap: 0 };
    var keep = rows.filter(function (r) {
      if (r.kind === '0') return true;
      if (r.kind === '1') return ctx.rows.dh;
      if (r.kind === '3') return ctx.rows.sim;
      return ctx.rows.gnd;
    });
    var cols = T.cols.filter(function (c) { return !c.opt || ctx.on[c.opt]; });
    var out = keep.map(function (r) {
      // ground, reserve and other duties have duty time, not block time
      var blk = (r.kind === '2' || r.kind === '6' || r.kind === '4') ? null : block(r);
      // ...and no block out/in either, except in the plain spreadsheet
      if (blk == null && id !== 'sheet' && (r.kind === '2' || r.kind === '6' || r.kind === '4')) r = Object.assign({}, r, { out: null, inn: null });
      [r.out, r.inn].forEach(function (t) { if (t && t.time && !r.zulu && !ZONE[t.stn]) warn.zone[t.stn] = 1; });
      if ((r.kind === '0' || r.kind === '3') && blk == null) warn.unflown++;
      var tl = r.tail || tail || '';
      if (T.needsTail && !tl && r.kind !== '2' && r.kind !== '6') warn.tail++;
      if (r.kind === '0' && !r.p1 && !r.p2) warn.cap++;
      var c = { blk: blk, ctx: ctx, tail: tl };
      return cols.map(function (col) { return col.v ? (col.v(r, c) || '') : ''; });
    });
    return { cols: cols, data: out, rows: keep, warn: warn };
  }
  function csvCell(v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function csvLine(a) { return a.map(csvCell).join(','); }
  function toCSV(id, b, tail) {
    var lines = [];
    if (id === 'foreflight') {
      var T = TARGETS.foreflight, tails = {};
      b.rows.forEach(function (r) { var t = r.tail || tail; if (t) tails[t] = tails[t] || r.type; });
      lines.push(csvLine(['ForeFlight Logbook Import', 'This row is required for importing into ForeFlight. Do not delete or modify.']));
      lines.push('');
      lines.push('Aircraft Table');
      lines.push(csvLine(T.aircraft));
      Object.keys(tails).forEach(function (t) {
        var ty = tails[t] || 'E75';
        lines.push(csvLine([t, 'aircraft', ICAOTYPE[ty] || ty, '', MAKE[ty.charAt(0)] || '', MODEL[ty] || ty, '', '', '', '', '', '', '']));
      });
      lines.push('');
      lines.push('Flights Table');
      lines.push(csvLine(TARGETS.foreflight.cols.map(function (c) { return c.h; })));
      // ForeFlight wants every column, filled or not
      var all = TARGETS.foreflight.cols, used = b.cols;
      b.data.forEach(function (d) { lines.push(csvLine(all.map(function (c) { var i = used.indexOf(c); return i >= 0 ? d[i] : ''; }))); });
    } else {
      lines.push(csvLine(b.cols.map(function (c) { return c.h; })));
      b.data.forEach(function (d) { lines.push(csvLine(d)); });
    }
    return lines.join('\r\n') + '\r\n';
  }
  function fileName(hdr, id, rows) {
    var ds = rows.map(function (r) { return fDate(r.date, 'iso'); }).sort();
    var last = (hdr.name || '').split(/\s+/)[0].replace(/[^A-Za-z-]/g, '').toUpperCase() || 'PILOT';
    var who = last + (hdr.crewId ? '-' + hdr.crewId : '');
    return who + '_' + TARGETS[id].tag + '_' + (ds.length ? ds[0] + '_to_' + ds[ds.length - 1] : 'empty') + '.csv';
  }

  // ---------- UI ----------
  function seg(label, key, choices, cur) {
    return '<div class="fx-col"><span class="lbl">' + esc(label) + '</span><div class="seg" role="group" aria-label="' + esc(label) + '">' +
      choices.map(function (c) { return '<button type="button" data-fx="' + key + '" data-v="' + c[0] + '" aria-pressed="' + (c[0] === cur) + '">' + esc(c[1]) + '</button>'; }).join('') + '</div></div>';
  }
  function chk(key, label, on) { return '<label class="opt"><input type="checkbox" data-fxo="' + key + '"' + (on ? ' checked' : '') + '> ' + esc(label) + '</label>'; }

  function mount(el, o) {
    var S = el._fx = { o: o, mem: load() };
    el.innerHTML = '<details class="fl-opts fx-fold"><summary>Export CSV for another logbook <span class="fl-os" id="fxSum"></span></summary><div class="fx-box"></div></details>';
    S.det = el.firstChild; S.body = S.det.lastChild;
    S.det.open = !!S.mem.open;   // closed until the pilot opens it; remembered on this device
    S.det.addEventListener('toggle', function () { S.mem.open = S.det.open; save(S.mem); });
    el.addEventListener('change', function (e) {
      var t = e.target, id = S.mem.target; if (!id && t.id !== 'fxTarget') return;
      if (t.id === 'fxTarget') { S.mem.target = t.value; save(S.mem); refresh(el); return; }
      var st = cur(S);
      if (t.dataset.fxo) st.on[t.dataset.fxo] = t.checked;
      if (t.dataset.fxr) st.rows[t.dataset.fxr] = t.checked;
      store(S, st); refresh(el);
    });
    el.addEventListener('input', function (e) { if (e.target.id === 'fxTail') { S.mem.tail = e.target.value.toUpperCase().trim(); save(S.mem); clearTimeout(S.tm); S.tm = setTimeout(function () { refresh(el, true); }, 400); } });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.fx) { var st = cur(S); st[b.dataset.fx] = b.dataset.v; store(S, st); refresh(el); }
      else if (b.id === 'fxDown') download(S);
      else if (b.id === 'fxCopy') copy(S);
    });
    refresh(el);
  }
  function cur(S) { return settings(S.mem, S.mem.target); }
  // page callbacks never take the page down: no file parsed yet just means no rows / no pilot
  function safe(fn, dflt) { try { var v = fn ? fn() : dflt; return v == null ? dflt : v; } catch (e) { return dflt; } }
  function store(S, st) { S.mem.t = S.mem.t || {}; S.mem.t[S.mem.target] = st; save(S.mem); }

  function refresh(el, keepFocus) {
    var S = el._fx; if (!S) return;
    var o = S.o, id = S.mem.target && TARGETS[S.mem.target] ? S.mem.target : '';
    var sum = el.querySelector('#fxSum'); if (sum) sum.textContent = '· ' + (id ? TARGETS[id].name : 'choose a logbook');
    var h = '<div class="fx-head"><select id="fxTarget" aria-label="Target logbook"><option value="">Choose a logbook…</option>' +
      Object.keys(TARGETS).map(function (k) { return '<option value="' + k + '"' + (k === id ? ' selected' : '') + '>' + esc(TARGETS[k].name) + '</option>'; }).join('') + '</select></div>';
    if (!id) {
      S.body.innerHTML = h + '<p class="fx-note">For pilots who keep ForeFlight, Logbook Pro, MyFlightbook or a spreadsheet instead of (or as well as) LogTen. Pick one to preview the file; it uses the legs checked above.</p>';
      S.last = null; return;
    }
    var T = TARGETS[id], ctx = settings(S.mem, id), rows = safe(o.rows, []), tail = S.mem.tail || '', hdr = safe(o.header, {});
    ctx.self = String(hdr.name || '').trim().replace(/\s+/g, ' ').toUpperCase();
    var b = build(id, rows, ctx, tail);
    S.last = { id: id, b: b, tail: tail };
    h += '<p class="fx-note">' + esc(T.note) + '</p>';
    var lim = safe(o.limits && function () { return o.limits(id); }, '');
    if (lim) h += '<p class="fx-lim"><strong>From this report:</strong> ' + esc(lim) + '</p>';
    h += '<div class="fx-grid">';
    h += '<div class="fx-col"><span class="lbl">Columns</span>' + T.opts.filter(function (x) { return x[0] !== 'pt121' || o.has121; }).map(function (x) { return chk(x[0], x[1], ctx.on[x[0]]); }).join('') + '</div>';
    h += '<div class="fx-col"><span class="lbl">Rows</span>' + '<label class="opt"><input type="checkbox" disabled checked> Flights</label>' +
      '<label class="opt"><input type="checkbox" data-fxr="dh"' + (ctx.rows.dh ? ' checked' : '') + '> Deadheads</label>' +
      '<label class="opt"><input type="checkbox" data-fxr="sim"' + (ctx.rows.sim ? ' checked' : '') + '> Sims</label>' +
      '<label class="opt"><input type="checkbox" data-fxr="gnd"' + (ctx.rows.gnd ? ' checked' : '') + '> Ground &amp; reserve</label></div>';
    h += '<div class="fx-col" style="gap:10px">';
    if (T.zoneChoice) h += seg('Clock times', 'zone', [['local', 'Station local'], ['utc', 'UTC']], ctx.zone);
    if (!T.fixed.dur) h += seg('Durations', 'dur', [['hm', 'h:mm'], ['dec', 'Decimal'], ['min', 'Minutes']], ctx.dur);
    if (!T.fixed.date) h += seg('Dates', 'date', [['mdy', 'M/D/Y'], ['iso', 'Y-M-D'], ['dmy', 'D/M/Y']], ctx.date);
    if (T.needsTail && !o.hasTail) h += '<div class="fx-col"><span class="lbl">Tail number</span><input type="text" id="fxTail" value="' + esc(tail) + '" placeholder="e.g. N401QX" autocomplete="off" spellcheck="false"><span class="fx-note" style="font-size:.78rem">This report has no tails; used for every leg.</span></div>';
    h += '</div></div>';
    // warnings
    var w = [], zs = Object.keys(b.warn.zone);
    if (zs.length) w.push('No time zone for ' + zs.join(', ') + ': ' + (ctx.zone === 'utc' ? 'UTC' : 'converted') + ' times and block left blank for those legs. Tell Bill so the station gets added.');
    if (b.warn.unflown) w.push(b.warn.unflown + ' flight' + (b.warn.unflown === 1 ? '' : 's') + ' not flown yet (no actual out and in): total time left blank. Uncheck them above or export after they fly.');
    if (b.warn.tail) w.push('No tail number for ' + b.warn.tail + ' leg' + (b.warn.tail === 1 ? '' : 's') + '. ' + T.name + ' needs one' + (o.hasTail ? '.' : ': enter it above.'));
    if (b.warn.cap && id !== 'sheet') w.push(b.warn.cap + ' flight' + (b.warn.cap === 1 ? '' : 's') + ' with no P1/P2: PIC and SIC left blank.');
    if (w.length) h += '<div class="fx-warn"><strong>Check before exporting</strong><ul>' + w.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    // preview: filled columns only
    var fill = b.cols.map(function (c, i) { return b.data.some(function (d) { return d[i] !== ''; }); });
    var show = b.cols.map(function (c, i) { return i; }).filter(function (i) { return fill[i]; });
    h += '<div class="fx-table"><table><thead><tr>' + show.map(function (i) { return '<th>' + esc(b.cols[i].h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      (b.data.length ? b.data.map(function (d) { return '<tr>' + show.map(function (i) { return '<td>' + esc(d[i]) + '</td>'; }).join('') + '</tr>'; }).join('') : '<tr><td>No legs checked.</td></tr>') + '</tbody></table></div>';
    var hidden = b.cols.length - show.length + (id === 'foreflight' ? TARGETS.foreflight.cols.length - b.cols.length : 0);
    if (hidden || id === 'foreflight') h += '<p class="fx-note">' + (hidden ? hidden + ' empty column' + (hidden === 1 ? '' : 's') + ' not shown' : '') + (id === 'foreflight' ? (hidden ? '; ' : '') + 'the file also has the Aircraft table and every template column.' : '.') + '</p>';
    var fn = fileName(hdr, id, b.rows), dis = safe(o.disabled, '');
    h += '<div class="fx-act">' + (dis || !b.data.length
      ? '<span class="btn send" aria-disabled="true">' + esc(dis || 'Nothing to export') + '</span>'
      : '<button type="button" class="btn" id="fxDown">Download ' + b.data.length + ' row' + (b.data.length === 1 ? '' : 's') + '<small>' + esc(fn) + '</small></button><button type="button" class="btn ghost" id="fxCopy">Copy CSV</button>') +
      '<span class="fx-msg" id="fxMsg"></span></div>';
    var hist = (S.mem.hist || []).filter(function (x) { return x.target === id; })[0];
    if (hist) h += '<p class="fx-hist">Last ' + esc(T.name) + ' export on this device: ' + esc(hist.file) + ' (' + hist.n + ' rows) on ' + esc(hist.when) + '.</p>';
    var focusTail = keepFocus && document.activeElement && document.activeElement.id === 'fxTail', pos = focusTail ? document.activeElement.selectionStart : 0;
    S.body.innerHTML = h;
    if (focusTail) { var ti = el.querySelector('#fxTail'); ti.focus(); ti.setSelectionRange(pos, pos); }
    S.file = fn;
  }
  function note(S, t) { var m = document.getElementById('fxMsg'); if (m) m.textContent = t; }
  function remember(S) {
    var L = S.last, now = new Date();
    S.mem.hist = [{ target: L.id, file: S.file, n: L.b.data.length, when: (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear() }].concat(S.mem.hist || []).slice(0, 20);
    save(S.mem);
  }
  function download(S) {
    var L = S.last; if (!L) return;
    var blob = new Blob([toCSV(L.id, L.b, L.tail)], { type: 'text/csv' }), u = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = u; a.download = S.file; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
    remember(S); note(S, 'Saved to Downloads.');
  }
  function copy(S) {
    var L = S.last; if (!L) return; var t = toCSV(L.id, L.b, L.tail);
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { remember(S); note(S, 'CSV copied.'); }, function () { note(S, 'Copy blocked; use Download.'); });
    else note(S, 'Copy not available; use Download.');
  }

  root.FGOCSV = { mount: mount, refresh: function (el) { refresh(el); }, utc: function (t, zulu) { return ms(t, zulu); }, hasZone: function (stn) { return !!ZONE[stn]; }, _t: { ms: ms, tzOff: tzOff, ZONE: ZONE, build: build, toCSV: toCSV, settings: settings, TARGETS: TARGETS, fileName: fileName } };
})(this);
