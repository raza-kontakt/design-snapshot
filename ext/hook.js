// Runs in the page's MAIN world at document_start: logs fetch/XHR/IntersectionObserver for later capture.
(() => {
  if (window.__dcHook) return;
  window.__dcHook = true;
  const net = (window.__dcNet = []), ios = (window.__dcIO = []);
  const shape = (v, d = 0) => {
    if (v === null) return 'null';
    if (Array.isArray(v)) return d > 2 ? 'array' : `array(${v.length})<${v.length ? JSON.stringify(shape(v[0], d + 1)) : '?'}>`;
    if (typeof v === 'object') { if (d > 2) return 'object'; const o = {}; for (const k of Object.keys(v).slice(0, 25)) o[k] = shape(v[k], d + 1); return o; }
    return typeof v;
  };
  const gql = (b) => { try { const j = JSON.parse(b); const x = Array.isArray(j) ? j[0] : j; if (x && x.query) return { op: x.operationName, query: String(x.query).slice(0, 400), vars: x.variables ? Object.keys(x.variables) : [] }; } catch {} };
  const push = (r) => { net.push(r); if (net.length > 500) net.shift(); };
  const base = (kind, method, url) => ({ kind, t: Math.round(performance.now()), method: String(method || 'GET').toUpperCase(), url: String(url), phase: document.readyState === 'complete' ? 'after-load' : 'initial', scrollY: Math.round(scrollY) });

  const _f = window.fetch;
  window.fetch = function (input, init) {
    const rec = base('fetch', (init && init.method) || (input && input.method), (input && input.url) || input);
    if (init && typeof init.body === 'string') rec.gql = gql(init.body);
    push(rec);
    const p = _f.apply(this, arguments);
    p.then((r) => {
      rec.status = r.status; rec.ms = Math.round(performance.now() - rec.t);
      const ct = r.headers.get('content-type') || ''; rec.type = ct.split(';')[0];
      if (ct.includes('json')) r.clone().json().then((j) => (rec.shape = shape(j))).catch(() => {});
    }, () => (rec.status = 'failed'));
    return p;
  };

  const XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__dc = [m, u]; return XO.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function (body) {
    const rec = base('xhr', this.__dc && this.__dc[0], this.__dc && this.__dc[1]);
    if (typeof body === 'string') rec.gql = gql(body);
    push(rec);
    this.addEventListener('loadend', () => {
      rec.status = this.status; rec.ms = Math.round(performance.now() - rec.t);
      const ct = this.getResponseHeader('content-type') || ''; rec.type = ct.split(';')[0];
      try { if (ct.includes('json') && (this.responseType === '' || this.responseType === 'text')) rec.shape = shape(JSON.parse(this.responseText)); } catch {}
    });
    return XS.apply(this, arguments);
  };

  const IO = window.IntersectionObserver;
  if (IO) window.IntersectionObserver = class extends IO {
    constructor(cb, opts) {
      super(cb, opts);
      this.__i = { rootMargin: (opts && opts.rootMargin) || '0px', threshold: opts && opts.threshold != null ? opts.threshold : 0, observed: 0, cb: String(cb).replace(/\s+/g, ' ').slice(0, 200) };
      ios.push(this.__i);
    }
    observe(el) { this.__i.observed++; return super.observe(el); }
  };
})();
