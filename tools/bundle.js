// node tools/bundle.js [страница.html …] — однофайловая сборка: CSS и JS встраиваются в HTML, результат в dist/.
// Зачем: панель браузера открывает file:// как снимок без соседних файлов, а знакомым удобнее прислать один файл.
const fs = require('fs');
const path = require('path');
const { SITE, LAZY } = require('./load');

const DIST = path.join(__dirname, '..', 'dist');
const pages = process.argv.length > 2 ? process.argv.slice(2) : ['index.html'];

fs.mkdirSync(DIST, { recursive: true });
// Портреты, знаки и шрифт — растровые файлы: кладём рядом с собранной страницей
for (const dir of ['img', 'fonts', 'js/share/portraits']) fs.cpSync(path.join(SITE, dir), path.join(DIST, dir), { recursive: true });
for (const page of pages) {
  let html = fs.readFileSync(path.join(SITE, page), 'utf8');
  const inline = src => '<script>\n' + fs.readFileSync(path.join(SITE, src.split('?')[0]), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>';
  // в одном файле подгружать нечего: тексты «по требованию» встраиваем сразу, перед приложением
  if (page === 'index.html') html = html.replace(/([ \t]*)(<script src="js\/app\.js[^"]*"><\/script>)/, (_, pad, app) => LAZY.map(src => `${pad}<script src="${src}"></script>\n`).join('') + pad + app);
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => inline(src));
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) =>
    '<style>\n' + fs.readFileSync(path.join(SITE, href.split('?')[0]), 'utf8') + '</style>');
  fs.writeFileSync(path.join(DIST, page), html);
  console.log(`→ dist/${page} (${Math.round(Buffer.byteLength(html) / 1024)} КБ)`);
}
