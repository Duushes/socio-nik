/* Socio-Nik · базовые утилиты: цвет, DOM, хранилище, тема (только тёмная) */
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
  const reducedMotion = () => Boolean(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pct = n => n + ' %';
  // Русский типограф для длинных текстов: неразрывный пробел после коротких слов («в», «и», «на»), перед тире
  // и между числом и словом или знаком («64 %», «4 минуты»). Только текстовые узлы — разметку, SVG и поля не трогает.
  // Зовётся после вставки длинного текста (страница пары)
  const NBSP = '\u00A0';
  const SHORT = /(^|[\s(«"„])([а-яёА-ЯЁa-zA-Z]{1,2}) (?=\S)/g;
  const typoText = str => str.replace(SHORT, '$1$2' + NBSP).replace(SHORT, '$1$2' + NBSP)
    .replace(/ ([—–]) /g, NBSP + '$1 ')
    .replace(/(\d) (?=[%₽а-яёА-ЯЁ])/g, '$1' + NBSP);
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
  S.dom = { esc, reducedMotion, pct, typo, typoText };

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

  // ---------- тема: сайт только тёмный; белые секции рисуют свои эмблемы со светлой палитрой (theme: 'light') ----------
  const preferred = () => 'dark';
  const resolved = () => 'dark';
  function apply() {
    document.documentElement.setAttribute('data-theme', 'dark');
    return 'dark';
  }
  const quadraColor = (qid, theme) => {
    const q = S.data.quadras.find(x => x.id === qid);
    return q.color[theme === 'light' ? 'light' : 'dark'];
  };
  S.theme = { preferred, resolved, apply, quadraColor };
})(typeof window !== 'undefined' ? window : globalThis);
