/* Socio-Nik · mystery box (#/box), о соционике (#/about), 404 */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;

  V.box = {
    title: () => 'Mystery box',
    valid: id => !id || Boolean(S.core.modelA.type(id)),
    render: id => `
      <section class="sec page-head box-page">
        <div class="wrap center">
          <p class="eyebrow reveal">Mystery box</p>
          <h1 class="title reveal">Открой коробку.</h1>
          <p class="lead reveal">Случайный факт об одном из 16 типов — или о соционике вообще. Факты не повторяются, пока колода не кончится.</p>
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

  V.about = {
    title: () => 'О соционике',
    render() {
      const A = S.data.aspects;
      const c = S.theme.resolved() === 'dark' ? '#2997ff' : '#0071e3';
      return `
        <section class="sec page-head">
          <div class="wrap narrow">
            <p class="eyebrow reveal">О соционике</p>
            <h1 class="title reveal">Что такое соционика.</h1>
            <p class="lead reveal">Модель, которая описывает, какую информацию человек замечает первой, как её обрабатывает и почему с одними людьми это совпадает, а с другими — нет.</p>
          </div>
        </section>
        <section class="sec">
          <div class="wrap narrow">
            <h2 class="title-sm reveal">Откуда она взялась</h2>
            <p class="body reveal">Соционику придумала в 1970-е годы литовская исследовательница Аушра Аугустинавичюте. Она соединила типологию Карла Юнга с идеей польского психиатра Антония Кемпинского об «информационном метаболизме»: психика, как и тело, всё время обменивается с миром — только не веществом, а информацией. Отсюда и официальное название типа — ТИМ, тип информационного метаболизма.</p>
            <h2 class="title-sm reveal gap-top">Четыре пары признаков</h2>
            <div class="about-dich">${DICH.map(([h, p], i) => `<div class="card reveal" style="--i:${i}"><h3 class="card-title">${h}</h3><p>${p}</p></div>`).join('')}</div>
          </div>
        </section>
        <section class="sec sec-alt">
          <div class="wrap">
            <h2 class="title-sm reveal">Восемь аспектов информации</h2>
            <p class="sub reveal">Каждая стихия бывает «чёрной» (экстравертной) и «белой» (интровертной). На сайте чёрные аспекты — плотные знаки, белые — стеклянные.</p>
            <div class="aspect-grid">${Object.keys(A).map((id, i) => `
              <div class="aspect card reveal" style="--i:${i % 4}">
                <span class="aspect-art">${S.art.glyphSVG(id, c, 'aspect-svg')}</span>
                <span class="aspect-code">${S.art.symbol(id)} ${A[id].short}</span>
                <span class="aspect-name">${esc(A[id].name)}</span>
                <span class="aspect-hint">${esc(A[id].hint)}</span>
              </div>`).join('')}</div>
          </div>
        </section>
        <section class="sec">
          <div class="wrap narrow">
            <h2 class="title-sm reveal">Модель А</h2>
            <p class="body reveal">Модель А раскладывает восемь аспектов по восьми функциям. Две верхние — Эго: базовая функция (то, чем тип живёт) и творческая (то, чем он действует). Суперэго — ролевая и болевая: то, что даётся с напряжением. Суперид — суггестивная и активационная: то, чего тип ждёт от других людей. Ид — ограничительная и демонстрационная: сильные, но фоновые функции.</p>
            <p class="body reveal">Из модели А выводятся и отношения: например, дуал своими сильными функциями закрывает суггестивную и активационную функции партнёра — поэтому рядом с ним спокойно и легко.</p>
            <h2 class="title-sm reveal gap-top">Как устроен тест</h2>
            <p class="body reveal">Двадцать вопросов — по пять на каждую пару признаков. Каждый ответ сдвигает свою шкалу; из шкал получаются вероятности полюсов, а вероятность типа — их произведение, поэтому по 16 типам всегда выходит 100 %. Ответы хранятся только на твоём устройстве.</p>
            <div class="card soft reveal gap-top"><h3 class="card-title">Честно о точности</h3>
              <p>Соционика — популярная типологическая модель, а не проверенный научный метод: академическая психология её не признаёт. Относись к результату как к поводу понаблюдать за собой и за отношениями, а не как к диагнозу.</p></div>
            <p class="center gap-top reveal"><a class="btn btn-lg" href="#/test">Пройти тест</a></p>
          </div>
        </section>`;
    }
  };

  V.notfound = {
    title: () => 'Страница не найдена',
    render: () => `
      <section class="sec empty"><div class="wrap center">
        <div class="lost" aria-hidden="true">${S.art.glyphSVG('Fi', S.theme.quadraColor('delta'), 'lost-svg')}</div>
        <h1 class="title">Такой страницы нет</h1>
        <p class="lead">Похоже, этот знак потерялся. Вернёмся туда, где всё на своих местах.</p>
        <p><a class="btn btn-lg" href="#/">На главную</a></p>
      </div></section>`
  };
})(window);
