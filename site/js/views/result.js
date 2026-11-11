/* Socio-Nik · результат: свой (#/result) и по ссылке (#/r/1-72-64-58-19) */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;
  const M = () => S.core.modelA;
  const NB = '\u00A0';
  // Ссылка на свой результат: с адресом сайта, а локально — от текущего адреса страницы
  const keepUrl = axes => S.share.url(axes) || (location.href.split('#')[0] + '#/r/' + S.core.payload.encode(axes));

  // Заголовок «Привет, {имя}» с подгонкой по ширине и персонаж с магнитом под ним.
  // Высота заголовка ограничена (data-maxh): на компьютере под персонажем в первом экране — строка с типом и кнопками
  const greet = (word, t) => `
    <h1 class="res-title display" data-fit data-min="12" data-max="17.5" data-maxh="15">
      <span class="fit-in"><span class="fit-line"><span class="sv">${word}</span></span> <span class="fit-line"><span class="sv">${esc(ui.short(t))}</span></span></span>
    </h1>
    <div class="res-char" data-magnet><div><div class="res-fig">${ui.character(t, { sizes: ui.CHAR.hero, eager: true })}</div></div></div>`;

  const nextCards = res => `<div class="next-grid">${res.next.map((r, i) => {
    const tt = M().type(r.id);
    return `<a class="next-card reveal" style="${ui.qStyle(tt.quadra)};--i:${i}" href="#/types/${tt.id}">
      ${ui.rich() ? `<span class="next-art">${ui.character(tt, { sizes: ui.CHAR.ava, alt: '' })}</span>` : ui.mark(tt, { cls: 'next-art' })}
      <span class="next-code">${tt.code}</span>
      <span class="next-name">${esc(tt.alias)} · ${esc(tt.role)}</span>
      <span class="next-pct num">${r.pct} %</span>
    </a>`;
  }).join('')}</div>`;

  // Тест пройден по ссылке друга — сразу показываем ваши отношения
  function friendPair(me, fr) {
    const r = M().relation(me, fr), txt = ui.relText(r.kind);
    return `
      <section class="sec sh-you">
        <div class="wrap center">
          <p class="eyebrow reveal">Ты и тот, кто прислал ссылку</p>
          <h2 class="h2 h2-md reveal"><span class="sv">${me.code} и ${fr.code}</span></h2>
          <div class="sh-pair reveal">${(ui.rich() ? ui.duo : ui.pairMarks)(me, fr, { labels: ['Ты', fr.code] })}</div>
          <h3 class="sh-rel reveal">${esc(ui.relTitle(r, me, fr))}</h3>
          <p class="reveal">${ui.toneChip(r.tone)}</p>
          <p class="lead reveal">${esc(txt.line || '')}</p>
          <p class="reveal"><a class="btn" href="#/relations/${me.id}/${fr.id}">Про ваши отношения</a></p>
        </div>
      </section>`;
  }

  function page(axes) {
    const res = S.core.scoring.result(axes);
    const t = M().type(res.top.id), q = ui.quadra(t.quadra), c = ui.content(t.id);
    const dual = M().partner(t, 'dual');
    const n1 = M().type(res.next[0].id);
    const qc = (S.content.quadras || {})[q.id] || {};
    const friend = S.state.friend ? S.core.scoring.result(S.state.friend).top.id : null;
    // Шкала ровно на 50 делит первое место: одна — между двумя типами, две — между четырьмя, три — между восемью
    const even = S.core.scoring.AXES.filter(ax => axes[ax] === 50).length;
    const tied = even > 1 ? res.dist.slice(1, 1 << even).map(r => M().type(r.id)) : [];
    const between = even === 2
      ? `Две шкалы легли ровно посередине, поэтому так${NB}же близко ещё три типа: ${tied.map(x => `<a href="#/types/${x.id}">${x.code}</a>`).join(', ')}.`
      : even === 3
        ? `Три шкалы легли ровно посередине, поэтому так${NB}же близко ещё семь типов${NB}— <a href="#/result#scales">они в${NB}списке ниже</a>.`
        : res.close ? `Результат между ${t.code} и${NB}<a href="#/types/${n1.id}">${n1.code} «${esc(n1.alias)}»</a> — загляни в${NB}оба описания.` : '';

    return `
      <section class="res-hero" style="${ui.qStyle(t.quadra)}">
        <p class="eyebrow res-eyebrow">Твой тип</p>
        ${greet('Привет,', t)}
        <div class="res-meta">
          <div class="res-id">
            <p class="res-code">${t.code}</p>
            <p class="res-name">${esc(t.name)}</p>
            <p class="res-alias">«${esc(t.alias)}» · ${esc(t.role)} · квадра ${q.name}</p>
            ${ui.clarityLine(res, { href: '#/result#scales' })}
            ${between ? `<p class="res-between">${between}</p>` : ''}
          </div>
          <div class="res-acts">
            <button class="btn res-share" type="button" data-share-now>Поделиться результатом</button>
            <a class="btn-ghost" href="#/#rel">С${NB}кем мне легко</a>
          </div>
        </div>
      </section>
      ${friend ? friendPair(t, M().type(friend)) : ''}

      <section class="sec sec-white">
        <div class="wrap">
          <h2 class="h2 h2-md sec-head reveal">Коротко о${NB}типе</h2>
          <div class="res-brief">
            <div>
              <p class="lead res-tagline reveal">${esc(c.tagline || '')}</p>
              <p class="body reveal">${esc((c.about || [])[0] || '')}</p>
              <p class="res-more reveal"><a class="link" href="#/types/${t.id}">Читать полностью</a><a class="link" href="#/box/${t.id}">Факты про ${t.code}</a></p>
              ${ui.celebLine(t)}
            </div>
            <div class="res-links">
              <a class="link-card reveal" href="#/quadras#${q.id}" style="${ui.qStyle(q.id)}">
                ${ui.rich() ? `<span class="lc-art" data-anim>${S.art.quadraEmblem(q)}</span>` : `<span class="lc-art">${ui.quadraMark(q)}</span>`}
                <span class="lc-kicker">Твоя квадра</span>
                <span class="lc-title">${q.name}</span>
                <span class="lc-text">${esc(qc.motto || '')}</span>
              </a>
              <a class="link-card reveal" href="#/relations/${t.id}/${dual.id}" style="${ui.qStyle(dual.quadra)};--i:1">
                ${ui.rich() ? `<span class="lc-art lc-char">${ui.character(dual, { sizes: ui.CHAR.ava, alt: '' })}</span>` : `<span class="lc-art">${ui.mark(dual, { cls: 'tm-xl' })}</span>`}
                <span class="lc-kicker">Твой дуал</span>
                <span class="lc-title">${dual.code} «${esc(dual.alias)}»</span>
                <span class="lc-text">${esc(ui.relText('dual').line || '')}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section class="sec">
        <div class="wrap">
          <h2 class="h2 h2-md sec-head reveal" id="scales"><span class="sv">Четыре шкалы</span></h2>
          <p class="lead sec-sub reveal">Какой полюс каждой пары тебе ближе. Из${NB}них и${NB}складывается тип.</p>
          ${ui.axisBars(res.axes)}
          <p class="res-all reveal">Близость к${NB}остальным типам${NB}— в${NB}списке ниже: вероятности по${NB}всем 16 в${NB}сумме дают 100${NB}%.</p>
          ${ui.distribution(res, { fold: true })}
        </div>
      </section>

      <section class="sec sec-white">
        <div class="wrap">
          <h2 class="h2 h2-md reveal">Сравни с другом</h2>
          <p class="lead sec-sub reveal">${friend ? `Результат по ссылке — ${M().type(friend).code} «${esc(M().type(friend).alias)}». Вот как устроены ваши отношения.` : 'Выбери тип близкого человека — покажем, как устроены ваши отношения.'}</p>
          <div class="reveal">${ui.calc(t.id, friend || dual.id)}</div>
          ${friend ? '' : `<div class="cmp-ask reveal">
            <p><b>Не знаешь тип друга?</b> Отправь свой результат. После теста по${NB}твоей ссылке друг сразу увидит ваши отношения${NB}— и${NB}пришлёт тебе свой тип.</p>
            <button class="btn-ghost" type="button" data-share-now>Отправить результат</button>
          </div>`}
        </div>
      </section>

      ${ui.resultShare(axes)}

      <section class="sec sec-line res-end">
        <div class="wrap center">
          <h2 class="h2 h2-sm reveal"><span class="sv">Не потеряй результат</span></h2>
          <p class="lead sec-sub reveal">Он хранится только в${NB}этом браузере. Сохрани ссылку${NB}— по${NB}ней результат откроется на${NB}любом устройстве.</p>
          <div class="reveal" data-keep>${ui.linkRow(keepUrl(axes))}</div>
          <p class="res-again reveal"><a class="btn-ghost" href="#/test" data-restart-test>Пройти тест заново</a></p>
          <details class="how reveal">
            <summary>Как это считается</summary>
            <p>Каждый ответ сдвигает одну из четырёх шкал. Из суммы по шкале получается вероятность каждого полюса, а вероятность типа — произведение вероятностей его четырёх полюсов, поэтому по 16 типам всегда выходит 100 %.</p>
            <p>Соционика — популярная типологическая модель, а не проверенный научный метод. Относись к результату как к поводу понаблюдать за собой, а не как к диагнозу.</p>
          </details>
        </div>
      </section>`;
  }

  // Персонаж наезжает на нижнюю строку заголовка — на треть высоты букв (герои результата, типа и ссылки)
  const overlap = root => {
    const hero = root.querySelector('.res-hero, .type-hero, .sh-hero, .lost-hero');
    if (!hero) return () => {};
    const set = e => { const fs = parseFloat(getComputedStyle(e.target).fontSize); hero.style.setProperty('--fs', fs + 'px'); };
    hero.addEventListener('fitted', set);
    return () => hero.removeEventListener('fitted', set);
  };
  ui.mountOverlap = overlap;

  V.result = {
    title: () => {
      const a = S.state.result();
      return a ? 'Твой тип — ' + M().type(S.core.scoring.result(a).top.id).code : 'Результат';
    },
    render() {
      const axes = S.state.result();
      if (!axes) {
        // на компьютере — случайный персонаж, на телефоне — только типографика
        const t = ui.rich() ? S.data.types[Math.floor(Math.random() * 16)] : null;
        return `<section class="lost-hero"${t ? ` style="${ui.qStyle(t.quadra)}"` : ''}>
          <h1 class="display lost-title" data-fit data-min="12" data-max="16" data-maxh="16"><span class="fit-in"><span class="fit-line"><span class="sv">Пока</span></span> <span class="fit-line"><span class="sv">пусто</span></span></span></h1>
          ${t ? `<div class="lost-char">${ui.character(t, { sizes: ui.CHAR.hero, eager: true, alt: '' })}</div>` : ''}
          <div class="lost-foot">
            <p class="lead">Результата пока нет. Пройди тест — это 20${NB}вопросов и${NB}около 4${NB}минут.</p>
            <p class="lost-actions"><a class="btn" href="#/test">Пройти тест</a></p>
          </div>
        </section>`;
      }
      return page(axes);
    },
    mount(root) {
      const axes = S.state.result();
      if (!axes) return overlap(root);
      const offs = [overlap(root), ui.mountCalc(root), ui.mountTips(root), ui.mountResultShare(root, axes)];
      const keep = root.querySelector('[data-keep]');
      if (keep) offs.push(ui.mountShareActions(keep, { url: () => keepUrl(axes), text: () => keepUrl(axes) }));
      // «Поделиться результатом» в первом экране и «Отправить результат» у калькулятора — тот же шер, что и в блоке ниже
      root.querySelectorAll('[data-share-now]').forEach(now => now.addEventListener('click', () => { const box = root.querySelector('[data-share]'); if (box && box.shareNow) box.shareNow(); }));
      if (S.state.justFinished) {
        S.state.justFinished = false;
        const t = M().type(S.core.scoring.result(axes).top.id);
        const c = S.theme.quadraColor(t.quadra);
        setTimeout(() => S.fx.confetti([c, S.color.tone(c, 0.35), '#b600a8', '#d7e2ea'], { y: 0.3 }), 450);
      }
      const again = root.querySelector('[data-restart-test]');
      if (again) again.addEventListener('click', () => S.state.restartTest());
      return () => offs.forEach(f => f && f());
    }
  };

  // Страница для того, кто открыл ссылку на чужой результат: чей-то тип + приглашение пройти тест самому
  function sharedPage(axes) {
    const res = S.core.scoring.result(axes);
    const t = M().type(res.top.id), q = ui.quadra(t.quadra), c = ui.content(t.id);
    const mineId = S.state.myType(), mine = mineId ? M().type(mineId) : null;
    const rel = mine ? M().relation(mine, t) : null;
    const test = label => `<a class="btn" href="#/test" data-friend>${label}</a>`;
    return `
      <section class="res-hero sh-hero" style="${ui.qStyle(t.quadra)}">
        <p class="sh-badge"><i aria-hidden="true"></i>Тебе прислали результат теста</p>
        ${greet('Это', t)}
        <div class="res-meta">
          <div class="res-id">
            <p class="res-code">${t.code}</p>
            <p class="res-name">${esc(t.name)}</p>
            <p class="res-alias">«${esc(t.alias)}» · ${esc(t.role)} · квадра ${q.name}</p>
          </div>
          <div class="res-acts">
            <div class="cta">
              ${mine ? `<a class="btn" href="#/relations/${mine.id}/${t.id}">Ваши отношения</a><a class="link" href="#/test" data-friend>Пройти тест заново</a>`
                     : `${test('Узнать свой тип')}<a class="link" href="#/types/${t.id}">Подробнее ${ui.about(t.code)}</a>`}
            </div>
            <p class="sh-note">20 вопросов · около 4 минут · без регистрации</p>
            ${mine ? '' : `<p class="sh-own">Это твоя ссылка? <button type="button" data-own>Открыть как свой результат</button></p>`}
          </div>
          <p class="sh-motto"><span>Коротко о типе</span>«${esc(c.tagline || '')}»</p>
        </div>
      </section>
      ${mine ? '' : `<div class="sh-sticky" data-sticky aria-hidden="true"><a class="btn" href="#/test" data-friend tabindex="-1">Узнать свой тип</a></div>`}

      <section class="sec sec-white">
        <div class="wrap center">
          <p class="eyebrow reveal">${mine ? 'Вы вдвоём' : 'Твоя очередь'}</p>
          <h2 class="h2 h2-md reveal">${mine ? `${mine.code} и ${t.code}` : 'А какой тип у тебя?'}</h2>
          <p class="lead reveal">${mine ? esc(ui.relText(rel.kind).line || '') : 'Пройди тест — и сразу увидишь, как устроены ваши отношения: дуальные, зеркальные, деловые или ещё какие-то из четырнадцати видов.'}</p>
          <div class="sh-pair reveal">${ui.rich() ? (mine ? ui.duo(mine, t, { labels: ['Ты', t.code] }) : ui.duoMystery(t)) : (mine ? ui.pairMarks(mine, t, { labels: ['Ты', t.code] }) : ui.pairMarksAsk(t))}</div>
          ${mine ? `<h3 class="sh-rel reveal">${esc(ui.relTitle(rel, mine, t))}</h3><p class="reveal"><a class="btn" href="#/relations/${mine.id}/${t.id}">Про ваши отношения</a></p>`
                 : `<p class="reveal">${test('Пройти тест')}</p>`}
        </div>
      </section>

      <section class="sec">
        <div class="wrap">
          <h2 class="h2 h2-md reveal"><span class="sv">Как распределились ответы</span></h2>
          <p class="lead sec-sub reveal">Какой полюс каждой пары ближе тому, кто прислал ссылку.</p>
          ${ui.axisBars(res.axes)}
          <h2 class="h2 h2-md gap-top sec-head reveal"><span class="sv">Ещё похоже на</span></h2>
          ${nextCards(res)}
        </div>
      </section>

      <section class="sec sec-white">
        <div class="wrap narrow">
          <h2 class="h2 h2-md reveal">Что за тип — ${t.code}</h2>
          <p class="lead sec-sub reveal">Отрывок из описания — оно написано для человека этого типа.</p>
          <p class="body reveal">${esc((c.about || [])[0] || '')}</p>
          <ol class="steps reveal" style="${ui.qStyle(t.quadra)}">${(c.strengths || []).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
          ${ui.celebLine(t)}
          <p class="reveal gap-top"><a class="link" href="#/types/${t.id}">Всё ${ui.about(t.code)}: описание, сильные и${NB}уязвимые стороны, отношения</a></p>
        </div>
      </section>

      <section class="sec final">
        <div class="wrap center">
          <h2 class="h2 reveal"><span class="sv">${mine ? 'Сравни и с другими' : 'Твоя очередь'}</span></h2>
          <p class="lead reveal">${mine ? 'Калькулятор покажет отношения с любым из 16 типов.' : 'Узнай свой соционический тип и то, как вы с этим человеком дополняете друг друга.'}</p>
          <p class="reveal">${mine ? '<a class="btn" href="#/relations">Открыть калькулятор</a>' : test('Пройти тест')}</p>
        </div>
      </section>`;
  }

  V.shared = {
    title: code => {
      const axes = S.core.payload.decode(code);
      return 'Результат друга — ' + M().type(S.core.scoring.result(axes).top.id).code;
    },
    // «ровный» результат (все шкалы посередине) типом не считаем — такая ссылка ведёт на «Ссылка не открылась»
    valid: code => { const axes = S.core.payload.decode(code); return Boolean(axes) && !S.core.scoring.flat(axes); },
    render(code) { return sharedPage(S.core.payload.decode(code)); },
    mount(root, code) {
      const axes = S.core.payload.decode(code);
      const onClick = e => {
        if (e.target.closest('[data-friend]')) { S.state.friend = axes; S.state.restartTest(); }
        // свою ссылку открыли в другом браузере — результат можно забрать, тест заново проходить не нужно
        if (e.target.closest('[data-own]')) { S.state.saveResult(axes); location.hash = '#/result'; }
      };
      root.addEventListener('click', onClick);
      const off = overlap(root);
      // телефон: пока кнопок «Узнать свой тип» в герое и в конце не видно — она прикреплена внизу экрана
      const bar = root.querySelector('[data-sticky]');
      let io = null;
      if (bar && 'IntersectionObserver' in window) {
        const seen = new Set();
        const btns = [root.querySelector('.sh-hero .cta .btn'), root.querySelector('.final .btn')].filter(Boolean);
        io = new IntersectionObserver(entries => {
          entries.forEach(e => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
          const on = seen.size === 0;
          bar.classList.toggle('on', on);
          bar.setAttribute('aria-hidden', String(!on));
          bar.querySelector('.btn').tabIndex = on ? 0 : -1;
        });
        btns.forEach(x => io.observe(x));
      }
      return () => { root.removeEventListener('click', onClick); off(); if (io) io.disconnect(); };
    }
  };
})(window);
