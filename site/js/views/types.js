/* Socio-Nik · все типы (#/types) и страница типа (#/types/ile) */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;
  const M = () => S.core.modelA;
  const NB = '\u00A0';

  V.types = {
    title: () => '16 типов',
    render: () => `
      <section class="page-top page-head">
        <div class="wrap">
          <p class="eyebrow reveal">Типы</p>
          <h1 class="h2 reveal"><span class="sv">16 типов</span></h1>
          <p class="lead reveal">Четыре ряда — четыре квадры. Нажми на${NB}тип: там описание, сильные и${NB}уязвимые стороны и${NB}отношения со${NB}всеми остальными.</p>
        </div>
      </section>
      <section class="sec types-sec">
        <div class="wrap">${ui.typesGrid()}</div>
      </section>`
  };

  // Модель А: слева 1 · 4 · 6 · 7, справа 2 · 3 · 5 · 8 — классическая раскладка.
  // В карточке сначала человеческие слова («Главная сила — чуткость к отношениям»), термин — мелкой строкой
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function modelA(t) {
    const m = M().modelA(t.ego), A = S.data.aspects, F = S.data.functions;
    const cell = n => {
      const a = A[m[n - 1]], f = F[n - 1], plain = ui.PLAIN[a.id];
      return `<button type="button" class="ma-cell reveal${n <= 2 ? ' ego' : ''}" style="--i:${n % 4}" data-fn="${n}" aria-haspopup="dialog" aria-label="${esc(`${f.plain}: ${plain}. ${f.name} функция, ${a.name}. Подробнее`)}">
        <span class="ma-n">${n}</span>
        <span class="ma-glyph">${S.art.aspectImg(a.id, t.quadra, 'ma-img', { sizes: '64px' })}</span>
        <span class="ma-fn">${f.plain}</span>
        <span class="ma-plain">${esc(cap(plain))}</span>
        <span class="ma-asp">${f.name} · ${a.short}</span>
        <span class="ma-more" aria-hidden="true">${ui.ICON.arrow}</span>
      </button>`;
    };
    const rows = [['Чем живёт и действует', 1, 2, 'Эго'], ['Что даётся с напряжением', 4, 3, 'Суперэго'], ['Чего ждёт от других', 6, 5, 'Суперид'], ['Что умеет, но держит в фоне', 7, 8, 'Ид']];
    return `<div class="ma" style="${ui.qStyle(t.quadra)}">${rows.map(([name, l, r, term]) => `
      <div class="ma-row"><div class="ma-block reveal"><b>${name}</b><span>блок «${term}»</span></div>${cell(l)}${cell(r)}</div>`).join('')}</div>`;
  }

  // Сильные стороны и зоны роста — нумерованным списком, как «Что внутри»
  const traits = (list, from = 1) => `<ol class="numlist numlist-sm">${list.map((x, i) => `
    <li class="reveal"><div class="nl-row"><span class="nl-num" aria-hidden="true">${String(i + from).padStart(2, '0')}</span><span class="nl-body"><span class="nl-text">${esc(x)}</span></span></div></li>`).join('')}</ol>`;

  V.type = {
    valid: id => Boolean(M().type(id)),
    title: id => { const t = M().type(id); return `${t.code} «${t.alias}»`; },
    render(id) {
      const t = M().type(id), q = ui.quadra(t.quadra), c = ui.content(t.id);
      const i = S.data.types.indexOf(t);
      const prev = S.data.types[(i + 15) % 16], next = S.data.types[(i + 1) % 16];
      const dual = M().partner(t, 'dual');
      const words = t.alias.split(' ');
      return `
        <section class="type-hero" style="${ui.qStyle(t.quadra)}">
          <a class="crumb" href="#/types">${ui.ICON.back}Все типы</a>
          <p class="eyebrow type-eyebrow"><i class="qdot" aria-hidden="true"></i>${t.code} · ${esc(t.role)} · ${q.name}</p>
          <h1 class="type-title display" data-fit data-min="11" data-max="19" data-maxh="22">
            <span class="sr">${t.code} — </span><span class="fit-in">${words.map(w => `<span class="fit-line"><span class="sv">${esc(w)}</span></span>`).join(' ')}</span>
          </h1>
          <div class="type-char" data-magnet><div><div class="res-fig">${ui.character(t, { sizes: ui.CHAR.hero, eager: true })}</div></div></div>
          <div class="type-meta">
            <p class="type-name">${esc(t.name)}</p>
            <p class="lead">${esc(c.tagline || '')}</p>
          </div>
        </section>

        <section class="sec sec-white">
          <div class="wrap">
            <h2 class="h2 sec-head reveal">О${NB}типе</h2>
            <div class="type-about">${(c.about || []).map((p, k) => `<p class="body reveal" style="--i:${k}">${esc(p)}</p>`).join('')}</div>
            ${ui.celebs(t)}
          </div>
        </section>

        <section class="sec">
          <div class="wrap">
            <h2 class="h2 reveal"><span class="sv">Как устроен тип</span></h2>
            <p class="lead sec-sub reveal">Восемь сторон характера: что${NB}типу даётся легко, что${NB}— с${NB}трудом, а${NB}чего он ждёт от${NB}других. В${NB}соционике эта раскладка называется моделью${NB}А. Нажми на${NB}карточку — расскажем, как это проявляется у${NB}${t.code}.</p>
            ${modelA(t)}
          </div>
        </section>

        <section class="sec sec-white">
          <div class="wrap">
            <div class="grid2 traits">
              <div><h2 class="h2 h2-sm reveal">Сильные стороны</h2>${traits(c.strengths || [])}</div>
              <div><h2 class="h2 h2-sm reveal">Зоны роста</h2>${traits(c.growth || [])}</div>
            </div>
          </div>
        </section>

        <section class="sec" id="relations">
          <div class="wrap">
            <h2 class="h2 h2-md reveal"><span class="sv">Отношения со${NB}всеми типами</span></h2>
            <p class="lead sec-sub reveal">${esc(c.inRelations || '')}</p>
            ${ui.relMap(t)}
          </div>
        </section>

        <p class="wrap type-facts reveal"><a class="link" href="#/box/${t.id}">Факты про ${t.code} — в${NB}коробке</a></p>

        <nav class="wrap type-nav" aria-label="Соседние типы">
          <a class="btn-ghost" href="#/types/${prev.id}" style="${ui.qStyle(prev.quadra)}"><span aria-hidden="true">‹</span> ${esc(ui.short(prev))}<span class="sr"> — ${prev.code}</span></a>
          <a class="btn-ghost" href="#/types/${next.id}" style="${ui.qStyle(next.quadra)}">${esc(ui.short(next))}<span class="sr"> — ${next.code}</span> <span aria-hidden="true">›</span></a>
        </nav>`;
    },
    mount(root, id) {
      const t = M().type(id);
      // Тексты «как это у типа» подгружаются в простое, пока человек читает страницу. Нажали раньше — шторка
      // откроется, как только они придут; не пришли (нет сети) — откроется с общим описанием функции
      let alive = true;
      const onClick = e => {
        const cell = e.target.closest('[data-fn]');
        if (!cell || !root.contains(cell)) return;
        const open = () => { if (alive) ui.openFunction(t, Number(cell.dataset.fn), cell); };
        if (ui.modelAReady()) open(); else ui.modelATexts().catch(() => {}).then(open);
      };
      root.addEventListener('click', onClick);
      ui.prefetchModelA();
      const offs = [ui.mountOverlap(root), ui.mountRelMap(root)];
      return () => { alive = false; root.removeEventListener('click', onClick); offs.forEach(f => f()); };
    }
  };
})(window);
