/* Socio-Nik · mystery box. Закрытая коробка-подарок парит, вокруг неё по наклонной орбите летают 3D-символы.
   Нажатие: тряска → вспышка, крышка взлетает → из коробки выскакивает персонаж типа (у общих фактов — символы),
   рядом — карточка-«коллекционка» с фактом и блоком «Поделиться». Шерится картинка в том же стиле (share/card.js).
   Факты без повторов, пока колода не кончится; коллекция «Открыто N из M» копится навсегда. */
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

  // символы, которые летают вокруг закрытой коробки
  const MOONS = ['sparkles', 'question', 'heart', 'lightning', 'bulb', 'puzzle'];

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
            <button type="button" data-m="mine"${mine ? '' : ' disabled title="Сначала пройди тест"'}>Мой тип${mine ? ' · ' + M().type(mine).code : ''}</button>
            <button type="button" data-m="pick">Выбрать тип</button>
          </div>
          <div class="box-pick" hidden>${ui.typeSelect('boxtype', target, 'Тип')}</div>` : ''}
        <div class="box-play">
          <div class="box-stage" data-anim>
            <div class="bx-glow" aria-hidden="true"></div>
            <div class="bx-moons" aria-hidden="true">${MOONS.map((k, i) => `<img class="bx-moon" data-i="${i}" src="${ui.emoteSrc(k)}" alt="" width="100" height="100" decoding="async" draggable="false">`).join('')}</div>
            <button class="bx" type="button" aria-label="Открыть коробку со случайным фактом">
              <span class="bx-shadow" aria-hidden="true"></span>
              <span class="bx-float" aria-hidden="true">
                <img class="bx-img bx-closed" src="img/box/closed.webp" width="560" height="560" alt="" decoding="async" draggable="false">
                <img class="bx-img bx-open" src="img/box/open.webp" width="560" height="560" alt="" decoding="async" draggable="false">
                <span class="bx-pop"></span>
              </span>
              <span class="bx-flash" aria-hidden="true"></span>
            </button>
            <p class="bx-hint">Нажми на коробку</p>
          </div>
          <article class="bx-card" aria-live="polite" hidden></article>
        </div>
        <p class="box-progress">${progress()}</p>
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

  // Кто выскочил из коробки: персонаж типа или, у общих фактов, вопрос с лампочкой
  const popHTML = t => (t
    ? `<span class="bx-who" style="${ui.qStyle(t.quadra)}">${ui.character(t, { sizes: '(min-width: 768px) 220px, 150px', alt: '', eager: true })}</span>`
    : `<span class="bx-who bx-who-gen"><img src="${ui.emoteSrc('question')}" alt="" width="100" height="100"><img src="${ui.emoteSrc('bulb')}" alt="" width="100" height="100"></span>`);

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
          ${t ? `<span class="fc-ava">${ui.character(t, { sizes: ui.CHAR.ava, alt: '' })}</span>
            <span class="fc-name"><b>${t.code} «${esc(t.alias)}»</b><small>${esc(t.role)} · квадра ${q.name}</small></span>`
            : `<span class="fc-ava fc-ava-gen"><img src="${ui.emoteSrc('sparkles')}" alt="" width="100" height="100"></span>
            <span class="fc-name"><b>Соционика</b><small>Факт обо всех 16 типах</small></span>`}
        </div>
        <p class="bx-text fc-text">${esc(f.text)}</p>
        ${reset ? '<p class="bx-reset">Все факты этой колоды уже открыты — перемешали заново.</p>' : ''}
        <div class="fc-share">
          <p class="fc-hook">${t ? 'Узнаёшь кого-то из друзей? Отправь им этот факт' : 'Удиви друзей — отправь им этот факт'}</p>
          ${ui.shareActions({ text: factText(f), url: factUrl(f), primary: 'Поделиться фактом', compact: true })}
        </div>
        <footer class="fc-foot">
          <button class="btn-ghost btn-sm" type="button" data-more>${ui.ICON.cycle}Ещё факт</button>
          ${t ? `<a class="link" href="#/types/${t.id}">Всё про ${t.code}</a>` : '<a class="link" href="#/about">О соционике</a>'}
        </footer>
      </div>`;
  }

  // Символы летают по наклонной орбите: спереди — крупнее и над коробкой, сзади — меньше и за ней
  function orbit(stage) {
    const moons = Array.from(stage.querySelectorAll('.bx-moon'));
    if (!moons.length) return () => {};
    let raf = 0, last = 0, a = 0, visible = true;
    const place = () => {
      const w = stage.clientWidth, R = Math.min(w * 0.42, 300), r = R * 0.36;
      moons.forEach((m, i) => {
        const t = a + i * (Math.PI * 2 / moons.length), d = Math.sin(t);
        const s = 0.7 + 0.3 * (d + 1) / 2;
        m.style.transform = `translate(${(Math.cos(t) * R).toFixed(1)}px, ${(d * r - 6).toFixed(1)}px) scale(${s.toFixed(3)})`;
        m.style.zIndex = d > 0 ? 4 : 1;
        m.style.opacity = (0.55 + 0.45 * (d + 1) / 2).toFixed(2);
      });
    };
    place();
    if (reducedMotion()) return () => {};
    const tick = now => {
      raf = 0;
      if (!visible) return;
      if (last) a += (now - last) * 0.00026;          // ~24 с на круг
      last = now;
      place();
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) { last = 0; raf = requestAnimationFrame(tick); }
    });
    io.observe(stage);
    addEventListener('resize', place);
    return () => { cancelAnimationFrame(raf); io.disconnect(); removeEventListener('resize', place); };
  }

  ui.mountBox = scope => {
    const box = scope.querySelector('[data-box]');
    if (!box) return () => {};
    const btn = box.querySelector('.bx'), card = box.querySelector('.bx-card'), stage = box.querySelector('.box-stage');
    const prog = box.querySelector('.box-progress'), hint = box.querySelector('.bx-hint'), pop = box.querySelector('.bx-pop');
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
      const t = fact.type ? M().type(fact.type) : null;
      // картинку для шера готовим заранее: портрет и символы догрузятся, пока человек читает
      if (t) S.share.portrait(t.id);
      S.share.art();
      hint.hidden = true;
      box.classList.remove('is-open');
      stage.classList.remove('is-open', 'is-lid');
      card.hidden = true;
      pop.innerHTML = popHTML(t);
      box.style.setProperty('--q', t ? `var(--q-${t.quadra})` : '');
      btn.classList.remove('shake');
      void btn.offsetWidth;
      btn.classList.add('shake');
      later(() => stage.classList.add('is-lid'), 420);
      later(() => {
        card.innerHTML = cardHTML(fact, reset);
        card.hidden = false;
        stage.classList.add('is-open');
        box.classList.add('is-open');
        const colors = t ? [S.theme.quadraColor(t.quadra), '#ffffff', '#ffd27a']
          : S.data.quadras.map(q => S.theme.quadraColor(q.id));
        const r = stage.getBoundingClientRect();
        S.fx.confetti(colors, { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height * 0.4) / innerHeight, n: 60 });
        prog.innerHTML = progress();
        const more = card.querySelector('[data-more]');
        if (more && document.documentElement.classList.contains('kbd')) more.focus({ preventScroll: true });
        // на телефоне карточка под коробкой — подводим к ней
        if (innerWidth < 900) {
          const cr = card.getBoundingClientRect();
          if (cr.top > innerHeight * 0.7) card.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
        }
        busy = false;
      }, 900);
    }

    function close(then) {
      stage.classList.remove('is-open', 'is-lid');
      box.classList.remove('is-open');
      later(() => { card.hidden = true; if (then) then(); }, 320);
    }

    btn.addEventListener('click', open);
    card.addEventListener('click', e => { if (e.target.closest('[data-more]')) close(open); });
    const offShare = ui.mountShareActions(card, {
      text: () => factText(current),
      url: () => factUrl(current),
      image: () => S.share.factImage(current),
      name: () => `socio-nik-fact-${current.id}.png`
    });
    const offOrbit = orbit(stage);

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
    return () => { timers.forEach(clearTimeout); offShare(); offOrbit(); };
  };
})(window);
