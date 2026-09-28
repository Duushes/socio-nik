/* Socio-Nik · mystery box: глянцевая 3D-коробка в цветах квадр → тряска → крышка → карточка со случайным фактом.
   Факты без повторов, пока колода не кончится; счётчик «Открыто N из M» копится навсегда. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const ui = S.ui = S.ui || {};
  const { esc, reducedMotion } = S.dom;

  function pool(mode, typeId) {
    return mode === 'type' && typeId ? S.facts.byType(typeId) : S.facts.all();
  }

  function draw(mode, typeId) {
    const p = pool(mode, typeId);
    const seen = new Set(S.store.get('box.seen', []));
    let fresh = p.filter(f => !seen.has(f.id));
    let reset = false;
    if (!fresh.length) {
      p.forEach(f => seen.delete(f.id));
      fresh = p;
      reset = true;
    }
    const f = fresh[Math.floor(Math.random() * fresh.length)];
    seen.add(f.id);
    S.store.set('box.seen', Array.from(seen));
    const opened = new Set(S.store.get('box.opened', []));
    opened.add(f.id);
    S.store.set('box.opened', Array.from(opened));
    return { fact: f, reset };
  }

  const counter = () => `Открыто <b>${new Set(S.store.get('box.opened', [])).size}</b> из ${S.facts.all().length} фактов`;

  // opts: { modes: true — выбор режима; typeId — зафиксировать тип; compact — для встраивания }
  ui.box = ({ modes = false, typeId = null, compact = false } = {}) => {
    const mine = S.state.myType();
    const mode = typeId ? 'type' : 'any';
    const target = typeId || mine || 'ile';
    return `
      <div class="box${compact ? ' box-compact' : ''}" data-box data-mode="${mode}" data-type="${target}">
        ${modes ? `
          <div class="seg box-modes" role="group" aria-label="Про какой тип факты">
            <button type="button" data-m="any" aria-pressed="true">Любой тип</button>
            <button type="button" data-m="mine"${mine ? '' : ' disabled title="Сначала пройди тест"'}>Мой тип${mine ? ' · ' + S.core.modelA.type(mine).code : ''}</button>
            <button type="button" data-m="pick">Выбрать тип</button>
          </div>
          <div class="box-pick" hidden>${ui.typeSelect('boxtype', target, 'Тип')}</div>` : ''}
        <div class="box-stage" data-anim>
          <div class="bx-glow" aria-hidden="true"></div>
          <button class="bx" type="button" aria-label="Открыть коробку со случайным фактом">
            <span class="bx-scene" aria-hidden="true">
              <span class="bx-cube">
                <i class="f f-front"></i><i class="f f-back"></i><i class="f f-left"></i><i class="f f-right"></i><i class="f f-bottom"></i>
                <span class="bx-lid"><i class="l l-top"></i><i class="l l-front"></i><i class="l l-back"></i><i class="l l-left"></i><i class="l l-right"></i></span>
              </span>
            </span>
            <span class="bx-shadow" aria-hidden="true"></span>
          </button>
          <p class="bx-hint">Нажми на коробку</p>
          <article class="bx-card" aria-live="polite" hidden></article>
        </div>
        <p class="box-count">${counter()}</p>
      </div>`;
  };

  function cardHTML(f, reset) {
    const t = f.type ? S.core.modelA.type(f.type) : null;
    return `
      <div class="bx-card-in"${t ? ` style="${ui.qStyle(t.quadra)}"` : ''}>
        <header>
          ${t ? `<span class="bx-em">${S.art.emblem(t, { cls: 'em-mini', label: false })}</span><span class="chip">${t.code} · ${esc(t.alias)}</span>` : '<span class="chip">Соционика</span>'}
          <span class="bx-cat">${esc(S.factCats[f.cat] || '')}</span>
        </header>
        <p class="bx-text">${esc(f.text)}</p>
        ${reset ? '<p class="bx-reset">Все факты этой колоды уже открыты — перемешали заново.</p>' : ''}
        <footer>
          <button class="btn btn-sm" type="button" data-more>Ещё факт</button>
          <button class="btn btn-sm btn-ghost" type="button" data-share-fact>Поделиться</button>
          ${t ? `<a class="link" href="#/types/${t.id}">Открыть ${t.code}</a>` : ''}
        </footer>
      </div>`;
  }

  ui.mountBox = scope => {
    const box = scope.querySelector('[data-box]');
    if (!box) return () => {};
    const btn = box.querySelector('.bx'), card = box.querySelector('.bx-card'), stage = box.querySelector('.box-stage');
    const count = box.querySelector('.box-count'), hint = box.querySelector('.bx-hint');
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, reducedMotion() ? 0 : ms));
    let busy = false, current = null;

    const mode = () => box.dataset.mode;
    const typeFor = () => (mode() === 'mine' ? S.state.myType() : box.dataset.type);

    function open() {
      if (busy) return;
      busy = true;
      const { fact, reset } = draw(mode() === 'any' ? 'any' : 'type', typeFor());
      current = fact;
      hint.hidden = true;
      stage.classList.remove('is-open');
      card.hidden = true;
      btn.classList.remove('shake');
      void btn.offsetWidth;
      btn.classList.add('shake');
      later(() => stage.classList.add('is-lid'), 420);
      later(() => {
        card.innerHTML = cardHTML(fact, reset);
        card.hidden = false;
        stage.classList.add('is-open');
        const t = fact.type ? S.core.modelA.type(fact.type) : null;
        const colors = t ? [S.theme.quadraColor(t.quadra), '#ffffff', S.color.tone(S.theme.quadraColor(t.quadra), 0.4)]
          : S.data.quadras.map(q => S.theme.quadraColor(q.id));
        const r = stage.getBoundingClientRect();
        S.fx.confetti(colors, { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height * 0.45) / innerHeight, n: 70 });
        count.innerHTML = counter();
        const more = card.querySelector('[data-more]');
        if (more) more.focus({ preventScroll: true });
        busy = false;
      }, 900);
    }

    function close(then) {
      stage.classList.remove('is-open', 'is-lid');
      later(() => { card.hidden = true; if (then) then(); }, 320);
    }

    btn.addEventListener('click', open);
    card.addEventListener('click', async e => {
      if (e.target.closest('[data-more]')) close(open);
      if (e.target.closest('[data-share-fact]') && current) {
        const t = current.type ? S.core.modelA.type(current.type) : null;
        const txt = `${t ? t.code + ' «' + t.alias + '»: ' : ''}${current.text} — факт из mystery box Socio-Nik`;
        const status = e.target.closest('[data-share-fact]');
        try {
          if (navigator.share) await navigator.share({ text: txt });
          else if (await S.share.copy(txt)) status.textContent = 'Скопировано';
        } catch (err) { /* закрыли меню */ }
      }
    });

    // режимы
    const modes = box.querySelector('.box-modes'), pick = box.querySelector('.box-pick');
    if (modes) {
      modes.addEventListener('click', e => {
        const b = e.target.closest('button[data-m]');
        if (!b || b.disabled) return;
        modes.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        const m = b.dataset.m;
        box.dataset.mode = m === 'pick' ? 'type' : m;
        if (pick) pick.hidden = m !== 'pick';
        if (m === 'pick') box.dataset.type = pick.querySelector('select').value;
        close();
        hint.hidden = false;
      });
      if (pick) pick.querySelector('select').addEventListener('change', e => { box.dataset.type = e.target.value; close(); hint.hidden = false; });
    }
    return () => timers.forEach(clearTimeout);
  };
})(window);
