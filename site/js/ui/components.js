/* Socio-Nik · общие куски интерфейса: плитки типов, выбор типа, калькулятор совместимости,
   списки отношений, графики результата, подсказка. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const ui = S.ui = S.ui || {};
  const { esc } = S.dom;
  const M = () => S.core.modelA;

  const typesOf = qid => S.data.types.filter(t => t.quadra === qid);
  const quadra = id => S.data.quadras.find(q => q.id === id);
  const content = id => (S.content.types && S.content.types[id]) || {};
  const relText = kind => (S.content.relations && S.content.relations[kind]) || {};
  ui.typesOf = typesOf;
  ui.quadra = quadra;
  ui.content = content;
  ui.relText = relText;

  ui.qStyle = qid => `--q:var(--q-${qid})`;

  // Эмблема: live — с живой орбитой (для крупных), иначе парит на CSS
  ui.emblem = (t, { live = false, cls = '', label } = {}) =>
    S.art.emblem(t, { cls: (live ? 'em-live ' : 'em-float ') + cls, label });

  ui.tile = (t, i = 0) => `
    <a class="tile tilt reveal" href="#/types/${t.id}" style="${ui.qStyle(t.quadra)};--i:${i % 4}">
      <span class="tile-art">${ui.emblem(t, { label: false })}</span>
      <span class="tile-code">${t.code}</span>
      <span class="tile-alias">${esc(t.alias)}</span>
      <span class="tile-role">${esc(t.role)}</span>
      <span class="glare" aria-hidden="true"></span>
    </a>`;

  ui.typesGrid = () => `
    <div class="tgrid">
      ${S.data.quadras.map(q => `
        <div class="tgroup" style="${ui.qStyle(q.id)}">
          <div class="tgroup-head reveal"><span class="qdot" aria-hidden="true"></span>${q.name}
            <span class="tgroup-vals">${q.values.map(v => S.art.symbol(v)).join('')}</span></div>
          <div class="trow">${typesOf(q.id).map(ui.tile).join('')}</div>
        </div>`).join('')}
    </div>`;

  // Выбор типа: нативный select, сгруппированный по квадрам
  ui.typeSelect = (name, selected, label) => `
    <label class="pick"><span class="pick-lab">${esc(label)}</span>
      <span class="pick-box"><select name="${name}" data-${name}>
        ${S.data.quadras.map(q => `<optgroup label="${q.name}">${typesOf(q.id).map(t =>
          `<option value="${t.id}"${t.id === selected ? ' selected' : ''}>${t.code} — ${esc(t.alias)}</option>`).join('')}</optgroup>`).join('')}
      </select></span>
    </label>`;

  ui.toneName = tone => S.data.tones[tone];
  ui.toneChip = tone => `<span class="tone tone-${tone}"><i aria-hidden="true"></i>${ui.toneName(tone)}</span>`;

  // Полное название вида; для заказа и ревизии с парой — кто кому заказчик / ревизор
  const TITLES = {
    dual: 'Дуальные отношения', activation: 'Отношения активации', mirror: 'Зеркальные отношения',
    semidual: 'Полудуальные отношения', mirage: 'Миражные отношения', identity: 'Тождественные отношения',
    kindred: 'Родственные отношения', business: 'Деловые отношения', quasi: 'Квазитождественные отношения',
    request: 'Социальный заказ', extinguish: 'Отношения погашения', superego: 'Отношения суперэго',
    supervision: 'Ревизия', conflict: 'Конфликтные отношения'
  };
  ui.kindTitle = kind => TITLES[kind];
  ui.relTitle = (r, a, b) => {
    if (a && b) {
      if (r.id === 'benefactor') return `Социальный заказ: ${b.code} — заказчик для ${a.code}`;
      if (r.id === 'beneficiary') return `Социальный заказ: ${a.code} — заказчик для ${b.code}`;
      if (r.id === 'supervisor') return `Ревизия: ${b.code} — ревизор для ${a.code}`;
      if (r.id === 'supervisee') return `Ревизия: ${a.code} — ревизор для ${b.code}`;
    }
    return TITLES[r.kind];
  };

  // Сцена пары: слева всегда тот, от кого идёт действие (ревизор, заказчик)
  ui.pairScene = (a, b, { cls = '', labels } = {}) => {
    const r = M().relation(a, b);
    let left = a, right = b, lab = labels || [a.code, b.code];
    if (r.id === 'benefactor' || r.id === 'supervisor') { left = b; right = a; lab = [lab[1], lab[0]]; }
    return S.art.scene(r.kind, left, right, { cls, labels: lab, label: `${a.code} и ${b.code}: ${ui.relTitle(r, a, b)}` });
  };

  // ---------- калькулятор совместимости ----------
  ui.calcOut = (aId, bId) => {
    const a = M().type(aId), b = M().type(bId), r = M().relation(a, b), txt = relText(r.kind);
    const role = txt.roles && txt.roles[r.id];
    return `
      <div class="calc-scene" data-anim>${ui.pairScene(a, b)}</div>
      <div class="calc-text">
        <p class="calc-kicker">${a.code} и ${b.code}</p>
        <h3 class="calc-title">${esc(ui.relTitle(r, a, b))}</h3>
        ${ui.toneChip(r.tone)}
        <p class="calc-line">${esc(txt.line || '')}</p>
        ${role ? `<p class="calc-role">${esc(role)}</p>` : ''}
        <a class="link" href="#/relations/${a.id}/${b.id}">Подробнее об этой паре</a>
      </div>`;
  };

  ui.calc = (aId, bId) => `
    <div class="calc" data-calc>
      <div class="calc-pick">
        ${ui.typeSelect('a', aId, 'Ты')}
        <button class="swap" type="button" data-swap aria-label="Поменять местами">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h11l-3-3M17 17H6l3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        ${ui.typeSelect('b', bId, 'Друг или подруга')}
      </div>
      <div class="calc-out" aria-live="polite">${ui.calcOut(aId, bId)}</div>
    </div>`;

  ui.mountCalc = scope => {
    const el = scope.querySelector('[data-calc]');
    if (!el) return () => {};
    const a = el.querySelector('[data-a]'), b = el.querySelector('[data-b]'), out = el.querySelector('.calc-out');
    const update = () => {
      out.classList.remove('pop');
      out.innerHTML = ui.calcOut(a.value, b.value);
      void out.offsetWidth;
      out.classList.add('pop');
    };
    const swap = () => { const v = a.value; a.value = b.value; b.value = v; update(); };
    a.addEventListener('change', update);
    b.addEventListener('change', update);
    el.querySelector('[data-swap]').addEventListener('click', swap);
    return () => {};
  };

  // ---------- отношения типа со всеми 16 ----------
  ui.relList = t => {
    const rows = S.data.types.map(b => ({ b, r: M().relation(t, b) }));
    return `<div class="rel-groups">${['support', 'work', 'tense'].map(tone => `
      <div class="rel-group reveal">
        <h3>${ui.toneChip(tone)}</h3>
        <ul>${rows.filter(x => x.r.tone === tone).map(({ b, r }) => `
          <li><a href="#/relations/${t.id}/${b.id}" style="${ui.qStyle(b.quadra)}">
            <span class="mini-em">${S.art.emblem(b, { cls: 'em-mini', label: false })}</span>
            <span class="rl-code">${b.code}</span>
            <span class="rl-name">${esc(r.role ? `${r.name} · ${r.role}` : r.name)}</span>
          </a></li>`).join('')}</ul>
      </div>`).join('')}</div>`;
  };

  // ---------- графики результата ----------
  const AXES = [
    ['EI', 'Экстраверсия', 'Интроверсия'],
    ['NS', 'Интуиция', 'Сенсорика'],
    ['TF', 'Логика', 'Этика'],
    ['RP', 'Рациональность', 'Иррациональность']
  ];
  ui.AXES = AXES;

  ui.axisBars = axes => `<div class="axes">${AXES.map(([ax, a, b], i) => {
    const v = axes[ax], first = v >= 50;
    return `<div class="axis reveal" style="--i:${i}">
      <div class="axis-labs"><span class="${first ? 'on' : ''}">${a} <b>${v} %</b></span><span class="${first ? '' : 'on'}"><b>${100 - v} %</b> ${b}</span></div>
      <div class="axis-track" role="img" aria-label="${a} ${v} %, ${b.toLowerCase()} ${100 - v} %">
        <i class="seg ${first ? 'on' : ''}" data-w="${v}"></i><i class="seg ${first ? '' : 'on'}" data-w="${100 - v}"></i>
      </div>
    </div>`;
  }).join('')}</div>`;

  ui.distribution = res => {
    const byId = {};
    res.dist.forEach(r => { byId[r.id] = r; });
    return `
      <div class="legend" aria-hidden="true">${S.data.quadras.map(q => `<span class="lg"><i style="background:var(--q-${q.id})"></i>${q.name}</span>`).join('')}</div>
      <div class="dist">${S.data.quadras.map(q => `
        <div class="dist-group reveal" style="${ui.qStyle(q.id)}">
          <div class="dist-head"><span><i class="qdot" aria-hidden="true"></i>${q.name}</span><b>${res.quadras[q.id]} %</b></div>
          ${typesOf(q.id).map(t => {
            const v = byId[t.id].pct;
            return `<a class="dist-row${t.id === res.top.id ? ' top' : ''}" href="#/types/${t.id}" data-tip="${v} %|${t.code} «${esc(t.alias)}» · ${esc(t.role)}" aria-label="${t.code}: ${v} %">
              <span class="dist-code">${t.code}</span>
              <span class="dist-track"><i class="dist-bar" data-w="${v}"></i></span>
              <span class="dist-val">${v} %</span>
            </a>`;
          }).join('')}
        </div>`).join('')}
      </div>
      <details class="table-view">
        <summary>Показать таблицей</summary>
        <table><thead><tr><th>Тип</th><th>Квадра</th><th>Вероятность</th></tr></thead><tbody>
          ${res.dist.map(r => { const t = M().type(r.id); return `<tr><td>${t.code} «${esc(t.alias)}»</td><td>${quadra(t.quadra).name}</td><td>${r.pct} %</td></tr>`; }).join('')}
        </tbody></table>
      </details>`;
  };

  // ---------- знаменитости с похожим типом ----------
  // Аватар героя: иконка вещи, с которой он ассоциируется; реальные люди — матовый круг, персонажи — стеклянный «кадр»
  const celebsOf = id => (S.content.celebs && S.content.celebs[id]) || [];
  const initials = name => {
    const w = name.split(/[\s-]+/).filter(x => /^[A-ZА-ЯЁ]/.test(x));
    return w.length ? (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase() : name.slice(0, 1).toUpperCase();
  };
  // Иконка героя (art/celeb-icons.js); если её нет — инициалы
  const ava = (c, cls = '') => {
    const ic = S.art.celebIcon ? S.art.celebIcon(c.icon) : '';
    return `<span class="celeb-ava${c.kind === 'fiction' ? ' fic' : ''}${ic ? ' has-ic' : ''}${cls}" aria-hidden="true">${ic || esc(initials(c.name))}</span>`;
  };
  const INFO = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 9v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="6.2" r="1.1" fill="currentColor"/></svg>';

  ui.celebs = t => {
    const list = celebsOf(t.id);
    if (!list.length) return '';
    const col = (kind, title, i) => `
      <div class="card celeb-col reveal" style="--i:${i}">
        <h3 class="celeb-kicker">${title}</h3>
        <ul class="celeb-list">${list.filter(c => c.kind === kind).map((c, k) => `
          <li class="celeb" style="--k:${k}">${ava(c)}
            <span class="celeb-txt"><b class="celeb-name">${esc(c.name)}</b><span class="celeb-who">${esc(c.who)}</span><span class="celeb-note">${esc(c.note)}</span></span>
          </li>`).join('')}</ul>
      </div>`;
    return `
      <div class="wrap celebs" id="celebs" style="${ui.qStyle(t.quadra)}">
        <h2 class="title-sm reveal">Похожий тип у знаменитостей</h2>
        <p class="sub reveal">Кого из известных людей и героев книг и фильмов часто относят к ${t.code}.</p>
        <div class="grid2 celeb-grid">${col('real', 'Люди', 0)}${col('fiction', 'Персонажи', 1)}</div>
        <p class="celeb-disc reveal">${INFO}<span>Это популярные типировки по публичному образу, а не диагноз: сами знаменитости тест не проходили, а разные школы соционики иногда называют для них другой тип.</span></p>
      </div>`;
  };

  // Строчка для результата: три монограммы внахлёст, два человека и персонаж, ссылка на полный список
  ui.celebLine = t => {
    const list = celebsOf(t.id);
    if (!list.length) return '';
    const real = list.filter(c => c.kind === 'real'), fic = list.filter(c => c.kind === 'fiction');
    const pick = [real[0], real[1], fic[0]].filter(Boolean);
    return `<a class="celeb-line reveal" href="#/types/${t.id}#celebs" style="${ui.qStyle(t.quadra)}">
      <span class="celeb-stack" aria-hidden="true">${pick.map(c => ava(c, ' sm')).join('')}</span>
      <span class="celeb-line-txt"><span class="celeb-line-k">Похожий тип — у знаменитостей</span> <b>${pick.map(c => esc(c.name)).join(', ')}</b> и ещё ${list.length - pick.length}</span>
      <span class="celeb-go" aria-hidden="true">›</span>
    </a>`;
  };

  // ---------- подсказка для [data-tip]: «значение|подпись» ----------
  ui.mountTips = scope => {
    const tip = document.createElement('div');
    tip.className = 'tip';
    tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);
    const showTip = (el, x, y) => {
      const [val, lab] = el.dataset.tip.split('|');
      tip.textContent = '';
      const b = document.createElement('b');
      b.textContent = val;
      tip.appendChild(b);
      if (lab) {
        const s = document.createElement('span');
        s.textContent = lab;
        tip.appendChild(s);
      }
      tip.classList.add('on');
      const r = tip.getBoundingClientRect();
      tip.style.left = Math.min(innerWidth - r.width - 8, Math.max(8, x - r.width / 2)) + 'px';
      tip.style.top = Math.max(8, y - r.height - 14) + 'px';
    };
    const over = e => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (!el || !scope.contains(el)) return;
      if (e.type === 'focusin') { const r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2, r.top); }
      else showTip(el, e.clientX, e.clientY);
    };
    const out = e => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (el && (!e.relatedTarget || !el.contains(e.relatedTarget))) tip.classList.remove('on');
    };
    scope.addEventListener('pointermove', over);
    scope.addEventListener('focusin', over);
    scope.addEventListener('pointerout', out);
    scope.addEventListener('focusout', out);
    return () => tip.remove();
  };
})(window);
