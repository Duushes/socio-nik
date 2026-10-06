/* Socio-Nik · карта отношений типа: тип вверху круга, остальные 15 по кругу — справа поддерживающие, внизу
   напряжённые, слева рабочие; от типа к каждому — дуга в цвете тона. Наведение или нажатие на аватар показывает
   подробный разбор пары в панели рядом: суть, как это устроено в модели А простыми словами, как ладить. */
(function (root) {
  const S = root.Socio;
  const ui = S.ui = S.ui || {};
  const { esc } = S.dom;
  const M = () => S.core.modelA;

  const nm = t => t.short || t.alias;
  const PLAIN = {
    Ne: 'чутьё на новые идеи', Ni: 'чувство времени', Se: 'воля и напор', Si: 'чувство комфорта',
    Te: 'деловая хватка', Ti: 'системное мышление', Fe: 'эмоциональность', Fi: 'чуткость к отношениям'
  };
  // Позиция в модели А словами (название функции — в скобках, для любопытных)
  const FN = {
    1: 'главная сила (базовая функция)',
    2: 'рабочий инструмент (творческая)',
    3: 'то, что получается с напряжением (ролевая)',
    4: 'самое уязвимое место (болевая)',
    5: 'то, чего больше всего не хватает (суггестивная)',
    6: 'то, что заряжает энергией (активационная)',
    7: 'сильная, но сдержанная сторона (ограничительная)',
    8: 'то, что выходит само собой, фоном (демонстрационная)'
  };
  const TONE_TEXT = {
    support: 'легко и тепло: друг друга понимаете с полуслова',
    work: 'ровно и по делу: вместе удобно работать, но близость не гарантирована',
    tense: 'с напряжением: помогают дистанция и правила'
  };

  // Порядок по кругу (по часовой стрелке от верха): справа поддерживающие, внизу напряжённые, слева рабочие
  const ORDER = [
    'dual', 'activation', 'semidual', 'mirror', 'mirage',
    'extinguish', 'supervisor', 'conflict', 'supervisee', 'superego',
    'kindred', 'business', 'quasi', 'beneficiary', 'benefactor'
  ];
  const CX = 500, CY = 530, R = 360, NODE = 48, MAIN = 80;
  const GAP = 32;   // градусов свободно по обе стороны от главного аватара вверху

  function layout(t) {
    const others = S.data.types.filter(b => b.id !== t.id).map(b => ({ b, r: M().relation(t, b) }));
    others.sort((x, y) => ORDER.indexOf(x.r.id) - ORDER.indexOf(y.r.id));
    return others.map((o, i) => {
      const a = (-90 + GAP + i * (360 - 2 * GAP) / 14) * Math.PI / 180;
      const ux = Math.cos(a), uy = Math.sin(a);
      // подпись — снаружи круга, по радиусу: так она не наезжает на соседей
      const lx = CX + (R + NODE + 22) * ux, ly = CY + (R + NODE + 22) * uy + 11;
      const anchor = ux > 0.3 ? 'start' : ux < -0.3 ? 'end' : 'middle';
      return Object.assign(o, { i: i + 1, x: CX + R * ux, y: CY + R * uy, lx, ly, anchor });
    });
  }

  // Дуга от типа вверху к узлу: выходит вниз и изгибается через середину круга
  const arc = (mx, my, n) => {
    const c1x = mx + (n.x - mx) * 0.08, c1y = my + 300;
    const c2x = n.x + (CX - n.x) * 0.42, c2y = n.y + (CY - n.y) * 0.42;
    return `M${mx.toFixed(1)} ${my.toFixed(1)} C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${n.x.toFixed(1)} ${n.y.toFixed(1)}`;
  };

  // Аватар в круге: лицо в центре (бюст 4:5, лицо на ~32 % высоты)
  const avatar = (t, d, clip) => {
    const w = d * 1.45, h = w * 1.25;
    return `<image href="img/types/${t.id}-520.webp" x="${(-w / 2).toFixed(1)}" y="${(-h * 0.32).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" clip-path="url(#${clip})" preserveAspectRatio="xMidYMid meet"/>`;
  };

  ui.relMap = (t, { uid = 'rm' } = {}) => {
    const nodes = layout(t), mx = CX, my = CY - R;
    const label = r => r.role ? `${r.name} · ${r.role}` : r.name;
    return `
      <div class="relmap reveal" data-relmap="${t.id}" style="${ui.qStyle(t.quadra)}">
        <div class="rm-stage">
          <div class="rm-filters" role="group" aria-label="Показать отношения">
            ${['support', 'work', 'tense'].map(tone => `<button type="button" class="rm-chip t-${tone}" data-tone="${tone}" aria-pressed="false"><i aria-hidden="true"></i>${ui.toneName(tone)}</button>`).join('')}
          </div>
          <svg class="rm-svg" viewBox="-90 70 1180 940" role="group" aria-label="Карта отношений типа «${esc(nm(t))}» со всеми остальными">
            <defs>
              <clipPath id="${uid}-c"><circle r="${NODE - 4}"/></clipPath>
              <clipPath id="${uid}-m"><circle r="${MAIN - 5}"/></clipPath>
            </defs>
            <circle class="rm-orbit" cx="${CX}" cy="${CY}" r="${R}"/>
            <g class="rm-lines">${nodes.map(n => `<path class="rm-line t-${n.r.tone}" data-i="${n.i}" style="--k:${n.i}" pathLength="1" d="${arc(mx, my, n)}"/>`).join('')}</g>
            <g class="rm-nodes">${nodes.map(n => `
              <g transform="translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})">
                <g class="rm-node t-${n.r.tone}" data-i="${n.i}" data-b="${n.b.id}" style="--k:${n.i}" tabindex="0" role="button" aria-label="${esc(`${nm(n.b)} (${n.b.code}): ${label(n.r)}`)}">
                  <circle class="rm-bg" r="${NODE}"/>
                  ${avatar(n.b, (NODE - 4) * 2, `${uid}-c`)}
                  <circle class="rm-ring" r="${NODE}"/>
                  <text class="rm-code" x="${(n.lx - n.x).toFixed(1)}" y="${(n.ly - n.y).toFixed(1)}" text-anchor="${n.anchor}">${n.b.code}</text>
                </g>
              </g>`).join('')}
            </g>
            <g transform="translate(${mx} ${my})">
              <g class="rm-main">
                <circle class="rm-glow" r="${MAIN + 46}"/>
                <circle class="rm-bg" r="${MAIN}"/>
                ${avatar(t, (MAIN - 5) * 2, `${uid}-m`)}
                <circle class="rm-ring" r="${MAIN}"/>
              </g>
            </g>
          </svg>
          <p class="rm-hint">Нажми на тип — появится разбор пары</p>
        </div>
        <div class="rm-panel" aria-live="polite">${ui.relDetail(t, nodes[0].b)}</div>
      </div>`;
  };

  // Подробный разбор пары для панели карты (и не только)
  ui.relDetail = (t, b) => {
    const r = M().relation(t, b), txt = ui.relText(r.kind);
    const role = txt.roles && txt.roles[r.id];
    const [p1, p2] = r.rule || [];
    return `
      <article class="rd t-${r.tone}" style="${ui.qStyle(b.quadra)}">
        <header class="rd-head">
          <span class="rd-ava">${ui.character(b, { sizes: ui.CHAR.ava, alt: '' })}</span>
          <div>
            <p class="rd-kicker">${b.code} «${esc(b.alias)}» · ${esc(b.role)}</p>
            <h3 class="rd-title">${esc(ui.relTitle(r, t, b))}</h3>
            <span class="rd-tone"><i aria-hidden="true"></i>${ui.toneName(r.tone)} — ${TONE_TEXT[r.tone]}</span>
          </div>
        </header>
        <p class="rd-line">${esc(txt.line || '')}</p>
        <p class="rd-about">${esc(txt.about || '')}</p>
        ${p1 ? `<div class="rd-block"><h4>Как это устроено</h4>
          <p>Сильные стороны типа «${esc(nm(b))}» — ${PLAIN[b.ego[0]]} и ${PLAIN[b.ego[1]]}. Для типа «${esc(nm(t))}» первое — ${FN[p1]}, второе — ${FN[p2]}.</p></div>` : ''}
        ${role ? `<div class="rd-block"><h4>Если ты — ${esc(nm(t))}</h4><p>${esc(role)}</p></div>` : ''}
        <div class="rd-block"><h4>Как ладить</h4><p>${esc(txt.tip || '')}</p></div>
        <a class="link" href="#/relations/${t.id}/${b.id}">Полный разбор пары</a>
      </article>`;
  };

  ui.mountRelMap = scope => {
    const box = scope.querySelector('[data-relmap]');
    if (!box) return () => {};
    const t = M().type(box.dataset.relmap);
    const svg = box.querySelector('.rm-svg'), panel = box.querySelector('.rm-panel');
    let selected = 1, shown = 1;
    const show = (i, sticky) => {
      const node = svg.querySelector(`.rm-node[data-i="${i}"]`);
      if (!node) return;
      if (sticky) selected = i;
      svg.querySelectorAll('.is-on').forEach(el => el.classList.remove('is-on'));
      node.classList.add('is-on');
      svg.querySelector(`.rm-line[data-i="${i}"]`).classList.add('is-on');
      svg.classList.add('has-on');
      if (shown !== i) {
        shown = i;
        panel.innerHTML = ui.relDetail(t, M().type(node.dataset.b));
        panel.classList.remove('pop');
        void panel.offsetWidth;
        panel.classList.add('pop');
      }
    };
    show(1, true);
    const nodeOf = e => e.target.closest && e.target.closest('.rm-node');
    const over = e => { const n = nodeOf(e); if (n) show(Number(n.dataset.i), false); };
    const leave = () => show(selected, false);
    const click = e => {
      const n = nodeOf(e);
      if (!n) return;
      show(Number(n.dataset.i), true);
      // на телефоне панель под картой — подводим к ней
      if (innerWidth < 900 && e.pointerType !== 'mouse') {
        const r = panel.getBoundingClientRect();
        if (r.top > innerHeight * 0.75) panel.scrollIntoView({ behavior: S.dom.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      }
    };
    const key = e => {
      const n = nodeOf(e);
      if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); show(Number(n.dataset.i), true); }
    };
    svg.addEventListener('pointerover', over);
    svg.addEventListener('focusin', over);
    svg.addEventListener('pointerleave', leave);
    svg.addEventListener('click', click);
    svg.addEventListener('keydown', key);
    // фильтры по тону: оставляют яркими только выбранные группы
    const chips = box.querySelector('.rm-filters');
    const onChip = e => {
      const c = e.target.closest('[data-tone]');
      if (!c) return;
      c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
      const on = Array.from(chips.querySelectorAll('[aria-pressed="true"]')).map(x => x.dataset.tone);
      ['support', 'work', 'tense'].forEach(tone => box.classList.toggle('f-' + tone, on.includes(tone)));
      box.classList.toggle('filtered', on.length > 0);
    };
    chips.addEventListener('click', onChip);
    return () => {};
  };
})(window);
