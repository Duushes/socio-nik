/* Socio-Nik · объёмные знаки аспектов: сенсорика — шар, интуиция — пирамида, логика — куб, этика — уголок.
   Экстравертные («чёрные») аспекты — плотные матовые, интровертные («белые») — стеклянные.
   Свет сверху-слева, глубина уходит вправо-вверх: видны фасад, верх и правая грань. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const art = S.art = S.art || {};
  const { tone, rgba } = S.color;

  const D = [15, -13];                        // вектор глубины
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const yRange = pts => [Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[1]))];
  const poly = (pts, fill, extra) => Object.assign({ t: 'poly', pts, fill }, extra || {});
  const line = (pts, stroke, sw, extra) => Object.assign({ t: 'line', pts, stroke, sw }, extra || {});

  // dark — стекло на тёмном фоне светлее и с яркими рёбрами, иначе тонет в черноте
  function palette(c, glass, dark) {
    if (!glass) {
      return {
        top: (y0, y1) => ({ lin: [0, y1, 0, y0], stops: [[0, tone(c, 0.26)], [1, tone(c, 0.5)]] }),
        front: (y0, y1) => ({ lin: [0, y0, 0, y1], stops: [[0, tone(c, 0.14)], [1, tone(c, -0.14)]] }),
        side: (y0, y1) => ({ lin: [0, y0, 0, y1], stops: [[0, tone(c, -0.2)], [1, tone(c, -0.44)]] }),
        shine: 'rgba(255,255,255,0.55)'
      };
    }
    if (dark) {
      return {
        top: () => rgba(tone(c, 0.7), 0.58),
        front: (y0, y1) => ({ lin: [0, y0, 0, y1], stops: [[0, rgba(tone(c, 0.55), 0.52)], [1, rgba(tone(c, 0.15), 0.26)]] }),
        side: () => rgba(tone(c, 0.1), 0.44),
        edge: rgba(tone(c, 0.45), 0.95),
        hidden: rgba(tone(c, 0.35), 0.5),
        shine: 'rgba(255,255,255,0.95)'
      };
    }
    return {
      top: () => rgba(tone(c, 0.62), 0.5),
      front: (y0, y1) => ({ lin: [0, y0, 0, y1], stops: [[0, rgba(tone(c, 0.45), 0.42)], [1, rgba(c, 0.14)]] }),
      side: () => rgba(tone(c, -0.08), 0.36),
      edge: rgba(tone(c, -0.24), 0.92),
      hidden: rgba(tone(c, -0.12), 0.45),
      shine: 'rgba(255,255,255,0.95)'
    };
  }

  // Экструзия многоугольника (обход по часовой на экране): видны стенки, чья нормаль смотрит в сторону D
  function solid(front, c, glass, dark) {
    const P = palette(c, glass, dark), out = [];
    const back = front.map(p => add(p, D));
    const walls = front.map((p, i) => {
      const q = front[(i + 1) % front.length];
      const n = [q[1] - p[1], -(q[0] - p[0])];
      return { edge: [p, q], pts: [p, q, add(q, D), add(p, D)], visible: n[0] * D[0] + n[1] * D[1] > 0, top: n[1] < 0 };
    });
    if (glass) {
      // «Рёбра насквозь»: задняя грань и связки видны сквозь стекло
      out.push(line(back.concat([back[0]]), P.hidden, 1.1));
      front.forEach((p, i) => out.push(line([p, back[i]], P.hidden, 1.1)));
    }
    walls.filter(w => w.visible).forEach(w => {
      const [y0, y1] = yRange(w.pts);
      out.push(poly(w.pts, w.top ? P.top(y0, y1) : P.side(y0, y1), glass ? { stroke: P.edge, sw: 1.4 } : null));
    });
    const [fy0, fy1] = yRange(front);
    out.push(poly(front, P.front(fy0, fy1), glass ? { stroke: P.edge, sw: 1.6 } : null));
    walls.filter(w => w.visible && w.top).forEach(w => out.push(line(w.edge, P.shine, glass ? 1.5 : 1.2, { op: glass ? 0.95 : 0.7 })));
    return [{ t: 'g', tf: { x: -D[0] / 2, y: -D[1] / 2 }, children: out }];
  }

  const SQUARE = [[-32, -32], [32, -32], [32, 32], [-32, 32]];
  const ELL = [[-34, -34], [-10, -34], [-10, 10], [34, 10], [34, 34], [-34, 34]];

  function pyramid(c, glass, dark) {
    const P = palette(c, glass, dark), out = [];
    const FL = [-38, 32], FR = [38, 32], BR = add(FR, D), BL = add(FL, D), A = [D[0] / 2, -50];
    if (glass) out.push(line([BL, FL], P.hidden, 1.1), line([BL, BR], P.hidden, 1.1), line([BL, A], P.hidden, 1.1));
    const right = [FR, BR, A], front = [FL, FR, A];
    const [ry0, ry1] = yRange(right), [fy0, fy1] = yRange(front);
    out.push(poly(right, P.side(ry0, ry1), glass ? { stroke: P.edge, sw: 1.4 } : null));
    out.push(poly(front, P.front(fy0, fy1), glass ? { stroke: P.edge, sw: 1.6 } : null));
    out.push(line([A, FL], P.shine, glass ? 1.5 : 1.2, { op: glass ? 0.95 : 0.6 }));
    return [{ t: 'g', tf: { x: -D[0] / 2, y: 9 }, children: out }];
  }

  const arc = (r, a0, a1) => {
    const p = a => [r * Math.cos(a * Math.PI / 180), r * Math.sin(a * Math.PI / 180)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };

  function sphere(c, glass, dark) {
    const r = 40;
    if (!glass) {
      return [
        { t: 'circle', cx: 0, cy: 0, r, fill: { rad: [0, 0, r * 1.3, -r * 0.35, -r * 0.4], stops: [[0, tone(c, 0.6)], [0.45, tone(c, 0.06)], [1, tone(c, -0.46)]] } },
        { t: 'ellipse', cx: -r * 0.34, cy: -r * 0.42, rx: r * 0.3, ry: r * 0.19, fill: { rad: [-r * 0.34, -r * 0.42, r * 0.3], stops: [[0, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']] } }
      ];
    }
    return [
      { t: 'circle', cx: 0, cy: 0, r, fill: { rad: [0, 0, r, -r * 0.3, -r * 0.35], stops: dark ? [[0, 'rgba(255,255,255,0.62)'], [0.55, rgba(tone(c, 0.45), 0.34)], [1, rgba(tone(c, 0.15), 0.62)]] : [[0, 'rgba(255,255,255,0.55)'], [0.55, rgba(tone(c, 0.35), 0.22)], [1, rgba(c, 0.5)]] }, stroke: palette(c, true, dark).edge, sw: 1.6 },
      { t: 'path', d: arc(r * 0.74, 195, 255), fill: 'none', stroke: 'rgba(255,255,255,0.95)', sw: 3.2 },
      { t: 'ellipse', cx: r * 0.28, cy: r * 0.5, rx: r * 0.36, ry: r * 0.14, fill: { rad: [r * 0.28, r * 0.5, r * 0.36], stops: [[0, rgba(tone(c, 0.2), 0.65)], [1, rgba(tone(c, 0.2), 0)]] } }
    ];
  }

  // element: I | S | L | E; vert: e (матовый) | i (стеклянный)
  // theme — светлая / тёмная; по умолчанию текущая
  function glyph(element, vert, c, theme) {
    const glass = vert === 'i', dark = (theme || S.theme.resolved()) === 'dark';
    if (element === 'S') return sphere(c, glass, dark);
    if (element === 'I') return pyramid(c, glass, dark);
    if (element === 'L') return solid(SQUARE, c, glass, dark);
    return solid(ELL, c, glass, dark);
  }

  const glyphOf = (aspectId, c, theme) => {
    const a = S.data.aspects[aspectId];
    return glyph(a.element, a.vert, c, theme);
  };

  // Отдельный знак в своём SVG
  art.glyphSVG = (aspectId, c, cls = 'glyph', theme) => art.svg(glyphOf(aspectId, c, theme), { viewBox: '-60 -60 120 120', cls });

  // Плоский соционический символ для текста: закрашенный — «чёрный» аспект, контур — «белый»
  art.symbol = (aspectId, cls = 'sym') => {
    const a = S.data.aspects[aspectId], filled = a.vert === 'e';
    const st = filled ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"';
    const shape = {
      L: `<rect x="3.5" y="3.5" width="13" height="13" ${st}/>`,
      E: `<polygon points="3.5,3.5 8.5,3.5 8.5,11.5 16.5,11.5 16.5,16.5 3.5,16.5" ${st}/>`,
      S: `<circle cx="10" cy="10" r="6.8" ${st}/>`,
      I: `<polygon points="10,3 17.2,16.5 2.8,16.5" ${st}/>`
    }[a.element];
    return `<svg class="${cls}" viewBox="0 0 20 20" aria-hidden="true" focusable="false">${shape}</svg>`;
  };

  art.glyph = glyph;
  art.glyphOf = glyphOf;
  art.D = D;
})(typeof window !== 'undefined' ? window : globalThis);
