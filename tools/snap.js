// node --experimental-websocket tools/snap.js "<?query#/маршрут>" <ширина> <высота> <имя> [селектор] [--mobile] [--dark]
// Скриншот через DevTools с реальным ожиданием анимаций (надёжнее, чем --screenshot с виртуальным временем).
const path = require('path');
const { execSync } = require('child_process');
const { launch } = require('./cdp');

const [route, w, h, name, selector] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const mobile = process.argv.includes('--mobile'), dark = process.argv.includes('--dark');
execSync(`rm -rf /tmp/socionik && cp -R "${path.join(__dirname, '..', 'site')}" /tmp/socionik && mkdir -p /tmp/socionik-shots`);

(async () => {
  const b = await launch();
  try {
    await b.viewport(Number(w), Number(h), { mobile, scale: mobile ? 2 : 1 });
    if (dark) await b.media({ 'prefers-color-scheme': 'dark' });
    await b.goto('file:///tmp/socionik/index.html' + route);
    await b.sleep(1600);
    if (selector) {
      await b.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (el) scrollTo(0, el.getBoundingClientRect().top + scrollY - 80); })()`);
      await b.sleep(1600);
    }
    const file = await b.shot(`/tmp/socionik-shots/${name}.png`);
    console.log(file + (b.errors.length ? ' · ошибки: ' + b.errors.join(' | ') : ''));
  } finally {
    await b.close();
  }
})();
