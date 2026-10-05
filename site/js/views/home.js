/* Socio-Nik · главная — посадочная для пар.
   Первый экран: слева обещание и две кнопки, справа живая карта пары-примера (она и есть «движение-рассказ»:
   круги встречаются, фишки разлетаются к тому, кто ведёт сферу). Дальше: узнаваемые ситуации, что будет
   (шаги и «бесплатно / в разборе»), почему не таблица совместимости, первый шаг и библиотека на втором плане.
   Надзаголовков, нумерации и декоративных знаков нет: смысл несут заголовки и сама карта. */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;
  const M = () => S.core.modelA;
  const P = () => (S.content && S.content.pair) || {};
  const enc = axes => S.core.payload.encode(axes);

  // Узнаваемые ситуации: разница типов в быту, без «кто прав»
  const SCENES = [
    'Ты бронируешь отпуск в феврале, партнёр — за два дня до вылета.',
    'Один хочет обсудить ссору сразу, второй — остыть до утра.',
    'Ты считаешь бюджет до рубля, а партнёр считает, что деньги нужны для радости.'
  ];

  const STEPS = [
    ['Пройти тест', '20 вопросов, около 4 минут. Узнаешь свой тип из шестнадцати, с кодом MBTI.'],
    ['Позвать партнёра', 'По ссылке у себя или на твоём телефоне, по очереди. Ответы не смешаются.'],
    ['Увидеть вашу пару', 'Вид отношений, как вы устроены и один совет. Сразу и бесплатно.']
  ];
  const FREE = ['Ваши типы и вид отношений', 'Как вы устроены и один совет', 'Одна сфера на карте пары', 'Картинка пары для сторис'];
  const PAID = ['Все 8 сфер: кто что ведёт', 'Пять договорённостей на неделю', 'Как мириться: три фразы', 'Ритуал и вопросы на вечер'];

  const DEMO = ['iee', 'sei'];   // ENFP и ISFP: «почти дополнение» — на карте видны три группы зон

  V.home = {
    title: () => 'Совместимость пары по 16 типам личности',
    render() {
      const mine = S.state.result(), me = mine ? M().type(S.state.myType()) : null;
      const p = S.core.couple.partner();
      const saved = mine && p ? `#/pair/${enc(mine)}/${p.code}` : '';
      const pt = p ? S.core.couple.side(p.code) : null;
      const [da, db] = DEMO.map(id => M().type(id));
      const dr = M().relation(da, db), title = (P().titles || {})[dr.id] || '';
      const demoHref = `#/pair/${da.mbti.toLowerCase()}/${db.mbti.toLowerCase()}`;
      // «Позвать по ссылке» без своего результата ведёт в тест: ссылку для партнёра дадим сразу после него
      const invite = mine ? '<a class="btn btn-lg btn-ghost" href="#/pair#invite">Позвать по ссылке</a>'
                          : '<a class="btn btn-lg btn-ghost" href="#/test" data-intent="invite">Позвать по ссылке</a>';
      return `
      <section class="hero-split">
        <div class="wrap-wide hero-grid">
          <div class="hero-copy">
            <h1 class="display">Как устроена ваша пара.</h1>
            <p class="lead">Каждый проходит тест за 4 минуты. Совместимость покажем сразу и бесплатно.</p>
            <div class="cta">
              <a class="btn btn-lg" href="#/duo">Пройти вдвоём</a>
              ${invite}
            </div>
          </div>
          <div class="hero-map" data-demo-href="${demoHref}">
            ${ui.pairVenn(da, db, { mode: 'demo', label: `Пример карты пары ${da.mbti} и ${db.mbti}: у кого какая сфера жизни` })}
            <p class="hero-map-cap"><a class="link" href="${demoHref}">Пример: ${da.mbti} и ${db.mbti}, ${esc(title.toLowerCase())}</a></p>
          </div>
        </div>
      </section>
      <div class="hero-after">
        <div class="wrap-wide hero-after-in">
          <a class="link" href="#/pair#codes">Мы знаем свои коды</a>
          ${saved && pt ? `<a class="mine" href="${saved}">Ваша пара: ${me.mbti} и ${pt.type.mbti} ›</a>`
                        : me ? `<a class="mine" href="#/result">Твой тип: ${me.mbti}, ${esc(me.title)} ›</a>` : ''}
        </div>
      </div>

      <section class="sec sec-alt">
        <div class="wrap">
          <div class="measure">
            <h2 class="title">Спорите об одном и том же?</h2>
            <ul class="scene-list">${SCENES.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
            <p class="lead">Просто у вас разные типы, и у каждой пары своя карта: где один легко делает то, что второму трудно.</p>
          </div>
        </div>
      </section>

      <section class="sec">
        <div class="wrap">
          <h2 class="title">Три шага, около десяти минут.</h2>
          <div class="plan">
            <ol class="plan-steps">${STEPS.map(([h, t]) => `<li><h3>${h}</h3><p>${esc(t)}</p></li>`).join('')}</ol>
            <div class="plan-tiers">
              <div class="tier reveal"><h3>Бесплатно</h3><ul class="tick-list">${FREE.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
              <div class="tier tier-paid reveal" style="--i:1"><h3>В разборе</h3><ul class="tick-list">${PAID.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
            </div>
          </div>
        </div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap">
          <div class="measure">
            <h2 class="title-sm">Таблицы говорят «64 %» и молчат, что делать.</h2>
            <p class="body">Таблица совместимости MBTI сравнивает буквы, гороскоп — звёзды. Мы считаем по двум настоящим прохождениям теста и по теории отношений соционики: в ней 14 видов отношений, а не одна цифра. А дальше даём конкретные шаги для вашей пары.</p>
            <ul class="tick-list trust">
              <li>Без регистрации</li><li>Ответы остаются на телефоне</li><li>Имён нет в ссылках</li>
            </ul>
            <p class="gap-sm"><a class="link" href="#/about">Насколько это научно</a></p>
          </div>
        </div>
      </section>

      <section class="sec final">
        <div class="wrap center">
          <h2 class="title">Меньше одинаковых ссор. Больше «а, вот почему».</h2>
          <p class="lead">Начните вдвоём на одном телефоне или позовите партнёра ссылкой.</p>
          <div class="cta center">
            <a class="btn btn-lg" href="#/duo">Пройти вдвоём</a>
            ${invite}
          </div>
          <p><a class="link" href="#/test">Узнать свой тип</a></p>
        </div>
      </section>

      <section class="sec sec-alt lib-teaser">
        <div class="wrap">
          <h2 class="title-sm">Шестнадцать типов, четыре квадры и все виды отношений.</h2>
          <p class="sub">Для тех, кто хочет глубже: описания типов, модель А, отношения со всеми типами и mystery box со случайными фактами.</p>
          <p class="links-row"><a class="link" href="#/types">16 типов</a><a class="link" href="#/quadras">Квадры</a><a class="link" href="#/relations">Отношения</a><a class="link" href="#/box">Mystery box</a><a class="link" href="#/about">О методике</a></p>
        </div>
      </section>`;
    },
    mount(root) {
      const offVenn = ui.mountVenn(root);
      // карта-пример: нажатие ведёт в пример пары (с клавиатуры — ссылка под картой)
      const onClick = e => {
        const map = e.target.closest('[data-demo-href]');
        if (map && !e.target.closest('a')) location.hash = map.dataset.demoHref;
        if (e.target.closest('[data-intent="invite"]')) S.store.set('intent', 'invite');
      };
      root.addEventListener('click', onClick);
      return () => { offVenn(); root.removeEventListener('click', onClick); };
    }
  };
})(window);
