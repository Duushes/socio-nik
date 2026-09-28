/* Socio-Nik · картинка для шера: сторис 1080×1920 и пост 1080×1350, целиком на Canvas 2D (без растровых файлов,
   чтобы canvas не «пачкался» на file://), плюс «Поделиться» / «Скачать» / «Скопировать текст» с фолбэками. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const { rgba, tone } = S.color;

  const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI Variable Display", "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif';
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

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // format: 'story' | 'post'
  function render(canvas, axes, format = 'story') {
    const W = 1080, H = format === 'story' ? 1920 : 1350, story = format === 'story';
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const res = S.core.scoring.result(axes);
    const M = S.core.modelA;
    const t = M.type(res.top.id), q = S.data.quadras.find(x => x.id === t.quadra);
    const c = q.color.dark;

    // фон: чёрный + «аврора» из цветов квадр
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    S.data.quadras.forEach((qq, i) => {
      const pos = [[0.08, 0.06], [0.95, 0.12], [0.05, 0.92], [0.92, 0.88]][i];
      blob(ctx, W * pos[0], H * pos[1], W * 0.55, qq.color.dark, qq.id === q.id ? 0.0 : 0.16);
    });
    // Сетка координат по форматам: сверху вниз, без наложений (сторис 1920, пост 1350)
    const L = story
      ? { brand: 118, title: 176, ey: 468, ek: 2.35, code: 900, codePx: 220, name: 978, alias: 1036, pct: 1172, pctPx: 140, pcPx: 62, pctLab: 1224, top3: 1316, topRow: 70, axes: 1548, axRow: 76, foot: 1864 }
      : { brand: 78, title: 128, ey: 318, ek: 1.55, code: 604, codePx: 170, name: 666, alias: 718, pct: 830, pctPx: 100, pcPx: 46, pctLab: 872, top3: 0, topRow: 0, axes: 952, axRow: 70, foot: 1292 };
    blob(ctx, W / 2, L.ey, W * 0.62, c, 0.5);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = font(600, 30);
    ctx.fillText('SOCIO-NIK', W / 2, L.brand);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = font(600, 40);
    ctx.fillText('Мой соционический тип', W / 2, L.title);

    // эмблема
    ctx.save();
    ctx.translate(W / 2, L.ey);
    ctx.scale(L.ek, L.ek);
    S.art.toCanvas(ctx, S.art.emblemNodes(t, 'dark', { at: 22 }));
    ctx.restore();

    // код и имя
    ctx.fillStyle = '#fff';
    ctx.font = font(800, L.codePx);
    ctx.fillText(t.code, W / 2, L.code);
    ctx.fillStyle = 'rgba(255,255,255,0.86)';
    fit(ctx, t.name, W - 160, 600, 46);
    ctx.fillText(t.name, W / 2, L.name);
    const sub = `«${t.alias}» · ${t.role} · квадра ${q.name}`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    fit(ctx, sub, W - 160, 500, 38);
    ctx.fillText(sub, W / 2, L.alias);

    // процент
    ctx.fillStyle = '#fff';
    ctx.font = font(700, L.pctPx);
    const pctText = String(res.top.pct);
    const pw = ctx.measureText(pctText).width;
    ctx.textAlign = 'right';
    ctx.fillText(pctText, W / 2 + pw / 2 - 16, L.pct);
    ctx.textAlign = 'left';
    ctx.font = font(600, L.pcPx);
    ctx.fillText('%', W / 2 + pw / 2 - 6, L.pct);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = font(500, 32);
    ctx.fillText('вероятность типа по ответам', W / 2, L.pctLab);

    // топ-3 (только в сторис — в посте мало места)
    const x0 = 150, x1 = W - 150;
    if (L.top3) {
      res.dist.slice(0, 3).forEach((row, i) => {
        const tt = M.type(row.id), qc = S.data.quadras.find(x => x.id === tt.quadra).color.dark;
        const yy = L.top3 + i * L.topRow;
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = font(700, 34);
        ctx.fillText(tt.code, x0, yy + 12);
        ctx.textAlign = 'right';
        ctx.font = font(600, 32);
        ctx.fillText(row.pct + ' %', x1, yy + 12);
        const bx = x0 + 130, bw = x1 - x0 - 130 - 120;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        roundRect(ctx, bx, yy - 8, bw, 16, 8); ctx.fill();
        ctx.fillStyle = qc;
        roundRect(ctx, bx, yy - 8, Math.max(16, bw * row.pct / 100), 16, 8); ctx.fill();
      });
    }

    // 4 шкалы
    const AX = [['EI', 'Экстраверсия', 'Интроверсия'], ['NS', 'Интуиция', 'Сенсорика'], ['TF', 'Логика', 'Этика'], ['RP', 'Рациональность', 'Иррациональность']];
    AX.forEach(([ax, a, b], i) => {
      const v = res.axes[ax], yy = L.axes + i * L.axRow;
      ctx.font = font(600, 29);
      ctx.textAlign = 'left';
      ctx.fillStyle = v >= 50 ? '#fff' : 'rgba(255,255,255,0.5)';
      ctx.fillText(`${a} ${v} %`, x0, yy);
      ctx.textAlign = 'right';
      ctx.fillStyle = v < 50 ? '#fff' : 'rgba(255,255,255,0.5)';
      ctx.fillText(`${100 - v} % ${b}`, x1, yy);
      const bw = x1 - x0, split = bw * v / 100;
      ctx.fillStyle = v >= 50 ? tone(c, 0.15) : 'rgba(255,255,255,0.18)';
      roundRect(ctx, x0, yy + 16, Math.max(8, split - 2), 12, 6); ctx.fill();
      ctx.fillStyle = v < 50 ? tone(c, 0.15) : 'rgba(255,255,255,0.18)';
      roundRect(ctx, x0 + split + 2, yy + 16, Math.max(8, bw - split - 2), 12, 6); ctx.fill();
    });

    // подпись
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = font(600, 34);
    const site = S.config && S.config.SITE_URL ? S.config.SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'Socio-Nik';
    ctx.fillText(`Узнай свой тип — ${site}`, W / 2, L.foot);
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
    return `Мой соционический тип — ${t.code}, «${t.alias}» (${res.top.pct} %). Узнай свой на Socio-Nik${link}`;
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

  // Факт из mystery box картинкой для сторис (1080×1920) — для Instagram, который ссылки не принимает
  function renderFact(canvas, fact) {
    const W = 1080, H = 1920;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const t = fact.type ? S.core.modelA.type(fact.type) : null;
    const q = t ? S.data.quadras.find(x => x.id === t.quadra) : null;
    const c = q ? q.color.dark : '#3987e5';

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    S.data.quadras.forEach((qq, i) => {
      const pos = [[0.08, 0.06], [0.95, 0.12], [0.05, 0.92], [0.92, 0.88]][i];
      blob(ctx, W * pos[0], H * pos[1], W * 0.55, qq.color.dark, q && qq.id === q.id ? 0 : 0.16);
    });
    blob(ctx, W / 2, 470, W * 0.6, c, 0.45);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = font(600, 30);
    ctx.fillText('SOCIO-NIK · MYSTERY BOX', W / 2, 118);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = font(600, 40);
    const cat = S.factCats && S.factCats[fact.cat];
    ctx.fillText(cat ? 'Факт · ' + cat.charAt(0).toLowerCase() + cat.slice(1) : 'Факт', W / 2, 176);

    if (t) {
      ctx.save();
      ctx.translate(W / 2, 470);
      ctx.scale(2.05, 2.05);
      S.art.toCanvas(ctx, S.art.emblemNodes(t, 'dark', { at: 22 }));
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.font = font(800, 170);
      ctx.fillText(t.code, W / 2, 860);
      const sub = `«${t.alias}» · ${t.role}`;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      fit(ctx, sub, W - 160, 500, 42);
      ctx.fillText(sub, W / 2, 924);
    } else {
      S.data.quadras.forEach((qq, i) => {
        const x = W / 2 + (i - 1.5) * 130, y = 500, g = ctx.createRadialGradient(x - 16, y - 18, 4, x, y, 52);
        g.addColorStop(0, tone(qq.color.dark, 0.55));
        g.addColorStop(1, tone(qq.color.dark, -0.35));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 48, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#fff';
      ctx.font = font(800, 130);
      ctx.fillText('Соционика', W / 2, 860);
    }

    // текст факта в полупрозрачной карточке; кегль уменьшается, пока текст не влезет в 9 строк
    let size = 60, lines = [];
    for (; size >= 40; size -= 2) {
      ctx.font = font(600, size);
      lines = wrap(ctx, fact.text, W - 240);
      if (lines.length <= 9) break;
    }
    const lh = Math.round(size * 1.34), top = 1080;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, 70, top - size - 44, W - 140, lines.length * lh + 96, 48);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    lines.forEach((l, i) => ctx.fillText(l, 120, top + i * lh));

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = font(600, 34);
    const site = S.config && S.config.SITE_URL ? S.config.SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'Socio-Nik';
    ctx.fillText(`Открой свою коробку — ${site}`, W / 2, H - 110);
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

  const factImage = fact => toBlob(renderFact(document.createElement('canvas'), fact));

  S.share = { render, renderFact, factImage, renderOG, url, text, toBlob, download, copy, canShareFiles, share };
})(window);
