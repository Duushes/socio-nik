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
  S.dom = { esc, reducedMotion, pct, announce };

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
  function apply() {
    const t = resolved();
    document.documentElement.setAttribute('data-theme', t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#000000' : '#ffffff');
    return t;
  }
  const quadraColor = (qid, theme) => {
    const q = S.data.quadras.find(x => x.id === qid);
    return q.color[(theme || resolved()) === 'dark' ? 'dark' : 'light'];
  };
  S.theme = { preferred, resolved, apply, quadraColor };
})(typeof window !== 'undefined' ? window : globalThis);
