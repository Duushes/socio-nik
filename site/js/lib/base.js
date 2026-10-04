/* Socio-Nik · базовые утилиты: цвет, DOM, хранилище, тема */
(function (root) {
  const S = root.Socio = root.Socio || {};

  // ---------- цвет ----------
  const hex2rgb = h => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  const rgb2hex = rgb => '#' + rgb.map(v => clamp(v).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => {
    const x = hex2rgb(a), y = hex2rgb(b);
    return rgb2hex(x.map((v, i) => v + (y[i] - v) * t));
  };
  // t > 0 — к белому, t < 0 — к чёрному
  const tone = (c, t) => (t >= 0 ? mix(c, '#ffffff', t) : mix(c, '#000000', -t));
  const rgba = (c, a) => {
    const [r, g, b] = hex2rgb(c);
    return `rgba(${r},${g},${b},${a})`;
  };
  S.color = { hex2rgb, rgb2hex, mix, tone, rgba };

  // ---------- DOM ----------
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
  const reducedMotion = () => Boolean((root.document && root.document.documentElement.classList.contains('motion-off')) ||
    (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches));
  const pct = n => n + ' %';
  // Короткое сообщение для скринридера: что изменилось на экране (например, «разбор открыт»)
  let live = null;
  const announce = msg => {
    if (!root.document || !root.document.body) return;
    if (!live) {
      live = root.document.createElement('p');
      live.className = 'sr';
      live.setAttribute('aria-live', 'polite');
      root.document.body.appendChild(live);
    }
    live.textContent = '';
    setTimeout(() => { live.textContent = msg; }, 80);
  };
  // Русский типограф для текста на экране: неразрывный пробел после коротких слов («в», «и», «на»),
  // перед тире и между числом и словом или знаком («64 %», «4 минуты»). Только текстовые узлы:
  // разметку, SVG и поля ввода не трогаем. Зовётся после каждой вставки текста на экран
  const NB = '\u00a0';
  const SHORT = /(^|[\s(«"„])([а-яёА-ЯЁa-zA-Z]{1,2}) (?=\S)/g;
  const typoText = s => s.replace(SHORT, '$1$2' + NB).replace(SHORT, '$1$2' + NB)
    .replace(/ ([—–]) /g, NB + '$1 ')
    .replace(/(\d) (?=[%₽а-яёА-ЯЁ])/g, '$1' + NB);
  const TYPO_SKIP = 'script, style, textarea, select, code, pre, svg';
  function typo(scope) {
    const d = root.document;
    if (!scope || !d || !d.createTreeWalker) return scope;
    const walker = d.createTreeWalker(scope, 4 /* NodeFilter.SHOW_TEXT */, {
      acceptNode: n => (/ /.test(n.nodeValue) && n.nodeValue.trim() && !(n.parentElement && n.parentElement.closest(TYPO_SKIP)) ? 1 : 3)
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => { const v = typoText(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; });
    return scope;
  }
  S.dom = { esc, reducedMotion, pct, announce, typo, typoText };

  // ---------- хранилище: localStorage с фолбэком в память (приватный режим, data:-снимок) ----------
  const memory = {};
  const PREFIX = 'socio.';
  S.store = {
    get(key, fallback) {
      try {
        const v = root.localStorage.getItem(PREFIX + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) {
        return key in memory ? memory[key] : fallback;
      }
    },
    set(key, value) {
      try { root.localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { memory[key] = value; }
    },
    del(key) {
      try { root.localStorage.removeItem(PREFIX + key); } catch (e) { /* нет доступа */ }
      delete memory[key];
    }
  };

  // ---------- тема ----------
  const query = () => (root.location ? new URLSearchParams(root.location.search) : new URLSearchParams());
  function preferred() {
    const q = query().get('theme');
    if (q === 'dark' || q === 'light') return q;           // для проверок: ?theme=dark
    return S.store.get('theme', 'auto');
  }
  function resolved() {
    const p = preferred();
    if (p === 'dark' || p === 'light') return p;
    return root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  // Значение токена из css/tokens.css — для SVG и canvas, чтобы цвета жили в одном месте.
  // Для другой темы читаем со скрытого «зонда» с нужным data-theme; значения кэшируем по теме
  const cache = { light: {}, dark: {} };
  let probe = null;
  function token(name, theme) {
    const d = root.document;
    if (!d || !d.documentElement) return '';
    const cur = d.documentElement.getAttribute('data-theme') || resolved();
    const th = theme === 'dark' || theme === 'light' ? theme : cur;
    if (cache[th][name]) return cache[th][name];
    let el = d.documentElement;
    if (th !== cur) {
      if (!probe) { probe = d.createElement('i'); probe.className = 'theme-probe'; probe.hidden = true; d.body.appendChild(probe); }
      probe.setAttribute('data-theme', th);
      el = probe;
    }
    const v = root.getComputedStyle(el).getPropertyValue(name).trim();
    if (v) cache[th][name] = v;
    return v;
  }
  function apply() {
    const t = resolved();
    document.documentElement.setAttribute('data-theme', t);
    // цвет панели браузера — фон выбранной темы (в HTML два значения по системной теме — для первого кадра)
    const bg = token('--bg', t);
    if (bg) document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', bg));
    return t;
  }
  const quadraColor = (qid, theme) => token('--q-' + qid, theme || resolved());
  S.theme = { preferred, resolved, apply, token, quadraColor };
})(typeof window !== 'undefined' ? window : globalThis);
