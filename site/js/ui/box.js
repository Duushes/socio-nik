/* Socio-Nik · mystery box. На своей странице (#/box) — коробка-подарок: нажатие → тряска, вспышка, крышка взлетает,
   рядом переворачивается карточка-«коллекционка» с фактом и блоком «Поделиться».
   Встроенная (compact: главная, результат, страница типа) — без подарка: одна карта рубашкой вверх, переворот на месте.
   Шерится картинка (share/card.js). Факты без повторов, пока колода не кончится; коллекция «N из M» копится навсегда. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const ui = S.ui = S.ui || {};
  const { esc, reducedMotion } = S.dom;
  const M = () => S.core.modelA;

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

  const openedCount = () => new Set(S.store.get('box.opened', [])).size;
  const progress = () => {
    const n = openedCount(), all = S.facts.all().length;
    return `<span class="bp-text">Твоя коллекция: <b>${n}</b> из ${all} фактов</span>
      <span class="bp-bar" aria-hidden="true"><i style="width:${Math.max(2, n / all * 100).toFixed(1)}%"></i></span>`;
  };

  // opts: { modes: true — выбор режима; typeId — зафиксировать тип; compact — для встраивания }
  ui.box = ({ modes = false, typeId = null, compact = false } = {}) => {
    const mine = S.state.myType();
    const mode = typeId ? 'type' : 'any';
    const target = typeId || mine || 'ile';
    return `
      <div class="box${compact ? ' box-compact' : ''}" data-box data-mode="${mode}" data-type="${target}">
        ${modes ? `
          <div class="seg box-modes" role="group" aria-label="Про какой тип факты">
            <button type="button" data-m="any" aria-pressed="true">Любой<span class="seg-x"> тип</span></button>
            <button type="button" data-m="mine"${mine ? '' : ' disabled title="Сначала пройди тест"'}>Мой<span class="seg-x"> тип</span>${mine ? ' · ' + M().type(mine).code : ''}</button>
            <button type="button" data-m="pick">Выбрать<span class="seg-x"> тип</span></button>
          </div>
          <div class="box-pick" hidden>${ui.typeSelect('boxtype', target, 'Тип')}</div>` : ''}
        <div class="box-play">
          ${compact ? '' : `<div class="box-stage" data-anim="keep">
            <div class="bx-glow" aria-hidden="true"></div>
            <button class="bx" type="button" aria-label="Открыть коробку со случайным фактом">
              <span class="bx-shadow" aria-hidden="true"></span>
              <span class="bx-float" aria-hidden="true">
                <img class="bx-img bx-closed" src="img/box/closed.webp" width="560" height="560" alt="" decoding="async" draggable="false">
                <img class="bx-img bx-open" src="img/box/open.webp" width="560" height="560" alt="" decoding="async" draggable="false">
              </span>
              <span class="bx-flash" aria-hidden="true"></span>
            </button>
            <p class="bx-hint">Нажми на коробку</p>
          </div>`}
          <div class="bx-slot">
            <div class="bx-flip">
              <button class="bx-back" type="button"${compact ? ' aria-label="Открыть случайный факт"' : ' tabindex="-1" aria-hidden="true"'}>
                ${ui.dots4('bxb-mark')}
                <span class="bxb-q" aria-hidden="true">?</span>
                <span class="bxb-t">${compact ? 'Открыть факт' : 'Здесь появится факт'}</span>
                <span class="bxb-s">${compact ? 'Нажми на карту — перевернём её' : 'Нажми на коробку или на эту карту'}</span>
              </button>
              <article class="bx-card" aria-hidden="true" inert></article>
            </div>
          </div>
        </div>
        <p class="box-progress">${progress()}</p>
        <p class="sr" data-box-say aria-live="polite"></p>
      </div>`;
  };

  // Текст и ссылка факта для шера: ссылка ведёт на страницу типа (или в коробку для общих фактов)
  const factText = f => {
    const t = f.type ? M().type(f.type) : null;
    return t ? `Узнаёшь кого-то? ${t.code} «${t.alias}»: ${f.text}` : `${f.text} — факт из mystery box Socio-Nik`;
  };
  const factUrl = f => {
    const base = S.config && S.config.SITE_URL;
    return base ? base.replace(/\/$/, '') + '/#/' + (f.type ? 'types/' + f.type : 'box') : '';
  };

  function cardHTML(f, reset) {
    const t = f.type ? M().type(f.type) : null;
    const all = S.facts.all(), no = all.findIndex(x => x.id === f.id) + 1;
    const q = t ? S.data.quadras.find(x => x.id === t.quadra) : null;
    return `
      <div class="fc"${t ? ` style="${ui.qStyle(t.quadra)}"` : ''}>
        <span class="fc-sheen" aria-hidden="true"></span>
        <header class="fc-head">
          <span class="fc-no">Факт № ${no}</span>
          <span class="fc-cat">${esc(S.factCats[f.cat] || '')}</span>
        </header>
        <div class="fc-who">
          ${t ? `${ui.mark(t, { cls: 'fc-ava' })}
            <span class="fc-name"><b>${t.code} «${esc(t.alias)}»</b><small>${esc(t.role)} · квадра ${q.name}</small></span>
            <a class="link fc-type-link" href="#/types/${t.id}">Про ${t.code}</a>`
            : `<span class="fc-ava fc-ava-gen">${ui.dots4()}</span>
            <span class="fc-name"><b>Соционика</b><small>Факт обо всех 16 типах</small></span>
            <a class="link fc-type-link" href="#/about">О соционике</a>`}
        </div>
        <p class="bx-text fc-text">${esc(f.text)}</p>
        ${reset ? '<p class="bx-reset">Все факты этой колоды уже открыты — перемешали заново.</p>' : ''}
        <div class="fc-share">
          <p class="fc-hook">${t ? 'Узнаёшь кого-то? Отправь им этот факт' : 'Удиви друзей — отправь им этот факт'}</p>
          ${ui.shareActions({ text: factText(f), url: factUrl(f), primary: 'Поделиться', compact: true,
            extra: `<button class="btn-ghost fc-next" type="button" data-more>${ui.ICON.cycle}<span>Ещё факт</span></button>` })}
        </div>
      </div>`;
  }

  ui.mountBox = scope => {
    const box = scope.querySelector('[data-box]');
    if (!box) return () => {};
    // у встроенной колоды нет подарка: btn, stage и hint — null, открывает сама карта
    const btn = box.querySelector('.bx'), card = box.querySelector('.bx-card'), stage = box.querySelector('.box-stage');
    const slot = box.querySelector('.bx-slot'), backFace = box.querySelector('.bx-back');
    const prog = box.querySelector('.box-progress'), hint = box.querySelector('.bx-hint');
    const cls = (el, fn, ...names) => { if (el) el.classList[fn](...names); };
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, reducedMotion() ? 0 : ms));
    const say = box.querySelector('[data-box-say]');
    let busy = false, current = null, refocus = false;

    const mode = () => box.dataset.mode;
    const typeFor = () => (mode() === 'mine' ? S.state.myType() : box.dataset.type);

    function open() {
      if (busy) return;
      busy = true;
      const { fact, reset } = draw(mode() === 'any' ? 'any' : 'type', typeFor());
      current = fact;
      const t = fact.type ? M().type(fact.type) : null;
      // картинку для шера готовим заранее: портрет и символы догрузятся, пока человек читает
      if (t) S.share.portrait(t.id);
      S.share.art();
      if (hint) hint.hidden = true;
      box.classList.remove('is-open');
      cls(stage, 'remove', 'is-open', 'is-lid');
      box.style.setProperty('--q', t ? `var(--q-${t.quadra})` : '');
      if (btn) {
        btn.classList.remove('shake');
        void btn.offsetWidth;
        btn.classList.add('shake');
      }
      later(() => {
        cls(stage, 'add', 'is-lid');
        // лицо карты заполняем, пока она лежит рубашкой вверх, — потом переворачиваем на месте
        card.innerHTML = cardHTML(fact, reset);
      }, btn ? 420 : 0);
      later(() => {
        cls(stage, 'add', 'is-open');
        box.classList.add('is-open');
        slot.classList.add('flipped');
        card.setAttribute('aria-hidden', 'false');
        backFace.setAttribute('aria-hidden', 'true');
        // во встроенной колоде нажали на саму рубашку — она сейчас выключится, фокус переедет на «Ещё факт»
        const fromBack = backFace.contains(document.activeElement);
        // Сторона карты, которая сейчас не видна, выключена целиком: по ней не пройти Tab и её не читает скринридер
        card.inert = false;
        backFace.inert = true;
        backFace.tabIndex = -1;
        if (say) say.textContent = `${t ? `${t.code} «${t.alias}». ` : ''}${fact.text}`;
        const colors = t ? [S.theme.quadraColor(t.quadra), '#ffffff', '#ffd27a']
          : S.data.quadras.map(q => S.theme.quadraColor(q.id));
        const r = (stage || slot).getBoundingClientRect();
        S.fx.confetti(colors, { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height * 0.42) / innerHeight, n: 34, power: 0.45 });
        prog.innerHTML = progress();
        // Фокус — на «Ещё факт»: тем, кто идёт с клавиатуры, и тем, кто только что нажал «Ещё факт»
        // (кнопка исчезает вместе со старой картой — без этого фокус пропадал)
        const more = card.querySelector('[data-more]');
        if (more && (refocus || fromBack || document.documentElement.classList.contains('kbd'))) more.focus({ preventScroll: true });
        refocus = false;
        // на телефоне карточка под коробкой — подводим к ней
        if (stage && innerWidth < 900) {
          const cr = slot.getBoundingClientRect();
          if (cr.top > innerHeight * 0.5) scrollTo({ top: cr.top + scrollY - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 60) - 12, behavior: reducedMotion() ? 'auto' : 'smooth' });
        }
        busy = false;
      }, btn ? 900 : 60);
    }

    // карта ложится рубашкой вверх, коробка закрывается — без исчезновений и скачков
    function close(then) {
      const hadFocus = card.contains(document.activeElement);
      slot.classList.remove('flipped');
      card.setAttribute('aria-hidden', 'true');
      card.inert = true;
      backFace.inert = false;
      // во встроенной колоде рубашка — единственная кнопка: снова доступна
      if (!btn) { backFace.removeAttribute('aria-hidden'); backFace.tabIndex = 0; }
      // фокус не остаётся на карте, которая ложится рубашкой вверх, — переносим его на коробку, а во встроенной колоде — на рубашку
      if (hadFocus) (btn || backFace).focus({ preventScroll: true });
      if (say) say.textContent = '';
      cls(stage, 'remove', 'is-open', 'is-lid');
      box.classList.remove('is-open');
      later(() => { if (then) then(); }, 480);
    }

    if (btn) btn.addEventListener('click', open);
    // У подарка рубашка — подсказка для мыши и пальца: фокус с неё уходит на саму коробку, рубашка сейчас перевернётся.
    // Во встроенной колоде подарка нет: рубашка и есть кнопка
    backFace.addEventListener('click', () => { if (btn) btn.focus({ preventScroll: true }); open(); });
    card.addEventListener('click', e => { if (e.target.closest('[data-more]')) { refocus = true; close(open); } });
    const offShare = ui.mountShareActions(card, {
      text: () => factText(current),
      url: () => factUrl(current),
      image: () => S.share.factImage(current),
      name: () => `socio-nik-fact-${current.id}.png`
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
        if (hint) hint.hidden = false;
      });
      if (pick) pick.querySelector('select').addEventListener('change', e => { box.dataset.type = e.target.value; close(); if (hint) hint.hidden = false; });
    }
    return () => { timers.forEach(clearTimeout); offShare(); };
  };
})(window);
