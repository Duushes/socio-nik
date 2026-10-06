// node --experimental-websocket tools/og.js — превью ссылок для мессенджеров тем же кодом, что и сайт (js/share/card.js):
//   site/og.jpg          — главная (1200×630, JPEG — лёгкий для WhatsApp);
//   site/og/<тип>.jpg    — 16 превью ссылок на результат;
//   site/r/<тип>/index.html — 16 страниц-заглушек: og-теги типа для ботов + мгновенный переход на #/r/<числа>.
// Превью-боты не выполняют JS и не видят #хэш, поэтому у каждого типа своя статичная страница.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { launch } = require('./cdp');

const SITE = path.join(__dirname, '..', 'site');
const OG_VER = '2';   // менять при перерисовке: VK и другие кэшируют картинку по адресу
execSync(`rm -rf /tmp/socionik && cp -R "${SITE}" /tmp/socionik`);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function stub(t, q, base) {
  const page = `${base}r/${t.id}/`, img = `${base}og/${t.id}.jpg?v=${OG_VER}`;
  const title = `Мой соционический тип — ${t.code} «${t.alias}»`;
  const desc = `${t.role} из квадры ${q.name}. А ты кто из 16 типов? 20 вопросов, 4 минуты — и узнаешь, как ладят наши типы.`;
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Socio-Nik</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0c0c0c">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Socio-Nik">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${page}">
<meta property="og:image" content="${img}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(`${t.code} «${t.alias}», ${t.role.toLowerCase()} — и вопрос «А какой тип у тебя?»`)}">
<meta property="og:locale" content="ru_RU">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${img}">
<link rel="icon" type="image/png" href="../../img/logo/mark-64.png">
<style>html { background: #0c0c0c; color: #d7e2ea; font: 16px/1.5 Montserrat, -apple-system, system-ui, sans-serif; }</style>
<script>
  // Числа результата приходят в #хэше: превью-боты и сервер их не видят, а сайт — да. Без чисел — страница типа
  (function () {
    var c = location.hash.slice(1), home = location.protocol === 'file:' ? '../../index.html' : '../../';
    location.replace(home + (/^\\d{1,2}(-\\d{1,3}){4}$/.test(c) ? '#/r/' + c : '#/types/${t.id}'));
  })();
</script>
</head>
<body>
<noscript><p><a href="../../#/types/${t.id}">${esc(t.code)} «${esc(t.alias)}» на Socio-Nik</a></p></noscript>
</body>
</html>
`;
}

(async () => {
  const b = await launch();
  try {
    await b.goto('file:///tmp/socionik/index.html');
    await b.sleep(700);
    const meta = await b.eval(`({ base: Socio.config.SITE_URL, types: Socio.data.types, quadras: Socio.data.quadras })`);
    const base = meta.base.replace(/\/?$/, '/');
    const jpeg = async id => Buffer.from(await b.eval(`Socio.share.ogImage(${JSON.stringify(id)}).then(c => c.toDataURL('image/jpeg', 0.88).split(',')[1])`), 'base64');
    fs.writeFileSync(path.join(SITE, 'og.jpg'), await jpeg(null));
    console.log('→ site/og.jpg', Math.round(fs.statSync(path.join(SITE, 'og.jpg')).size / 1024), 'КБ');
    fs.mkdirSync(path.join(SITE, 'og'), { recursive: true });
    let total = 0;
    for (const t of meta.types) {
      const buf = await jpeg(t.id);
      total += buf.length;
      fs.writeFileSync(path.join(SITE, 'og', t.id + '.jpg'), buf);
      fs.mkdirSync(path.join(SITE, 'r', t.id), { recursive: true });
      fs.writeFileSync(path.join(SITE, 'r', t.id, 'index.html'), stub(t, meta.quadras.find(q => q.id === t.quadra), base));
    }
    console.log(`→ site/og/*.jpg (${meta.types.length}, ${Math.round(total / 1024)} КБ) и site/r/<тип>/index.html`);
    if (b.errors.length) console.log('ошибки:', b.errors.join(' | '));
  } finally {
    await b.close();
  }
})();
