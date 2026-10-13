/* Socio-Nik · отношения типа с остальными 15 — три строки: «Легко», «Ровно», «Непросто», по пять типов в каждой
   (поддерживающие, рабочие и напряжённые отношения). Одна переменная — одна строка: читается с первого взгляда,
   без орбит, перспективы и лучей. Нажатие на тип выбирает пару; рядом (на телефоне — ниже) панель: суть, как это
   устроено в модели А простыми словами и как ладить. Всё в нейтральных тонах сайта, ярко только выбранная пара. */
(function (root) {
  const S = root.Socio;
  const ui = S.ui = S.ui || {};
  const { esc } = S.dom;
  const M = () => S.core.modelA;
  const NB = '\u00A0';

  const nm = t => t.short || t.alias;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
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
  // названия пригодятся и странице пары («Как это устроено»)
  ui.PLAIN = PLAIN;
  ui.FN = FN;
  const TONE_TEXT = {
    support: 'легко и тепло: друг друга понимаете с полуслова',
    work: 'ровно и по делу: вместе удобно работать, но близость не гарантирована',
    tense: 'с напряжением: помогают дистанция и правила'
  };
  const TONES = ['support', 'work', 'tense'];
  // Подпись строки: слово и пояснение простыми словами
  const ROW = {
    support: ['Легко', 'понимаете друг друга с\u00A0полуслова'],
    work: ['Ровно', 'вместе удобно, особенно в\u00A0делах'],
    tense: ['Непросто', 'помогают дистанция и\u00A0правила']
  };
  // Кто в какой строке и в каком порядке: самое важное — первым
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
  // Порядок: строка за строкой, i — сквозной номер с 1
  function layout(t) {
    const rel = new Map(S.data.types.filter(b => b.id !== t.id).map(b => [M().relation(t, b).id, b]));
    const out = [];
    TONES.forEach(tone => RING[tone].forEach(rid => {
      const b = rel.get(rid);
      if (b) out.push({ b, r: M().relation(t, b), tone, i: out.length + 1 });
    }));
    return out;
  }

  // Тип в строке: аватар, код и вид отношения (на телефоне вид — только у выбранного)
  const node = n => `<li><button type="button" class="rm-node t-${n.tone}" data-i="${n.i}" data-b="${n.b.id}" style="--k:${n.i};${ui.qStyle(n.b.quadra)}"
      aria-pressed="false" aria-label="${esc(`${n.b.code} «${n.b.alias}»: ${n.r.role ? `${n.r.name} · ${n.r.role}` : n.r.name}, ${ui.toneName(n.tone)}`)}">
      <span class="rm-orb">${ui.character(n.b, { sizes: '(min-width: 768px) 80px, 56px', alt: '' })}</span>
      <span class="rm-tag" aria-hidden="true"><b>${n.b.code}</b><small>${TAG[n.r.id]}</small></span>
    </button></li>`;

  const rows = t => {
    const nodes = layout(t);
    return TONES.map(tone => `
      <div class="rm-row t-${tone}">
        <p class="rm-lab"><span class="rd-dot" aria-hidden="true"></span><b>${ROW[tone][0]}</b><span class="rm-hint">${ROW[tone][1]}</span></p>
        <ul class="rm-list" aria-label="${esc(`${ROW[tone][0]}: ${ui.toneName(tone)} отношения`)}">${nodes.filter(n => n.tone === tone).map(node).join('')}</ul>
      </div>`).join('');
  };
  const stageLabel = t => `Отношения ${t.code} «${t.alias}» с${NB}остальными 15${NB}типами`;

  // Разбор пары для панели: вид отношения и с кем, тон, одна фраза, суть / как устроено / как ладить
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
        <header class="rd-head">
          <span class="rd-ava">${ui.character(b, { sizes: ui.CHAR.ava, alt: '' })}</span>
          <div>
            <h3 class="rd-title">${esc(ui.relTitle(r, t, b))}</h3>
            <p class="rd-who">${b.code} «${esc(b.alias)}»<span class="rd-k-role"> · ${esc(b.role)}</span></p>
          </div>
        </header>
        <p class="rd-tone"><span class="rd-dot" aria-hidden="true"></span><span>${esc(cap(ui.toneName(r.tone)))}<span class="rd-tone-x"> — ${TONE_TEXT[r.tone]}</span></span></p>
        <p class="rd-line">${esc(txt.line || '')}</p>
        <div class="rd-tabs" role="tablist" aria-label="Разбор пары">
          ${tabs.map(([name], i) => `<button type="button" role="tab" id="${uid}-t${i}" aria-controls="${uid}-p${i}" aria-selected="${i === tab}" tabindex="${i === tab ? 0 : -1}" data-tab="${i}">${name}</button>`).join('')}
        </div>
        <div class="rd-panes">
          ${tabs.map(([, html], i) => `<div class="rd-pane" role="tabpanel" id="${uid}-p${i}" aria-labelledby="${uid}-t${i}"${i === tab ? '' : ' hidden'}>${html}</div>`).join('')}
        </div>
        <footer class="rd-foot">
          <a class="link" href="#/relations/${t.id}/${b.id}">Советы для пары</a>
          ${refocus === 'button'
            ? `<button type="button" class="rd-refocus" data-refocus="${b.id}" aria-label="Показать отношения ${b.code}">${ui.ICON.cycle}<span class="rd-ref-w">Отношения </span>${b.code}</button>`
            : `<a class="rd-refocus" href="#/types/${b.id}#relations" aria-label="Отношения ${b.code} со всеми типами">${ui.ICON.cycle}<span class="rd-ref-w">Отношения </span>${b.code}</a>`}
        </footer>
      </article>`;
  };

  // pick — выбор типа прямо здесь (страница «Отношения»); без него показан один тип (главная, страница типа)
  ui.relMap = (t, { uid = 'rm', pick = false } = {}) => `
    <div class="relmap reveal" data-anim data-relmap="${t.id}" data-uid="${uid}"${pick ? ' data-pick' : ''} style="${ui.qStyle(t.quadra)}">
      ${pick ? `<div class="rm-ctl"><div class="rm-pick">${ui.typeSelect('rmtype', t.id, 'Чьи отношения показать', { short: true })}</div></div>` : ''}
      <div class="rm-stage" role="group" aria-label="${esc(stageLabel(t))}">${rows(t)}</div>
      <div class="rm-panel" aria-live="polite"></div>
    </div>`;

  ui.mountRelMap = scope => {
    // отсюда ведут на страницу пары — её тексты подгружаем заранее, в простое
    if (ui.prefetchPair) ui.prefetchPair();
    const box = scope.querySelector('[data-relmap]');
    if (!box) return () => {};
    const stageEl = box.querySelector('.rm-stage'), panel = box.querySelector('.rm-panel');
    const refocusMode = box.hasAttribute('data-pick') ? 'button' : 'link';
    const wide = () => (root.matchMedia ? root.matchMedia('(min-width: 1024px)').matches : true);
    let t = M().type(box.dataset.relmap), nodes = layout(t);
    let shown = 0, tab = 0;
    const calm = S.dom.reducedMotion();

    const nodeEl = i => stageEl.querySelector(`.rm-node[data-i="${i}"]`);
    // у прокручиваемой вкладки низ затухает, пока не дочитаешь
    const fade = () => {
      const p = panel.querySelector('.rd-panes');
      if (p) p.classList.toggle('more', p.scrollHeight - p.scrollTop - p.clientHeight > 4);
    };
    panel.addEventListener('scroll', fade, true);
    const show = i => {
      const n = nodes[i - 1], el = nodeEl(i);
      if (!n || !el) return;
      stageEl.querySelectorAll('.rm-node.is-on').forEach(x => { x.classList.remove('is-on'); x.setAttribute('aria-pressed', 'false'); });
      el.classList.add('is-on');
      el.setAttribute('aria-pressed', 'true');
      if (shown === i) return;
      shown = i;
      panel.innerHTML = ui.relDetail(t, n.b, { tab, refocus: refocusMode });
      fade();
      panel.classList.remove('pop');
      void panel.offsetWidth;
      panel.classList.add('pop');
    };

    // Другой тип: строки перерисовываются, выбран снова первый (дуал)
    const draw = () => {
      nodes = layout(t);
      box.dataset.relmap = t.id;
      box.style.setProperty('--q', `var(--q-${t.quadra})`);
      stageEl.setAttribute('aria-label', stageLabel(t));
      stageEl.innerHTML = rows(t);
      shown = 0;
      show(1);
      if (!calm) { box.classList.remove('in-again'); void box.offsetWidth; box.classList.add('in-again'); }
    };
    const refocus = id => {
      const next = M().type(id);
      if (!next) return;
      t = next;
      const sel = box.querySelector('[data-rmtype]');
      if (sel) sel.value = id;
      draw();
      box.dispatchEvent(new CustomEvent('relmap:focus', { bubbles: true, detail: { id } }));
    };
    show(1);

    const nodeOf = e => e.target.closest && e.target.closest('.rm-node');
    const click = e => {
      const n = nodeOf(e);
      if (!n) return;
      show(Number(n.dataset.i));
      // панель под строками (телефон, планшет) — подводим к ней, если она ниже экрана
      if (!wide()) {
        const r = panel.getBoundingClientRect();
        if (r.top > innerHeight * 0.8) panel.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'nearest' });
      }
    };
    // стрелки: влево-вправо — по порядку, вверх-вниз — в соседнюю строку
    const key = e => {
      const n = nodeOf(e), step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 5, ArrowUp: -5 }[e.key];
      if (!n || !step) return;
      e.preventDefault();
      const i = Number(n.dataset.i) + step;
      if (i < 1 || i > nodes.length) return;
      nodeEl(i).focus();
      show(i);
    };
    stageEl.addEventListener('click', click);
    stageEl.addEventListener('keydown', key);

    // панель: вкладки и «Отношения …» (поставить партнёра на место выбранного типа)
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

    // выбор типа
    const sel = box.querySelector('[data-rmtype]');
    if (sel) sel.addEventListener('change', () => refocus(sel.value));
    return () => {};
  };
})(window);
