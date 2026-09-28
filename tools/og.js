// node --experimental-websocket tools/og.js — рисует превью ссылки site/og.jpg (1200×630, JPEG — лёгкий для WhatsApp) тем же кодом, что и сайт
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { launch } = require('./cdp');

const SITE = path.join(__dirname, '..', 'site');
execSync(`rm -rf /tmp/socionik && cp -R "${SITE}" /tmp/socionik`);
(async () => {
  const b = await launch();
  try {
    await b.goto('file:///tmp/socionik/index.html');
    await b.sleep(700);
    const data = await b.eval(`Socio.share.renderOG(document.createElement('canvas')).toDataURL('image/jpeg', 0.86).split(',')[1]`);
    fs.writeFileSync(path.join(SITE, 'og.jpg'), Buffer.from(data, 'base64'));
    console.log('→ site/og.jpg');
  } finally {
    await b.close();
  }
})();
