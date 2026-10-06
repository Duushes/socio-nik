// node --experimental-websocket tools/sharpness.js — ищет картинки, которые на ретине растянуты больше своего файла (мылятся).
// Компьютер 1440×900 ×2 и телефон 390×844 ×3; страницы прокручиваются до конца, ленивые картинки догружаются.
const path = require('path');
const { execSync } = require('child_process');
const { launch } = require('./cdp');
execSync(`rm -rf /tmp/socionik && cp -R "${path.join(__dirname, '..', 'site')}" /tmp/socionik`);
const ROUTES = ['#/', '?demo=esi#/', '#/test', '?demo=esi#/result', '#/types', '#/types/esi', '#/quadras', '#/relations', '#/relations/ile/lse', '#/box', '#/about'];
(async () => {
  const b = await launch();
  const bad = new Map();
  try {
    for (const [w, h, dpr, mobile] of [[1440, 900, 2, false], [390, 844, 3, true]]) {
      await b.viewport(w, h, { mobile, scale: dpr });
      for (const r of ROUTES) {
        await b.goto('file:///tmp/socionik/index.html' + r);
        await b.sleep(900);
        const found = await b.eval(`(async () => {
          const sleep = ms => new Promise(r => setTimeout(r, ms));
          for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.8) { scrollTo(0, y); await sleep(160); }
          await sleep(600);
          if (document.querySelector('.bx')) { document.querySelector('.bx').click(); await sleep(1600); }
          const out = [];
          document.querySelectorAll('img').forEach(im => {
            const rc = im.getBoundingClientRect();
            if (!im.complete || !im.naturalWidth || rc.width < 8) return;
            // у srcset naturalWidth — в CSS-пикселях; ширину файла берём из описания выбранного кандидата
            let have = im.naturalWidth;
            if (im.srcset) {
              const cur = im.currentSrc;
              im.srcset.split(',').map(x => x.trim().split(/\\s+/)).forEach(([u, d]) => { if (d && /w$/.test(d) && new URL(u, location.href).href === cur) have = parseInt(d, 10); });
            }
            const need = rc.width * devicePixelRatio;
            if (have < need * 0.92) out.push([(im.currentSrc || im.src).split('/socionik/')[1], Math.round(rc.width), Math.round(need), have]);
          });
          return out;
        })()`);
        found.forEach(([src, css, need, have]) => {
          const k = src.replace(/\\?v=.*$/, '');
          const prev = bad.get(k);
          if (!prev || need > prev.need) bad.set(k, { css, need, have, at: `${w}px ${r}` });
        });
      }
    }
  } finally { await b.close(); }
  if (!bad.size) { console.log('ВСЁ ЧЁТКО: ни одна картинка не растянута больше своего файла'); return; }
  console.log('Растянуты больше файла (нужно px → есть px):');
  [...bad.entries()].sort((a, b) => b[1].need / b[1].have - a[1].need / a[1].have).forEach(([k, v]) => console.log(`  ${k}: ${v.need} → ${v.have} (×${(v.need / v.have).toFixed(2)}, ${v.css}px на ${v.at})`));
})();
