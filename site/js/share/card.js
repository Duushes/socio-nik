/* Socio-Nik · картинка для шера: сторис 1080×1920 и пост 1080×1350 на Canvas 2D, плюс «Поделиться» / «Скачать» /
   «Скопировать текст» с фолбэками. Портрет персонажа приходит data:-URI из js/share/portraits/<id>.js: обычная картинка
   с file:// «пачкает» canvas, и сохранить PNG уже нельзя. Пока портрет не загружен — рисуется векторная эмблема. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const { rgba, tone } = S.color;

  // Шрифт сайта; картинку перерисовываем после document.fonts.ready (views/result.js)
  const FONT = 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  const font = (w, px) => `${w} ${px}px ${FONT}`;

  function fit(ctx, text, maxW, weight, px, min = 20) {
    let size = px;
    ctx.font = font(weight, size);
    while (ctx.measureText(text).width > maxW && size > min) { size -= 2; ctx.font = font(weight, size); }
    return size;
  }

  function blob(ctx, x, y, r, c, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // ---------- портрет типа ----------
  const pics = {}, waits = {};
  const VER = ((document.querySelector('script[src*="share/card.js"]') || {}).src || '').split('?')[1] || '';
  function portrait(id) {
    if (pics[id]) return Promise.resolve(pics[id]);
    if (waits[id]) return waits[id];
    waits[id] = new Promise(ok => {
      const make = () => {
        const src = (S.sharePortraits || {})[id];
        if (!src) { ok(null); return; }
        const im = new Image();
        im.onload = () => { pics[id] = im; ok(im); };
        im.onerror = () => ok(null);
        im.src = src;
      };
      if ((S.sharePortraits || {})[id]) { make(); return; }
      const s = document.createElement('script');
      s.src = `js/share/portraits/${id}.js${VER ? '?' + VER : ''}`;
      s.onload = make;
      s.onerror = () => ok(null);
      document.head.appendChild(s);
    });
    return waits[id];
  }

  // Бюст по центру, низ растворяется — поверх него ляжет код типа
  function drawPortrait(ctx, im, cx, bottom, h) {
    const w = h * 0.8, off = document.createElement('canvas');
    off.width = Math.round(w);
    off.height = Math.round(h);
    const o = off.getContext('2d');
    o.drawImage(im, 0, 0, off.width, off.height);
    o.globalCompositeOperation = 'destination-in';
    const g = o.createLinearGradient(0, 0, 0, off.height);
    g.addColorStop(0, '#000');
    g.addColorStop(0.68, '#000');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    o.fillStyle = g;
    o.fillRect(0, 0, off.width, off.height);
    ctx.drawImage(off, cx - w / 2, bottom - h);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------- коробка и 3D-символы: data:-URI из js/share/art.js (грузится, когда нужна картинка) ----------
  const arts = {};
  let artWait = null;
  function art() {
    if (artWait) return artWait;
    artWait = new Promise(ok => {
      const make = () => {
        const all = S.shareArt || {}, keys = Object.keys(all);
        let left = keys.length;
        if (!left) { ok(arts); return; }
        const done = () => { if (--left === 0) ok(arts); };
        keys.forEach(k => { const im = new Image(); im.onload = () => { arts[k] = im; done(); }; im.onerror = done; im.src = all[k]; });
      };
      if (S.shareArt) { make(); return; }
      const s = document.createElement('script');
      s.src = `js/share/art.js${VER ? '?' + VER : ''}`;
      s.onload = make;
      s.onerror = () => ok(arts);
      document.head.appendChild(s);
    });
    return artWait;
  }
  function drawArt(ctx, key, cx, cy, w, rot = 0, alpha = 1) {
    const im = arts[key];
    if (!im) return;
    const h = w * im.height / im.width;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.rotate(rot * Math.PI / 180);
    ctx.drawImage(im, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // ---------- общие детали картинок ----------
  // четырёхлучевая искра
  function spark(ctx, x, y, r, color, a = 1) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
    ctx.restore();
  }
  // серебряный текст, как заголовки сайта
  function silver(ctx, text, x, y, px) {
    const g = ctx.createLinearGradient(0, y - px * 0.78, 0, y + px * 0.06);
    g.addColorStop(0, '#8f96a0');
    g.addColorStop(1, '#e6eef4');
    ctx.fillStyle = g;
    ctx.fillText(text, x, y);
  }
  // пилюля: бренд, черта типа, проценты; держится в пределах картинки
  function pill(ctx, text, cx, cy, { px = 32, weight = 700, dot = null, fill = 'rgba(10,10,12,0.62)', stroke = 'rgba(215,226,234,0.3)', color = '#fff', W = 1080 } = {}) {
    const label = text.toUpperCase();
    ctx.font = font(weight, px);
    const tw = ctx.measureText(label).width, gap = dot ? px * 0.66 : 0;
    const h = Math.round(px * 1.95), w = tw + gap + px * 1.6;
    const x = Math.max(36, Math.min(W - 36 - w, cx - w / 2)), y = cy - h / 2;
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    let tx = x + px * 0.8;
    if (dot) {
      ctx.save();
      ctx.shadowColor = dot;
      ctx.shadowBlur = 14;
      ctx.fillStyle = dot;
      ctx.beginPath();
      ctx.arc(tx + px * 0.2, cy, px * 0.21, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      tx += gap;
    }
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, tx, cy + px * 0.04);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
  }
  // фон: почти чёрный, свет в цвете квадры за персонажем, фирменный градиент по краям и искры
  function backdrop(ctx, W, H, c, focusY) {
    ctx.fillStyle = '#07080a';
    ctx.fillRect(0, 0, W, H);
    blob(ctx, W * 0.06, H * 0.08, W * 0.62, '#b600a8', 0.2);
    blob(ctx, W * 0.96, H * 0.9, W * 0.66, '#7621b0', 0.24);
    blob(ctx, W / 2, focusY, W * 0.74, c, 0.5);
    blob(ctx, W / 2, focusY + W * 0.12, W * 0.34, '#ffffff', 0.08);
    [[0.08, 0.15, 18], [0.92, 0.19, 13], [0.05, 0.46, 10], [0.95, 0.5, 15], [0.07, 0.74, 12], [0.93, 0.78, 9], [0.5, 0.985, 7]]
      .forEach(([x, y, r], i) => spark(ctx, W * x, H * y, r * 1.7, i % 2 ? '#ffd27a' : '#ffffff', 0.5));
  }
  const site = () => (S.config && S.config.SITE_URL ? S.config.SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'Socio-Nik');
  const traitsOf = id => (S.content.traits && S.content.traits[id]) || [];

  // Результат картинкой: «Я — Хранитель», персонаж с чертами вокруг, код, одно число и вопрос к друзьям.
  // Сторис 1080×1920: всё важное — между 250 и 1580 px, там его не закроют шапка и строка ответа.
  function render(canvas, axes, format = 'story') {
    const story = format === 'story', W = 1080, H = story ? 1920 : 1350;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const res = S.core.scoring.result(axes), t = S.core.modelA.type(res.top.id);
    const q = S.data.quadras.find(x => x.id === t.quadra), c = q.color.dark;
    const L = story
      ? { brand: 300, head: 446, headPx: 104, picBottom: 1222, picH: 700, chips: [[196, 700], [900, 790], [870, 1030]], chipPx: 28, code: 1306, codePx: 190, sub: 1376, pct: 1452, ask: 1542, url: 1592, focus: 840 }
      : { brand: 74, head: 186, headPx: 88, picBottom: 852, picH: 610, chips: [[196, 420], [900, 500], [880, 700]], chipPx: 25, code: 944, codePx: 160, sub: 1004, pct: 1072, ask: 1168, url: 1224, focus: 560 };
    backdrop(ctx, W, H, c, L.focus);
    ctx.textAlign = 'center';
    pill(ctx, 'Socio-Nik · тест на тип личности', W / 2, L.brand, { px: 24, weight: 700, fill: 'rgba(255,255,255,0.06)', stroke: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.8)' });

    const head = `Я — ${t.role}`;
    fit(ctx, head, W - 120, 900, L.headPx);
    silver(ctx, head, W / 2, L.head, L.headPx);

    if (pics[t.id]) drawPortrait(ctx, pics[t.id], W / 2, L.picBottom, L.picH);
    else {
      ctx.save();
      ctx.translate(W / 2, L.picBottom - L.picH * 0.5);
      ctx.scale(2.2, 2.2);
      S.art.toCanvas(ctx, S.art.emblemNodes(t, 'dark', { at: 22 }));
      ctx.restore();
    }
    drawArt(ctx, 'sparkles', W * 0.8, L.picBottom - L.picH * 0.86, story ? 120 : 100, 8, 0.95);
    traitsOf(t.id).forEach((x, i) => pill(ctx, x, L.chips[i][0], L.chips[i][1], { px: L.chipPx, dot: c }));

    ctx.fillStyle = '#fff';
    ctx.font = font(900, L.codePx);
    ctx.fillText(t.code, W / 2, L.code);
    const sub = `«${t.alias}» · квадра ${q.name}`;
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    fit(ctx, sub, W - 160, 600, 40);
    ctx.fillText(sub, W / 2, L.sub);
    pill(ctx, `совпадение ${res.top.pct} %`, W / 2, L.pct, { px: 28, fill: rgba(c, 0.22), stroke: rgba(c, 0.8) });

    ctx.fillStyle = '#fff';
    ctx.font = font(800, story ? 64 : 56);
    ctx.fillText('А какой тип у тебя?', W / 2, L.ask);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    fit(ctx, `Тест за 4 минуты → ${site()}`, W - 140, 600, 34);
    ctx.fillText(`Тест за 4 минуты → ${site()}`, W / 2, L.url);
    return canvas;
  }

  // Ссылка на результат — только когда сайт выложен (SITE_URL); в ней 4 числа, без ответов и имён
  function url(axes) {
    const base = S.config && S.config.SITE_URL;
    return base ? base.replace(/\/$/, '') + '/#/r/' + S.core.payload.encode(axes) : '';
  }

  function text(axes, { withUrl = true } = {}) {
    const res = S.core.scoring.result(axes), t = S.core.modelA.type(res.top.id);
    const link = withUrl && url(axes) ? ' ' + url(axes) : '';
    return `Я — ${t.code} «${t.alias}», ${t.role.toLowerCase()} (совпадение ${res.top.pct} %). А ты кто из 16 типов? Тест за 4 минуты на Socio-Nik${link}`;
  }

  const toBlob = canvas => new Promise((ok, fail) => canvas.toBlob(b => (b ? ok(b) : fail(new Error('PNG не собрался'))), 'image/png'));

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function copy(str) {
    try {
      await navigator.clipboard.writeText(str);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = str;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  // Можно ли поделиться файлом через системное меню
  function canShareFiles() {
    try {
      const f = new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' });
      return Boolean(navigator.canShare && navigator.canShare({ files: [f] }));
    } catch (e) {
      return false;
    }
  }

  async function share(canvas, axes, format) {
    const blob = await toBlob(canvas);
    const id = S.core.scoring.result(axes).top.id;
    const file = new File([blob], `socio-nik-${id}-${format}.png`, { type: 'image/png' });
    await navigator.share({ files: [file], text: text(axes), title: 'Мой соционический тип' });
  }

  // Перенос текста по словам под ширину
  function wrap(ctx, str, maxW) {
    const lines = [];
    let line = '';
    str.split(/\s+/).forEach(w => {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  // Персонаж выглядывает из открытой коробки: всё, что ниже кромки проёма, — «внутри» (кромка — ломаная по рисунку коробки)
  const RIM = [[0.18, 0.49], [0.384, 0.542], [0.8, 0.5]];
  function bustInBox(ctx, im, bx, by, bw, w) {
    const h = w * 1.25, rimMid = by + bw * 0.52, top = rimMid - h * 0.74, cx = bx + bw * 0.49;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - w, 0);
    ctx.lineTo(cx + w, 0);
    ctx.lineTo(cx + w, by + bw * RIM[2][1]);
    RIM.slice().reverse().forEach(([x, y]) => ctx.lineTo(bx + bw * x, by + bw * y));
    ctx.lineTo(cx - w, by + bw * RIM[0][1]);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(im, cx - w / 2, top, w, h);
    ctx.restore();
  }

  // Факт из mystery box для сторис (1080×1920): вопрос-крючок, персонаж выскакивает из коробки, факт в стеклянной карточке
  function renderFact(canvas, fact) {
    const W = 1080, H = 1920;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const t = fact.type ? S.core.modelA.type(fact.type) : null;
    const q = t ? S.data.quadras.find(x => x.id === t.quadra) : null;
    const c = q ? q.color.dark : '#8b3fd1';
    const all = S.facts ? S.facts.all() : [], no = all.findIndex(f => f.id === fact.id) + 1;
    backdrop(ctx, W, H, c, 800);
    ctx.textAlign = 'center';
    pill(ctx, 'Socio-Nik · mystery box', W / 2, 288, { px: 24, fill: 'rgba(255,255,255,0.06)', stroke: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.8)' });
    const head = t ? 'Узнаёшь кого-то?' : 'Факт о соционике';
    fit(ctx, head, W - 120, 900, 96);
    silver(ctx, head, W / 2, 410, 96);
    const cat = S.factCats && S.factCats[fact.cat];
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = font(600, 32);
    ctx.fillText([no ? `Факт № ${no} из ${all.length}` : 'Факт', cat ? cat.toLowerCase() : ''].filter(Boolean).join(' · '), W / 2, 468);

    // коробка, тёплый свет из проёма и тот, кто из неё выскочил
    const bw = 500, bx = W / 2 - bw / 2 - 6, by = 520;
    blob(ctx, W / 2, by + bw * 0.46, 300, '#ffc37a', 0.32);
    drawArt(ctx, 'box-open', bx + bw / 2, by + bw / 2, bw);
    if (t && pics[t.id]) bustInBox(ctx, pics[t.id], bx, by, bw, 330);
    else {
      drawArt(ctx, t ? 'heart' : 'question', bx + bw * 0.42, by + bw * 0.24, 170, -10);
      drawArt(ctx, t ? 'sparkles' : 'bulb', bx + bw * 0.66, by + bw * 0.14, 140, 12);
    }
    drawArt(ctx, 'sparkles', 210, 690, 130, -12, 0.95);
    drawArt(ctx, t ? 'heart' : 'puzzle', 880, 640, 110, 14, 0.95);

    // кто это и сам факт
    const label = t ? `${t.code} «${t.alias}» · ${t.role}` : 'Соционика';
    let y = by + bw + 46;
    pill(ctx, label, W / 2, y, { px: 30, dot: t ? c : null, fill: rgba(c, 0.2), stroke: rgba(c, 0.75) });
    // кегль — самый крупный, при котором карточка кончается до 1520 px (ниже — строка ответа в сторис)
    const top = y + 54;
    let size = 46, lines = [], lh = 0, boxH = 0;
    for (; size >= 30; size -= 2) {
      ctx.font = font(600, size);
      lines = wrap(ctx, fact.text, W - 280);
      lh = Math.round(size * 1.34);
      boxH = lines.length * lh + 92;
      if (top + boxH <= 1520) break;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.075)';
    roundRect(ctx, 80, top, W - 160, boxH, 44);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.stroke();
    ctx.fillStyle = rgba(c, 0.95);
    ctx.font = font(900, 130);
    ctx.textAlign = 'left';
    ctx.fillText('“', 92, top + 58);
    ctx.fillStyle = '#fff';
    ctx.font = font(600, size);
    lines.forEach((l, i) => ctx.fillText(l, 140, top + 50 + size + i * lh));
    ctx.textAlign = 'center';
    y = Math.min(top + boxH + 62, 1584);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    fit(ctx, `Открой свою коробку → ${site()}`, W - 140, 600, 34);
    ctx.fillText(`Открой свою коробку → ${site()}`, W / 2, y);
    return canvas;
  }

  // Превью ссылки для мессенджеров 1200×630 — как hero главной: «аврора», парящие знаки, градиентный заголовок
  function renderOG(canvas) {
    const W = 1200, H = 630;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const Q = id => S.data.quadras.find(q => q.id === id).color.dark;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    [['alpha', 0.14, 0.2], ['gamma', 0.86, 0.16], ['beta', 0.82, 0.9], ['delta', 0.16, 0.9]].forEach(([q, x, y]) => blob(ctx, W * x, H * y, W * 0.5, Q(q), 0.4));
    [['Ne', 'alpha', 0.1, 0.24, 1.25], ['Fe', 'beta', 0.9, 0.22, 1.1], ['Ti', 'beta', 0.13, 0.78, 1.0], ['Si', 'alpha', 0.89, 0.76, 1.0],
      ['Se', 'gamma', 0.31, 0.9, 0.7], ['Ni', 'gamma', 0.69, 0.91, 0.72], ['Te', 'delta', 0.035, 0.52, 0.7], ['Fi', 'delta', 0.965, 0.5, 0.72]]
      .forEach(([a, q, x, y, s]) => {
        ctx.save();
        ctx.translate(W * x, H * y);
        ctx.scale(s, s);
        S.art.toCanvas(ctx, S.art.glyphOf(a, Q(q), 'dark'));
        ctx.restore();
      });
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = font(600, 30);
    ctx.fillText('Socio-Nik', W / 2, 196);
    ctx.fillStyle = '#fff';
    ctx.font = font(800, 80);
    ctx.fillText('Узнай свой', W / 2, 298);
    const g = ctx.createLinearGradient(W / 2 - 390, 0, W / 2 + 390, 0);
    g.addColorStop(0, Q('alpha'));
    g.addColorStop(0.52, Q('gamma'));
    g.addColorStop(1, Q('beta'));
    ctx.fillStyle = g;
    ctx.fillText('соционический тип', W / 2, 392);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = font(500, 30);
    ctx.fillText('20 вопросов · 4 минуты · 16 типов и их отношения', W / 2, 462);
    return canvas;
  }

  const factImage = fact => Promise.all([fact.type ? portrait(fact.type) : null, art()]).then(() => toBlob(renderFact(document.createElement('canvas'), fact)));

  S.share = { render, renderFact, factImage, renderOG, portrait, art, url, text, toBlob, download, copy, canShareFiles, share };
})(window);
