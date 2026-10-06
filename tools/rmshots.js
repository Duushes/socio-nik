// node --experimental-websocket tools/rmshots.js — снимки карты отношений и пары на нескольких экранах + замер «влезает ли в экран»
const path = require('path');
const { execSync } = require('child_process');
const { launch } = require('./cdp');
execSync(`rm -rf /tmp/socionik && cp -R "${path.join(__dirname, '..', 'site')}" /tmp/socionik && mkdir -p /tmp/socionik-shots`);
const SIZES = (process.argv[2] || '1440x900,1366x768,390x844,375x667').split(',');
const ROUTE = process.argv[3] || '#/relations';
const SEL = process.argv[4] || '.relmap';
(async () => {
  const b = await launch();
  try {
    for (const sz of SIZES) {
      const [w, h] = sz.split('x').map(Number), mobile = w < 768;
      await b.viewport(w, h, { mobile, scale: mobile ? 2 : 1 });
      await b.goto('file:///tmp/socionik/index.html' + ROUTE);
      await b.sleep(1200);
      const m = await b.eval(`(async () => {
        const el = document.querySelector(${JSON.stringify(SEL)});
        const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 60;
        scrollTo(0, el.getBoundingClientRect().top + scrollY - nav - 8);
        await new Promise(r => setTimeout(r, 1800));
        const r = el.getBoundingClientRect();
        const kids = Array.from(el.querySelectorAll('.rm-ctl, .rm-stage, .rm-panel .rd')).map(k => { const q = k.getBoundingClientRect(); return k.className.split(' ')[0] + ':' + Math.round(q.top) + '-' + Math.round(q.bottom); });
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, kids };
      })()`);
      const file = await b.shot(`/tmp/socionik-shots/rm-${sz}.png`);
      console.log(sz, m.bottom <= m.vh ? 'ВЛЕЗАЕТ' : `НЕ ВЛЕЗАЕТ на ${m.bottom - m.vh}px`, JSON.stringify(m), b.errors.length ? 'ошибки: ' + b.errors.join(' | ') : '');
    }
  } finally { await b.close(); }
})();
