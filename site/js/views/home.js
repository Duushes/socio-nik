/* Socio-Nik · главная: герой «Привет, я …» с персонажем, лента 16 типов, «Соционика»,
   белая «Что внутри», стопка квадр */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;
  const M = () => S.core.modelA;
  const NB = '\u00A0';

  let introDone = false;
  const heroType = () => M().type(document.documentElement.dataset.hero) || M().type('iee');

  const mineType = () => (S.state.myType() ? M().type(S.state.myType()) : null);
  // Вопрос-крючок под приветствием: личный вопрос рядом с кнопкой — главный рычаг перехода в тест
  function ask(t) {
    const mine = mineType();
    if (mine && mine.id === t.id) return 'Это твой тип!';
    if (mine) return `Твой тип — ${ui.short(mine)}. А${NB}у${NB}друзей?`;
    return `А${NB}какой тип у${NB}тебя?`;
  }
  function caption(t) {
    const mine = mineType();
    if (mine && mine.id === t.id) return `Посмотри, с${NB}кем тебе легко, и${NB}позови друзей пройти тест`;
    if (mine) return `${t.alias} — так в${NB}соционике называют тип${NB}${t.code}. Сравни свой тип с${NB}типами друзей`;
    return `${t.alias} — так в${NB}соционике называют тип${NB}${t.code}. Узнай свой и${NB}с${NB}кем тебе легко`;
  }
  const cheer = t => (S.content.cheers && S.content.cheers[t.id]) || 'Давай узнаем твой тип!';

  const traits = t => (S.content.traits && S.content.traits[t.id]) || [];
  const traitItems = t => traits(t).map((x, i) => `<li style="--k:${i}">${esc(x)}</li>`).join('');

  // ---------- герой ----------
  function hero(t) {
    const mine = mineType();
    const intro = !introDone && !S.dom.reducedMotion();
    return `
      <section class="hero${intro ? ' intro' : ''}" data-hero style="${ui.qStyle(t.quadra)}">
        <nav class="hero-menu h-in" style="--d:0s;--y:-20px" aria-label="Разделы">
          <a href="#/test">Тест</a><a href="#/types">Типы</a><a href="#/relations">Отношения</a><a href="#/about">О${NB}соционике</a>
        </nav>
        <h1 class="hero-title display h-in" style="--d:.15s;--y:40px" data-fit data-min="12" data-max="17.5" data-maxh="21">
          <span class="fit-in"><span class="fit-line"><span class="sv">Привет, я</span></span> <span class="fit-line"><span class="sv hero-name" data-hero-name>${esc(ui.short(t))}</span></span></span>
        </h1>
        <div class="hero-char h-in" style="--d:.6s;--y:30px">
          <div class="hero-magnet" data-magnet><div class="hero-mag"><div class="hero-look">
            <div class="hero-fig" data-hero-next>${ui.character(t, { sizes: ui.CHAR.hero, eager: true })}</div>
          </div></div></div>
          <p class="hero-bubble" aria-hidden="true" data-hero-bubble>${esc(cheer(t))}</p>
          <span class="hero-sparks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
          <ul class="hero-traits" aria-label="Коротко о типе" data-hero-traits data-anim>${traitItems(t)}</ul>
        </div>
        <div class="hero-foot">
          <ul class="hero-traits-m h-in" style="--d:.35s;--y:20px" aria-label="Коротко о типе" data-hero-traits>${traitItems(t)}</ul>
          <div class="hero-ask h-in" style="--d:.3s;--y:20px">
            <p class="hero-q${mine && mine.id !== t.id ? ' long' : ''}" data-hero-q>${esc(ask(t))}</p>
            <p class="hero-cap" data-hero-cap>${esc(caption(t))}</p>
          </div>
          <div class="hero-right">
          ${mine ? `<nav class="hero-steps h-in" style="--d:.45s;--y:20px" aria-label="Что дальше">
            <a href="#/types/${mine.id}">Про мой тип</a><a href="#/types/${mine.id}#relations">Мои отношения</a><a href="#/result#share">Поделиться</a><a href="#/test" data-restart-test>Пройти заново</a>
          </nav>` : ''}
          <div class="hero-actions h-in" style="--d:.5s;--y:20px">
            <button class="btn-ghost hero-next" type="button" data-hero-next title="Другой тип"><span class="hero-next-l">Другой тип</span>${ui.ICON.cycle}</button>
            ${mine ? '<a class="btn hero-cta" href="#/result" data-cheer>Мой результат</a>' : '<a class="btn hero-cta" href="#/test" data-cheer>Узнать свой тип</a>'}
          </div>
          ${mine ? '' : `<p class="hero-micro h-in" style="--d:.55s;--y:12px">20${NB}вопросов · 4${NB}минуты · без регистрации</p>`}
          </div>
        </div>
      </section>`;
  }

  // Персонаж стоит под заголовком и закрывает нижнюю часть букв имени; ширина 280 / 360 / 440 / 520.
  // Если места больше, чем нужно персонажу, заголовок опускается к нему — наложение остаётся одинаковым.
  function layoutHero(el) {
    const title = el.querySelector('.hero-title'), name = title.querySelector('.fit-line:last-child');
    const fig = el.querySelector('.hero-char'), foot = el.querySelector('.hero-foot');
    title.style.marginTop = '';
    const W = innerWidth, phone = W < 640, wide = W >= 1024;
    const maxW = wide ? 520 : W >= 768 ? 440 : phone ? 280 : 360;
    const minW = Math.round(maxW * 0.62);
    // offsetTop, а не getBoundingClientRect: на него не влияет анимация появления
    const cs = getComputedStyle(title), fs = parseFloat(cs.fontSize);
    const lh = parseFloat(cs.lineHeight) / fs || 0.88;
    const base = title.offsetTop + name.offsetTop + fs * (lh / 2 + 0.3585);   // базовая линия имени (метрики Montserrat)
    const top0 = base - 0.7 * fs * 0.36;                                      // макушка закрывает ~треть высоты букв
    const limit = wide ? el.offsetHeight : foot.offsetTop - (phone ? 10 : 0);
    const w = Math.max(minW, Math.min(maxW, (limit - top0) * 0.8)), h = w * 1.25;
    let shift = Math.max(0, limit - top0 - h);
    if (phone) shift /= 2;
    let top = top0 + shift;
    if (top + h > limit) top = limit - h;
    title.style.marginTop = shift ? `calc(var(--title-mt) + ${shift.toFixed(1)}px)` : '';
    fig.style.top = top.toFixed(1) + 'px';
    fig.style.width = w.toFixed(1) + 'px';
    el.style.setProperty('--side', Math.max(180, (W - w) / 2 - 24 - parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter'))).toFixed(0) + 'px');
    el.classList.add('laid');
    // плавающие черты: держим в пределах экрана
    const gut = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 20;
    el.querySelectorAll('.hero-traits li').forEach(li => {
      li.style.setProperty('--dx', '0px');
      const r = li.getBoundingClientRect();
      const dx = r.left < gut ? gut - r.left : r.right > W - gut ? W - gut - r.right : 0;
      li.style.setProperty('--dx', dx.toFixed(1) + 'px');
    });
  }

  // Колода без повторов: следующий персонаж — случайный, пока не покажем всех
  let deck = [];
  function nextType(cur) {
    if (!deck.length) deck = S.data.types.map(t => t.id).filter(id => id !== cur).sort(() => Math.random() - 0.5);
    return M().type(deck.shift());
  }
  function prefetch(t) {
    const img = new Image();
    img.dataset.id = t.id;
    img.sizes = ui.CHAR.hero;
    img.srcset = ui.charSrc(t).srcset;
    img.src = ui.charSrc(t).src;
    return img;
  }

  function mountHero(root) {
    const el = root.querySelector('[data-hero]');
    if (!el) return () => {};
    const de = document.documentElement, timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, S.dom.reducedMotion() ? 0 : ms));
    const title = el.querySelector('.hero-title'), figEl = el.querySelector('.hero-fig');
    const nameEl = el.querySelector('[data-hero-name]'), capEl = el.querySelector('[data-hero-cap]'), qEl = el.querySelector('[data-hero-q]');
    const traitEls = Array.from(el.querySelectorAll('[data-hero-traits]'));
    const bubble = el.querySelector('[data-hero-bubble]'), look = el.querySelector('.hero-look');
    const layout = () => layoutHero(el);
    el.addEventListener('fitted', layout);
    addEventListener('resize', layout);
    if (el.classList.contains('intro')) later(() => { introDone = true; el.classList.remove('intro'); }, 1400);
    else introDone = true;

    // шапка спрятана, пока на экране меню героя
    const menu = el.querySelector('.hero-menu');
    const io = new IntersectionObserver(([e]) => de.classList.toggle('hero-on', e.isIntersecting));
    io.observe(menu);

    let queued = prefetch(nextType(de.dataset.hero)), busy = false;
    const swap = () => {
      if (busy) return;
      busy = true;
      const img = queued, next = M().type(img.dataset.id);
      const ready = img.decode ? img.decode().catch(() => {}) : Promise.resolve();
      figEl.classList.add('is-out');
      [title, capEl, qEl, ...traitEls].forEach(x => x.classList.add('is-fading'));
      Promise.all([ready, new Promise(r => later(r, 160))]).then(() => {
        de.dataset.hero = next.id;
        S.store.set('hero', next.id);
        const pic = figEl.querySelector('img'), src = ui.charSrc(next);
        pic.srcset = src.srcset;
        pic.src = src.src;
        pic.alt = `Персонаж типа ${next.code} «${next.alias}»`;
        nameEl.textContent = ui.short(next);
        capEl.textContent = caption(next);
        qEl.textContent = ask(next);
        traitEls.forEach(ul => { ul.innerHTML = traitItems(next); });
        bubble.textContent = cheer(next);
        el.style.setProperty('--q', `var(--q-${next.quadra})`);
        S.fx.fit(title);
        figEl.classList.remove('is-out');
        [title, capEl, qEl, ...traitEls].forEach(x => x.classList.remove('is-fading'));
        queued = prefetch(nextType(next.id));
        later(() => { busy = false; }, 160);
      });
    };
    const onClick = e => {
      if (e.target.closest('[data-hero-next]')) swap();
      if (e.target.closest('[data-restart-test]')) S.store.del('test');
    };
    el.addEventListener('click', onClick);

    // Персонаж поворачивается к курсору (мышь, не в щадящем режиме)
    let raf = 0, px = 0, py = 0;
    const look2 = () => {
      raf = 0;
      const r = look.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * 0.35;
      const dx = Math.max(-1, Math.min(1, (px - cx) / (innerWidth * 0.5))), dy = Math.max(-1, Math.min(1, (py - cy) / (innerHeight * 0.6)));
      look.style.setProperty('--ry', (dx * 16).toFixed(2) + 'deg');
      look.style.setProperty('--rx', (-dy * 9).toFixed(2) + 'deg');
    };
    const onMove = e => { if (e.pointerType !== 'mouse') return; px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(look2); };
    const follow = !S.dom.reducedMotion() && S.fx.fineMouse();
    if (follow) addEventListener('pointermove', onMove, { passive: true });

    // Наведение на главную кнопку или значок: персонаж радуется и подбадривает
    let cheerT = 0;
    const cheerOn = () => { clearTimeout(cheerT); el.classList.add('cheer'); };
    const cheerOff = () => { clearTimeout(cheerT); cheerT = setTimeout(() => el.classList.remove('cheer'), 350); };
    const enter = e => { if (e.target.closest && e.target.closest('[data-cheer]')) cheerOn(); };
    const leave = e => { const c = e.target.closest && e.target.closest('[data-cheer]'); if (c && !(e.relatedTarget && c.contains(e.relatedTarget))) cheerOff(); };
    el.addEventListener('pointerover', enter);
    el.addEventListener('pointerout', leave);
    el.addEventListener('focusin', enter);
    el.addEventListener('focusout', leave);
    // на телефоне наведения нет — один раз подбадривает сам после появления
    if (!S.fx.fineMouse()) later(() => { cheerOn(); later(cheerOff, 3600); }, 2400);

    return () => {
      removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
      clearTimeout(cheerT);
      io.disconnect();
      de.classList.remove('hero-on');
      removeEventListener('resize', layout);
      timers.forEach(clearTimeout);
    };
  }

  // ---------- лента 16 типов ----------
  function marquee() {
    const qs = S.data.quadras;
    const rows = [[qs[0], qs[1]], [qs[2], qs[3]]].map(pair => pair.flatMap(q => ui.typesOf(q.id)));
    const tile = (t, live) => `<a class="mq-tile" href="#/types/${t.id}" style="${ui.qStyle(t.quadra)}"${live ? '' : ' tabindex="-1"'}>
        <span class="mq-text"><span class="mq-code">${t.code}</span><span class="mq-alias">${esc(t.alias)}</span><span class="mq-role">${esc(t.role)} · ${ui.quadra(t.quadra).name}</span></span>
        ${ui.character(t, { sizes: ui.CHAR.tile, alt: '', cls: 'mq-img' })}
      </a>`;
    const copy = (row, live) => `<div class="mq-copy"${live ? '' : ' inert aria-hidden="true"'}>${row.map(t => tile(t, live)).join('')}</div>`;
    return `
      <section class="mq-sec" data-marquee aria-labelledby="mq-h">
        <div class="wrap mq-head reveal">
          <h2 class="caption" id="mq-h">16 типов · 4 квадры</h2>
          <a class="link" href="#/types">Все типы</a>
        </div>
        ${rows.map(row => `<div class="mq-row"><div class="mq-track">${copy(row, false)}${copy(row, true)}${copy(row, false)}</div></div>`).join('')}
      </section>`;
  }

  // ---------- «Соционика»: четыре стихии по углам и текст, который проявляется по буквам ----------
  const CORNERS = [['Se', 'beta', 'tl', -1, -1], ['Ni', 'gamma', 'tr', 1, -1], ['Ti', 'alpha', 'bl', -1, 1], ['Fe', 'delta', 'br', 1, 1]];
  function socionics() {
    return `
      <section class="sec soc-sec">
        ${CORNERS.map(([a, q, pos, sx, sy], i) => `<span class="soc-g soc-${pos} reveal" data-anim style="--fx:${sx * 90}px;--fy:${sy * 30}px;--d:${(i * 0.08).toFixed(2)}s" aria-hidden="true"><span class="soc-float">${S.art.aspectImg(a, q, 'soc-img')}</span></span>`).join('')}
        <div class="wrap center soc-in">
          <h2 class="h2 soc-h" data-anim-text>Соционика</h2>
          <p class="soc-text" data-anim-text>Соционика описывает 16${NB}типов: как человек замечает мир, принимает решения и${NB}с${NB}кем ему легко. Это не${NB}диагноз и${NB}не${NB}гороскоп, а${NB}язык, на${NB}котором проще понимать себя и${NB}близких. Двадцать вопросов — и${NB}узнаешь свой тип.</p>
          <p class="reveal"><a class="btn" href="#/test">Пройти тест</a></p>
        </div>
      </section>`;
  }

  // ---------- «Что внутри» ----------
  const INSIDE = [
    ['Твой тип', 'Код из трёх букв и вероятность по всем 16 типам', '#/test'],
    ['Модель А', 'Восемь функций: чем живёшь, что даётся легко, где нужна поддержка', '#/types'],
    ['Квадра', 'Компания, в которой проще всего быть собой', '#/quadras'],
    ['Отношения', '14 видов: с кем легко, с кем искрит и как договориться', '#/relations'],
    ['Mystery box', 'Случайные факты о типах', '#/box']
  ];
  function inside() {
    return `
      <section class="sec sec-white">
        <div class="wrap">
          <h2 class="h2 reveal sec-head">Что внутри</h2>
          <ol class="numlist">${INSIDE.map(([title, text, href], i) => `
            <li class="reveal"><a class="nl-row" href="${href}">
              <span class="nl-num" aria-hidden="true">0${i + 1}</span>
              <span class="nl-body"><span class="nl-title">${esc(title)}</span><span class="nl-text">${esc(text)}</span></span>
              <span class="nl-go" aria-hidden="true">${ui.ICON.arrow}</span>
            </a></li>`).join('')}
          </ol>
        </div>
      </section>`;
  }

  // ---------- стопка квадр ----------
  ui.quadraCard = (q, i) => {
    const qc = (S.content.quadras || {})[q.id] || {};
    return `
      <div class="stack-item" style="--i:${i}">
        <article class="stack-card" style="${ui.qStyle(q.id)}" aria-labelledby="qc-${q.id}">
          <header class="qc-head">
            <span class="qc-num" aria-hidden="true">0${i + 1}</span>
            <div class="qc-titles">
              <p class="qc-kicker caption" id="qc-${q.id}">Квадра · ${q.name}</p>
              <p class="qc-motto">${esc(qc.motto || '')}</p>
            </div>
            <a class="btn-ghost btn-sm qc-go" href="#/quadras#${q.id}">Смотреть квадру</a>
          </header>
          <div class="qc-grid">
            <div class="qc-left">
              <div class="qc-em" data-anim>${S.art.quadraEmblem(q)}</div>
              <div class="qc-vals"><p class="caption">Ценит</p>
                <ul>${q.values.map(v => `<li>${S.art.symbol(v)}<span>${esc(S.data.aspects[v].name)}</span></li>`).join('')}</ul>
              </div>
            </div>
            <ul class="qc-types">${ui.typesOf(q.id).map(t => `
              <li><a class="qc-type" href="#/types/${t.id}">
                <span class="qc-art">${ui.character(t, { sizes: ui.CHAR.tile, alt: '' })}</span>
                <span class="qc-code">${t.code}</span><span class="qc-alias">${esc(t.alias)}</span>
              </a></li>`).join('')}</ul>
          </div>
        </article>
      </div>`;
  };
  ui.quadraStack = () => `<div class="stack wrap" data-stack>${S.data.quadras.map(ui.quadraCard).join('')}</div>`;

  function quadras() {
    return `
      <section class="sec qs-sec">
        <div class="wrap sec-head">
          <h2 class="h2 reveal"><span class="sv">Квадры</span></h2>
          <p class="lead reveal">Четыре компании по${NB}ценностям. В${NB}своей квадре человеку проще всего: там ценят то${NB}же, что и${NB}он.</p>
        </div>
        ${ui.quadraStack()}
      </section>`;
  }

  V.home = {
    render: () => hero(heroType()) + marquee() + socionics() + inside() + quadras(),
    mount: root => mountHero(root)
  };
})(window);
