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
          <p class="lead reveal">Четыре ряда — четыре квадры. Нажми на${NB}тип: там описание, модель${NB}А и${NB}отношения со${NB}всеми остальными.</p>
        </div>
      </section>
      <section class="sec types-sec">
        <div class="wrap">${ui.typesGrid()}</div>
      </section>`
  };

  // Модель А: слева 1 · 4 · 6 · 7, справа 2 · 3 · 5 · 8 — классическая раскладка
  function modelA(t) {
    const m = M().modelA(t.ego), A = S.data.aspects, F = S.data.functions;
    const cell = n => {
      const a = A[m[n - 1]];
      return `<button type="button" class="ma-cell reveal${n <= 2 ? ' ego' : ''}" style="--i:${n % 4}" data-fn="${n}" aria-haspopup="dialog" aria-label="${F[n - 1].name} функция — ${esc(a.name)}. Подробнее">
        <span class="ma-n">${n}</span>
        <span class="ma-glyph">${S.art.glyphSVG(a.id, S.theme.quadraColor(t.quadra), 'ma-svg')}</span>
        <span class="ma-fn">${F[n - 1].name}</span>
        <span class="ma-asp">${a.short} · ${esc(a.name)}</span>
        <span class="ma-more" aria-hidden="true">${ui.ICON.arrow}</span>
      </button>`;
    };
    const rows = [['Эго', 1, 2, 'то, чем тип живёт и действует'], ['Суперэго', 4, 3, 'то, что даётся с напряжением'], ['Суперид', 6, 5, 'то, чего ждёт от других'], ['Ид', 7, 8, 'сильное, но фоновое']];
    return `<div class="ma" style="${ui.qStyle(t.quadra)}">${rows.map(([name, l, r, hint]) => `
      <div class="ma-row"><div class="ma-block reveal"><b>${name}</b><span>${hint}</span></div>${cell(l)}${cell(r)}</div>`).join('')}</div>`;
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
            <h2 class="h2 reveal"><span class="sv">Модель${NB}А</span></h2>
            <p class="lead sec-sub reveal">Восемь функций: какие аспекты информации тип обрабатывает легко и${NB}уверенно, а${NB}какие — с${NB}трудом или с${NB}помощью других. Нажми на${NB}функцию — расскажем, как она проявляется у${NB}${t.code}.</p>
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

        <section class="sec">
          <div class="wrap">
            <h2 class="h2 h2-md reveal"><span class="sv">Отношения со${NB}всеми типами</span></h2>
            <p class="lead sec-sub reveal">${esc(c.inRelations || '')}</p>
            <p class="reveal sec-sub"><a class="link" href="#/relations/${t.id}/${dual.id}">${t.code} и${NB}${dual.code}: дуальные отношения</a></p>
            ${ui.relList(t)}
          </div>
        </section>

        <section class="sec sec-line">
          <div class="wrap center">
            <h2 class="h2 h2-sm reveal"><span class="sv">Mystery box про ${t.code}</span></h2>
            <div class="reveal">${ui.box({ typeId: t.id, compact: true })}</div>
          </div>
        </section>

        <nav class="wrap type-nav" aria-label="Соседние типы">
          <a class="btn-ghost" href="#/types/${prev.id}" style="${ui.qStyle(prev.quadra)}"><span aria-hidden="true">‹</span> ${esc(ui.short(prev))}<span class="sr"> — ${prev.code}</span></a>
          <a class="btn-ghost" href="#/types/${next.id}" style="${ui.qStyle(next.quadra)}">${esc(ui.short(next))}<span class="sr"> — ${next.code}</span> <span aria-hidden="true">›</span></a>
        </nav>`;
    },
    mount(root, id) {
      const t = M().type(id);
      const onClick = e => {
        const cell = e.target.closest('[data-fn]');
        if (cell && root.contains(cell)) ui.openFunction(t, Number(cell.dataset.fn), cell);
      };
      root.addEventListener('click', onClick);
      const offs = [ui.mountBox(root), ui.mountOverlap(root)];
      return () => { root.removeEventListener('click', onClick); offs.forEach(f => f()); };
    }
  };
})(window);
