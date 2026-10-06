/* Socio-Nik · карта отношений типа — «орбиты». Тип стоит в центре, остальные 15 летают вокруг на трёх наклонных
   орбитах: чем ближе орбита, тем легче отношения (ближняя — поддерживающие, средняя — рабочие, дальняя — напряжённые).
   Так устроены эго-сети: в центре человек, расстояние до него — близость связи, круги подписаны и их немного.
   Нажатие или наведение на аватар выбирает пару: от центра к ней идёт луч с символом отношения, а в панели рядом —
   сцена пары, суть, как это устроено в модели А простыми словами и как ладить. Карта целиком влезает в один экран. */
(function (root) {
  const S = root.Socio;
  const ui = S.ui = S.ui || {};
  const { esc } = S.dom;
  const M = () => S.core.modelA;
  const NB = '\u00A0';

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
  const TONES = ['support', 'work', 'tense'];
  // Кто на какой орбите и в каком месте (по порядку углов орбиты): самое важное — впереди по центру
  const RING = {
    support: ['dual', 'activation', 'semidual', 'mirror', 'mirage'],
    work: ['business', 'kindred', 'benefactor', 'beneficiary', 'quasi'],
    tense: ['conflict', 'supervisor', 'supervisee', 'superego', 'extinguish']
  };
  // Как отношение называется на подписи (с ролью для заказа и ревизии)
  const TAG = {
    dual: 'дуал', activation: 'активация', semidual: 'полудуал', mirror: 'зеркало', mirage: 'мираж',
    business: 'деловые', kindred: 'родственные', benefactor: 'заказчик', beneficiary: 'подзаказный', quasi: 'квази',
    conflict: 'конфликт', supervisor: 'ревизор', supervisee: 'подревизный', superego: 'суперэго', extinguish: 'погашение'
  };
  // Куда течёт влияние по лучу: из центра к партнёру (out), от партнёра к центру (in) или обмен
  const FLOW = { supervisee: 'out', beneficiary: 'out', supervisor: 'in', benefactor: 'in' };

  // Геометрия сцены (единицы viewBox): широкая — от 768 px, высокая — телефон.
  // Углы: 90° — ближе всего к зрителю, 270° — дальше всего (там стоит персонаж в центре)
  const GEO = {
    wide: {
      vb: [0, 140, 1000, 650], cx: 500, cy: 430, k: 0.58, radii: [220, 342, 464], node: 42, bust: 190, base: 46,
      angles: [[90, 30, 150, 330, 210], [60, 120, 0, 180, 300], [90, 30, 150, 330, 210]],
      moons: [240, 240, 270]
    },
    tall: {
      vb: [0, 95, 1000, 845], cx: 500, cy: 470, k: 0.82, radii: [215, 335, 445], node: 60, bust: 190, base: 50,
      angles: [[90, 18, 162, 318, 222], [54, 126, 342, 198, 270], [90, 18, 162, 306, 234]],
      moons: null
    }
  };
  const wideMQ = () => root.matchMedia ? root.matchMedia('(min-width: 768px)') : { matches: true };
  const geoNow = () => (wideMQ().matches ? GEO.wide : GEO.tall);

  const pt = (g, ring, deg) => {
    const a = deg * Math.PI / 180, rx = g.radii[ring], ry = rx * g.k;
    return { x: g.cx + rx * Math.cos(a), y: g.cy + ry * Math.sin(a), d: Math.sin(a) };
  };
  const pctX = (g, x) => ((x - g.vb[0]) / g.vb[2] * 100).toFixed(3) + '%';
  const pctY = (g, y) => ((y - g.vb[1]) / g.vb[3] * 100).toFixed(3) + '%';

  function layout(t, g) {
    const rel = new Map(S.data.types.filter(b => b.id !== t.id).map(b => [M().relation(t, b).id, b]));
    const out = [];
    TONES.forEach((tone, ring) => RING[tone].forEach((rid, j) => {
      const b = rel.get(rid);
      if (!b) return;
      const p = pt(g, ring, g.angles[ring][j]);
      const s = 0.86 + 0.14 * p.d;                     // ближе — крупнее
      out.push({ b, r: M().relation(t, b), tone, ring, i: out.length + 1, ...p, s, rad: g.node * s });
    }));
    return out;
  }

  // Половины орбиты: задняя (за персонажем) и передняя
  const half = (g, ring, front) => {
    const rx = g.radii[ring], ry = rx * g.k, { cx, cy } = g;
    return front ? `M${cx - rx} ${cy} A${rx} ${ry.toFixed(1)} 0 0 0 ${cx + rx} ${cy}` : `M${cx + rx} ${cy} A${rx} ${ry.toFixed(1)} 0 0 0 ${cx - rx} ${cy}`;
  };

  // Аватар-шар на орбите: висит над своей точкой, под ним тень; подпись — код и вид отношения
  const node = (g, n) => {
    const lift = n.rad * 0.18;   // шар чуть парит над своей точкой орбиты
    const label = n.r.role ? `${n.r.name} · ${n.r.role}` : n.r.name;
    return `<button type="button" class="rm-node t-${n.tone}" data-i="${n.i}" data-b="${n.b.id}"
      style="left:${pctX(g, n.x)};top:${pctY(g, n.y - lift)};--d:${(n.rad * 2 / g.vb[2] * 100).toFixed(3)}%;--z:${n.d < 0 ? 10 + Math.round((n.d + 1) * 8) : 30 + Math.round(n.d * 8)};--k:${n.i};--dim:${(0.8 + 0.2 * (n.d + 1) / 2).toFixed(3)};${ui.qStyle(n.b.quadra)}"
      aria-pressed="false" aria-label="${esc(`${n.b.code} «${n.b.alias}»: ${label}, ${ui.toneName(n.tone)}`)}">
      <span class="rm-shadow" aria-hidden="true"></span>
      <span class="rm-orb">${ui.character(n.b, { sizes: '(min-width: 768px) 96px, 64px', alt: '' })}</span>
      <span class="rm-tag" aria-hidden="true"><b>${n.b.code}</b><small>${TAG[n.r.id]}</small></span>
    </button>`;
  };

  function stage(t, g) {
    const nodes = layout(t, g), [vx, vy, vw, vh] = g.vb, { cx, cy } = g;
    const rings = front => TONES.map((tone, ring) => `<path class="rm-ring t-${tone}" pathLength="1" d="${half(g, ring, front)}"/>`).join('');
    const beam = cls => `<g class="rm-beam ${cls}"><path class="rm-ray" pathLength="1" d=""/><path class="rm-flow" d=""/><path class="rm-flow rm-back" d=""/></g>`;
    const bw = g.bust, bh = bw * 1.25;
    const moons = g.moons ? TONES.map((tone, ring) => {
      const p = pt(g, ring, g.moons[ring]);
      return `<img class="rm-moon t-${tone}" src="${ui.emoteSrc(ui.TONE_EMOTE[tone])}" alt="" aria-hidden="true" width="100" height="100" style="left:${pctX(g, p.x)};top:${pctY(g, p.y - 26)};--k:${ring}">`;
    }).join('') : '';
    return {
      nodes,
      html: `
        <div class="rm-scene" style="aspect-ratio:${vw} / ${vh}">
          <svg class="rm-svg rm-svg-back" viewBox="${g.vb.join(' ')}" aria-hidden="true">
            <defs><radialGradient id="rmfloor-${t.id}"><stop offset="0" stop-color="var(--q)" stop-opacity="0.28"/><stop offset="0.55" stop-color="var(--q)" stop-opacity="0.07"/><stop offset="1" stop-color="var(--q)" stop-opacity="0"/></radialGradient></defs>
            <ellipse class="rm-floor" cx="${cx}" cy="${cy}" rx="${g.radii[2] + 40}" ry="${((g.radii[2] + 40) * g.k).toFixed(1)}" fill="url(#rmfloor-${t.id})"/>
            ${rings(false)}${beam('rm-beam-back')}
          </svg>
          <div class="rm-bust" style="left:${pctX(g, cx)};top:${pctY(g, cy + g.base)};width:${(bw / vw * 100).toFixed(3)}%">
            <span class="rm-pedestal" aria-hidden="true"></span>
            ${ui.character(t, { sizes: '(min-width: 768px) 200px, 90px', alt: '' })}
          </div>
          <svg class="rm-svg rm-svg-front" viewBox="${g.vb.join(' ')}" aria-hidden="true">${rings(true)}${beam('rm-beam-front')}</svg>
          ${moons}
          ${nodes.map(n => node(g, n)).join('')}
          <img class="rm-emote" src="${ui.emoteSrc('heart')}" alt="" aria-hidden="true" width="100" height="100">
        </div>`
    };
  }

  // Подробный разбор пары для панели карты: сцена пары, суть, как устроено, как ладить
  ui.relDetail = (t, b, { tab = 0, refocus = 'link' } = {}) => {
    const r = M().relation(t, b), txt = ui.relText(r.kind);
    const role = txt.roles && txt.roles[r.id];
    const [p1, p2] = r.rule || [];
    const tabs = [
      ['Суть', `<p>${esc(txt.about || '')}</p>${role ? `<p class="rd-role"><b>Если ты — ${esc(nm(t))}.</b> ${esc(role)}</p>` : ''}`],
      ['Как устроено', p1 ? `<p>Сильные стороны типа «${esc(nm(b))}» — ${PLAIN[b.ego[0]]} и${NB}${PLAIN[b.ego[1]]}. Для типа «${esc(nm(t))}» первое — ${FN[p1]}, второе — ${FN[p2]}.</p>` : ''],
      ['Как ладить', `<p>${esc(txt.tip || '')}</p>`]
    ];
    const uid = `rd-${t.id}-${b.id}`;
    return `
      <article class="rd t-${r.tone}" style="${ui.qStyle(b.quadra)}">
        <div class="rd-duo">${ui.duo(t, b, { cls: 'duo-sm', sizes: '(min-width: 1024px) 200px, 150px' })}</div>
        <header class="rd-head">
          <span class="rd-ava">${ui.character(b, { sizes: ui.CHAR.ava, alt: '' })}</span>
          <div>
            <p class="rd-kicker">${b.code} «${esc(b.alias)}» · ${esc(b.role)}</p>
            <h3 class="rd-title">${esc(ui.relTitle(r, t, b))}</h3>
            <span class="rd-tone"><img src="${ui.emoteSrc(ui.TONE_EMOTE[r.tone])}" alt="" width="40" height="40"><span>${ui.toneName(r.tone)}<span class="rd-tone-x"> — ${TONE_TEXT[r.tone]}</span></span></span>
          </div>
        </header>
        <p class="rd-line">${esc(txt.line || '')}</p>
        <div class="rd-tabs" role="tablist" aria-label="Разбор пары">
          ${tabs.map(([name], i) => `<button type="button" role="tab" id="${uid}-t${i}" aria-controls="${uid}-p${i}" aria-selected="${i === tab}" tabindex="${i === tab ? 0 : -1}" data-tab="${i}">${name}</button>`).join('')}
        </div>
        <div class="rd-panes">
          ${tabs.map(([, html], i) => `<div class="rd-pane" role="tabpanel" id="${uid}-p${i}" aria-labelledby="${uid}-t${i}"${i === tab ? '' : ' hidden'}>${html}</div>`).join('')}
        </div>
        <footer class="rd-foot">
          <a class="link" href="#/relations/${t.id}/${b.id}">Полный разбор пары</a>
          ${refocus === 'button'
            ? `<button type="button" class="rd-refocus" data-refocus="${b.id}" aria-label="Поставить ${b.code} в центр карты">${ui.ICON.cycle}Карта ${b.code}</button>`
            : `<a class="rd-refocus" href="#/types/${b.id}#relations" aria-label="Карта отношений ${b.code}">${ui.ICON.cycle}Карта ${b.code}</a>`}
        </footer>
      </article>`;
  };

  // pick — выбор типа прямо в карте (страница «Отношения»); без него карта показывает один тип (страница типа)
  ui.relMap = (t, { uid = 'rm', pick = false } = {}) => `
    <div class="relmap reveal" data-relmap="${t.id}" data-uid="${uid}"${pick ? ' data-pick' : ''} style="${ui.qStyle(t.quadra)}">
      <div class="rm-ctl">
        ${pick ? `<div class="rm-pick">${ui.typeSelect('rmtype', t.id, 'Тип в центре', { short: true })}</div>` : ''}
        <div class="rm-filters" role="group" aria-label="Показать на карте">
          ${TONES.map(tone => `<button type="button" class="rm-chip t-${tone}" data-tone="${tone}" aria-pressed="false"><img src="${ui.emoteSrc(ui.TONE_EMOTE[tone])}" alt="" width="40" height="40"><span>${ui.toneName(tone)}</span></button>`).join('')}
        </div>
      </div>
      <div class="rm-stage" role="group" aria-label="Карта отношений: ${esc(`${t.code} «${t.alias}»`)} в центре, вокруг остальные 15 типов">${stage(t, geoNow()).html}</div>
      <div class="rm-panel" aria-live="polite"></div>
    </div>`;

  ui.mountRelMap = scope => {
    // с карты ведут на страницу пары — её тексты подгружаем заранее, в простое
    if (ui.prefetchPair) ui.prefetchPair();
    const box = scope.querySelector('[data-relmap]');
    if (!box) return () => {};
    const stageEl = box.querySelector('.rm-stage'), panel = box.querySelector('.rm-panel');
    const refocusMode = box.hasAttribute('data-pick') ? 'button' : 'link';
    let t = M().type(box.dataset.relmap), g = geoNow(), nodes = layout(t, g);
    let selected = 1, shown = 0, tab = 0;
    const calm = S.dom.reducedMotion();

    const nodeEl = i => stageEl.querySelector(`.rm-node[data-i="${i}"]`);
    // у прокручиваемой вкладки низ затухает, пока не дочитаешь
    const fade = () => {
      const p = panel.querySelector('.rd-panes');
      if (p) p.classList.toggle('more', p.scrollHeight - p.scrollTop - p.clientHeight > 4);
    };
    panel.addEventListener('scroll', fade, true);
    // Луч по плоскости орбит: из-под ног персонажа к точке партнёра; за персонажем — в заднем слое
    const ray = n => {
      const x0 = g.cx, y0 = g.cy + g.base * 0.35, x1 = n.x, y1 = n.y;
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - Math.hypot(x1 - x0, y1 - y0) * 0.12;
      return { d: `M${x0} ${y0.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}` };
    };
    const show = (i, sticky) => {
      const n = nodes[i - 1], el = nodeEl(i);
      if (!n || !el) return;
      if (sticky) selected = i;
      stageEl.querySelectorAll('.rm-node.is-on').forEach(x => { x.classList.remove('is-on'); x.setAttribute('aria-pressed', 'false'); });
      el.classList.add('is-on');
      el.setAttribute('aria-pressed', 'true');
      const back = n.d < 0, { d } = ray(n), flow = FLOW[n.r.id] || 'both';
      stageEl.querySelectorAll('.rm-beam').forEach(beam => {
        const layerBack = beam.classList.contains('rm-beam-back'), on = layerBack === back;
        beam.setAttribute('class', `rm-beam ${layerBack ? 'rm-beam-back' : 'rm-beam-front'} t-${n.tone} f-${flow}${on ? ' is-on' : ''}`);
        beam.querySelectorAll('path').forEach(p => p.setAttribute('d', on ? d : ''));
        if (on && !calm) { void beam.getBoundingClientRect(); beam.classList.add('draw'); }
      });
      const emote = stageEl.querySelector('.rm-emote');
      emote.src = ui.emoteSrc(ui.EMOTE[n.r.kind] || 'sparkles');
      const side = n.x > g.cx + 1 ? -1 : 1, lift = n.rad * 0.18;
      emote.style.left = pctX(g, n.x + side * n.rad * 1.02);
      emote.style.top = pctY(g, n.y - lift - n.rad * 0.92);
      emote.classList.remove('pop');
      void emote.offsetWidth;
      emote.classList.add('pop');
      if (shown !== i) {
        shown = i;
        panel.innerHTML = ui.relDetail(t, n.b, { tab, refocus: refocusMode });
        fade();
        panel.classList.remove('pop');
        void panel.offsetWidth;
        panel.classList.add('pop');
      }
    };

    // Перерисовать сцену (смена типа в центре или геометрии при повороте экрана)
    const draw = (keep) => {
      g = geoNow();
      nodes = layout(t, g);
      box.dataset.relmap = t.id;
      box.style.setProperty('--q', `var(--q-${t.quadra})`);
      stageEl.setAttribute('aria-label', `Карта отношений: ${t.code} «${t.alias}» в центре, вокруг остальные 15 типов`);
      stageEl.innerHTML = stage(t, g).html;
      shown = 0;
      if (!keep) selected = 1;
      show(selected, true);
      if (!calm) { box.classList.remove('in-again'); void box.offsetWidth; box.classList.add('in-again'); }
    };
    const refocus = id => {
      const next = M().type(id);
      if (!next) return;
      t = next;
      const sel = box.querySelector('[data-rmtype]');
      if (sel) sel.value = id;
      draw(false);
      box.dispatchEvent(new CustomEvent('relmap:focus', { bubbles: true, detail: { id } }));
    };
    show(1, true);

    const nodeOf = e => e.target.closest && e.target.closest('.rm-node');
    const fine = S.fx.fineMouse();
    const over = e => { const n = nodeOf(e); if (n && fine) show(Number(n.dataset.i), false); };
    const leave = () => { if (fine) show(selected, false); };
    const click = e => {
      const n = nodeOf(e);
      if (!n) return;
      show(Number(n.dataset.i), true);
      // на телефоне панель под картой — подводим к ней, если она ниже экрана
      if (!wideMQ().matches) {
        const r = panel.getBoundingClientRect();
        if (r.top > innerHeight * 0.8) panel.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'nearest' });
      }
    };
    // стрелки — по кругу между аватарами
    const key = e => {
      const n = nodeOf(e);
      if (!n || !['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const i = ((Number(n.dataset.i) - 1 + step + nodes.length) % nodes.length) + 1;
      nodeEl(i).focus();
      show(i, true);
    };
    const focus = e => { const n = nodeOf(e); if (n) show(Number(n.dataset.i), true); };
    stageEl.addEventListener('pointerover', over);
    stageEl.addEventListener('pointerleave', leave);
    stageEl.addEventListener('click', click);
    stageEl.addEventListener('keydown', key);
    stageEl.addEventListener('focusin', focus);

    // панель: вкладки и «Карта для …»
    const onPanel = e => {
      const tb = e.target.closest('[data-tab]');
      if (tb) {
        tab = Number(tb.dataset.tab);
        panel.querySelectorAll('[data-tab]').forEach(x => { const on = x === tb; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; });
        panel.querySelectorAll('.rd-pane').forEach((p, i) => { p.hidden = i !== tab; });
        const panes = panel.querySelector('.rd-panes');
        if (panes) panes.scrollTop = 0;
        fade();
        return;
      }
      const rf = e.target.closest('button[data-refocus]');
      if (rf) refocus(rf.dataset.refocus);
    };
    const onPanelKey = e => {
      const tb = e.target.closest('[data-tab]');
      if (!tb || !['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      const all = Array.from(panel.querySelectorAll('[data-tab]'));
      const next = all[(all.indexOf(tb) + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
      next.focus();
      next.click();
    };
    panel.addEventListener('click', onPanel);
    panel.addEventListener('keydown', onPanelKey);

    // выбор типа в центре
    const sel = box.querySelector('[data-rmtype]');
    const onSel = () => refocus(sel.value);
    if (sel) sel.addEventListener('change', onSel);

    // фильтры по тону: оставляют яркими только выбранные орбиты
    const chips = box.querySelector('.rm-filters');
    const onChip = e => {
      const c = e.target.closest('[data-tone]');
      if (!c) return;
      c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
      const on = Array.from(chips.querySelectorAll('[aria-pressed="true"]')).map(x => x.dataset.tone);
      TONES.forEach(tone => box.classList.toggle('f-' + tone, on.includes(tone)));
      box.classList.toggle('filtered', on.length > 0);
      // выбранная пара — в первой из включённых групп
      if (on.length && !on.includes(nodes[selected - 1].tone)) {
        const first = nodes.find(n => on.includes(n.tone));
        if (first) show(first.i, true);
      }
    };
    chips.addEventListener('click', onChip);

    // поворот экрана / смена ширины: другая геометрия
    const mq = wideMQ();
    const onMq = () => draw(true);
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', onMq); };
  };
})(window);
