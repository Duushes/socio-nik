/* Socio-Nik · карта пары: восемь сфер по кругу, у каждой два лепестка — твой и партнёра.
   Длина лепестка — сила функции (мерность по Букалову: 1 и 8 — четыре, 2 и 7 — три, 3 и 6 — две, 4 и 5 — одна).
   Заливка — ценность: насыщенный лепесток — человеку это важно, бледный с контуром — умеет или терпит, но не ценит.
   Один список примитивов рисуется и в SVG на странице, и на canvas в картинке для сторис. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const art = S.art = S.art || {};
  const { tone, rgba } = S.color;

  const R0 = 30, RMAX = 150, LABEL_R = 184, HALF = 210;
  const SPREAD = 9;            // градусов между лепестком и лучом сферы
  const rad = d => d * Math.PI / 180;
  const polar = (r, deg) => [r * Math.cos(rad(deg)), r * Math.sin(rad(deg))];
  const angleOf = i => -90 + i * 45;

  // Цвета двоих: у партнёра из той же квадры — другой оттенок, чтобы лепестки не сливались
  function colors(a, b, theme) {
    const dark = theme === 'dark';
    const me = S.theme.quadraColor(a.quadra, theme);
    let partner = S.theme.quadraColor(b.quadra, theme);
    if (a.quadra === b.quadra) partner = dark ? tone(partner, 0.45) : tone(partner, -0.42);
    return { me, partner };
  }

  function leaf(r, phi, c, isValued, dark, cls) {
    const rt = R0 + (RMAX - R0) * r;
    const rm = R0 + (rt - R0) * 0.55;
    const w = Math.atan(15 / rm) * 180 / Math.PI;
    const [bx, by] = polar(R0 - 4, phi), [tx, ty] = polar(rt, phi);
    const [c1x, c1y] = polar(rm, phi - w), [c2x, c2y] = polar(rm, phi + w);
    const d = `M${bx.toFixed(1)} ${by.toFixed(1)} Q${c1x.toFixed(1)} ${c1y.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)} Q${c2x.toFixed(1)} ${c2y.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}Z`;
    const fill = isValued
      ? { lin: [bx, by, tx, ty], stops: [[0, rgba(c, dark ? 0.3 : 0.22)], [1, rgba(c, dark ? 0.95 : 0.9)]] }
      : rgba(c, dark ? 0.16 : 0.1);
    return { t: 'path', d, fill, stroke: isValued ? rgba(c, 0.95) : rgba(c, 0.85), sw: isValued ? 1.4 : 1.6, dash: isValued ? '' : '4 3', cls };
  }

  // zones — из S.core.pair.map(a, b); theme — светлая / тёмная
  function pairMapNodes(a, b, theme, { zones } = {}) {
    const th = theme || S.theme.resolved(), dark = th === 'dark';
    const z = zones || S.core.pair.map(a, b);
    const c = colors(a, b, th);
    const ink = dark ? '#f5f5f7' : '#1d1d1f';
    const nodes = [
      { t: 'circle', cx: 0, cy: 0, r: RMAX + 6, fill: { rad: [0, 0, RMAX + 6], stops: [[0, rgba(ink, dark ? 0.07 : 0.035)], [1, rgba(ink, 0)]] } }
    ];
    [0.25, 0.5, 0.75, 1].forEach(k => nodes.push({ t: 'circle', cx: 0, cy: 0, r: R0 + (RMAX - R0) * k, fill: 'none', stroke: rgba(ink, k === 1 ? 0.16 : 0.09), sw: 1, dash: k === 1 ? '' : '2 5' }));
    z.forEach((x, i) => {
      const [lx, ly] = polar(RMAX + 8, angleOf(i));
      nodes.push({ t: 'line', pts: [[0, 0], [lx, ly]], stroke: rgba(ink, 0.08), sw: 1 });
    });
    z.forEach((x, i) => {
      const th0 = angleOf(i);
      nodes.push({ t: 'g', cls: `pm-petal pm-${x.group}`, children: [
        leaf(x.dimA / 4, th0 - SPREAD, c.me, x.valuedA, dark, 'pm-me'),
        leaf(x.dimB / 4, th0 + SPREAD, c.partner, x.valuedB, dark, 'pm-partner')
      ] });
    });
    nodes.push({ t: 'circle', cx: 0, cy: 0, r: R0 - 6, fill: dark ? '#000000' : '#ffffff', stroke: rgba(ink, 0.12), sw: 1 });
    return { nodes, colors: c, labels: z.map((x, i) => {
      const [x0, y0] = polar(LABEL_R, angleOf(i));
      return { aspect: x.aspect, x: x0, y: y0, angle: angleOf(i), left: ((x0 + HALF) / (2 * HALF)) * 100, top: ((y0 + HALF) / (2 * HALF)) * 100 };
    }) };
  }

  art.pairMapNodes = pairMapNodes;
  art.pairMapSVG = (a, b, { theme, zones, cls = '', label = '' } = {}) =>
    art.svg(pairMapNodes(a, b, theme, { zones }).nodes, { viewBox: `${-HALF} ${-HALF} ${2 * HALF} ${2 * HALF}`, cls: 'pm-svg ' + cls, label });
  art.pairMapGeo = { R0, RMAX, LABEL_R, HALF, angleOf, polar, colors };

  // Значки групп зон: рисуются текстовым цветом (цвет на карте — у людей, а не у групп)
  const GROUP_PATHS = {
    fit: 'M10 3.2a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 0 0 0-13.6zM10 3.2c-3.4 0-3.4 6.8 0 6.8s3.4 6.8 0 6.8',
    common: 'M4 7.5h12M4 12.5h12',
    ask: 'M4.2 5.6c0-1.3 1-2.3 2.3-2.3h7c1.3 0 2.3 1 2.3 2.3v5.4c0 1.3-1 2.3-2.3 2.3H9.6L6.2 16.4v-3.1h0c-1.1-.2-2-1.1-2-2.3z',
    care: 'M10 16.2 4.4 10.7a3.5 3.5 0 0 1 5-4.9l.6.6.6-.6a3.5 3.5 0 0 1 5 4.9z',
    gap: 'M10 3.4a6.6 6.6 0 1 1 0 13.2 6.6 6.6 0 0 1 0-13.2z'
  };
  art.groupIcon = (id, cls = 'gi') => `<svg class="${cls} gi-${id}" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="${GROUP_PATHS[id]}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"${id === 'gap' ? ' stroke-dasharray="2.6 2.4"' : ''}/></svg>`;
  art.groupPath = id => GROUP_PATHS[id];
})(typeof window !== 'undefined' ? window : globalThis);
