/* Socio-Nik · результат: свой (#/result) и по ссылке (#/r/1-72-64-58-19) */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;
  const M = () => S.core.modelA;
  const NB = '\u00A0';

  // Заголовок «Привет, {имя}» с подгонкой по ширине и персонаж с магнитом под ним
  const greet = (word, t) => `
    <h1 class="res-title display" data-fit data-min="12" data-max="17.5" data-maxh="19">
      <span class="fit-in"><span class="fit-line"><span class="sv">${word}</span></span> <span class="fit-line"><span class="sv">${esc(ui.short(t))}</span></span></span>
    </h1>
    <div class="res-char" data-magnet><div><div class="res-fig">${ui.character(t, { sizes: ui.CHAR.hero, eager: true })}</div></div></div>`;

  const nextCards = res => `<div class="next-grid">${res.next.map((r, i) => {
    const tt = M().type(r.id);
    return `<a class="next-card reveal" style="${ui.qStyle(tt.quadra)};--i:${i}" href="#/types/${tt.id}">
      <span class="next-art">${ui.character(tt, { sizes: ui.CHAR.ava, alt: '' })}</span>
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
          <div class="sh-pair reveal">${ui.duo(me, fr, { labels: ['Ты', fr.code] })}</div>
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

    return `
      <section class="res-hero" style="${ui.qStyle(t.quadra)}">
        <p class="eyebrow res-eyebrow">Твой тип</p>
        ${greet('Привет,', t)}
        <div class="res-meta">
          <p class="res-code">${t.code}</p>
          <p class="res-name">${esc(t.name)}</p>
          <p class="res-alias">«${esc(t.alias)}» · ${esc(t.role)} · квадра ${q.name}</p>
          <div class="res-pct"><span class="big num" data-count="${res.top.pct}">${res.top.pct}</span><span class="pc">%</span></div>
          <p class="res-pct-lab">вероятность этого типа по${NB}твоим ответам</p>
          ${res.close ? `<p class="res-between">Результат между ${t.code} и${NB}${n1.code} — загляни в${NB}оба описания.</p>` : ''}
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
              <p class="reveal"><a class="link" href="#/types/${t.id}">Читать полностью</a></p>
              ${ui.celebLine(t)}
            </div>
            <div class="res-links">
              <a class="link-card reveal" href="#/quadras#${q.id}" style="${ui.qStyle(q.id)}">
                <span class="lc-art" data-anim>${S.art.quadraEmblem(q)}</span>
                <span class="lc-kicker">Твоя квадра</span>
                <span class="lc-title">${q.name}</span>
                <span class="lc-text">${esc(qc.motto || '')}</span>
              </a>
              <a class="link-card reveal" href="#/relations/${t.id}/${dual.id}" style="${ui.qStyle(dual.quadra)};--i:1">
                <span class="lc-art lc-char">${ui.character(dual, { sizes: ui.CHAR.ava, alt: '' })}</span>
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
          <h2 class="h2 h2-md sec-head reveal"><span class="sv">Ещё похоже на</span></h2>
          ${nextCards(res)}
          <h2 class="h2 h2-md gap-top reveal"><span class="sv">Четыре шкалы</span></h2>
          <p class="lead sec-sub reveal">Какой полюс каждой пары тебе ближе.</p>
          ${ui.axisBars(res.axes)}
          <h2 class="h2 h2-md gap-top reveal"><span class="sv">Все 16 типов</span></h2>
          <p class="lead sec-sub reveal">Вероятности по всем типам складываются в${NB}100${NB}%. Наведи на строку — увидишь подробности.</p>
          ${ui.distribution(res)}
        </div>
      </section>

      <section class="sec sec-white">
        <div class="wrap">
          <h2 class="h2 h2-md reveal">Сравни с другом</h2>
          <p class="lead sec-sub reveal">${friend ? `Результат по ссылке — ${M().type(friend).code} «${esc(M().type(friend).alias)}». Вот как устроены ваши отношения.` : 'Выбери тип близкого человека — покажем, как устроены ваши отношения.'}</p>
          <div class="reveal">${ui.calc(t.id, friend || dual.id)}</div>
        </div>
      </section>

      ${ui.resultShare(axes)}

      <section class="sec sec-line">
        <div class="wrap center">
          <h2 class="h2 h2-sm reveal"><span class="sv">Mystery box про ${t.code}</span></h2>
          <p class="lead sec-sub reveal">Случайный факт о${NB}твоём типе.</p>
          <div class="reveal">${ui.box({ typeId: t.id, compact: true })}</div>
          <p class="gap-top reveal"><a class="btn-ghost" href="#/test" data-restart-test>Пройти тест заново</a></p>
          <details class="how reveal">
            <summary>Как это считается</summary>
            <p>Каждый ответ сдвигает одну из четырёх шкал. Из суммы по шкале получается вероятность каждого полюса, а вероятность типа — произведение вероятностей его четырёх полюсов, поэтому по 16 типам всегда выходит 100 %.</p>
            <p>Соционика — популярная типологическая модель, а не проверенный научный метод. Относись к результату как к поводу понаблюдать за собой, а не как к диагнозу.</p>
          </details>
        </div>
      </section>`;
  }

  // Персонаж наезжает на нижнюю строку заголовка — на треть высоты букв
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
        const t = S.data.types[Math.floor(Math.random() * 16)];
        return `<section class="lost-hero" style="${ui.qStyle(t.quadra)}">
          <h1 class="display lost-title" data-fit data-min="12" data-max="16" data-maxh="16"><span class="fit-in"><span class="fit-line"><span class="sv">Пока</span></span> <span class="fit-line"><span class="sv">пусто</span></span></span></h1>
          <div class="lost-char">${ui.character(t, { sizes: ui.CHAR.hero, eager: true, alt: '' })}</div>
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
      const offs = [overlap(root), ui.mountCalc(root), ui.mountBox(root), ui.mountTips(root), ui.mountResultShare(root, axes)];
      if (S.state.justFinished) {
        S.state.justFinished = false;
        const t = M().type(S.core.scoring.result(axes).top.id);
        const c = S.theme.quadraColor(t.quadra);
        setTimeout(() => S.fx.confetti([c, S.color.tone(c, 0.35), '#b600a8', '#d7e2ea'], { y: 0.3 }), 450);
      }
      const again = root.querySelector('[data-restart-test]');
      if (again) again.addEventListener('click', () => S.store.del('test'));
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
        <p class="sh-badge"><i aria-hidden="true"></i>Тебе прислали результат теста Socio-Nik</p>
        ${greet('Это', t)}
        <div class="res-meta">
          <p class="res-code">${t.code}</p>
          <p class="res-name">${esc(t.name)}</p>
          <p class="res-alias">«${esc(t.alias)}» · ${esc(t.role)} · квадра ${q.name} · ${res.top.pct}${NB}%</p>
          <p class="sh-motto"><span>Коротко о типе</span>«${esc(c.tagline || '')}»</p>
          <div class="cta">
            ${mine ? `<a class="btn" href="#/relations/${mine.id}/${t.id}">Ваши отношения</a><a class="link" href="#/test" data-friend>Пройти тест заново</a>`
                   : `${test('Узнать свой тип')}<a class="link" href="#/types/${t.id}">Подробнее о${NB}${t.code}</a>`}
          </div>
          <p class="sh-note">20 вопросов · около 4 минут · без регистрации</p>
        </div>
      </section>

      <section class="sec sec-white">
        <div class="wrap center">
          <p class="eyebrow reveal">${mine ? 'Вы вдвоём' : 'Твоя очередь'}</p>
          <h2 class="h2 h2-md reveal">${mine ? `${mine.code} и ${t.code}` : 'А какой тип у тебя?'}</h2>
          <p class="lead reveal">${mine ? esc(ui.relText(rel.kind).line || '') : 'Пройди тест — и сразу увидишь, как устроены ваши отношения: дуальные, зеркальные, деловые или ещё какие-то из четырнадцати видов.'}</p>
          <div class="sh-pair reveal">${mine ? ui.duo(mine, t, { labels: ['Ты', t.code] }) : ui.duoMystery(t)}</div>
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
          <p class="reveal gap-top"><a class="link" href="#/types/${t.id}">Всё о${NB}${t.code}: описание, модель${NB}А, отношения</a></p>
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
    valid: code => Boolean(S.core.payload.decode(code)),
    render(code) { return sharedPage(S.core.payload.decode(code)); },
    mount(root, code) {
      const axes = S.core.payload.decode(code);
      const onClick = e => {
        if (e.target.closest('[data-friend]')) { S.state.friend = axes; S.store.del('test'); }
      };
      root.addEventListener('click', onClick);
      const off = overlap(root);
      return () => { root.removeEventListener('click', onClick); off(); };
    }
  };
})(window);
