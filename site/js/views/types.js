/* Socio-Nik · все типы (#/types) и страница типа (#/types/ile) */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;
  const M = () => S.core.modelA;

  V.types = {
    title: () => '16 типов',
    render: () => `
      <section class="sec page-head">
        <div class="wrap-wide">
          <div class="wrap-inner">
            <p class="eyebrow reveal">Типы</p>
            <h1 class="title reveal">16 типов</h1>
            <p class="lead reveal">Нажми на тип — там описание, модель А и отношения со всеми остальными. Эмблема: крупный знак — базовая функция, маленький на орбите — творческая.</p>
          </div>
          ${ui.typesGrid()}
        </div>
      </section>`
  };

  // Модель А: слева 1 · 4 · 6 · 7, справа 2 · 3 · 5 · 8 — классическая раскладка
  function modelA(t) {
    const m = M().modelA(t.ego), A = S.data.aspects, F = S.data.functions;
    const cell = n => {
      const a = A[m[n - 1]];
      return `<button type="button" class="ma-cell reveal${n <= 2 ? ' ego' : ''}" style="--i:${n}" data-fn="${n}" aria-haspopup="dialog" aria-label="${F[n - 1].name} функция — ${esc(a.name)}. Подробнее">
        <span class="ma-n">${n}</span>
        <span class="ma-glyph">${S.art.glyphSVG(a.id, S.theme.quadraColor(t.quadra), 'ma-svg')}</span>
        <span class="ma-fn">${F[n - 1].name}</span>
        <span class="ma-asp">${a.short} · ${esc(a.name)}</span>
        <span class="ma-more" aria-hidden="true">›</span>
      </button>`;
    };
    const rows = [['Эго', 1, 2, 'то, чем тип живёт и действует'], ['Суперэго', 4, 3, 'то, что даётся с напряжением'], ['Суперид', 6, 5, 'то, чего ждёт от других'], ['Ид', 7, 8, 'сильное, но фоновое']];
    return `<div class="ma" style="${ui.qStyle(t.quadra)}">${rows.map(([name, l, r, hint]) => `
      <div class="ma-row"><div class="ma-block reveal"><b>${name}</b><span>${hint}</span></div>${cell(l)}${cell(r)}</div>`).join('')}</div>`;
  }

  V.type = {
    valid: id => Boolean(M().type(id)),
    title: id => { const t = M().type(id); return `${t.code} «${t.alias}»`; },
    render(id) {
      const t = M().type(id), q = ui.quadra(t.quadra), c = ui.content(t.id);
      const i = S.data.types.indexOf(t);
      const prev = S.data.types[(i + 15) % 16], next = S.data.types[(i + 1) % 16];
      const dual = M().partner(t, 'dual');
      return `
        <section class="type-hero" style="${ui.qStyle(t.quadra)}" data-anim>
          <div class="res-glow" aria-hidden="true"></div>
          <div class="wrap type-top">
            <a class="crumb reveal" href="#/types">‹ Все типы</a>
            <div class="type-emblem reveal" style="--i:1">${ui.emblem(t, { live: true, cls: 'em-big' })}</div>
            <p class="eyebrow reveal" style="--i:2"><i class="qdot" aria-hidden="true"></i>${q.name} · ${esc(t.role)}</p>
            <h1 class="res-code reveal" style="--i:2">${t.code}</h1>
            <p class="res-name reveal" style="--i:3">${esc(t.name)} · «${esc(t.alias)}»</p>
            <p class="lead reveal" style="--i:4">${esc(c.tagline || '')}</p>
          </div>
        </section>

        <section class="sec">
          <div class="wrap narrow">
            <h2 class="title-sm reveal">О типе</h2>
            ${(c.about || []).map((p, k) => `<p class="body reveal" style="--i:${k}">${esc(p)}</p>`).join('')}
          </div>
          ${ui.celebs(t)}
        </section>

        <section class="sec sec-alt">
          <div class="wrap">
            <div class="grid2" style="${ui.qStyle(t.quadra)}">
              <div class="card reveal"><h3 class="card-title">Сильные стороны</h3>
                <ul class="checks">${(c.strengths || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>
              <div class="card reveal" style="--i:1"><h3 class="card-title">Зоны роста</h3>
                <ul class="checks soft">${(c.growth || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>
            </div>
            <div class="card wide reveal" style="${ui.qStyle(dual.quadra)}">
              <span class="wide-art">${ui.emblem(dual, { label: false })}</span>
              <div><h3 class="card-title">В отношениях</h3><p>${esc(c.inRelations || '')}</p>
              <a class="link" href="#/relations/${t.id}/${dual.id}">${t.code} и ${dual.code}: дуальные отношения</a></div>
            </div>
          </div>
        </section>

        <section class="sec">
          <div class="wrap">
            <h2 class="title-sm reveal">Модель А</h2>
            <p class="sub reveal">Восемь функций: какие аспекты информации тип обрабатывает легко и уверенно, а какие — с трудом или с помощью других. Нажми на функцию — расскажем, как она проявляется у ${t.code}.</p>
            ${modelA(t)}
          </div>
        </section>

        <section class="sec sec-alt">
          <div class="wrap">
            <h2 class="title-sm reveal">Отношения со всеми типами</h2>
            <p class="sub reveal">Нажми на тип — откроется подробный разбор пары.</p>
            ${ui.relList(t)}
          </div>
        </section>

        <section class="sec">
          <div class="wrap">
            <h2 class="title-sm reveal">Mystery box про ${t.code}</h2>
            <div class="reveal">${ui.box({ typeId: t.id, compact: true })}</div>
          </div>
        </section>

        <nav class="wrap type-nav" aria-label="Соседние типы">
          <a href="#/types/${prev.id}" style="${ui.qStyle(prev.quadra)}"><span>‹ ${prev.code}</span><small>${esc(prev.alias)}</small></a>
          <a href="#/types/${next.id}" style="${ui.qStyle(next.quadra)}"><span>${next.code} ›</span><small>${esc(next.alias)}</small></a>
        </nav>`;
    },
    mount(root, id) {
      const t = M().type(id);
      const onClick = e => {
        const cell = e.target.closest('[data-fn]');
        if (cell && root.contains(cell)) ui.openFunction(t, Number(cell.dataset.fn), cell);
      };
      root.addEventListener('click', onClick);
      const off = ui.mountBox(root);
      return () => { root.removeEventListener('click', onClick); off(); };
    }
  };
})(window);
