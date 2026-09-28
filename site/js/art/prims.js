/* Socio-Nik · мини-рендер иллюстраций: один список примитивов → SVG-строка или Canvas 2D.
   Поэтому эмблема на сайте и в картинке для шера — одна и та же, а canvas не «пачкается» растровыми файлами.
   Узлы: poly · line · circle · ellipse · path · text · g { tf: {x, y, s, fx} }.
   Заливка: цвет | { lin: [x1,y1,x2,y2], stops } | { rad: [cx,cy,r,fx,fy], stops }. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const art = S.art = S.art || {};

  let uid = 0;
  const n2 = v => Math.round(v * 100) / 100;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function toSVG(nodes) {
    const defs = [];
    const paint = p => {
      if (!p || p === 'none') return 'none';
      if (typeof p === 'string') return p;
      const id = 'sn' + (++uid);
      const stops = p.stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
      if (p.lin) {
        const [x1, y1, x2, y2] = p.lin.map(n2);
        defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`);
      } else {
        const [cx, cy, r, fx = cx, fy = cy] = p.rad.map(n2);
        defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}">${stops}</radialGradient>`);
      }
      return `url(#${id})`;
    };
    const attrs = n => {
      let a = '';
      if (n.t !== 'g' && n.t !== 'text') a += ` fill="${paint(n.t === 'line' ? 'none' : n.fill)}"`;
      if (n.stroke) a += ` stroke="${paint(n.stroke)}" stroke-width="${n.sw || 1}" stroke-linejoin="round" stroke-linecap="round"`;
      if (n.dash) a += ` stroke-dasharray="${n.dash}"`;
      if (n.op != null) a += ` opacity="${n.op}"`;
      if (n.cls) a += ` class="${n.cls}"`;
      return a;
    };
    const pts = list => list.map(p => n2(p[0]) + ',' + n2(p[1])).join(' ');
    const tf = t => {
      if (!t) return '';
      const s = t.s == null ? 1 : t.s, fx = t.fx || 1;
      const scale = s !== 1 || fx !== 1 ? ` scale(${n2(s * fx)} ${n2(s)})` : '';
      return ` transform="translate(${n2(t.x || 0)} ${n2(t.y || 0)})${scale}"`;
    };
    const node = n => {
      switch (n.t) {
        case 'poly': return `<polygon points="${pts(n.pts)}"${attrs(n)}/>`;
        case 'line': return `<polyline points="${pts(n.pts)}"${attrs(n)}/>`;
        case 'circle': return `<circle cx="${n2(n.cx)}" cy="${n2(n.cy)}" r="${n2(n.r)}"${attrs(n)}/>`;
        case 'ellipse': return `<ellipse cx="${n2(n.cx)}" cy="${n2(n.cy)}" rx="${n2(n.rx)}" ry="${n2(n.ry)}"${attrs(n)}/>`;
        case 'path': return `<path d="${n.d}"${attrs(n)}/>`;
        case 'text': return `<text x="${n.x}" y="${n.y}" text-anchor="${n.anchor || 'middle'}"${attrs(n)}>${esc(n.text)}</text>`;
        case 'g': return `<g${tf(n.tf)}${attrs(n)}>${n.children.map(node).join('')}</g>`;
        default: return '';
      }
    };
    const body = nodes.map(node).join('');
    return (defs.length ? `<defs>${defs.join('')}</defs>` : '') + body;
  }

  function toCanvas(ctx, nodes) {
    const paint = p => {
      if (typeof p === 'string') return p;
      let g;
      if (p.lin) g = ctx.createLinearGradient(p.lin[0], p.lin[1], p.lin[2], p.lin[3]);
      else {
        const [cx, cy, r, fx = cx, fy = cy] = p.rad;
        g = ctx.createRadialGradient(fx, fy, 0, cx, cy, r);
      }
      p.stops.forEach(([o, c]) => g.addColorStop(o, c));
      return g;
    };
    const draw = n => {
      if (n.t === 'text') return;
      ctx.save();
      if (n.op != null) ctx.globalAlpha *= n.op;
      if (n.t === 'g') {
        if (n.tf) {
          const s = n.tf.s == null ? 1 : n.tf.s;
          ctx.translate(n.tf.x || 0, n.tf.y || 0);
          ctx.scale(s * (n.tf.fx || 1), s);
        }
        n.children.forEach(draw);
        ctx.restore();
        return;
      }
      let path;
      if (n.t === 'path') path = new Path2D(n.d);
      else {
        path = new Path2D();
        if (n.t === 'poly' || n.t === 'line') {
          n.pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
          if (n.t === 'poly') path.closePath();
        } else if (n.t === 'circle') path.arc(n.cx, n.cy, n.r, 0, Math.PI * 2);
        else if (n.t === 'ellipse') path.ellipse(n.cx, n.cy, n.rx, n.ry, 0, 0, Math.PI * 2);
      }
      if (n.t !== 'line' && n.fill && n.fill !== 'none') {
        ctx.fillStyle = paint(n.fill);
        ctx.fill(path);
      }
      if (n.stroke) {
        ctx.strokeStyle = paint(n.stroke);
        ctx.lineWidth = n.sw || 1;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.setLineDash(n.dash ? String(n.dash).split(/[\s,]+/).map(Number) : []);
        ctx.stroke(path);
      }
      ctx.restore();
    };
    nodes.forEach(draw);
  }

  // SVG-обёртка: с подписью — role="img", без — декоративная
  art.svg = (nodes, { viewBox = '-100 -100 200 200', cls = '', label = '' } = {}) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="${cls}"` +
    (label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true" focusable="false"') +
    `>${toSVG(nodes)}</svg>`;
  art.toSVG = toSVG;
  art.toCanvas = toCanvas;
})(typeof window !== 'undefined' ? window : globalThis);
