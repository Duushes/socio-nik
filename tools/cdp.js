// Мини-драйвер Chrome через DevTools Protocol: без Playwright и без npm, только встроенные fetch и WebSocket.
// Запуск скриптов, которые его используют: node --experimental-websocket tools/e2e.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BIN = (() => {
  const base = path.join(require('os').homedir(), 'Library/Caches/ms-playwright');
  for (const dir of fs.readdirSync(base).filter(d => d.startsWith('chromium_headless_shell'))) {
    const found = require('child_process').execSync(`find "${path.join(base, dir)}" -type f -name chrome-headless-shell | head -1`).toString().trim();
    if (found) return found;
  }
  throw new Error('chrome-headless-shell не найден');
})();

async function launch() {
  const profile = fs.mkdtempSync('/tmp/socionik-profile-');
  const proc = spawn(BIN, ['--headless', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--hide-scrollbars', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const port = await new Promise((ok, fail) => {
    let buf = '';
    proc.stderr.on('data', d => {
      buf += d;
      const m = buf.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (m) ok(Number(m[1]));
    });
    setTimeout(() => fail(new Error('Chrome не запустился')), 10000);
  });
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(ok => ws.addEventListener('open', ok, { once: true }));

  let seq = 0;
  const pending = new Map(), listeners = [];
  ws.addEventListener('message', e => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { ok, fail } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? fail(new Error(msg.error.message)) : ok(msg.result);
    } else if (msg.method) listeners.slice().forEach(l => l(msg)); // копия: once() удаляет себя прямо во время обхода
  });
  const send = (method, params = {}) => new Promise((ok, fail) => {
    const id = ++seq;
    pending.set(id, { ok, fail });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const once = method => new Promise(ok => {
    const l = msg => { if (msg.method === method) { listeners.splice(listeners.indexOf(l), 1); ok(msg.params); } };
    listeners.push(l);
  });
  const errors = [];
  listeners.push(msg => {
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception ? msg.params.exceptionDetails.exception.description : msg.params.exceptionDetails.text);
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push(msg.params.entry.text);
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');

  const api = {
    errors,
    send,
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    // Навигация внутри документа (другой #хэш) не даёт события загрузки — тогда не ждём его
    async goto(url) {
      const loaded = once('Page.loadEventFired');
      const r = await send('Page.navigate', { url });
      if (r.loaderId) await loaded;
    },
    async reload() {
      const loaded = once('Page.loadEventFired');
      await send('Page.reload');
      await loaded;
    },
    async eval(fnOrExpr) {
      const expression = typeof fnOrExpr === 'function' ? `(${fnOrExpr})()` : fnOrExpr;
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text);
      return r.result.value;
    },
    async viewport(width, height, { mobile = false, scale = 1 } = {}) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
    },
    async media(features) {
      await send('Emulation.setEmulatedMedia', { features: Object.entries(features).map(([name, value]) => ({ name, value })) });
    },
    async shot(file) {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
      return file;
    },
    async close() {
      try { ws.close(); } catch (e) { /* уже закрыт */ }
      const exited = new Promise(ok => proc.once('exit', ok));
      proc.kill();
      await Promise.race([exited, new Promise(ok => setTimeout(ok, 3000))]);
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* уберёт система */ }
    }
  };
  return api;
}

module.exports = { launch };
