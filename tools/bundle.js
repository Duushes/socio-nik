// node tools/bundle.js [страница.html …] — однофайловая сборка: CSS и JS встраиваются в HTML, результат в dist/.
// Зачем: панель браузера открывает file:// как снимок без соседних файлов, а знакомым удобнее прислать один файл.
const fs = require('fs');
const path = require('path');
const { SITE } = require('./load');

const DIST = path.join(__dirname, '..', 'dist');
const pages = process.argv.length > 2 ? process.argv.slice(2) : ['index.html'];

fs.mkdirSync(DIST, { recursive: true });
for (const page of pages) {
  let html = fs.readFileSync(path.join(SITE, page), 'utf8');
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) =>
    '<script>\n' + fs.readFileSync(path.join(SITE, src), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>');
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) =>
    '<style>\n' + fs.readFileSync(path.join(SITE, href), 'utf8') + '</style>');
  // Тексты, которые сайт грузит по требованию (разбор пары), в одном файле встраиваем сразу:
  // загрузчик увидит, что всё на месте, и ничего не будет запрашивать
  if (page === 'index.html') {
    const used = new Set([...fs.readFileSync(path.join(SITE, page), 'utf8').matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]));
    const lazy = fs.readdirSync(path.join(SITE, 'js', 'content')).filter(f => f.endsWith('.js')).map(f => 'js/content/' + f).filter(f => !used.has(f)).sort();
    const inline = lazy.map(src => '<script>\n' + fs.readFileSync(path.join(SITE, src), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>').join('\n');
    html = html.replace('</body>', inline + '\n</body>');
    if (lazy.length) console.log(`  + по требованию: ${lazy.join(', ')}`);
  }
  fs.writeFileSync(path.join(DIST, page), html);
  console.log(`→ dist/${page} (${Math.round(Buffer.byteLength(html) / 1024)} КБ)`);
}
