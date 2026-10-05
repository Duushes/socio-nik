/* Socio-Nik · общие куски интерфейса: персонажи, карточки типов, выбор типа, калькулятор совместимости,
   списки отношений, графики результата, знаменитости, подсказка. */
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
  // Короткое имя для крупного заголовка: «Максим», «Джек»; в подписях — полный псевдоним
  ui.short = t => t.short || t.alias;

  ui.ICON = {
    cycle: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrow: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    back: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    swap: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h11l-3-3M17 17H6l3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  // Персонаж типа: srcset 520 / 1040, лениво везде, кроме героя
  ui.CHAR = {
    hero: '(min-width: 1024px) 520px, (min-width: 768px) 440px, (min-width: 640px) 360px, 280px',
    card: '(min-width: 1024px) 300px, (min-width: 640px) 34vw, 46vw',
    tile: '(min-width: 768px) 216px, 144px',
    duo: '(min-width: 768px) 300px, 40vw',
    ava: '64px'
  };
  ui.charSrc = t => ({ src: `img/types/${t.id}-520.webp`, srcset: `img/types/${t.id}-520.webp 520w, img/types/${t.id}-1040.webp 1040w` });
  ui.character = (t, { sizes = ui.CHAR.card, eager = false, cls = '', alt } = {}) => {
    const s = ui.charSrc(t);
    const a = alt == null ? `Персонаж типа ${t.code} «${t.alias}»` : alt;
    return `<img class="char ${cls}" src="${s.src}" srcset="${s.srcset}" sizes="${sizes}" width="520" height="650" alt="${esc(a)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async" draggable="false">`;
  };

  // Эмблема: live — с живой орбитой (для крупных), иначе парит на CSS; theme: 'light' — для белых секций
  ui.emblem = (t, { live = false, cls = '', label, theme } = {}) =>
    S.art.emblem(t, { cls: (live ? 'em-live ' : 'em-float ') + cls, label, theme });

  // Карточка типа: бюст, код, псевдоним, роль
  ui.tile = (t, i = 0) => `
    <a class="tcard reveal" href="#/types/${t.id}" style="${ui.qStyle(t.quadra)};--i:${i % 4}">
      <span class="tcard-art">${ui.character(t, { alt: '' })}</span>
      <span class="tcard-txt">
        <span class="tcard-code">${t.code}</span>
        <span class="tcard-alias">${esc(t.alias)}</span>
        <span class="tcard-role">${esc(t.role)}</span>
      </span>
    </a>`;

  ui.typesGrid = () => `
    <div class="tgrid">
      ${S.data.quadras.map(q => `
        <section class="tgroup" style="${ui.qStyle(q.id)}" aria-labelledby="tg-${q.id}">
          <h2 class="tgroup-head reveal" id="tg-${q.id}"><span class="qdot" aria-hidden="true"></span>${q.name}
            <span class="tgroup-vals" aria-hidden="true">${q.values.map(v => S.art.symbol(v)).join('')}</span></h2>
          <div class="trow">${typesOf(q.id).map(ui.tile).join('')}</div>
        </section>`).join('')}
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

  // Сцена пары из знаков: слева всегда тот, от кого идёт действие (ревизор, заказчик)
  ui.pairScene = (a, b, { cls = '', labels, theme } = {}) => {
    const r = M().relation(a, b);
    let left = a, right = b, lab = labels || [a.code, b.code];
    if (r.id === 'benefactor' || r.id === 'supervisor') { left = b; right = a; lab = [lab[1], lab[0]]; }
    return S.art.scene(r.kind, left, right, { cls, labels: lab, theme, label: `${a.code} и ${b.code}: ${ui.relTitle(r, a, b)}` });
  };

  // Два персонажа лицом друг к другу: правый отражён. Слева — тот, от кого идёт действие
  ui.duo = (a, b, { labels, cls = '', sizes = ui.CHAR.duo, eager = false } = {}) => {
    const r = M().relation(a, b);
    let left = a, right = b, lab = labels || [a.code, b.code];
    if (r.id === 'benefactor' || r.id === 'supervisor') { left = b; right = a; lab = [lab[1], lab[0]]; }
    const fig = (t, l, side) => `<figure class="duo-${side}" style="${ui.qStyle(t.quadra)}">
        <span class="duo-glow" aria-hidden="true"></span>${ui.character(t, { sizes, alt: '', eager })}
        <figcaption><b>${esc(l)}</b><span>${esc(t.alias)}</span></figcaption></figure>`;
    return `<div class="duo ${cls}" role="img" aria-label="${esc(`${a.code} и ${b.code}: ${ui.relTitle(r, a, b)}`)}">${fig(left, lab[0], 'a')}${fig(right, lab[1], 'b')}</div>`;
  };

  // ---------- калькулятор совместимости ----------
  ui.calcOut = (aId, bId) => {
    const a = M().type(aId), b = M().type(bId), r = M().relation(a, b), txt = relText(r.kind);
    const role = txt.roles && txt.roles[r.id];
    return `
      <div class="calc-duo">${ui.duo(a, b)}</div>
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
        <button class="swap" type="button" data-swap aria-label="Поменять местами">${ui.ICON.swap}</button>
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
            <span class="rl-ava">${ui.character(b, { sizes: ui.CHAR.ava, alt: '' })}</span>
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
  const ava = (c, cls = '') => {
    const ic = S.art.celebIcon ? S.art.celebIcon(c.icon) : '';
    return `<span class="celeb-ava${c.kind === 'fiction' ? ' fic' : ''}${ic ? ' has-ic' : ''}${cls}" aria-hidden="true">${ic || esc(initials(c.name))}</span>`;
  };
  const INFO = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 9v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="6.2" r="1.1" fill="currentColor"/></svg>';

  ui.celebs = t => {
    const list = celebsOf(t.id);
    if (!list.length) return '';
    const col = (kind, title, i) => `
      <div class="celeb-col reveal" style="--i:${i}">
        <h3 class="celeb-kicker">${title}</h3>
        <ul class="celeb-list">${list.filter(c => c.kind === kind).map((c, k) => `
          <li class="celeb" style="--k:${k}">${ava(c)}
            <span class="celeb-txt"><b class="celeb-name">${esc(c.name)}</b><span class="celeb-who">${esc(c.who)}</span><span class="celeb-note">${esc(c.note)}</span></span>
          </li>`).join('')}</ul>
      </div>`;
    return `
      <div class="celebs" id="celebs" style="${ui.qStyle(t.quadra)}">
        <h2 class="h2 h2-sm reveal"><span class="sv">Похожий тип у&nbsp;знаменитостей</span></h2>
        <p class="lead reveal">Кого из известных людей и героев книг и фильмов часто относят к ${t.code}.</p>
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
      <span class="celeb-go" aria-hidden="true">${ui.ICON.arrow}</span>
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
