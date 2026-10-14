/* Socio-Nik · главная. Новому человеку: герой «Привет, кто ты?» с тайным типом — силуэтом с «?» вместо лица
   (твой тип пока скрыт, тест его откроет), лента 16 типов, «Соционика», белая «Что внутри», стопка квадр.
   После теста страница подстраивается под тип: «Привет, Драйзер», твой персонаж и три шага — про тип, твои
   отношения (три строки «легко / ровно / непросто» прямо тут), поделиться картинкой; дальше факты про твой тип, лента с отметкой «ты»
   и квадры, начиная с твоей. Шапка — общая для всех страниц (index.html). */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;
  const M = () => S.core.modelA;
  const NB = '\u00A0';

  let introDone = false;
  const mineType = () => (S.state.myType() ? M().type(S.state.myType()) : null);
  // После теста герой — твой тип; до теста — тайный тип (data-hero="mystery", так же решает скрипт в <head>)
  const heroType = () => {
    const mine = mineType();
    document.documentElement.dataset.hero = mine ? mine.id : 'mystery';
    // для скрипта в <head>: в следующий раз сразу предзагрузит твой портрет
    if (mine && !S.state.demo && S.store.get('mine', null) !== mine.id) S.store.set('mine', mine.id);
    return mine;
  };

  const traits = t => (S.content.traits && S.content.traits[t.id]) || [];
  const chips = list => list.map((x, i) => `<li style="--k:${i}">${esc(x)}</li>`).join('');
  // Тайный тип: вокруг силуэта — то, что откроется после теста
  const TEASE = ['Твоя суперсила', `С${NB}кем тебе легко`, 'Звёзды похожего типа'];

  // ---------- герой ----------
  // t — твой тип после теста; без него — тайный тип
  function hero(t) {
    const intro = !introDone && !S.dom.reducedMotion();
    const pct = t ? S.core.scoring.result(S.state.result()).top.pct : 0;
    const items = t ? traits(t) : TEASE;
    const about = t ? 'Коротко о типе' : 'Что узнаешь после теста';
    return `
      <section class="hero${intro ? ' intro' : ''}${t ? ' hero-me' : ' hero-mystery'}" data-hero${t ? ` style="${ui.qStyle(t.quadra)}"` : ''}>
        <h1 class="hero-title display h-in" style="--d:.15s;--y:40px" data-fit data-min="12" data-max="17.5" data-maxh="21">
          <span class="fit-in"><span class="fit-line"><span class="sv">Привет,</span></span> <span class="fit-line"><span class="sv hero-name" data-hero-name>${t ? esc(ui.short(t)) : `кто${NB}ты?`}</span></span></span>
        </h1>
        <div class="hero-char h-in" style="--d:.6s;--y:30px">
          <div class="hero-magnet" data-magnet><div class="hero-mag"><div class="hero-look">
            <div class="hero-fig">${t ? ui.character(t, { sizes: ui.CHAR.hero, eager: true }) : `${ui.mysteryChar({ sizes: ui.CHAR.hero, eager: true })}<span class="hero-mark" aria-hidden="true">?</span>`}</div>
          </div></div></div>
          <p class="hero-bubble" aria-hidden="true" data-hero-bubble>${t ? 'Покажи друзьям, кто ты!' : `Найди меня за${NB}4${NB}минуты!`}</p>
          <span class="hero-sparks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
          <ul class="hero-traits" aria-label="${about}" data-hero-traits data-anim>${chips(items)}</ul>
        </div>
        <div class="hero-foot">
          <ul class="hero-traits-m h-in" style="--d:.35s;--y:20px" aria-label="${about}" data-hero-traits>${chips(items)}</ul>
          <div class="hero-ask h-in" style="--d:.3s;--y:20px">
            ${t ? `<p class="hero-q">Ты${NB}— ${esc(t.role.toLowerCase())}</p>
            <p class="hero-cap">${esc(ui.content(t.id).tagline || '')}</p>
            <a class="hero-meta" href="#/result">${t.code} «${esc(t.alias)}» · совпадение ${pct}${NB}%</a>`
            : `<p class="hero-q" data-hero-q>16${NB}типов. Один${NB}—${NB}твой</p>
            <p class="hero-cap" data-hero-cap>Ответь на${NB}вопросы, и${NB}силуэт оживёт: увидишь свой тип, в${NB}чём твоя сила и${NB}с${NB}кем тебе легко</p>`}
          </div>
          <div class="hero-right">
            ${t ? `<nav class="hero-steps h-in" style="--d:.45s;--y:20px" aria-label="Что дальше">
              <a href="#/types/${t.id}">Про мой тип</a><a href="#/#rel">Мои отношения</a><a href="#/test" data-restart-test>Пройти заново</a>
            </nav>` : ''}
            <div class="hero-actions h-in" style="--d:.5s;--y:20px">
              ${t ? '<a class="btn hero-cta" href="#/#share" data-cheer>Поделиться результатом</a>' : '<a class="btn hero-cta" href="#/test" data-cheer>Узнать свой тип</a>'}
            </div>
            ${t ? '' : `<p class="hero-micro h-in" style="--d:.55s;--y:12px">20${NB}вопросов · 4${NB}минуты · без${NB}регистрации</p>`}
          </div>
        </div>
      </section>`;
  }

  // Персонаж стоит под заголовком и закрывает нижнюю часть букв имени; ширина до 340 (телефон, в пределах полей) / 360 / 440 / 520.
  // Если места больше, чем нужно персонажу, заголовок опускается к нему — наложение остаётся одинаковым.
  // Тайный тип тёмный и прятал бы буквы, поэтому при нехватке места он не поднимается на заголовок, а уходит
  // низом под подвал героя: над подвалом остаются голова и плечи, ниже силуэт и так растворяется в фоне.
  function layoutHero(el) {
    const title = el.querySelector('.hero-title'), name = title.querySelector('.fit-line:last-child');
    const fig = el.querySelector('.hero-char'), foot = el.querySelector('.hero-foot');
    title.style.marginTop = '';
    const W = innerWidth, phone = W < 640, wide = W >= 1024;
    const gut = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 20;
    // на телефоне персонаж растёт, если внизу героя мало элементов (после теста) и есть место по высоте
    const maxW = wide ? 520 : W >= 768 ? 440 : phone ? Math.min(340, W - 2 * gut) : 360;
    const minW = Math.round(maxW * 0.62);
    // offsetTop, а не getBoundingClientRect: на него не влияет анимация появления
    const cs = getComputedStyle(title), fs = parseFloat(cs.fontSize);
    const lh = parseFloat(cs.lineHeight) / fs || 0.88;
    const base = title.offsetTop + name.offsetTop + fs * (lh / 2 + 0.3585);   // базовая линия имени (метрики Montserrat)
    const top0 = base - 0.7 * fs * 0.36;                                      // макушка закрывает ~треть высоты букв
    const limit = wide ? el.offsetHeight : foot.offsetTop - (phone ? 10 : 0);
    const mystery = !wide && el.classList.contains('hero-mystery');   // на широком подвал героя и так внизу, поверх
    const room = (limit - top0) * (mystery ? 1 / (0.55 * 1.25) : 0.8);   // тайному типу хватает места на голову и плечи
    const w = Math.max(minW, Math.min(maxW, room)), h = w * 1.25;
    let shift = Math.max(0, limit - top0 - h);
    if (phone) shift /= 2;
    let top = top0 + shift;
    if (top + h > limit && !mystery) top = limit - h;
    title.style.marginTop = shift ? `calc(var(--title-mt) + ${shift.toFixed(1)}px)` : '';
    fig.style.top = top.toFixed(1) + 'px';
    fig.style.width = w.toFixed(1) + 'px';
    el.style.setProperty('--side', Math.max(180, (W - w) / 2 - 24 - parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter'))).toFixed(0) + 'px');
    el.classList.add('laid');
    // плавающие черты: держим в пределах экрана
    el.querySelectorAll('.hero-traits li').forEach(li => {
      li.style.setProperty('--dx', '0px');
      const r = li.getBoundingClientRect();
      const dx = r.left < gut ? gut - r.left : r.right > W - gut ? W - gut - r.right : 0;
      li.style.setProperty('--dx', dx.toFixed(1) + 'px');
    });
  }

  function mountHero(root) {
    const el = root.querySelector('[data-hero]');
    if (!el) return () => {};
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, S.dom.reducedMotion() ? 0 : ms));
    const layout = () => layoutHero(el);
    el.addEventListener('fitted', layout);
    addEventListener('resize', layout);
    if (el.classList.contains('intro')) later(() => { introDone = true; el.classList.remove('intro'); }, 1400);
    else introDone = true;

    const onClick = e => { if (e.target.closest('[data-restart-test]')) S.store.del('test'); };
    el.addEventListener('click', onClick);

    // Наведение на главную кнопку: персонаж радуется (тайный тип — подпрыгивает и качает «?»)
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
      clearTimeout(cheerT);
      removeEventListener('resize', layout);
      timers.forEach(clearTimeout);
    };
  }

  // ---------- лента 16 типов ----------
  function marquee() {
    const qs = S.data.quadras;
    const rows = [[qs[0], qs[1]], [qs[2], qs[3]]].map(pair => pair.flatMap(q => ui.typesOf(q.id)));
    const mine = S.state.myType();
    const tile = (t, live) => `<a class="mq-tile${t.id === mine ? ' is-you' : ''}" href="#/types/${t.id}" style="${ui.qStyle(t.quadra)}"${live ? '' : ' tabindex="-1"'}>
        ${t.id === mine ? '<span class="mq-you">Ты</span>' : ''}<span class="mq-text"><span class="mq-code">${t.code}</span><span class="mq-alias">${esc(t.alias)}</span><span class="mq-role">${esc(t.role)} · ${ui.quadra(t.quadra).name}</span></span>
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
        ${CORNERS.map(([a, q, pos, sx, sy], i) => `<span class="soc-g soc-${pos} reveal" data-anim style="--fx:${sx * 90}px;--fy:${sy * 30}px;--d:${(i * 0.08).toFixed(2)}s" aria-hidden="true"><span class="soc-float">${S.art.aspectImg(a, q, 'soc-img', { sizes: '(max-width: 600px) 96px, (min-width: 1563px) 250px, 16vw' })}</span></span>`).join('')}
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
  ui.quadraCard = (q, i, { n = i, mine = false } = {}) => {
    const qc = (S.content.quadras || {})[q.id] || {};
    return `
      <div class="stack-item" style="--i:${i}">
        <article class="stack-card" style="${ui.qStyle(q.id)}" aria-labelledby="qc-${q.id}">
          <header class="qc-head">
            <span class="qc-num" aria-hidden="true">0${n + 1}</span>
            <div class="qc-titles">
              <p class="qc-kicker caption" id="qc-${q.id}">Квадра · ${q.name}${mine ? '<span class="qc-you">Твоя квадра</span>' : ''}</p>
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
  // first — квадра, которую показать первой (после теста — своя)
  ui.quadraStack = (first = null) => {
    const qs = S.data.quadras.map((q, n) => ({ q, n }));
    if (first) qs.sort((a, b) => (b.q.id === first) - (a.q.id === first));
    return `<div class="stack wrap" data-stack>${qs.map(({ q, n }, i) => ui.quadraCard(q, i, { n, mine: q.id === first })).join('')}</div>`;
  };

  function quadras(mine) {
    return `
      <section class="sec qs-sec">
        <div class="wrap sec-head">
          <h2 class="h2 reveal"><span class="sv">Квадры</span></h2>
          <p class="lead reveal">${mine ? `Твоя квадра${NB}— ${ui.quadra(mine.quadra).name}: здесь ценят то${NB}же, что и${NB}ты. Остальные три${NB}— ниже.` : `Четыре компании по${NB}ценностям. В${NB}своей квадре человеку проще всего: там ценят то${NB}же, что и${NB}он.`}</p>
        </div>
        ${ui.quadraStack(mine ? mine.quadra : null)}
      </section>`;
  }

  // ---------- после теста: всё про тебя ----------
  function yours(t) {
    return `
      <section class="sec rm-sec" id="rel">
        <div class="wrap">
          <div class="rm-head">
            <h2 class="h2 reveal"><span class="sv">С${NB}кем тебе легко</span></h2>
            <p class="rm-sub reveal">Нажми на${NB}тип${NB}— увидишь, как вы ладите.</p>
          </div>
          ${ui.relMap(t, { uid: 'rmh' })}
        </div>
      </section>
      ${ui.resultShare(S.state.result(), { title: 'Покажи друзьям, кто ты' })}
      <section class="sec sec-line home-box">
        <div class="wrap center">
          <h2 class="h2 h2-sm reveal"><span class="sv">Факты про ${t.code}</span></h2>
          <p class="lead sec-sub reveal">Открой коробку${NB}— внутри факт про твой тип. Узнаешь себя${NB}— отправь друзьям.</p>
          <div class="reveal">${ui.box({ typeId: t.id, compact: true })}</div>
        </div>
      </section>`;
  }

  V.home = {
    render: () => {
      const mine = mineType();
      return mine
        ? hero(heroType()) + yours(mine) + marquee() + quadras(mine)
        : hero(heroType()) + marquee() + socionics() + inside() + quadras(null);
    },
    mount: root => {
      const offs = [mountHero(root)];
      if (mineType()) {
        offs.push(ui.mountRelMap(root.querySelector('#rel')));
        offs.push(ui.mountResultShare(root, S.state.result()));
        offs.push(ui.mountBox(root.querySelector('.home-box')));
      }
      return () => offs.forEach(f => f && f());
    }
  };
})(window);
