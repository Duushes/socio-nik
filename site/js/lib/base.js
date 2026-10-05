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
  S.dom = { esc, reducedMotion, pct };

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
