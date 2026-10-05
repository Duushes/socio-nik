/* Socio-Nik · эмблемы: тип (базовая функция крупно, творческая — на орбите) и квадра (4 ценности по кругу) */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const art = S.art = S.art || {};
  const { tone, rgba } = S.color;

  const ORBIT = { cx: 0, cy: 26, rx: 84, ry: 24 };

  // Точка орбиты: угол в градусах, depth > 0 — спутник перед базовым знаком
  function orbitPos(deg) {
    const a = deg * Math.PI / 180, depth = Math.sin(a);
    return { x: ORBIT.cx + ORBIT.rx * Math.cos(a), y: ORBIT.cy + ORBIT.ry * depth, s: 0.43 + 0.08 * depth, front: depth >= 0 };
  }

  function emblemNodes(t, theme, { at = 22 } = {}) {
    const c = S.theme.quadraColor(t.quadra, theme);
    const dark = theme === 'dark';
    const p = orbitPos(at);
    return [
      { t: 'circle', cx: 0, cy: 0, r: 98, fill: { rad: [0, 0, 98], stops: [[0, rgba(c, dark ? 0.34 : 0.22)], [0.55, rgba(c, dark ? 0.1 : 0.07)], [1, rgba(c, 0)]] } },
      { t: 'ellipse', cx: 0, cy: 84, rx: 48, ry: 7, cls: 'em-shadow', fill: { rad: [0, 84, 48], stops: [[0, dark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.16)'], [1, 'rgba(0,0,0,0)']] } },
      { t: 'ellipse', cx: ORBIT.cx, cy: ORBIT.cy, rx: ORBIT.rx, ry: ORBIT.ry, fill: 'none', stroke: rgba(c, dark ? 0.45 : 0.34), sw: 1.1, cls: 'em-orbit' },
      { t: 'g', tf: { x: -4, y: -10 }, cls: 'em-basewrap', children: [{ t: 'g', cls: 'em-base', children: art.glyphOf(t.ego[0], c, theme) }] },
      { t: 'g', tf: { x: p.x, y: p.y, s: p.s }, cls: 'em-sat', children: [{ t: 'g', cls: 'em-creative', children: art.glyphOf(t.ego[1], tone(c, 0.1), theme) }] }
    ];
  }

  art.emblemNodes = emblemNodes;

  art.emblem = (t, { cls = '', theme, label } = {}) =>
    art.svg(emblemNodes(t, theme || S.theme.resolved()), {
      cls: 'emblem ' + cls,
      label: label === false ? '' : (label || `Эмблема ${t.code}: базовая функция — ${S.data.aspects[t.ego[0]].name.toLowerCase()}, творческая — ${S.data.aspects[t.ego[1]].name.toLowerCase()}`)
    });

  // Живая орбита для крупных эмблем: спутник обходит базовый знак и уходит за него
  art.animateOrbit = svg => {
    const sat = svg && svg.querySelector('.em-sat');
    const base = svg && svg.querySelector('.em-basewrap');
    if (!sat || !base || S.dom.reducedMotion()) return () => {};
    let deg = 22, last = 0, raf = 0, visible = true;
    const tick = now => {
      raf = 0;
      if (!visible) return;
      if (last) deg = (deg + (now - last) * 0.02) % 360;   // ~18 с на круг
      last = now;
      const p = orbitPos(deg);
      sat.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${p.s.toFixed(3)})`);
      const before = sat.compareDocumentPosition(base) & Node.DOCUMENT_POSITION_FOLLOWING;
      if (p.front && before) base.after(sat);
      if (!p.front && !before) base.before(sat);
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) { last = 0; raf = requestAnimationFrame(tick); }
    });
    io.observe(svg);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  };

  // Эмблема квадры: 4 ценимых аспекта на общей орбите — отрисованные знаки; орбита медленно вращается, знаки стоят прямо
  const ORBIT_POS = [[50, 18], [82, 50], [50, 82], [18, 50]];
  art.quadraEmblem = (q, { cls = '' } = {}) => `
    <div class="qorbit ${cls}" role="img" aria-label="Квадра ${q.name}: ценности — ${q.values.map(v => S.data.aspects[v].short).join(', ')}" style="--q:var(--q-${q.id})">
      <span class="qo-glow" aria-hidden="true"></span><span class="qo-ring" aria-hidden="true"></span>
      <span class="qo-spin" aria-hidden="true">${q.values.map((id, i) => `<span class="qo-item" style="left:${ORBIT_POS[i][0]}%;top:${ORBIT_POS[i][1]}%">${art.aspectImg(id, q.id, 'qo-img')}</span>`).join('')}</span>
    </div>`;

  art.orbitPos = orbitPos;
})(typeof window !== 'undefined' ? window : globalThis);
