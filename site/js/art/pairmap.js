/* Socio-Nik · карта пары — диаграмма Венна «мы двое».
   Два круга — ты и партнёр (цвета квадр, как на всём сайте). Каждая из восьми сфер жизни — фишка,
   и стоит она у того, кто в этой сфере силён: в твоём круге, в круге партнёра, в пересечении (сильны оба)
   или под кругами («не хватает паре»). Одна переменная на канал: позиция — кто ведёт, значок — вид зоны,
   тёплый акцент — только у «бережно». Один и тот же расчёт рисует SVG на странице и canvas для сторис. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const art = S.art = S.art || {};
  const { tone, rgba } = S.color;

  // Сцена 600×400: круги радиуса 175 с центрами 200 и 400 — пересечение шириной 150, по краям по 200
  const VB = { w: 600, h: 400 }, R = 175, CX = [200, 400], CY = 200;
  // Колонки фишек в процентах ширины сцены: твой круг, пересечение, круг партнёра
  const COL = { me: 18, both: 50, partner: 82 };
  const STRONG = { 1: true, 2: true, 7: true, 8: true };

  // Кто силён в сфере: me — ты, partner — партнёр, both — оба, none — никто
  const regionOf = z => {
    const a = STRONG[z.posA], b = STRONG[z.posB];
    return a && b ? 'both' : a ? 'me' : b ? 'partner' : 'none';
  };

  // Раскладка: фишки каждого региона — столбиком вокруг середины круга, сверху вниз в порядке сфер
  function layout(zones) {
    const by = { me: [], both: [], partner: [], none: [] };
    zones.forEach(z => by[regionOf(z)].push(z));
    const slots = [];
    ['me', 'both', 'partner'].forEach(reg => {
      const list = by[reg], n = list.length, step = 13;   // шаг по высоте, % высоты сцены
      list.forEach((z, k) => slots.push({ z, region: reg, x: COL[reg], y: 50 + (k - (n - 1) / 2) * step }));
    });
    by.none.forEach((z, k) => slots.push({ z, region: 'none', x: null, y: null, k }));
    return { slots, count: { me: by.me.length, both: by.both.length, partner: by.partner.length, none: by.none.length } };
  }

  // Цвета двоих: у партнёра из той же квадры — другой оттенок того же цвета, чтобы круги не сливались
  function colors(a, b, theme) {
    const dark = theme === 'dark';
    const me = S.theme.quadraColor(a.quadra, theme);
    let partner = S.theme.quadraColor(b.quadra, theme);
    if (a.quadra === b.quadra) partner = dark ? tone(partner, 0.4) : tone(partner, -0.36);
    return { me, partner };
  }

  let uid = 0;

  // SVG-подложка: два стеклянных круга с объёмным светом, кольцо-обводка, крупные коды типов водяным знаком
  function vennSVG(a, b, { theme, label = '' } = {}) {
    const th = theme || S.theme.resolved(), dark = th === 'dark';
    const c = colors(a, b, th), id = 'pv' + (++uid);
    const grad = (key, col, cx) => `
      <radialGradient id="${id}-${key}" gradientUnits="userSpaceOnUse" cx="${cx - 55}" cy="${CY - 70}" r="${R * 1.35}">
        <stop offset="0" stop-color="${tone(col, dark ? 0.18 : 0.45)}" stop-opacity="${dark ? 0.78 : 0.72}"/>
        <stop offset="0.55" stop-color="${col}" stop-opacity="${dark ? 0.5 : 0.42}"/>
        <stop offset="1" stop-color="${tone(col, dark ? -0.2 : -0.1)}" stop-opacity="${dark ? 0.32 : 0.24}"/>
      </radialGradient>`;
    const shine = `
      <radialGradient id="${id}-shine" gradientUnits="objectBoundingBox" cx="0.32" cy="0.22" r="0.55">
        <stop offset="0" stop-color="#ffffff" stop-opacity="${dark ? 0.22 : 0.55}"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>`;
    const circle = (key, cx, col) => `
      <g class="pv-c pv-c-${key}">
        <circle cx="${cx}" cy="${CY}" r="${R}" fill="url(#${id}-${key})"/>
        <circle cx="${cx}" cy="${CY}" r="${R}" fill="url(#${id}-shine)"/>
        <circle cx="${cx}" cy="${CY}" r="${R - 0.75}" fill="none" stroke="${rgba(col, dark ? 0.7 : 0.55)}" stroke-width="1.5"/>
      </g>`;
    const code = (t, x, col) => `<text class="pv-code" x="${x}" y="${CY + R - 36}" text-anchor="middle" fill="${rgba(col, dark ? 0.32 : 0.22)}">${t.mbti}</text>`;
    // Линза пересечения: «где вы сильны вместе» светится, а не мутнеет от смешения двух цветов
    const half = (CX[1] - CX[0]) / 2, hy = Math.sqrt(R * R - half * half), mx = (CX[0] + CX[1]) / 2;
    const lens = `M${mx} ${(CY - hy).toFixed(1)} A${R} ${R} 0 0 1 ${mx} ${(CY + hy).toFixed(1)} A${R} ${R} 0 0 1 ${mx} ${(CY - hy).toFixed(1)}Z`;
    const glow = `
      <radialGradient id="${id}-lens" gradientUnits="userSpaceOnUse" cx="${mx}" cy="${CY - 20}" r="${hy * 1.05}">
        <stop offset="0" stop-color="#ffffff" stop-opacity="${dark ? 0.32 : 0.62}"/>
        <stop offset="0.6" stop-color="#ffffff" stop-opacity="${dark ? 0.1 : 0.22}"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>`;
    return `<svg class="pv-svg" viewBox="0 0 ${VB.w} ${VB.h}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"'}>
      <defs>${grad('me', c.me, CX[0])}${grad('partner', c.partner, CX[1])}${shine}${glow}</defs>
      ${circle('me', CX[0], c.me)}${circle('partner', CX[1], c.partner)}
      <path class="pv-lens" d="${lens}" fill="url(#${id}-lens)"/>
      ${code(a, CX[0] - 62, c.me)}${code(b, CX[1] + 62, c.partner)}
    </svg>`;
  }

  // Значки видов зон — текстовым цветом: цвет на карте — у людей, а не у зон
  const GROUP_PATHS = {
    fit: 'M10 3.2a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 0 0 0-13.6zM10 3.2c-3.4 0-3.4 6.8 0 6.8s3.4 6.8 0 6.8',
    common: 'M4 7.5h12M4 12.5h12',
    ask: 'M4.2 5.6c0-1.3 1-2.3 2.3-2.3h7c1.3 0 2.3 1 2.3 2.3v5.4c0 1.3-1 2.3-2.3 2.3H9.6L6.2 16.4v-3.1h0c-1.1-.2-2-1.1-2-2.3z',
    care: 'M10 16.2 4.4 10.7a3.5 3.5 0 0 1 5-4.9l.6.6.6-.6a3.5 3.5 0 0 1 5 4.9z',
    gap: 'M10 3.4a6.6 6.6 0 1 1 0 13.2 6.6 6.6 0 0 1 0-13.2z'
  };
  const LOCK_PATH = 'M6 9.5h8a1.5 1.5 0 0 1 1.5 1.5v4.5A1.5 1.5 0 0 1 14 17H6a1.5 1.5 0 0 1-1.5-1.5V11A1.5 1.5 0 0 1 6 9.5zM7.3 9.5V7.2a2.7 2.7 0 0 1 5.4 0v2.3';
  art.groupIcon = (id, cls = 'gi') => `<svg class="${cls} gi-${id}" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="${GROUP_PATHS[id]}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"${id === 'gap' ? ' stroke-dasharray="2.6 2.4"' : ''}/></svg>`;
  art.lockIcon = (cls = 'gi') => `<svg class="${cls}" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="${LOCK_PATH}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  art.groupPath = id => GROUP_PATHS[id];

  // ---------- canvas: та же карта для картинки в сторис ----------
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Рисует круги и фишки в прямоугольнике (ox, oy, ширина w); names — подписи сфер; font(weight, px) — шрифт
  function drawVenn(ctx, a, b, { ox, oy, w, zones, names, font, theme = 'dark', gapY = null }) {
    const k = w / VB.w, c = colors(a, b, theme), L = layout(zones);
    const X = x => ox + x * k, Y = y => oy + y * k;
    [['me', CX[0], c.me], ['partner', CX[1], c.partner]].forEach(([, cx, col]) => {
      const g = ctx.createRadialGradient(X(cx - 55), Y(CY - 70), 0, X(cx - 55), Y(CY - 70), R * 1.35 * k);
      g.addColorStop(0, rgba(tone(col, 0.18), 0.8));
      g.addColorStop(0.55, rgba(col, 0.52));
      g.addColorStop(1, rgba(tone(col, -0.2), 0.34));
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(X(cx), Y(CY), R * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = rgba(col, 0.75);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X(cx), Y(CY), R * k - 1, 0, Math.PI * 2);
      ctx.stroke();
    });
    // линза пересечения светится
    {
      const half = (CX[1] - CX[0]) / 2, hy = Math.sqrt(R * R - half * half), mx = (CX[0] + CX[1]) / 2;
      const g = ctx.createRadialGradient(X(mx), Y(CY - 20), 0, X(mx), Y(CY - 20), hy * 1.05 * k);
      g.addColorStop(0, 'rgba(255,255,255,0.34)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save();
      ctx.beginPath();
      ctx.arc(X(CX[0]), Y(CY), R * k, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.arc(X(CX[1]), Y(CY), R * k, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
    }
    // коды типов водяным знаком
    ctx.textAlign = 'center';
    ctx.font = font(800, Math.round(64 * k));
    ctx.fillStyle = rgba(c.me, 0.38);
    ctx.fillText(a.mbti, X(CX[0] - 62), Y(CY + R - 36));
    ctx.fillStyle = rgba(c.partner, 0.38);
    ctx.fillText(b.mbti, X(CX[1] + 62), Y(CY + R - 36));
    // фишки
    const chip = (cx, cy, text, group) => {
      ctx.font = font(600, Math.round(15 * k));
      const tw = ctx.measureText(text).width, ic = 15 * k, pad = 11 * k, h = 30 * k;
      const wdt = tw + ic + pad * 2 + 6 * k;
      const x = cx - wdt / 2, y = cy - h / 2;
      ctx.fillStyle = group === 'gap' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.94)';
      roundRect(ctx, x, y, wdt, h, h / 2);
      ctx.fill();
      if (group === 'care' || group === 'gap') {
        ctx.strokeStyle = group === 'care' ? '#ec835a' : 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash(group === 'gap' ? [5, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const ink = group === 'gap' ? 'rgba(255,255,255,0.86)' : group === 'care' ? '#c4542a' : '#1d1d1f';
      ctx.save();
      ctx.translate(x + pad, cy - ic / 2);
      ctx.scale(ic / 20, ic / 20);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash(group === 'gap' ? [2.6, 2.4] : []);
      ctx.stroke(new Path2D(GROUP_PATHS[group]));
      ctx.restore();
      ctx.setLineDash([]);
      ctx.fillStyle = ink;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x + pad + ic + 6 * k, cy + 1);
      ctx.textBaseline = 'alphabetic';
      return wdt;
    };
    L.slots.filter(s => s.region !== 'none').forEach(s => chip(X(s.x / 100 * VB.w), Y(s.y / 100 * VB.h), names[s.z.aspect], s.z.group));
    // «не хватает паре» — строкой под кругами, по центру
    const none = L.slots.filter(s => s.region === 'none');
    if (gapY != null && none.length) {
      ctx.font = font(600, Math.round(15 * k));
      const widths = none.map(s => ctx.measureText(names[s.z.aspect]).width + (15 + 22 + 6) * k), gap = 12 * k;
      let x = ox + w / 2 - (widths.reduce((p, q) => p + q, 0) + gap * (none.length - 1)) / 2;
      none.forEach((s, i) => { chip(x + widths[i] / 2, gapY, names[s.z.aspect], 'gap'); x += widths[i] + gap; });
    }
    return L;
  }

  art.pairVenn = { VB, R, CX, CY, COL, regionOf, layout, colors, svg: vennSVG, drawVenn };
})(typeof window !== 'undefined' ? window : globalThis);
