/* Socio-Nik · сцены интертипных отношений: две фигуры разыгрывают суть отношения.
   left — тот, от кого идёт действие (ревизор, заказчик); анимации — в css/motion.css (.sc-<вид>). */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const art = S.art = S.art || {};
  const { tone, rgba } = S.color;

  const LX = 100, RX = 220, Y = 86;

  function star(cx, cy, r, k) {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * k : r;
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
    return pts;
  }

  // kind — вид отношения (kind из data/relations.js)
  art.scene = (kind, left, right, { theme, labels, cls = '', label } = {}) => {
    const th = theme || S.theme.resolved();
    const cl = S.theme.quadraColor(left.quadra, th), cr = S.theme.quadraColor(right.quadra, th);
    const ink = th === 'dark' ? '#f5f5f7' : '#1d1d1f';
    const fig = (t, c, role, x, y, s = 0.56, extra = {}) => ({
      t: 'g', tf: Object.assign({ x, y, s }, extra), children: [{ t: 'g', cls: 'sf ' + role, children: art.glyphOf(t.ego[0], c, th) }]
    });
    let A = fig(left, cl, 'sa', LX, Y), B = fig(right, cr, 'sb', RX, Y);
    const back = [], front = [];
    const both = { lin: [LX, 0, RX, 0], stops: [[0, cl], [1, cr]] };

    switch (kind) {
      case 'dual':
        back.push({ t: 'circle', cx: 160, cy: Y, r: 74, fill: 'none', stroke: both, sw: 2, cls: 'sx sx-ring' });
        break;
      case 'activation':
        back.push({ t: 'circle', cx: 160, cy: Y, r: 58, fill: 'none', stroke: rgba(ink, 0.14), sw: 1.2, dash: '2 6' });
        A = fig(left, cl, 'sa', 104, Y, 0.5);
        B = fig(right, cr, 'sb', 216, Y, 0.5);
        A = { t: 'g', cls: 'sx-spin', children: [A, B] };
        B = null;
        break;
      case 'mirror':
        back.push({ t: 'line', pts: [[160, 16], [160, 150]], stroke: rgba(ink, 0.28), sw: 1.2, dash: '3 5', cls: 'sx sx-line' });
        B = fig(right, cr, 'sb', RX, Y, 0.56, { fx: -1 });
        break;
      case 'semidual':
        front.push({ t: 'poly', pts: star(160, Y, 11, 0.32), fill: { rad: [160, Y, 11], stops: [[0, '#ffffff'], [1, tone(cl, 0.3)]] }, cls: 'sx sx-spark' });
        break;
      case 'mirage':
        [58, 86, 114].forEach((y, i) => back.push({ t: 'path', d: `M180 ${y} q10 -6 20 0 t20 0 t20 0 t20 0`, fill: 'none', stroke: rgba(cr, 0.4), sw: 1.6, cls: `sx sx-wave w${i}` }));
        break;
      case 'identity':
        back.push({ t: 'line', pts: [[150, Y - 4], [170, Y - 4]], stroke: rgba(ink, 0.3), sw: 2 }, { t: 'line', pts: [[150, Y + 4], [170, Y + 4]], stroke: rgba(ink, 0.3), sw: 2 });
        break;
      case 'kindred':
        front.push({ t: 'g', cls: 'sx sx-sat sx-sat-a', children: [{ t: 'circle', cx: LX + 40, cy: Y, r: 6, fill: tone(cl, 0.2) }] });
        front.push({ t: 'g', cls: 'sx sx-sat sx-sat-b', children: [{ t: 'circle', cx: RX - 40, cy: Y, r: 6, fill: tone(cr, 0.2) }] });
        break;
      case 'business':
        back.push({ t: 'line', pts: [[36, 146], [284, 146]], stroke: rgba(ink, 0.22), sw: 2, dash: '10 10', cls: 'sx sx-track' });
        break;
      case 'quasi':
        back.push({ t: 'line', pts: [[160, 40], [160, 132]], stroke: rgba(ink, 0.12), sw: 1 });
        break;
      case 'request':
        back.push({ t: 'path', d: `M${LX + 12} ${Y - 16} Q160 ${Y - 66} ${RX - 12} ${Y - 16}`, fill: 'none', stroke: rgba(ink, 0.2), sw: 1.4, dash: '3 5' });
        front.push({ t: 'g', cls: 'sx sx-gift', children: [{ t: 'circle', cx: LX + 12, cy: Y - 16, r: 7, fill: { rad: [LX + 12, Y - 16, 7], stops: [[0, '#ffffff'], [1, tone(cl, 0.25)]] } }] });
        break;
      case 'extinguish':
        break;
      case 'superego':
        back.push({ t: 'line', pts: [[132, Y], [150, Y]], stroke: rgba(ink, 0.28), sw: 1.4 }, { t: 'line', pts: [[170, Y], [188, Y]], stroke: rgba(ink, 0.28), sw: 1.4 });
        break;
      case 'supervision':
        A = fig(left, cl, 'sa', 92, 62, 0.64);
        B = fig(right, cr, 'sb', 228, 104, 0.5);
        back.push({ t: 'poly', pts: [[116, 66], [210, 80], [214, 132]], fill: { lin: [116, 0, 214, 0], stops: [[0, rgba(cl, 0.55)], [1, rgba(cl, 0.04)]] }, cls: 'sx sx-beam' });
        break;
      case 'conflict':
        [[-1, -1], [1, -1], [0, 1.3]].forEach(([dx, dy], i) => front.push({ t: 'line', pts: [[160 + dx * 8, Y + dy * 8], [160 + dx * 18, Y + dy * 18]], stroke: tone(cl, 0.2), sw: 2.4, cls: `sx sx-hit h${i}` }));
        break;
      default:
        break;
    }

    const lab = labels || [left.code, right.code];
    const text = kind === 'supervision'
      ? [{ t: 'text', x: 92, y: 124, text: lab[0], cls: 'sc-lab' }, { t: 'text', x: 228, y: 156, text: lab[1], cls: 'sc-lab' }]
      : [{ t: 'text', x: LX, y: 164, text: lab[0], cls: 'sc-lab' }, { t: 'text', x: RX, y: 164, text: lab[1], cls: 'sc-lab' }];
    const nodes = back.concat([A], B ? [B] : [], front, text);
    return art.svg(nodes, { viewBox: '0 0 320 180', cls: `scene sc-${kind} ${cls}`, label });
  };

  // Сцена-загадка для страницы результата по ссылке: тип друга и стеклянный шар с «?» — тип того, кто ещё не прошёл тест
  art.mystery = (t, { theme, cls = '' } = {}) => {
    const th = theme || S.theme.resolved();
    const c = S.theme.quadraColor(t.quadra, th), ink = th === 'dark' ? '#f5f5f7' : '#1d1d1f';
    const acc = th === 'dark' ? '#2997ff' : '#0071e3';
    const nodes = [
      { t: 'path', d: `M${LX + 18} ${Y - 18} Q160 ${Y - 70} ${RX - 18} ${Y - 18}`, fill: 'none', stroke: rgba(ink, 0.28), sw: 1.4, dash: '3 6', cls: 'sx sx-arc' },
      { t: 'g', tf: { x: LX, y: Y, s: 0.56 }, children: [{ t: 'g', cls: 'sf sa', children: art.glyphOf(t.ego[0], c, th) }] },
      { t: 'g', tf: { x: RX, y: Y, s: 0.56 }, children: [{ t: 'g', cls: 'sf sb', children: art.glyph('S', 'i', acc, th) }] },
      { t: 'text', x: RX, y: Y + 12, text: '?', cls: 'sc-q' },
      { t: 'text', x: LX, y: 164, text: t.code, cls: 'sc-lab' },
      { t: 'text', x: RX, y: 164, text: 'ты', cls: 'sc-lab' }
    ];
    return art.svg(nodes, { viewBox: '0 0 320 180', cls: `scene sc-mystery ${cls}`, label: `${t.code} и ты: отношения пока неизвестны` });
  };
})(typeof window !== 'undefined' ? window : globalThis);
