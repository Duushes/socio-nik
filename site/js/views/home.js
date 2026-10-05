/* Socio-Nik · главная: hero → четыре пары признаков → 16 типов → квадры → калькулятор → mystery box → призыв */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;

  // 8 парящих знаков героя: аспект, квадра-цвет, место (%), глубина параллакса, размер, откуда «прилетает»
  const HERO = [
    { a: 'Ne', q: 'alpha', x: 10, y: 22, d: 1.2, s: 1.0, sx: -260, sy: -160, sr: -50 },
    { a: 'Fe', q: 'beta', x: 86, y: 18, d: 1.0, s: 0.92, sx: 280, sy: -200, sr: 50 },
    { a: 'Ti', q: 'beta', x: 13, y: 72, d: 0.9, s: 0.86, sx: -280, sy: 200, sr: -30 },
    { a: 'Si', q: 'alpha', x: 88, y: 68, d: 0.8, s: 0.82, sx: 240, sy: 160, sr: 30 },
    { a: 'Se', q: 'gamma', x: 27, y: 90, d: 0.6, s: 0.62, sx: -120, sy: 260, sr: 20 },
    { a: 'Ni', q: 'gamma', x: 72, y: 91, d: 0.7, s: 0.66, sx: 140, sy: 280, sr: -24 },
    { a: 'Te', q: 'delta', x: 4, y: 47, d: 0.5, s: 0.56, sx: -320, sy: 0, sr: 60 },
    { a: 'Fi', q: 'delta', x: 96, y: 43, d: 0.55, s: 0.6, sx: 320, sy: -40, sr: -60 }
  ];

  const accent = () => (S.theme.resolved() === 'dark' ? '#2997ff' : '#0071e3');

  function morphArt(kind) {
    const c = accent();
    const g = (id, cls) => `<g class="${cls}">${S.art.toSVG(S.art.glyphOf(id, c))}</g>`;
    if (kind === 'RP') {
      return `<svg class="morph" viewBox="-70 -70 140 140" aria-hidden="true">
        <g class="m-a"><path d="M-56 42 H-28 V14 H0 V-14 H28 V-42 H56" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g class="m-b"><path d="M-58 0 C-44 -46 -26 -46 -14 0 S16 46 30 0 S52 -40 58 -18" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/></g>
      </svg>`;
    }
    const pair = { EI: ['Te', 'Ti'], NS: ['Ne', 'Se'], TF: ['Te', 'Fe'] }[kind];
    return `<svg class="morph" viewBox="-70 -70 140 140" aria-hidden="true">${g(pair[0], 'm-a')}${g(pair[1], 'm-b')}</svg>`;
  }

  const DICH = [
    { k: 'EI', title: 'Экстраверсия или интроверсия', text: 'Куда направлено внимание: на внешний мир и действия — или на отношения и внутренние состояния.', a: 'Плотный знак', b: 'Стеклянный знак' },
    { k: 'NS', title: 'Интуиция или сенсорика', text: 'Что замечаешь первым: возможности и смыслы — или то, что можно увидеть и потрогать.', a: 'Пирамида', b: 'Шар' },
    { k: 'TF', title: 'Логика или этика', text: 'На что опираешься в решениях: на факты и системы — или на чувства и отношения людей.', a: 'Куб', b: 'Уголок' },
    { k: 'RP', title: 'Рациональность или иррациональность', text: 'Как устроена жизнь: по плану и с решениями заранее — или по ситуации, с подстройкой на ходу.', a: 'Ступени', b: 'Волна' }
  ];

  V.home = {
    title: () => 'Соционический тип за 4 минуты',
    render() {
      const mine = S.state.myType();
      const me = mine ? S.core.modelA.type(mine) : null;
      const a = mine || 'ile';
      const b = S.core.modelA.partner(S.core.modelA.type(a), 'dual').id;
      return `
      <section class="hero" data-parallax data-anim>
        <div class="aurora" aria-hidden="true"><i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i></div>
        <div class="hero-glyphs" aria-hidden="true">
          ${HERO.map((g, i) => `<span class="hg" style="--x:${g.x}%;--y:${g.y}%;--d:${g.d};--s:${g.s};--i:${i};--sx:${g.sx}px;--sy:${g.sy}px;--sr:${g.sr}deg">
            <span class="hg-in"><span class="hg-float">${S.art.glyphSVG(g.a, S.theme.quadraColor(g.q), 'hg-svg')}</span></span></span>`).join('')}
        </div>
        <div class="wrap hero-copy">
          <p class="eyebrow reveal">Socio-Nik</p>
          <h1 class="display reveal" style="--i:1">Узнай свой<br><span class="grad">соционический тип.</span></h1>
          <p class="lead reveal" style="--i:2">20 вопросов и около 4 минут. Узнаешь свой тип, квадру и то, как складываются отношения с остальными пятнадцатью типами.</p>
          <div class="cta reveal" style="--i:3">
            <a class="btn btn-lg" href="#/test">Пройти тест</a>
            <a class="link" href="#/about">Что такое соционика</a>
          </div>
          ${me ? `<a class="mine reveal" style="--i:4;${ui.qStyle(me.quadra)}" href="#/result"><i class="qdot" aria-hidden="true"></i>Твой тип — ${me.code} «${esc(me.alias)}»</a>` : ''}
        </div>
        <div class="scroll-cue" aria-hidden="true"><i></i></div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap">
          <p class="eyebrow reveal">Как это устроено</p>
          <h2 class="title reveal">Четыре пары.<br>Шестнадцать типов.</h2>
          <p class="lead reveal">Соционика описывает, какую информацию ты замечаешь первой и как с ней обходишься. Тип складывается из четырёх пар признаков — у каждой свой знак.</p>
          <div class="dich-grid">
            ${DICH.map((d, i) => `
              <article class="card dich reveal" style="--i:${i}" data-morph>
                <div class="dich-art">${morphArt(d.k)}</div>
                <h3>${d.title}</h3>
                <p>${d.text}</p>
                <div class="dich-poles"><span class="pa">${d.a}</span><span class="pb">${d.b}</span></div>
              </article>`).join('')}
          </div>
        </div>
      </section>

      <section class="sec">
        <div class="wrap-wide">
          <div class="wrap-inner">
            <p class="eyebrow reveal">16 типов</p>
            <h2 class="title reveal">Шестнадцать типов.<br>Четыре квадры.</h2>
            <p class="lead reveal">У каждого типа своя эмблема: крупный знак — базовая функция, маленький на орбите — творческая. Цвет — квадра, то есть компания типов с общими ценностями.</p>
          </div>
          ${ui.typesGrid()}
          <p class="more reveal"><a class="link" href="#/types">Все типы подробно</a></p>
        </div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap-wide">
          <div class="wrap-inner">
            <p class="eyebrow reveal">Квадры</p>
            <h2 class="title reveal">Четыре компании<br>с общими ценностями.</h2>
          </div>
          <div class="qgrid">
            ${S.data.quadras.map((q, i) => {
              const c = (S.content.quadras || {})[q.id] || {};
              return `<a class="qcard tilt reveal" style="${ui.qStyle(q.id)};--i:${i}" href="#/quadras#${q.id}">
                <span class="qcard-art" data-anim>${S.art.quadraEmblem(q)}</span>
                <span class="qcard-name">${q.name}</span>
                <span class="qcard-motto">${esc(c.motto || '')}</span>
                <span class="qcard-types">${ui.typesOf(q.id).map(t => t.code).join(' · ')}</span>
                <span class="glare" aria-hidden="true"></span>
              </a>`;
            }).join('')}
          </div>
          <p class="more reveal"><a class="link" href="#/quadras">Подробнее о квадрах</a></p>
        </div>
      </section>

      <section class="sec">
        <div class="wrap">
          <p class="eyebrow reveal">Отношения</p>
          <h2 class="title reveal">Почему с одними легко,<br>а с другими — нет.</h2>
          <p class="lead reveal">Выбери свой тип и тип близкого человека — посмотрим, как устроены ваши отношения.</p>
          <div class="reveal">${ui.calc(a, b)}</div>
          <p class="more reveal"><a class="link" href="#/relations">Все 14 видов отношений</a></p>
        </div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap">
          <p class="eyebrow reveal">Mystery box</p>
          <h2 class="title reveal">Открой коробку.</h2>
          <p class="lead reveal">Внутри — случайный факт об одном из 16 типов или о соционике. Факты не повторяются, пока колода не кончится.</p>
          <div class="reveal">${ui.box()}</div>
        </div>
      </section>

      <section class="sec final">
        <div class="wrap center">
          <h2 class="title reveal">Узнаем твой тип?</h2>
          <p class="lead reveal">20 вопросов, никаких регистраций. Ответы остаются только на этом устройстве.</p>
          <p class="reveal"><a class="btn btn-lg" href="#/test">Пройти тест</a></p>
        </div>
      </section>`;
    },
    mount(root) {
      const offs = [ui.mountCalc(root), ui.mountBox(root)];
      return () => offs.forEach(f => f && f());
    }
  };
})(window);
