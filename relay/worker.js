// Floggy-Go Flifo relay (Cloudflare Worker) v2
// Fetches Alaska's public flight status page for one flight and date and
// returns only the fields Flifo needs for each leg (no passenger lists).
// Usage: https://<your-worker>.workers.dev/?flt=2406&date=2026-10-31

const ALLOWED_ORIGINS = ['https://qxav8r.github.io'];

// Read one field from Alaska's page data (same reader as the Flifo bookmarklet)
function field(s, name) {
  const i = s.indexOf(',' + name + ':');
  if (i < 0) return '';
  const a = i + name.length + 2;
  if (s.charAt(a) === '"') {
    const e = s.indexOf('"', a + 1);
    return e < 0 ? '' : s.substring(a + 1, e);
  }
  let e = a;
  while (e < s.length && ',}]'.indexOf(s.charAt(e)) < 0) e++;
  const v = s.substring(a, e);
  return v === 'void 0' || v === 'null' ? '' : v;
}

function parseLegs(html) {
  const start = html.indexOf('flights:[');
  if (start < 0) return [];
  let block = html.substring(start);
  const end = block.indexOf('],anyCancels:');
  if (end > 0) block = block.substring(0, end);
  const parts = block.split('displayDepartureStation:');
  const legs = [];
  for (let k = 1; k < parts.length; k++) {
    const s = ',displayDepartureStation:' + parts[k];
    legs.push({
      dep: field(s, 'displayDepartureStation'),
      arr: field(s, 'displayArrivalStation'),
      atd: field(s, 'displayDepartureTime'),
      ata: field(s, 'displayArrivalTime'),
      std: field(s, 'scheduledDepartureTime'),
      sta: field(s, 'scheduledArrivalTime'),
      tail: field(s, 'tailNumber'),
      equipment: field(s, 'equipmentType'),
      operator: field(s, 'operatingAirlineCode'),
      status: field(s, 'statusMessage'),
      cancelled: field(s, 'cancelled'),
      returned: field(s, 'returned'),
      newArr: field(s, 'newArrivalStation'),
    });
  }
  return legs;
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const reply = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      });

    const url = new URL(request.url);
    const flt = (url.searchParams.get('flt') || '').replace(/\D/g, '');
    const date = url.searchParams.get('date') || '';
    if (!/^\d{1,4}$/.test(flt) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return reply({ ok: false, error: 'Use ?flt=1234&date=YYYY-MM-DD' }, 400);
    }
    const target = 'https://www.alaskaair.com/status/' + parseInt(flt, 10) + '/' + date;
    let html;
    try {
      const r = await fetch(target, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        cf: { cacheTtl: 60, cacheEverything: true },
      });
      if (!r.ok) return reply({ ok: false, error: 'Alaska returned HTTP ' + r.status, source: target }, 502);
      html = await r.text();
    } catch (e) {
      return reply({ ok: false, error: 'Could not reach Alaska: ' + e.message, source: target }, 502);
    }
    return reply({ ok: true, flt: String(parseInt(flt, 10)), date, legs: parseLegs(html), source: target });
  },
};
