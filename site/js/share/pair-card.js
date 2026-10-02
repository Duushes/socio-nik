/* Socio-Nik · картинки пары для сторис (1080×1920), целиком на Canvas 2D:
   «Наша пара» — бесплатно: два типа и вид отношений; «Карта нашей пары» — из разбора: восемь сфер и зоны.
   Имён на картинках нет — только коды типов. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const { rgba, tone } = S.color;
  const U = () => S.share.util;
  const W = 1080, H = 1920;
  const P = () => (S.content && S.content.pair) || {};
  const site = () => (S.config && S.config.SITE_URL ? S.config.SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'Socio-Nik');

  function backdrop(ctx, a, b) {
    const { blob } = U();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const ca = S.theme.quadraColor(a.quadra, 'dark'), cb = S.theme.quadraColor(b.quadra, 'dark');
    blob(ctx, W * 0.1, H * 0.12, W * 0.62, ca, 0.38);
    blob(ctx, W * 0.92, H * 0.2, W * 0.6, cb, 0.34);
    blob(ctx, W * 0.5, H * 0.95, W * 0.7, a.quadra === b.quadra ? ca : cb, 0.16);
  }

  function header(ctx, sub) {
    const { font } = U();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = font(600, 30);
    ctx.fillText('SOCIO-NIK · 16 ТИПОВ ДЛЯ ДВОИХ', W / 2, 118);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = font(600, 42);
    ctx.fillText(sub, W / 2, 180);
  }

  function footer(ctx, text) {
    const { font } = U();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = font(600, 34);
    ctx.fillText(text, W / 2, H - 70);
  }

  const titleOf = r => (P().titles || {})[r.id] || S.ui.kindTitle(r.kind);

  // «Наша пара»: две эмблемы, коды и названия, вид отношений и одна строка о нём
  function renderPair(canvas, a, b) {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const { font, fit, roundRect, wrap } = U();
    const r = S.core.modelA.relation(a, b), txt = S.ui.relText(r.kind);
    backdrop(ctx, a, b);
    header(ctx, 'Наша пара');

    [[a, W / 2 - 250], [b, W / 2 + 250]].forEach(([t, x]) => {
      ctx.save();
      ctx.translate(x, 520);
      ctx.scale(1.75, 1.75);
      S.art.toCanvas(ctx, S.art.emblemNodes(t, 'dark', { at: 22 }));
      ctx.restore();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = font(800, 120);
      ctx.fillText(t.mbti, x, 830);
      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      fit(ctx, t.title, 440, 600, 44);
      ctx.fillText(t.title, x, 892);
    });
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = font(300, 110);
    ctx.textAlign = 'center';
    ctx.fillText('+', W / 2, 560);

    // вид отношений
    const title = titleOf(r);
    ctx.fillStyle = '#fff';
    let size = 88, lines = [];
    for (; size >= 60; size -= 4) { ctx.font = font(800, size); lines = wrap(ctx, title, W - 160); if (lines.length <= 2) break; }
    lines.forEach((l, i) => ctx.fillText(l, W / 2, 1080 + i * size * 1.08));
    const y0 = 1080 + (lines.length - 1) * size * 1.08 + 70;
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = font(500, 36);
    ctx.fillText(`${S.ui.kindTitle(r.kind)} в соционике · ${S.data.tones[r.tone]}`, W / 2, y0);

    // строка о виде отношений в стеклянной карточке
    ctx.font = font(600, 46);
    const body = wrap(ctx, txt.line || '', W - 260).slice(0, 4);
    const lh = 62, top = y0 + 120;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, 80, top - 80, W - 160, body.length * lh + 110, 48);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    body.forEach((l, i) => ctx.fillText(l, W / 2, top + i * lh));

    footer(ctx, `Проверьте свою пару — ${site()}`);
    return canvas;
  }

  // «Карта нашей пары»: лепестки двоих по восьми сферам, подписи сфер и счётчики зон
  function renderMap(canvas, a, b) {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const { font, fit, roundRect } = U();
    const r = S.core.modelA.relation(a, b);
    const zones = S.core.pair.map(a, b), sum = S.core.pair.summary(a, b);
    const geo = S.art.pairMapNodes(a, b, 'dark', { zones });
    backdrop(ctx, a, b);
    header(ctx, 'Карта нашей пары');

    // коды двоих с цветными точками
    ctx.font = font(800, 76);
    const left = `${a.mbti}`, right = `${b.mbti}`, gap = 120;
    const wl = ctx.measureText(left).width, wr = ctx.measureText(right).width;
    const x0 = W / 2 - (wl + wr + gap) / 2;
    [[left, x0, geo.colors.me], [right, x0 + wl + gap, geo.colors.partner]].forEach(([t, x, c]) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.fillText(t, x, 300);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + ctx.measureText(t).width / 2, 336, 11, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('+', W / 2, 296);
    ctx.fillStyle = 'rgba(255,255,255,0.86)';
    fit(ctx, titleOf(r), W - 200, 700, 48);
    ctx.fillText(titleOf(r), W / 2, 410);

    // карта
    const cx = W / 2, cy = 900, k = 2.05;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(k, k);
    S.art.toCanvas(ctx, geo.nodes);
    ctx.restore();
    const D = P().domains || {};
    ctx.font = font(700, 34);
    geo.labels.forEach(l => {
      const name = (D[l.aspect] || {}).short || l.aspect;
      const x = cx + l.x * k, y = cy + l.y * k;
      ctx.textAlign = Math.abs(l.x) < 20 ? 'center' : l.x > 0 ? 'left' : 'right';
      const dx = Math.abs(l.x) < 20 ? 0 : l.x > 0 ? -18 : 18;
      ctx.fillStyle = '#fff';
      ctx.fillText(name, x + dx, y + 12);
    });

    // счётчики зон
    const G = P().groups || {};
    const rows = S.core.pair.GROUPS.filter(g => sum[g.id]);
    const top = 1440, rh = 72;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, 110, top - 64, W - 220, rows.length * rh + 60, 40);
    ctx.fill();
    rows.forEach((g, i) => {
      const y = top + i * rh;
      ctx.save();
      ctx.translate(170, y - 24);
      ctx.scale(1.7, 1.7);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash(g.id === 'gap' ? [2.6, 2.4] : []);
      ctx.stroke(new Path2D(S.art.groupPath(g.id)));
      ctx.restore();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.font = font(600, 40);
      ctx.fillText((G[g.id] || {}).title || g.id, 230, y + 6);
      ctx.textAlign = 'right';
      ctx.font = font(800, 44);
      ctx.fillText(String(sum[g.id]), W - 160, y + 8);
    });

    footer(ctx, `Карта вашей пары — ${site()}`);
    return canvas;
  }

  S.share.renderPair = renderPair;
  S.share.renderMap = renderMap;
})(window);
