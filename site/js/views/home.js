/* Socio-Nik · главная: сценарий пары по девяти блокам посадочной страницы (канон NMT, communication.md §8):
   суть → узнаваемая ситуация → ценность по критериям → как это работает → почему не таблица совместимости →
   страхи → пример карты → состояние «после» → первый шаг. Библиотека типов — внизу, на втором плане. */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;
  const M = () => S.core.modelA;
  const P = () => (S.content && S.content.pair) || {};

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

  // Узнаваемые ситуации: разница типов в быту, без «кто прав»
  const SCENES = [
    { a: 'Ni', text: 'Ты бронируешь отпуск в феврале, партнёр — за два дня до вылета.' },
    { a: 'Fe', text: 'Один хочет обсудить ссору сразу, второй — остыть до утра.' },
    { a: 'Te', text: 'Ты считаешь бюджет до рубля, а партнёр — что деньги нужны для радости.' }
  ];

  const VALUES = [
    { k: 'Про вас двоих', t: 'Не «INFP вообще», а ваша пара: восемь сфер жизни — от денег до близости — по двум настоящим прохождениям теста.' },
    { k: 'Что делать', t: 'Договорённости на эту неделю: кто за что отвечает, как мириться и о чём поговорить вечером.' },
    { k: 'Без приговора', t: 'Никаких «совместимы на 64 %». Где вы дополняете друг друга, а где нужна бережность — и что с этим делать.' }
  ];

  const DEMO = ['iee', 'sei'];   // ENFP и ISFP: «почти дополнение» — на карте видны три группы зон

  V.home = {
    title: () => 'Совместимость пары по 16 типам личности',
    render() {
      const mine = S.state.result(), me = mine ? M().type(S.state.myType()) : null;
      const p = S.core.couple.partner();
      const saved = mine && p ? `#/pair/${S.core.payload.encode(mine)}/${p.code}` : '';
      const pt = p ? S.core.couple.side(p.code) : null;
      const [da, db] = DEMO.map(id => M().type(id));
      const dr = M().relation(da, db), dt = ui.relText(dr.kind), sum = S.core.pair.summary(da, db), G = P().groups || {};
      return `
      <section class="hero" data-parallax data-anim>
        <div class="aurora" aria-hidden="true"><i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i></div>
        <div class="hero-glyphs" aria-hidden="true">
          ${HERO.map((g, i) => `<span class="hg" style="--x:${g.x}%;--y:${g.y}%;--d:${g.d};--s:${g.s};--i:${i};--sx:${g.sx}px;--sy:${g.sy}px;--sr:${g.sr}deg">
            <span class="hg-in"><span class="hg-float">${S.art.glyphSVG(g.a, S.theme.quadraColor(g.q), 'hg-svg')}</span></span></span>`).join('')}
        </div>
        <div class="wrap hero-copy">
          <p class="eyebrow reveal">Socio-Nik · 16 типов личности для двоих</p>
          <h1 class="display reveal" style="--i:1">Как устроена<br><span class="grad">ваша пара.</span></h1>
          <p class="lead reveal" style="--i:2">По 4 минуты на тест каждому — и вы увидите, где дополняете друг друга, а где нужна бережность. Совместимость — сразу и бесплатно.</p>
          <div class="cta reveal" style="--i:3">
            <a class="btn btn-lg" href="#/duo">Пройти вдвоём</a>
            <a class="btn btn-lg btn-ghost" href="#/pair#invite">Позвать по ссылке</a>
          </div>
          <p class="hero-alt reveal" style="--i:3"><a class="link" href="#/pair#codes">Мы знаем свои коды</a></p>
          ${saved && pt ? `<a class="mine reveal" style="--i:4;${ui.qStyle(pt.type.quadra)}" href="${saved}"><i class="qdot" aria-hidden="true"></i>Ваша пара — ${me.mbti} и ${pt.type.mbti}</a>`
                        : me ? `<a class="mine reveal" style="--i:4;${ui.qStyle(me.quadra)}" href="#/result"><i class="qdot" aria-hidden="true"></i>Твой тип — ${me.mbti} «${esc(me.title)}»</a>` : ''}
        </div>
        <div class="scroll-cue" aria-hidden="true"><i></i></div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap">
          <p class="eyebrow reveal">Узнаёте?</p>
          <h2 class="title reveal">Спорите об одном<br>и том же?</h2>
          <div class="scenes">
            ${SCENES.map((x, i) => `<article class="card scene-card reveal" style="--i:${i}">
              <span class="scene-glyph">${S.art.glyphSVG(x.a, S.theme.resolved() === 'dark' ? '#2997ff' : '#0071e3', 'scene-svg')}</span>
              <p>${esc(x.text)}</p>
            </article>`).join('')}
          </div>
          <p class="lead reveal gap-top">Это не «вы не подходите». Это разные типы личности — и у каждой пары своя карта: где один легко делает то, что второму трудно.</p>
        </div>
      </section>

      <section class="sec">
        <div class="wrap">
          <p class="eyebrow reveal">Что вы получите</p>
          <h2 class="title reveal">Конкретно. Про вас.<br>Бережно.</h2>
          <div class="values">
            ${VALUES.map((v, i) => `<article class="card value reveal" style="--i:${i}"><b class="value-n">${i + 1}</b><h3 class="card-title">${esc(v.k)}</h3><p>${esc(v.t)}</p></article>`).join('')}
          </div>
        </div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap">
          <p class="eyebrow reveal">Как это работает</p>
          <h2 class="title reveal">Три шага —<br>минут десять.</h2>
          <div class="steps">
            <div class="step card reveal"><b>1</b><h3>Твой тест</h3><p>20 вопросов, около 4 минут. Узнаешь свой тип из шестнадцати — с кодом MBTI и описанием.</p></div>
            <div class="step card reveal" style="--i:1"><b>2</b><h3>Тест партнёра</h3><p>По ссылке у себя — или прямо на твоём телефоне, по очереди. Ответы не смешаются.</p></div>
            <div class="step card reveal" style="--i:2"><b>3</b><h3>Ваша пара</h3><p>Вид отношений, сильные стороны пары и совет — сразу и бесплатно. Подробный разбор — по желанию.</p></div>
          </div>
        </div>
      </section>

      <section class="sec">
        <div class="wrap">
          <p class="eyebrow reveal">Пример</p>
          <h2 class="title reveal">${da.mbti} и ${db.mbti}:<br>${esc((P().titles || {})[dr.id] || '')}.</h2>
          <div class="demo reveal">
            <div class="demo-map">${ui.pairMapFigure(da, db, { label: `Карта пары ${da.mbti} и ${db.mbti}: восемь сфер жизни` })}</div>
            <div class="demo-copy">
              <p class="demo-line">${esc(dt.line || '')}</p>
              <ul class="teaser-counts">${S.core.pair.GROUPS.map(g => `<li class="${sum[g.id] ? '' : 'none'}">${S.art.groupIcon(g.id)}<span>${esc((G[g.id] || {}).title || '')}</span><b>${sum[g.id]}</b></li>`).join('')}</ul>
              <p><a class="btn" href="#/pair/${da.mbti.toLowerCase()}/${db.mbti.toLowerCase()}">Открыть пример пары</a></p>
            </div>
          </div>
          <p class="sub reveal">На карте — восемь сфер жизни пары. Длина лепестка — насколько легко это даётся каждому, насыщенность — насколько это важно.</p>
        </div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap narrow">
          <p class="eyebrow reveal">Почему не таблица совместимости</p>
          <h2 class="title-sm reveal">Таблицы говорят «64 %» и молчат, что делать.</h2>
          <p class="body reveal">Таблица совместимости MBTI сравнивает буквы, гороскоп — звёзды. Мы считаем по двум настоящим прохождениям теста и по теории отношений соционики: в ней шестнадцать видов отношений, а не одна цифра. А дальше — конкретные шаги для вашей пары.</p>
          <div class="fears reveal">
            <span>Без регистрации</span><span>Ответы остаются на телефоне</span><span>Имён нет в ссылках</span><span>Честно о научности</span>
          </div>
        </div>
      </section>

      <section class="sec final">
        <div class="wrap center">
          <h2 class="title reveal">Меньше одинаковых ссор.<br>Больше «а, вот почему».</h2>
          <p class="lead reveal">Начните вдвоём на одном телефоне или позовите партнёра ссылкой.</p>
          <div class="cta center reveal">
            <a class="btn btn-lg" href="#/duo">Пройти вдвоём</a>
            <a class="btn btn-lg btn-ghost" href="#/pair#invite">Позвать по ссылке</a>
          </div>
          <p class="reveal"><a class="link" href="#/test">Сначала просто узнать свой тип</a></p>
        </div>
      </section>

      <section class="sec sec-alt lib-teaser">
        <div class="wrap">
          <p class="eyebrow reveal">Библиотека</p>
          <h2 class="title-sm reveal">Шестнадцать типов, четыре квадры и все виды отношений.</h2>
          <p class="sub reveal">Для тех, кто хочет глубже: описания типов, модель А, отношения со всеми типами и mystery box со случайными фактами.</p>
          <p class="links-row reveal"><a class="link" href="#/types">16 типов</a><a class="link" href="#/quadras">Квадры</a><a class="link" href="#/relations">Отношения</a><a class="link" href="#/box">Mystery box</a><a class="link" href="#/about">О методике</a></p>
        </div>
      </section>`;
    }
  };
})(window);
