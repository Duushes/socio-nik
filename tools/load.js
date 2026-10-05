// Грузит скрипты сайта в изолированный контекст Node — в том же порядке, что и tests.html в браузере.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE = path.join(__dirname, '..', 'site');

function scriptsOf(htmlFile) {
  const html = fs.readFileSync(path.join(SITE, htmlFile), 'utf8');
  return [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1].split('?')[0]);   // без ?v= — версии сборки
}

function load(htmlFile = 'tests.html') {
  const ctx = vm.createContext({ console });
  for (const src of scriptsOf(htmlFile)) {
    vm.runInContext(fs.readFileSync(path.join(SITE, src), 'utf8'), ctx, { filename: src });
  }
  return ctx.Socio;
}

module.exports = { load, SITE };
