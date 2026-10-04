/* Socio-Nik · отношения (#/relations): калькулятор, 14 видов со сценами, матрица 16×16.
   Экран пары (#/pair/<a>/<b>, старые #/relations/<a>/<b>) — в views/pair.js */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;
  const M = () => S.core.modelA;

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
          <caption class="sr">Отношения всех пар типов: строка — ты, столбец — партнёр. В таблицу одна остановка Tab, по клеткам — стрелками</caption>
          <thead><tr><th scope="col"><span class="sr">Ты \\ партнёр</span></th>${ts.map(t => `<th scope="col">${t.mbti}</th>`).join('')}</tr></thead>
          <tbody>${ts.map((a, i) => `<tr><th scope="row">${a.mbti}</th>${ts.map((b, j) => {
            const r = M().relation(a, b);
            const name = r.role ? `${r.name} · ${r.role}` : r.name;
            return `<td><a class="mx t-${r.tone}${a === b ? ' self' : ''}" data-col="${j}" tabindex="${i === 0 && j === 0 ? 0 : -1}" href="#/pair/${a.mbti.toLowerCase()}/${b.mbti.toLowerCase()}" data-tip="${esc(name)}|${a.mbti} → ${b.mbti}" aria-label="${a.mbti} и ${b.mbti}: ${esc(name)}"></a></td>`;
          }).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="legend reveal">${['support', 'work', 'tense'].map(tone => ui.toneChip(tone)).join('')}</div>`;
  }

  V.relations = {
    needs: ['types', 'relations'],
    title: () => 'Отношения',
    render() {
      const a = S.state.myType() || 'ile';
      const b = M().partner(M().type(a), 'dual').id;
      const ile = M().type('ile');
      return `
        <section class="sec page-head">
          <div class="wrap">
            <h1 class="title">Как типы ладят друг с другом.</h1>
            <p class="lead">Соционика различает 14 видов отношений. Они описывают, насколько легко двум людям понимать и дополнять друг друга, — а не то, кто кому подходит навсегда.</p>
            <div class="reveal">${ui.calc(a, b, { level: 2 })}</div>
          </div>
        </section>

        <section class="sec sec-alt">
          <div class="wrap-wide">
            <div class="wrap-inner">
              <h2 class="title-sm">14 видов отношений</h2>
              <p class="sub">Сцены показаны на примере ENTP «Изобретатель» — в соционике это ИЛЭ «Дон Кихот».</p>
            </div>
            <div class="kinds">
              ${KINDS.map(([kind, pos], i) => {
                const r = M().relationById(pos), partner = M().partner(ile, pos), txt = ui.relText(kind);
                return `<article class="kind card reveal" style="--i:${i % 3}" data-anim>
                  <div class="kind-scene">${ui.pairScene(ile, partner)}</div>
                  <div class="kind-copy">
                    <h3>${ui.kindTitle(kind)}</h3>
                    <p class="kind-human">${esc(((S.content.pair || {}).titles || {})[pos] || '')}</p>
                    ${ui.toneChip(r.tone)}
                    <p>${esc(txt.line || '')}</p>
                    <details><summary>Подробнее</summary><p>${esc(txt.about || '')}</p><p class="tip-line"><b>Как ладить.</b> ${esc(txt.tip || '')}</p></details>
                  </div>
                </article>`;
              }).join('')}
            </div>
          </div>
        </section>

        <section class="sec">
          <div class="wrap">
            <h2 class="title-sm">Все пары</h2>
            <p class="sub">Строка — ты, столбец — партнёр. Чем темнее клетка, тем легче отношения. Нажми на клетку, чтобы открыть разбор пары.</p>
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
      if (sel) sel.addEventListener('change', () => { out.innerHTML = ui.relList(M().type(sel.value)); S.dom.typo(out); out.querySelectorAll('.reveal').forEach(S.fx.show); });
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
        // 256 клеток — одна остановка Tab: по таблице ходим стрелками, Home и End — к началу и концу строки
        const rows = Array.from(table.tBodies[0].rows).map(tr => Array.from(tr.querySelectorAll('.mx')));
        const move = e => {
          const cell = e.target.closest && e.target.closest('.mx');
          if (!cell) return;
          const r = rows.findIndex(row => row.includes(cell)), c = Number(cell.dataset.col), last = rows.length - 1;
          const to = { ArrowRight: [r, c + 1], ArrowLeft: [r, c - 1], ArrowDown: [r + 1, c], ArrowUp: [r - 1, c], Home: [r, 0], End: [r, last] }[e.key];
          if (!to) return;
          e.preventDefault();
          const next = rows[Math.max(0, Math.min(last, to[0]))][Math.max(0, Math.min(last, to[1]))];
          cell.tabIndex = -1;
          next.tabIndex = 0;
          next.focus();
        };
        table.addEventListener('keydown', move);
      }
      return () => offs.forEach(f => f && f());
    }
  };

})(window);
