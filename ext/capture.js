// Injected into the page MAIN world. Defines window.__dcRun(mode) -> builds a Markdown design dossier and downloads it.
(() => {
  window.__dcRun = async (mode) => {
    let root = document.body;
    if (mode === 'pick') { root = await pick(); if (!root) return toast('Capture cancelled'); }
    if (mode === 'page') await scrollThrough();
    toast('Capturing…');
    let md;
    try { md = await build(root, mode); } catch (e) { console.error(e); return toast('Capture failed: ' + e.message); }
    const name = `design-snapshot-${location.hostname || 'page'}-${Date.now()}.md`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = name; document.documentElement.append(a); a.click(); a.remove();
    let copied = false;
    try { await navigator.clipboard.writeText(md); copied = true; } catch {}
    toast(`Saved ${name} (${Math.round(md.length / 1024)} KB)${copied ? ' + copied to clipboard' : ''}`);
  };

  // Scroll top→bottom in viewport-sized steps so lazy images, scroll reveals and infinite content load, then restore position.
  async function scrollThrough() {
    const startY = scrollY, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const step = Math.max(300, innerHeight * 0.8);
    let y = 0, last = -1, n = 0;
    while (n++ < 150) {
      toast(`Scrolling to load the full page… ${Math.min(100, Math.round(((y + innerHeight) / document.documentElement.scrollHeight) * 100))}%`);
      scrollTo(0, y); await wait(250);
      const h = document.documentElement.scrollHeight;
      if (y + innerHeight >= h) { if (h === last) break; last = h; await wait(600); } else y += step;
    }
    await wait(400);
    scrollTo(0, startY); await wait(200);
  }

  const trunc = (s, n) => (s.length > n ? s.slice(0, n) + `\n… [truncated ${s.length - n} chars]` : s);
  const label = (el) => el.localName + (el.id ? '#' + el.id : '') + [...el.classList].slice(0, 3).map((c) => '.' + c).join('');

  function toast(text) {
    let t = document.getElementById('__dc_toast');
    if (!t) { t = document.createElement('div'); t.id = '__dc_toast'; t.style.cssText = 'position:fixed;z-index:2147483647;right:16px;bottom:16px;background:#111;color:#fff;font:13px system-ui;padding:10px 14px;border-radius:8px;box-shadow:0 4px 16px #0006'; document.documentElement.append(t); }
    t.textContent = text; clearTimeout(t.__h); t.__h = setTimeout(() => t.remove(), 5000);
  }

  function pick() {
    return new Promise((res) => {
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #7c3aed;background:#7c3aed26';
      const tip = document.createElement('div');
      tip.style.cssText = 'position:fixed;z-index:2147483647;left:8px;top:8px;background:#111;color:#fff;font:12px monospace;padding:6px 10px;border-radius:6px;pointer-events:none';
      document.documentElement.append(box, tip);
      let cur;
      const show = () => { if (!cur) return; const r = cur.getBoundingClientRect(); Object.assign(box.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }); tip.textContent = label(cur) + '   (click=select, ↑=parent, Esc=cancel)'; };
      const done = (v) => { ['mousemove', 'click', 'keydown'].forEach((e) => document.removeEventListener(e, h[e], true)); box.remove(); tip.remove(); res(v); };
      const h = {
        mousemove: (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); if (el && el !== box && el !== tip) { cur = el; show(); } },
        click: (e) => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); done(cur); },
        keydown: (e) => { if (e.key === 'Escape') done(null); else if (e.key === 'ArrowUp' && cur && cur.parentElement) { e.preventDefault(); cur = cur.parentElement; show(); } },
      };
      for (const k in h) document.addEventListener(k, h[k], true);
      tip.textContent = 'Hover an element, click to capture (Esc to cancel)';
    });
  }

  // ---------- components ----------
  const fiberOf = (el) => { for (const k in el) if (k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')) return el[k]; };
  function fiberName(f) {
    const t = f.type; if (!t) return null;
    if (typeof t === 'function') return t.displayName || t.name || null;
    if (typeof t === 'object') return t.displayName || (t.render && (t.render.displayName || t.render.name)) || (t.type && (t.type.displayName || t.type.name)) || (String(t.$$typeof).includes('lazy') ? 'Lazy' : null);
    return null;
  }
  function componentOf(el) {
    const f = fiberOf(el);
    if (f) { const chain = []; let c = f.return; while (c && chain.length < 5) { const n = fiberName(c); if (n) chain.push(n); c = c.return; } if (chain.length) return { fw: 'react', name: chain[0], chain }; }
    const vp = el.__vueParentComponent;
    if (vp) { const t = vp.type || {}; const n = t.name || t.__name || (t.__file && t.__file.split('/').pop()); if (n) return { fw: 'vue', name: n }; }
    if (el.__vue__) { const o = el.__vue__.$options || {}; if (o.name || o._componentTag) return { fw: 'vue2', name: o.name || o._componentTag }; }
    try { if (window.ng && window.ng.getComponent) { const c = window.ng.getComponent(el); if (c) return { fw: 'angular', name: c.constructor.name }; } } catch {}
    if (el.localName.includes('-')) return { fw: 'web-component', name: el.localName };
    const d = el.getAttribute('data-component') || el.getAttribute('data-testid') || el.getAttribute('data-cy') || el.getAttribute('data-test');
    if (d) return { fw: 'attr', name: d };
    return null;
  }

  // ---------- html ----------
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  function ser(n, d) {
    const pad = '  '.repeat(d);
    if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, ' ').trim(); return t ? pad + (t.length > 200 ? t.slice(0, 200) + '…' : t) + '\n' : ''; }
    if (n.nodeType !== 1) return '';
    const tag = n.localName;
    let attrs = '';
    for (const a of n.attributes) {
      let v = a.value;
      if (a.name === 'nonce') continue;
      if (v.startsWith('data:')) v = v.slice(0, 30) + '…';
      if (v.length > 300) v = v.slice(0, 300) + '…';
      attrs += ` ${a.name}="${v.replace(/"/g, '&quot;')}"`;
    }
    if (VOID.has(tag)) return `${pad}<${tag}${attrs}>\n`;
    if (tag === 'svg' && n.innerHTML.length > 3000) return `${pad}<svg${attrs}><!-- ${n.childElementCount} child nodes omitted (${n.innerHTML.length} chars) --></svg>\n`;
    if (tag === 'svg') return `${pad}<svg${attrs}>${n.innerHTML.replace(/\s+/g, ' ')}</svg>\n`;
    const kids = [...n.childNodes].map((c) => ser(c, d + 1)).join('');
    if (!kids) return `${pad}<${tag}${attrs}></${tag}>\n`;
    const one = kids.trim();
    if (!one.includes('\n') && one.length < 80 && !one.startsWith('<')) return `${pad}<${tag}${attrs}>${one}</${tag}>\n`;
    return `${pad}<${tag}${attrs}>\n${kids}${pad}</${tag}>\n`;
  }

  // ---------- css ----------
  const PSEUDO = /:{1,2}(hover|focus(-visible|-within)?|active|visited|before|after|placeholder|selection|first-(letter|line)|backdrop|marker|file-selector-button|-[\w-]+)(\([^)]*\))?/g;
  const strip = (s) => s.replace(PSEUDO, '').replace(/(^|[\s>+~,(])(?=[\s>+~,)]|$)/g, '$1*').trim() || '*';

  async function sheetsOf() {
    const out = [], unreadable = [];
    const add = async (sh) => {
      try { out.push({ rules: sh.cssRules, href: sh.href }); }
      catch {
        if (!sh.href) return;
        try {
          const txt = await (await fetch(sh.href)).text();
          const c = new CSSStyleSheet(); c.replaceSync(txt.replace(/@import[^;]+;/g, '')); out.push({ rules: c.cssRules, href: sh.href });
        } catch { unreadable.push(sh.href); }
      }
    };
    for (const sh of document.styleSheets) await add(sh);
    for (const sh of document.adoptedStyleSheets || []) await add(sh);
    return { out, unreadable };
  }

  async function build(root, mode) {
    const els = [root, ...root.querySelectorAll('*')];
    const NOISE = '[class*="cgw"],[id*="cgw"],[class*="hs-web-interactives"],[id*="hs-web-interactives"],[class*="axeptio"],[id*="axeptio"],[id^="__dc_"],grammarly-extension,grammarly-desktop-integration,[data-lastpass-icon-root],[data-1p-ignore],com-1password-button,[id^="onetrust"],#hubspot-messages-iframe-container,[class*="CookieConsent"]';
    const all = els.slice(0, 1500);
    const capped = all.filter((e) => !e.closest(NOISE));

    // components + annotated HTML
    const clone = root.cloneNode(true);
    const cels = [clone, ...clone.querySelectorAll('*')];
    const comps = new Map(), cache = new Map();
    all.forEach((el, i) => {
      if (el.closest(NOISE)) return;
      const c = componentOf(el); cache.set(el, c);
      const pc = el === root ? null : cache.get(el.parentElement);
      if (c && (!pc || pc.name !== c.name)) {
        cels[i].setAttribute('data-cmp', c.name);
        const e = comps.get(c.name) || { fw: c.fw, n: 0, sel: label(el), chain: c.chain };
        e.n++; comps.set(c.name, e);
      }
    });
    clone.querySelectorAll('script,style,noscript,template,' + NOISE).forEach((n) => n.remove());
    const htmlOut = trunc(ser(clone, 0), 400000);

    // computed styles
    const PROPS = ['display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'flex-direction', 'flex-wrap', 'flex', 'justify-content', 'align-items', 'align-self', 'gap', 'grid-template-columns', 'grid-template-rows', 'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height', 'margin', 'padding', 'overflow', 'box-sizing', 'color', 'background-color', 'background-image', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-decoration-line', 'border', 'border-radius', 'box-shadow', 'opacity', 'transform', 'filter', 'backdrop-filter', 'cursor', 'transition', 'animation', 'object-fit', 'aspect-ratio'];
    const INH = new Set(['color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'cursor']);
    const DEF = new Set(['all', '0 1 auto', 'fill', 'none', 'normal', 'auto', '0px', 'static', 'visible', 'rgba(0, 0, 0, 0)', 'start', 'baseline', 'row', 'nowrap', '1', 'content-box', '0px 0px', 'all 0s ease 0s', 'none 0s ease 0s 1 normal none running', '0s', 'repeat', 'left', 'rgb(0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box']);
    const sig = new Map(), colors = {}, fonts = {}, animNames = new Set(), transitions = new Map(), fontFams = new Set();
    const tally = (o, k) => (o[k] = (o[k] || 0) + 1);
    for (const el of capped) {
      const cs = getComputedStyle(el);
      if (!el.offsetParent && cs.position !== 'fixed' && el !== root) continue;
      tally(colors, 'text ' + cs.color); if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') tally(colors, 'bg ' + cs.backgroundColor);
      if (parseFloat(cs.borderTopWidth) > 0) tally(colors, 'border ' + cs.borderTopColor);
      tally(fonts, `${cs.fontFamily} | ${cs.fontSize} | ${cs.fontWeight}`);
      cs.fontFamily.split(',').forEach((f) => fontFams.add(f.trim().replace(/['"]/g, '')));
      if (cs.animationName !== 'none') cs.animationName.split(',').forEach((n) => animNames.add(n.trim()));
      if (cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0)) transitions.set(label(el), `${cs.transitionProperty} ${cs.transitionDuration} ${cs.transitionTimingFunction}${cs.transitionDelay !== '0s' ? ' delay ' + cs.transitionDelay : ''}`);
      const key = el.localName + '|' + [...el.classList].slice(0, 8).join('.');
      const s = sig.get(key);
      if (s) { s.n++; continue; }
      const pcs = el.parentElement ? getComputedStyle(el.parentElement) : null;
      const decl = [];
      for (const p of PROPS) { const v = cs.getPropertyValue(p); if (!v || DEF.has(v) || v.startsWith('0px none')) continue; if (INH.has(p) && pcs && pcs.getPropertyValue(p) === v && el !== root) continue; decl.push(`${p}: ${v.replace(/url\((['"]?)data:[^)]{60,}\)/g, 'url($1data:…omitted$1)')}`); }
      sig.set(key, { el, n: 1, decl, c: cache.get(el) });
    }

    // css rules matching the subtree
    const { out: sheets, unreadable } = await sheetsOf();
    const mc = new Map();
    const hit = (sel) => { if (mc.has(sel)) return mc.get(sel); let r = false; try { const s = strip(sel); r = root.matches(s) || !!root.querySelector(s) || document.documentElement.matches(s) || document.body.matches(s); } catch {} mc.set(sel, r); return r; };
    const matched = [], kf = new Map(), faces = [], vars = [];
    const walk = (rules, ctx) => {
      for (const r of rules) {
        const t = r.constructor.name;
        if (t === 'CSSStyleRule') {
          if (/(:root|^html|^body|\.dark|\.light|\[data-theme|\[data-mode|\[class\*)/.test(r.selectorText)) {
            const vs = []; for (const p of r.style) if (p.startsWith('--')) vs.push(`${p}: ${r.style.getPropertyValue(p).trim()}`);
            if (vs.length) vars.push(`${ctx}${r.selectorText} {\n  ${vs.join(';\n  ')};\n}`);
          }
          if (hit(r.selectorText)) matched.push(ctx ? `${ctx}{ ${r.cssText} }` : r.cssText);
        } else if (t === 'CSSKeyframesRule') kf.set(r.name, r.cssText);
        else if (t === 'CSSFontFaceRule') faces.push(r.cssText);
        else if (t === 'CSSImportRule') { try { walk(r.styleSheet.cssRules, ctx); } catch {} }
        else if (r.cssRules) walk(r.cssRules, `${ctx}${(r.cssText.match(/^@[^{]+/) || [''])[0].trim()} `);
      }
    };
    sheets.forEach((s) => walk(s.rules, ''));
    const cssText = trunc(matched.join('\n').replace(/url\((['"]?)data:[^)]{60,}\)/g, 'url($1data:…omitted$1)'), 400000);
    const kfOut = [...kf].filter(([n, t]) => animNames.has(n) || cssText.includes(n)).map(([, t]) => t);
    const faceOut = faces.filter((f) => [...fontFams].some((n) => n && f.includes(n)));

    // animations at runtime
    let running = [];
    try { running = document.getAnimations().slice(0, 40).map((a) => `${a.constructor.name} ${a.animationName || a.transitionProperty || a.id || ''} on ${a.effect && a.effect.target ? label(a.effect.target) : '?'} (${Math.round(a.effect && a.effect.getTiming().duration || 0)}ms, ${a.playState})`); } catch {}
    const g = (k) => k in window;
    const animLibs = [g('gsap') && 'GSAP', g('anime') && 'anime.js', g('lottie') && 'Lottie', g('ScrollTrigger') && 'ScrollTrigger', g('AOS') && 'AOS', g('Swiper') && 'Swiper', $$('[data-framer-name],[data-projection-id]') && 'Framer Motion', $$('[data-aos]') && 'AOS (data-aos)', $$('[class*="animate-"]') && 'Tailwind animate-*', $$('[class*="animate__"]') && 'Animate.css'].filter(Boolean);
    const scrollTL = matched.some((r) => /animation-timeline|view-timeline|scroll-timeline/.test(r));

    // stack
    const stack = [];
    const hasFiber = els.slice(0, 200).some((e) => fiberOf(e));
    if (hasFiber) stack.push('React'); if (window.__NEXT_DATA__) stack.push('Next.js'); const nuxt = window.__NUXT__ || window.$nuxt || $$('#__nuxt'); if (nuxt) stack.push('Nuxt (Vue)'); if (!nuxt && (window.Vue || els.some((e) => e.__vue__ || e.__vue_app__))) stack.push('Vue');
    if ($$('[ng-version]')) stack.push('Angular ' + $$('[ng-version]').getAttribute('ng-version')); if ($$('[class*="svelte-"]')) stack.push('Svelte'); if (window.__remixContext) stack.push('Remix'); if ($$('astro-island')) stack.push('Astro');
    const cls = els.slice(0, 600).flatMap((e) => (typeof e.className === 'string' ? e.className.split(/\s+/) : []));
    const cnt = (re) => cls.filter((c) => re.test(c)).length;
    if (cnt(/^(p[xytblr]?|m[xytblr]?|text|bg|flex|grid|w|h|gap|rounded)-/) > 20) stack.push('Tailwind CSS');
    if (cnt(/^Mui/) > 0) stack.push('MUI'); if (cnt(/^chakra-/) > 0) stack.push('Chakra UI'); if (cnt(/^ant-/) > 0) stack.push('Ant Design'); if (cnt(/^(btn|col-|container)/) > 5) stack.push('Bootstrap');
    if ($$('style[data-styled]') && cnt(/^sc-[A-Za-z0-9]{5,}$/) > 2) stack.push('styled-components'); if ($$('style[data-emotion]')) stack.push('Emotion'); if ($$('[data-radix-popper-content-wrapper],[data-radix-collection-item]')) stack.push('Radix UI');
    function $$(s) { return document.querySelector(s); }

    // data fetching
    const nav = performance.getEntriesByType('navigation')[0];
    const loadEnd = nav ? nav.loadEventEnd : 0;
    const res = performance.getEntriesByType('resource');
    const lazyScripts = res.filter((r) => r.initiatorType === 'script' && r.startTime > loadEnd && /\.m?js(\?|$)/.test(r.name)).map((r) => r.name);
    const lazyImgs = res.filter((r) => ['img', 'image'].includes(r.initiatorType) && r.startTime > loadEnd).length;
    const TRACK = /(google-analytics|googletagmanager|doubleclick|googleadservices|google\.com\/(pagead|ccm)|facebook\.(com|net)|linkedin\.com\/(px|li)|sentry\.io|hubspot|hs-analytics|hsforms|hotjar|segment\.(io|com)|amplitude|mixpanel|axept|cookiebot|onetrust|clarity\.ms|tiktok|bing\.com\/(action|bat)|criteo|fullstory|datadog|newrelic|nr-data|intercom|optimizely|taboola|outbrain|snapchat|pinterest|\/collect\b|beacon)/i;
    const netAll = window.__dcNet || [];
    const net = netAll.filter((r) => !TRACK.test(r.url) && !/^https?:\/\/(127\.0\.0\.1|localhost):8766\//.test(r.url));
    const trackN = netAll.length - net.length;
    const netLines = net.slice(0, 150).map((r) => `- \`${r.method} ${r.url.slice(0, 200)}\` — ${r.kind}, ${r.status ?? 'pending'}${r.ms != null ? ', ' + r.ms + 'ms' : ''}, ${r.phase}${r.phase === 'after-load' ? ' (scrollY=' + r.scrollY + ')' : ''}${r.type ? ', ' + r.type : ''}` + (r.gql ? `\n  - GraphQL op: ${r.gql.op || '(anon)'} vars: [${r.gql.vars}]\n  \`\`\`graphql\n  ${r.gql.query.replace(/\n/g, '\n  ')}\n  \`\`\`` : '') + (r.shape ? `\n  - response shape: \`${trunc(JSON.stringify(r.shape), 700)}\`` : ''));
    const fallbackNet = res.filter((r) => ['fetch', 'xmlhttprequest', 'beacon'].includes(r.initiatorType) && !TRACK.test(r.name)).slice(0, 60).map((r) => `- \`${r.name.slice(0, 200)}\` — ${r.initiatorType}, started ${Math.round(r.startTime)}ms${r.startTime > loadEnd ? ' (after load)' : ''}, ${Math.round(r.duration)}ms`);
    const blobs = ['__NEXT_DATA__', '__NUXT__', '__APOLLO_STATE__', '__INITIAL_STATE__', '__PRELOADED_STATE__', '__REDUX_STATE__', '__remixContext', '__RELAY_STORE__'].filter(g).map((k) => `${k} (keys: ${Object.keys(window[k] || {}).slice(0, 12).join(', ')})`);
    const ios = (window.__dcIO || []).map((o) => `- rootMargin=${o.rootMargin}, threshold=${JSON.stringify(o.threshold)}, observing ${o.observed} el(s); callback: \`${o.cb}\``);
    const lazyEls = { 'img[loading=lazy]': document.querySelectorAll('img[loading=lazy]').length, 'iframe[loading=lazy]': document.querySelectorAll('iframe[loading=lazy]').length, '[data-src],[data-lazy],[data-srcset]': document.querySelectorAll('[data-src],[data-lazy],[data-srcset]').length, 'link[rel=preload]': document.querySelectorAll('link[rel=preload]').length, 'link[rel=prefetch|modulepreload]': document.querySelectorAll('link[rel=prefetch],link[rel=modulepreload]').length };
    const lazyComps = [...comps].filter(([n]) => n === 'Lazy' || /lazy|suspense/i.test(n)).map(([n]) => n);

    // tokens
    const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `- ${k}  ×${v}`).join('\n');
    const rs = getComputedStyle(document.documentElement);
    const metaTheme = document.querySelector('meta[name=theme-color]');

    const fence = (lang, s) => '```' + lang + '\n' + s + '\n```';
    const compLines = [...comps].map(([n, e]) => `- **${n}** (${e.fw}) ×${e.n} — e.g. \`${e.sel}\`${e.chain && e.chain.length > 1 ? ' ← ' + e.chain.slice(1).join(' ← ') : ''}`).join('\n') || '_No framework component names found (production build minified, or plain HTML)._';
    const styleLines = [...sig.values()].slice(0, 400).map((s) => `### \`${label(s.el)}\`${s.n > 1 ? ' ×' + s.n : ''}${s.c ? ' — component: ' + s.c.name : ''}\n${s.decl.join('; ')}`).join('\n\n');

    return `# Design snapshot: ${document.title}

- **URL:** ${location.href}
- **Captured:** ${new Date().toISOString()}
- **Scope:** ${mode === 'pick' ? 'Picked element `' + label(root) + '`' : 'Whole page (<body>)'} — ${els.length} elements${els.length > capped.length ? ` (first ${capped.length} analysed)` : ''}
- **Viewport:** ${innerWidth}×${innerHeight} @${devicePixelRatio}x, color-scheme: ${rs.colorScheme}${metaTheme ? ', theme-color: ' + metaTheme.content : ''}
- **Detected stack:** ${stack.join(', ') || 'unknown'}

${window.__dcHook ? '' : '> ⚠️ **Network/IntersectionObserver hook was NOT active on this page.** Reload the page (after installing/reloading the extension) and capture again to get API methods, response shapes and scroll-triggered loading.\n\n'}> For the AI agent: this is a reverse-engineered snapshot of a rendered UI. Re-create the structure from **HTML**, take exact values from **Matched CSS / Computed styles / Tokens**, reproduce motion from **Animations**, and mirror loading behaviour from **Data fetching**. \`data-cmp\` attributes in the HTML mark where a framework component starts (added by the capture tool, not in the real DOM).

## 1. Components
${compLines}

## 2. HTML structure
${fence('html', htmlOut)}

## 3. Design tokens
### CSS custom properties
${vars.length ? fence('css', trunc(vars.join('\n'), 80000)) : '_None found._'}
### Colors in use (top)
${top(colors, 25)}
### Typography in use (family | size | weight)
${top(fonts, 15)}
### @font-face (fonts in use)
${faceOut.length ? fence('css', faceOut.join('\n')) : '_None matched._'}

## 4. Matched CSS rules (rules that apply to this subtree, source order)
${unreadable.length ? '_Unreadable cross-origin stylesheets (CORS):_ ' + unreadable.join(', ') + '\n' : ''}${fence('css', cssText)}

## 5. Computed styles (deduped by tag+class; inherited values omitted)
${styleLines}

## 6. Animations & transitions
- **Libraries:** ${animLibs.join(', ') || 'none detected'}${scrollTL ? '\n- Uses CSS scroll/view-driven animation-timeline' : ''}
- **Currently running (${running.length}):** ${running.length ? '\n' + running.map((r) => '  - ' + r).join('\n') : 'none at capture time'}
### Transitions
${[...transitions].slice(0, 40).map(([k, v]) => `- \`${k}\`: ${v}`).join('\n') || '_None._'}
### @keyframes
${kfOut.length ? fence('css', trunc(kfOut.join('\n'), 20000)) : '_None used._'}

## 7. Data fetching & loading behaviour
- **Embedded/hydration state:** ${blobs.join('; ') || 'none detected'}
- **Lazy markers:** ${Object.entries(lazyEls).map(([k, v]) => `${k}: ${v}`).join(', ')}
- **Lazy components:** ${lazyComps.join(', ') || 'none detected'}
- **Assets loaded after window load:** ${lazyScripts.length} script chunk(s), ${lazyImgs} image(s)${lazyScripts.length ? '\n' + lazyScripts.slice(0, 15).map((s) => '  - ' + s).join('\n') : ''}
### IntersectionObserver usage (scroll-triggered loading / reveal)
${ios.join('\n') || (window.__dcHook ? '_None._' : '_Hook inactive — reload the page after installing the extension._')}
### API calls (${window.__dcHook ? 'live log since page start' : 'hook inactive; falling back to Performance API — reload page for full log'})
${netLines.join('\n') || fallbackNet.join('\n') || '_No fetch/XHR calls observed._'}
${trackN ? `\n_${trackN} analytics/tracking/consent call(s) omitted._` : ''}
`;
  }
})();
