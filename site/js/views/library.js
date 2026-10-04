/* Socio-Nik · библиотека (#/library): всё о типах на втором плане — четыре шкалы, 16 типов, квадры,
   калькулятор отношений и mystery box. Раньше это была главная. */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;

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

  // Шкалы — по-человечески и в духе MBTI; буквы кода — в скобках
  const DICH = [
    { k: 'EI', title: 'Экстраверсия — интроверсия', letters: 'E / I', text: 'Куда направлено внимание: на внешний мир и действия — или на отношения и внутренние состояния.', a: 'Плотный знак', b: 'Стеклянный знак' },
    { k: 'NS', title: 'Интуиция — ощущения', letters: 'N / S', text: 'Что замечаешь первым: возможности и смыслы — или то, что можно увидеть и потрогать.', a: 'Пирамида', b: 'Шар' },
    { k: 'TF', title: 'Логика — чувства', letters: 'T / F', text: 'На что опираешься в решениях: на факты и системы — или на чувства и отношения людей.', a: 'Куб', b: 'Уголок' },
    { k: 'RP', title: 'План — импровизация', letters: 'J / P', text: 'Как устроена жизнь: по плану и с решениями заранее — или по ситуации, с подстройкой на ходу.', a: 'Ступени', b: 'Волна' }
  ];

  V.library = {
    needs: ['types'],
    title: () => 'Библиотека',
    render() {
      const a = S.state.myType() || 'iee';
      const b = S.core.modelA.partner(S.core.modelA.type(a), 'dual').id;
      return `
      <section class="sec page-head">
        <div class="wrap">
          <p class="eyebrow reveal">Библиотека</p>
          <h1 class="title reveal">Шестнадцать типов.<br>Четыре шкалы.</h1>
          <p class="lead reveal">Всё о типах личности: шкалы, из которых складывается код, описания шестнадцати типов, квадры и отношения между типами. Коды — как в MBTI, глубина — из соционики.</p>
          <div class="dich-grid">
            ${DICH.map((d, i) => `
              <article class="card dich reveal" style="--i:${i}" data-morph>
                <div class="dich-art">${morphArt(d.k)}</div>
                <h3>${d.title} <span class="dich-letters">${d.letters}</span></h3>
                <p>${d.text}</p>
                <div class="dich-poles"><span class="pa">${d.a}</span><span class="pb">${d.b}</span></div>
              </article>`).join('')}
          </div>
        </div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap-wide">
          <div class="wrap-inner">
            <p class="eyebrow reveal">16 типов</p>
            <h2 class="title reveal">Шестнадцать типов.<br>Четыре квадры.</h2>
            <p class="lead reveal">У каждого типа своя эмблема: крупный знак — главная функция, маленький на орбите — творческая. Цвет — квадра, то есть компания типов с общими ценностями.</p>
          </div>
          ${ui.typesGrid()}
          <p class="more reveal"><a class="link" href="#/types">Все типы подробно</a></p>
        </div>
      </section>

      <section class="sec">
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
                <span class="qcard-types">${ui.typesOf(q.id).map(t => t.mbti).join(' · ')}</span>
                <span class="glare" aria-hidden="true"></span>
              </a>`;
            }).join('')}
          </div>
          <p class="more reveal"><a class="link" href="#/quadras">Подробнее о квадрах</a></p>
        </div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap">
          <p class="eyebrow reveal">Отношения</p>
          <h2 class="title reveal">Почему с одними легко,<br>а с другими — нет.</h2>
          <p class="lead reveal">Выбери два типа — покажем, как устроены отношения. Для своей пары лучше пройти тест вдвоём: так разбор будет по вашим настоящим ответам.</p>
          <div class="reveal">${ui.calc(a, b)}</div>
          <p class="more reveal"><a class="link" href="#/relations">Все виды отношений</a></p>
        </div>
      </section>

      <section class="sec">
        <div class="wrap">
          <p class="eyebrow reveal">Mystery box</p>
          <h2 class="title reveal">Открой коробку.</h2>
          <p class="lead reveal">Внутри — случайный факт об одном из 16 типов или о соционике. Факты не повторяются, пока колода не кончится.</p>
          <div class="reveal">${ui.box()}</div>
        </div>
      </section>`;
    },
    mount(root) {
      const offs = [ui.mountCalc(root), ui.mountBox(root)];
      return () => offs.forEach(f => f && f());
    }
  };
})(window);
