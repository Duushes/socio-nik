/* Socio-Nik · mystery box (#/box), о соционике (#/about), 404 */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;
  const NB = '\u00A0';

  V.box = {
    title: () => 'Mystery box',
    valid: id => !id || Boolean(S.core.modelA.type(id)),
    render: id => `
      <section class="page-top box-page">
        <div class="wrap center">
          <p class="eyebrow reveal">Mystery box</p>
          <h1 class="h2 reveal"><span class="sv">Открой коробку</span></h1>
          <p class="lead reveal">Случайный факт об${NB}одном из${NB}16 типов — или о${NB}соционике вообще. Факты не${NB}повторяются, пока колода не${NB}кончится.</p>
          <div class="reveal">${ui.box({ modes: !id, typeId: id || null })}</div>
        </div>
      </section>`,
    mount: root => ui.mountBox(root)
  };

  const DICH = [
    ['Экстраверсия — интроверсия', 'Внимание к внешнему миру, объектам и действиям — или к отношениям между ними и внутренним состояниям.'],
    ['Интуиция — сенсорика', 'Возможности, смыслы и время — или ощущения, пространство и то, что можно потрогать.'],
    ['Логика — этика', 'Факты, системы и эффективность — или эмоции и отношения людей.'],
    ['Рациональность — иррациональность', 'Решения, планы и порядок — или восприятие, гибкость и подстройка под ситуацию.']
  ];

  const part = (n, title, white) => `<p class="part-num reveal" aria-hidden="true">${n}</p><h2 class="h2 h2-md reveal">${white ? title : `<span class="sv">${title}</span>`}</h2>`;

  V.about = {
    title: () => 'О соционике',
    render() {
      const A = S.data.aspects;
      return `
        <section class="page-top page-head">
          <div class="wrap">
            <p class="eyebrow reveal">О соционике</p>
            <h1 class="h2 reveal"><span class="sv">Что такое соционика</span></h1>
            <p class="lead reveal">Модель, которая описывает, какую информацию человек замечает первой, как её обрабатывает и${NB}почему с${NB}одними людьми это совпадает, а${NB}с${NB}другими — нет.</p>
          </div>
        </section>
        <section class="sec sec-white">
          <div class="wrap narrow">
            ${part('01', 'Откуда она взялась', true)}
            <p class="body reveal">Соционику придумала в 1970-е годы литовская исследовательница Аушра Аугустинавичюте. Она соединила типологию Карла Юнга с идеей польского психиатра Антония Кемпинского об «информационном метаболизме»: психика, как и тело, всё время обменивается с миром — только не веществом, а информацией. Отсюда и официальное название типа — ТИМ, тип информационного метаболизма.</p>
          </div>
        </section>
        <section class="sec">
          <div class="wrap">
            ${part('02', 'Четыре пары признаков', false)}
            <div class="about-dich">${DICH.map(([h, p], i) => `<div class="card reveal" style="--i:${i}"><h3 class="card-title">${h}</h3><p>${p}</p></div>`).join('')}</div>
          </div>
        </section>
        <section class="sec sec-white">
          <div class="wrap">
            ${part('03', 'Восемь аспектов информации', true)}
            <p class="lead sec-sub reveal">Каждая стихия бывает «чёрной» (экстравертной) и${NB}«белой» (интровертной). На${NB}сайте чёрные аспекты — плотные знаки, белые — стеклянные. Те${NB}же знаки носят персонажи на${NB}одежде.</p>
            <div class="aspect-grid">${Object.keys(A).map((id, i) => `
              <div class="aspect reveal" style="--i:${i % 4}">
                <span class="aspect-art">${S.art.aspectImg(id, 'violet', 'aspect-img')}</span>
                <span class="aspect-code">${S.art.symbol(id)} ${A[id].short}</span>
                <span class="aspect-name">${esc(A[id].name)}</span>
                <span class="aspect-hint">${esc(A[id].hint)}</span>
              </div>`).join('')}</div>
          </div>
        </section>
        <section class="sec">
          <div class="wrap narrow">
            ${part('04', 'Модель А', false)}
            <p class="body reveal">Модель А раскладывает восемь аспектов по восьми функциям. Две верхние — Эго: базовая функция (то, чем тип живёт) и творческая (то, чем он действует). Суперэго — ролевая и болевая: то, что даётся с напряжением. Суперид — суггестивная и активационная: то, чего тип ждёт от других людей. Ид — ограничительная и демонстрационная: сильные, но фоновые функции.</p>
            <p class="body reveal">Из модели А выводятся и отношения: например, дуал своими сильными функциями закрывает суггестивную и активационную функции партнёра — поэтому рядом с ним спокойно и легко.</p>
            <div class="gap-top">${part('05', 'Как устроен тест', false)}</div>
            <p class="body reveal">Двадцать вопросов — по пять на каждую пару признаков. Каждый ответ сдвигает свою шкалу; из шкал получаются вероятности полюсов, а вероятность типа — их произведение, поэтому по 16 типам всегда выходит 100 %. Ответы хранятся только на твоём устройстве.</p>
            <div class="card honest reveal gap-top"><h3 class="card-title">Честно о точности</h3>
              <p>Соционика — популярная типологическая модель, а не проверенный научный метод: академическая психология её не признаёт. Относись к результату как к поводу понаблюдать за собой и за отношениями, а не как к диагнозу.</p></div>
            <p class="gap-top reveal"><a class="btn" href="#/test">Пройти тест</a></p>
          </div>
        </section>`;
    }
  };

  V.notfound = {
    title: () => 'Страница не найдена',
    render() {
      const t = S.data.types[Math.floor(Math.random() * 16)];
      return `
        <section class="lost-hero" style="${ui.qStyle(t.quadra)}">
          <h1 class="display lost-title" data-fit data-min="12" data-max="16" data-maxh="16"><span class="fit-in"><span class="fit-line"><span class="sv">Тут</span></span> <span class="fit-line"><span class="sv">пусто</span></span></span></h1>
          <div class="lost-char">${ui.character(t, { sizes: ui.CHAR.hero, eager: true, alt: '' })}</div>
          <div class="lost-foot">
            <p class="lead">Такой страницы нет. Зато есть 16${NB}типов — и${NB}один из${NB}них твой.</p>
            <p class="lost-actions"><a class="btn" href="#/">На главную</a><a class="btn-ghost" href="#/test">Пройти тест</a></p>
          </div>
        </section>`;
    },
    mount: root => ui.mountOverlap(root)
  };
})(window);
