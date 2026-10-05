/* Socio-Nik · отношения (#/relations): калькулятор, 14 видов со сценами, матрица 16×16; экран пары (#/relations/ile/sei) */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;
  const M = () => S.core.modelA;
  const NB = '\u00A0';

  // 14 видов в порядке тона; пример — пара с ИЛЭ (для асимметричных — ИЛЭ в роли ревизора / заказчика)
  const KINDS = [
    ['dual', 'dual'], ['activation', 'activation'], ['mirror', 'mirror'], ['semidual', 'semidual'], ['mirage', 'mirage'],
    ['identity', 'identity'], ['kindred', 'kindred'], ['business', 'business'], ['quasi', 'quasi'], ['request', 'beneficiary'],
    ['extinguish', 'extinguish'], ['superego', 'superego'], ['supervision', 'supervisee'], ['conflict', 'conflict']
  ];

  function matrix() {
    const ts = S.data.types;
    return `
      <div class="matrix-wrap reveal">
        <table class="matrix">
          <caption class="sr">Отношения всех пар типов: строка — ты, столбец — партнёр</caption>
          <thead><tr><th scope="col"><span class="sr">Ты \\ партнёр</span></th>${ts.map(t => `<th scope="col">${t.code}</th>`).join('')}</tr></thead>
          <tbody>${ts.map(a => `<tr><th scope="row">${a.code}</th>${ts.map((b, j) => {
            const r = M().relation(a, b);
            const name = r.role ? `${r.name} · ${r.role}` : r.name;
            return `<td><a class="mx t-${r.tone}${a === b ? ' self' : ''}" data-col="${j}" href="#/relations/${a.id}/${b.id}" data-tip="${esc(name)}|${a.code} → ${b.code}" aria-label="${a.code} и ${b.code}: ${esc(name)}"></a></td>`;
          }).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="legend reveal">${['support', 'work', 'tense'].map(tone => ui.toneChip(tone)).join('')}</div>`;
  }

  V.relations = {
    title: () => 'Отношения',
    render() {
      const a = S.state.myType() || 'ile';
      const b = M().partner(M().type(a), 'dual').id;
      const ile = M().type('ile');
      return `
        <section class="page-top page-head rel-head">
          <div class="wrap">
            <p class="eyebrow reveal">Отношения</p>
            <h1 class="h2 reveal"><span class="sv">Отношения</span></h1>
            <p class="lead reveal">Соционика различает 14${NB}видов отношений. Они описывают, насколько легко двум людям понимать и${NB}дополнять друг друга, — а${NB}не${NB}то, кто кому подходит навсегда.</p>
            <div class="reveal gap-top">${ui.calc(a, b)}</div>
          </div>
        </section>

        <section class="sec sec-white">
          <div class="wrap">
            <h2 class="h2 reveal">14${NB}видов</h2>
            <p class="lead sec-sub reveal">Сцены показаны на${NB}примере ИЛЭ «Дон Кихот»: знак слева — он, справа — партнёр.</p>
            <ol class="numlist kinds">
              ${KINDS.map(([kind, pos], i) => {
                const r = M().relationById(pos), partner = M().partner(ile, pos), txt = ui.relText(kind);
                return `<li class="kind reveal" data-anim>
                  <span class="nl-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
                  <div class="kind-scene">${ui.pairScene(ile, partner, { theme: 'light' })}</div>
                  <div class="kind-copy">
                    <h3 class="nl-title">${ui.kindTitle(kind)}</h3>
                    ${ui.toneChip(r.tone)}
                    <p class="nl-text">${esc(txt.line || '')}</p>
                    <details><summary>Подробнее</summary><p>${esc(txt.about || '')}</p><p class="tip-line"><b>Как ладить.</b> ${esc(txt.tip || '')}</p></details>
                  </div>
                </li>`;
              }).join('')}
            </ol>
          </div>
        </section>

        <section class="sec">
          <div class="wrap">
            <h2 class="h2 reveal"><span class="sv">Все пары</span></h2>
            <p class="lead sec-sub reveal">Строка — ты, столбец — партнёр. Чем светлее клетка, тем легче отношения. Нажми на${NB}клетку, чтобы открыть разбор пары.</p>
            <div class="only-wide">${matrix()}</div>
            <div class="only-narrow reveal">
              ${ui.typeSelect('mlist', a, 'Твой тип')}
              <div class="mlist-out">${ui.relList(M().type(a))}</div>
            </div>
          </div>
        </section>`;
    },
    mount(root) {
      const offs = [ui.mountCalc(root), ui.mountTips(root)];
      const sel = root.querySelector('[data-mlist]'), out = root.querySelector('.mlist-out');
      if (sel) sel.addEventListener('change', () => { out.innerHTML = ui.relList(M().type(sel.value)); out.querySelectorAll('.reveal').forEach(S.fx.show); });
      const table = root.querySelector('.matrix');
      if (table) {
        const clear = () => table.querySelectorAll('.hl').forEach(el => el.classList.remove('hl'));
        const hl = e => {
          const cell = e.target.closest && e.target.closest('.mx');
          clear();
          if (!cell) return;
          const tr = cell.closest('tr'), col = Number(cell.dataset.col);
          tr.classList.add('hl');
          table.querySelectorAll('tr').forEach(row => { const c = row.children[col + 1]; if (c) c.classList.add('hl'); });
        };
        table.addEventListener('pointerover', hl);
        table.addEventListener('focusin', hl);
        table.addEventListener('pointerleave', clear);
      }
      return () => offs.forEach(f => f && f());
    }
  };

  V.pair = {
    valid: (a, b) => Boolean(M().type(a) && M().type(b)),
    title: (a, b) => `${M().type(a).code} и ${M().type(b).code}`,
    render(aId, bId) {
      const a = M().type(aId), b = M().type(bId), r = M().relation(a, b), txt = ui.relText(r.kind);
      const role = txt.roles && txt.roles[r.id];
      // Подсветка идёт за фигурами: у заказа и ревизии слева заказчик / ревизор
      const flip = r.id === 'benefactor' || r.id === 'supervisor';
      const [lq, rq] = flip ? [b.quadra, a.quadra] : [a.quadra, b.quadra];
      return `
        <section class="pair-hero" style="--qa:var(--q-${lq});--qb:var(--q-${rq})">
          <div class="wrap center">
            <a class="crumb" href="#/relations">${ui.ICON.back}Отношения</a>
            <p class="eyebrow">${a.code} «${esc(a.alias)}» и${NB}${b.code} «${esc(b.alias)}»</p>
            <h1 class="pair-title display"><span class="sv">${esc(ui.relTitle(r, a, b))}</span></h1>
            <div class="pair-duo">${ui.duo(a, b, { eager: true })}</div>
            <p>${ui.toneChip(r.tone)}</p>
            <p class="lead">${esc(txt.line || '')}</p>
          </div>
        </section>
        <section class="sec sec-white">
          <div class="wrap narrow">
            <p class="body pair-about reveal">${esc(txt.about || '')}</p>
            ${role ? `<div class="card reveal"><h3 class="card-title">С${NB}позиции ${a.code}</h3><p>${esc(role)}</p></div>` : ''}
            <div class="card tip-card reveal"><h3 class="card-title">Как ладить</h3><p>${esc(txt.tip || '')}</p></div>
            <div class="pair-links reveal">
              <a class="link" href="#/relations/${b.id}/${a.id}">Посмотреть глазами ${b.code}</a>
              <a class="link" href="#/relations">Выбрать другую пару</a>
            </div>
          </div>
        </section>
        <section class="sec">
          <div class="wrap">
            <div class="grid2">
              ${[a, b].map((t, i) => `<a class="link-card reveal" style="${ui.qStyle(t.quadra)};--i:${i}" href="#/types/${t.id}">
                <span class="lc-art lc-char">${ui.character(t, { sizes: ui.CHAR.ava, alt: '' })}</span>
                <span class="lc-kicker">${ui.quadra(t.quadra).name} · ${esc(t.role)}</span>
                <span class="lc-title">${t.code} «${esc(t.alias)}»</span>
                <span class="lc-text">${esc(ui.content(t.id).tagline || '')}</span>
              </a>`).join('')}
            </div>
          </div>
        </section>`;
    }
  };
})(window);
