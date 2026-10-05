/* Socio-Nik · mystery box (#/box), о методике (#/about): MBTI и соционика, 404 */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;

  V.box = {
    needs: ['types', 'relations', 'facts'],
    title: () => 'Mystery box',
    valid: id => !id || Boolean(S.core.modelA.find(id)),
    render: id => `
      <section class="sec page-head box-page">
        <div class="wrap center">
          <h1 class="title">Открой коробку.</h1>
          <p class="lead">Случайный факт об одном из 16 типов — или о соционике вообще. Факты не повторяются, пока колода не кончится.</p>
          <div class="reveal">${ui.box({ modes: !id, typeId: id ? S.core.modelA.find(id).id : null })}</div>
        </div>
      </section>`,
    mount: root => ui.mountBox(root)
  };

  const DICH = [
    ['Экстраверсия — интроверсия · E / I', 'Внимание к внешнему миру, объектам и действиям — или к отношениям между ними и внутренним состояниям.'],
    ['Интуиция — ощущения · N / S', 'Возможности, смыслы и время — или ощущения, пространство и то, что можно потрогать.'],
    ['Логика — чувства · T / F', 'Факты, системы и эффективность — или эмоции и отношения людей. В соционике — логика и этика.'],
    ['План — импровизация · J / P', 'Решения, планы и порядок — или восприятие, гибкость и подстройка под ситуацию. В соционике — рациональность и иррациональность.']
  ];

  // Соответствие кодов: буквы MBTI ← дихотомии соционики, рационал → J. Группами по квадрам — так, как типы
  // сгруппированы по всему сайту
  const mapTable = () => `<table class="map-table"><thead><tr><th scope="col">MBTI</th><th scope="col">Наше название</th><th scope="col">Соционика</th></tr></thead>
    ${S.data.quadras.map(q => `<tbody style="${ui.qStyle(q.id)}"><tr class="map-q"><th scope="rowgroup" colspan="3"><i class="qdot" aria-hidden="true"></i>${q.name}</th></tr>
      ${ui.typesOf(q.id).map(t => `<tr><td><a href="#/types/${t.mbti.toLowerCase()}">${t.mbti}</a></td><td>${esc(t.title)}</td><td>${t.code} «${esc(t.alias)}»</td></tr>`).join('')}</tbody>`).join('')}
  </table>`;

  V.about = {
    title: () => 'О методике',
    render() {
      const A = S.data.aspects;
      const c = S.theme.token('--art-accent');
      return `
        <section class="sec page-head">
          <div class="wrap narrow">
            <h1 class="title">Коды из MBTI, глубина из соционики.</h1>
            <p class="lead">Шестнадцать типов личности мы показываем привычными кодами из четырёх букв, а совместимость пары считаем по соционике — у неё есть подробная теория отношений между типами.</p>
          </div>
        </section>
        <section class="sec">
          <div class="wrap narrow">
            <h2 class="title-sm">MBTI и соционика</h2>
            <p class="body">MBTI — опросник Изабель Майерс и Кэтрин Бриггс по типологии Карла Юнга, он появился в 1940-х. Четыре шкалы — E/I, N/S, T/F, J/P — дают 16 типов с кодом вроде ENFP. Соционика выросла из того же Юнга в 1970-х: типов тоже 16, но к ним добавлена модель А — восемь функций — и теория 14 видов отношений между типами. В MBTI такой теории почти нет, поэтому совместимость пары мы считаем по соционике.</p>
            <h2 class="title-sm gap-top">Как коды соответствуют друг другу</h2>
            <p class="body">Код MBTI мы получаем по буквам шкал. Тест меряет поведение: кто планирует заранее, получает букву J, кто действует по ситуации — P. В соционике это рациональность и иррациональность.</p>
            <div class="card soft reveal"><h3 class="card-title">Про интровертов</h3>
              <p>У интровертов соответствие спорное. Одни школы сопоставляют типы по буквам, как мы, другие — по ведущей функции. Поэтому, например, ЛИИ «Робеспьер» у нас INTJ, а в части источников — INTP. Мы выбрали буквы, потому что тест спрашивает именно о поведении.</p></div>
            <div class="reveal gap-top">${mapTable()}</div>
            <h2 class="title-sm gap-top">Откуда взялась соционика</h2>
            <p class="body">Соционику придумала в 1970-е годы литовская исследовательница Аушра Аугустинавичюте. Она соединила типологию Карла Юнга с идеей польского психиатра Антония Кемпинского об «информационном метаболизме»: психика, как и тело, всё время обменивается с миром — только не веществом, а информацией. Отсюда и официальное название типа — ТИМ, тип информационного метаболизма.</p>
            <h2 class="title-sm gap-top">Четыре шкалы</h2>
            <div class="about-dich">${DICH.map(([h, p], i) => `<div class="card reveal" style="--i:${i}"><h3 class="card-title">${h}</h3><p>${p}</p></div>`).join('')}</div>
          </div>
        </section>
        <section class="sec sec-alt">
          <div class="wrap">
            <h2 class="title-sm">Восемь аспектов информации</h2>
            <p class="sub">Каждая стихия бывает «чёрной» (экстравертной) и «белой» (интровертной). На сайте чёрные аспекты — плотные знаки, белые — стеклянные.</p>
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
            <h2 class="title-sm">Модель А</h2>
            <p class="body">Модель А раскладывает восемь аспектов по восьми функциям. Две верхние — Эго: базовая функция (то, чем тип живёт) и творческая (то, чем он действует). Суперэго — ролевая и болевая: то, что даётся с напряжением. Суперид — суггестивная и активационная: то, чего тип ждёт от других людей. Ид — ограничительная и демонстрационная: сильные, но фоновые функции.</p>
            <p class="body">Из модели А выводятся и отношения: например, дуал своими сильными функциями закрывает суггестивную и активационную функции партнёра — поэтому рядом с ним спокойно и легко.</p>
            <h2 class="title-sm gap-top">Как устроен тест</h2>
            <p class="body">Двадцать вопросов — по пять на каждую пару признаков. Каждый ответ сдвигает свою шкалу; из шкал получаются вероятности полюсов, а вероятность типа — их произведение, поэтому по 16 типам всегда выходит 100 %. Ответы хранятся только на твоём устройстве.</p>
            <h2 class="title-sm gap-top">Как считается совместимость пары</h2>
            <p class="body">Для пары мы раскладываем восемь аспектов на сферы жизни — от денег до близости — и смотрим, на какой позиции модели А стоит каждая сфера у каждого из вас. Если одному это легко и важно, а другому очень нужно, — вы дополняете друг друга. Если одному важно, а другому больно, — здесь нужна бережность. Набор таких зон зависит от вида отношений, а конкретика — от ваших типов.</p>
            <div class="card soft reveal gap-top"><h3 class="card-title">Насколько это точно</h3>
              <p>И MBTI, и соционика — популярные типологии, а не проверенные научные методы: академическая психология их не признаёт. Относись к результату как к поводу поговорить и понаблюдать за собой, а не как к диагнозу отношениям.</p></div>
            <div class="card soft reveal"><h3 class="card-title">Товарный знак</h3>
              <p>MBTI и Myers-Briggs Type Indicator — товарные знаки The Myers-Briggs Company. Socio-Nik с ней не связан и упоминает коды MBTI только для описания типов. Названия типов и тексты на сайте — наши.</p></div>
            <p class="center gap-top"><a class="btn btn-lg" href="#/pair">Проверить нашу пару</a></p>
          </div>
        </section>`;
    }
  };

  // Битая ссылка на пару, приглашение или результат — чаще всего её обрезал мессенджер: даём понятные выходы
  const PAIR_LINK = /^\/(pair|i|r|relations)\//;
  V.notfound = {
    title: (path = '') => (PAIR_LINK.test(path) ? 'Ссылка не открылась' : 'Страница не найдена'),
    render: (path = '') => PAIR_LINK.test(path) ? `
      <section class="sec empty"><div class="wrap center">
        <div class="lost" aria-hidden="true">${S.art.glyphSVG('Fi', S.theme.quadraColor('delta'), 'lost-svg')}</div>
        <h1 class="title">Ссылка не открылась.</h1>
        <p class="lead">Похоже, мессенджер обрезал её по дороге. Попроси прислать ссылку ещё раз или откройте пару по кодам.</p>
        <div class="cta"><a class="btn btn-lg" href="#/pair#codes">Ввести коды</a><a class="btn btn-lg btn-ghost" href="#/test">Узнать свой тип</a></div>
      </div></section>` : `
      <section class="sec empty"><div class="wrap center">
        <div class="lost" aria-hidden="true">${S.art.glyphSVG('Fi', S.theme.quadraColor('delta'), 'lost-svg')}</div>
        <h1 class="title">Такой страницы нет.</h1>
        <p class="lead">Похоже, этот знак потерялся. Вернёмся туда, где всё на своих местах.</p>
        <div class="cta"><a class="btn btn-lg" href="#/">На главную</a><a class="btn btn-lg btn-ghost" href="#/pair">Проверить пару</a></div>
      </div></section>`
  };
})(window);
