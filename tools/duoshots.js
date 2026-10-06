// node --experimental-websocket tools/duoshots.js — сцены пар для всех 14 видов (калькулятор, ИЛЭ слева) → лист /tmp/socionik-shots/duo-sheet.png
const path = require('path');
const { execSync } = require('child_process');
const { launch } = require('./cdp');
execSync(`rm -rf /tmp/socionik && cp -R "${path.join(__dirname, '..', 'site')}" /tmp/socionik && mkdir -p /tmp/socionik-shots/duo`);
const RELS = ['dual', 'activation', 'mirror', 'semidual', 'mirage', 'identity', 'kindred', 'business', 'quasi', 'benefactor', 'extinguish', 'superego', 'supervisor', 'conflict'];
const at = Number(process.argv[2] || 1300);
(async () => {
  const b = await launch();
  try {
    await b.viewport(1100, 760);
    await b.goto('file:///tmp/socionik/index.html#/relations');
    await b.sleep(1200);
    for (const rel of RELS) {
      await b.eval(`(async () => {
        const M = Socio.core.modelA, a = document.querySelector('[data-a]'), bb = document.querySelector('[data-b]');
        a.value = 'ile'; bb.value = M.partner(M.type('ile'), ${JSON.stringify(rel)}).id;
        bb.dispatchEvent(new Event('change'));
        const d = document.querySelector('.calc-duo');
        scrollTo(0, d.getBoundingClientRect().top + scrollY - 160);
      })()`);
      await b.sleep(at);
      await b.shot(`/tmp/socionik-shots/duo/${rel}.png`);
      const r = await b.eval(`(() => { const r = document.querySelector('.calc-duo').getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round).join(','); })()`);
      console.log(rel, r);
    }
  } finally { await b.close(); }
})();
