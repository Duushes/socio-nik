/* Socio-Nik · результат: свой (#/result) и по ссылке (#/r/1-72-64-58-19).
   Главный следующий шаг после теста — пара: позвать партнёра или открыть совместимость, если тест пройден по приглашению. */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;
  const M = () => S.core.modelA;
  const enc = axes => S.core.payload.encode(axes);
  const humanTitle = r => ((S.content.pair || {}).titles || {})[r.id] || ui.kindTitle(r.kind);
  // строка о паре — своя, «как вы устроены и что помогает», а не общая соционическая
  const pairLine = r => ((S.content.pair || {}).lines || {})[r.id] || ui.relText(r.kind).line || '';

  // Тест пройден по приглашению — сначала свой тип (выше), потом сразу ваша пара
  function friendPair(me, fr, myAxes, frAxes) {
    const r = M().relation(me, fr);
    return `
      <section class="sec sec-alt sh-you">
        <div class="wrap center">
          <h2 class="title">${me.mbti} и ${fr.mbti}: ${esc(humanTitle(r).toLowerCase())}</h2>
          <div class="sh-pair reveal" data-anim>${ui.pairScene(me, fr, { labels: ['ты · ' + me.mbti, fr.mbti] })}</div>
          <p class="lead">${esc(pairLine(r))}</p>
          <p><a class="btn btn-lg" href="#/pair/${enc(myAxes)}/${enc(frAxes)}" data-pair-go>Смотреть нашу совместимость</a></p>
          <p class="sub">На экране пары будет ссылка: отправь её обратно, чтобы совместимость увидели оба.</p>
        </div>
      </section>`;
  }

  // Партнёр уже есть на этом устройстве — короткая карточка пары
  function savedPair(axes) {
    const p = S.core.couple.partner();
    const side = p ? S.core.couple.side(p.code) : null;
    if (!side) return '';
    const me = M().type(S.core.scoring.result(axes).top.id), r = M().relation(me, side.type);
    const name = p.name ? ` · ${esc(p.name)}` : '';
    return `<a class="card link-card saved-pair" href="#/pair/${enc(axes)}/${p.code}" style="${ui.qStyle(side.type.quadra)}">
      <span class="lc-art">${ui.pairScene(me, side.type, { labels: ['ты', side.type.mbti] })}</span>
      <span class="lc-kicker">Ваша пара${name}</span>
      <span class="lc-title">${me.mbti} и ${side.type.mbti}: ${esc(humanTitle(r).toLowerCase())}</span>
      <span class="lc-text">${esc(pairLine(r))}</span>
    </a>`;
  }

  function nextCards(res) {
    return res.next.map((r, i) => {
      const tt = M().type(r.id);
      return `<a class="next-card" style="${ui.qStyle(tt.quadra)};--i:${i}" href="#/types/${tt.id}">
        <span class="next-art">${ui.emblem(tt, { label: false })}</span>
        <span class="next-code">${tt.mbti}</span>
        <span class="next-name">${esc(tt.title)}, ${tt.code}</span>
        <span class="next-pct">${r.pct} %</span>
      </a>`;
    }).join('');
  }

  function page(axes) {
    const res = S.core.scoring.result(axes);
    const t = M().type(res.top.id), q = ui.quadra(t.quadra), c = ui.content(t.id);
    const dual = M().partner(t, 'dual');
    const [n1] = res.next.map(r => M().type(r.id));
    const qc = (S.content.quadras || {})[q.id] || {};
    const friendAxes = S.state.friend, friend = friendAxes ? M().type(S.core.scoring.result(friendAxes).top.id) : null;
    const link = S.share.url(axes), plain = S.share.text(axes, { withUrl: false });
    const saved = friend ? '' : savedPair(axes);

    return `
      <section class="res-hero" style="${ui.qStyle(t.quadra)}" data-anim>
        <div class="res-glow" aria-hidden="true"></div>
        <div class="wrap res-top">
          <p class="eyebrow">Твой тип</p>
          <div class="res-emblem" data-reveal-type>${ui.emblem(t, { live: true, cls: 'em-big' })}</div>
          <h1 class="res-code" data-type-code aria-label="${t.mbti}, ${esc(t.title)}">${t.mbti.split('').map((ch, k) => `<span style="--k:${k}">${ch}</span>`).join('')}</h1>
          <p class="res-name">${esc(t.title)}</p>
          <div class="res-pct"><span class="big" data-count="${res.top.pct}">${res.top.pct}</span><span class="pc">%</span></div>
          <p class="res-pct-lab">вероятность этого типа по твоим ответам</p>
          ${res.close ? `<p class="res-between">Результат между ${t.mbti} и ${n1.mbti}: загляни в оба описания.</p>` : ''}
          <div class="cta res-cta">${friend ? `<a class="btn btn-lg" href="#/pair/${enc(axes)}/${enc(friendAxes)}" data-pair-go>Смотреть нашу совместимость</a>`
            : saved ? `<a class="btn btn-lg" href="#/pair/${enc(axes)}/${S.core.couple.partner().code}">Открыть нашу пару</a><button class="btn btn-lg btn-ghost" type="button" data-goto-invite>Позвать партнёра</button>`
            : `<button class="btn btn-lg" type="button" data-goto-invite>Позвать партнёра</button><a class="btn btn-lg btn-ghost" href="#/duo">Пройти вдвоём</a>`}</div>
        </div>
      </section>
      ${friend ? friendPair(t, friend, axes, friendAxes) : `
      <section class="sec sec-alt invite-sec" id="invite" tabindex="-1">
        <div class="wrap center">
          <h2 class="title">Позови партнёра.</h2>
          <p class="lead">Партнёру те же 20 вопросов и около 4 минут. Потом вы оба увидите, как устроены вместе: где дополняете друг друга и где нужна бережность.</p>
          ${ui.inviteBox(axes)}
          ${saved ? `<div class="saved-wrap">${saved}</div>` : ''}
        </div>
      </section>`}

      <section class="sec">
        <div class="wrap">
          <h2 class="title-sm">Коротко о типе</h2>
          <p class="lead-sm">${esc(c.tagline || '')}</p>
          <p class="body">${esc((c.about || [])[0] || '')}</p>
          <p class="sub">В соционике этот тип называют ${t.code} «${esc(t.alias)}», квадра ${q.name}.</p>
          <p><a class="link" href="#/types/${t.id}">Читать полностью</a></p>
          ${ui.celebLine(t)}
          <div class="grid2 gap-top">
            <a class="card link-card" href="#/pair/${enc(axes)}/${dual.mbti.toLowerCase()}" style="${ui.qStyle(dual.quadra)}">
              <span class="lc-art">${ui.emblem(dual, { label: false })}</span>
              <span class="lc-kicker">Тип-дополнение по соционике</span>
              <span class="lc-title">${dual.mbti}, ${esc(dual.title)}</span>
              <span class="lc-text">В соционике это самая лёгкая пара. Но и другие пары бывают счастливыми: у каждой своя карта.</span>
            </a>
            <a class="card link-card" href="#/quadras#${q.id}" style="${ui.qStyle(q.id)};--i:1">
              <span class="lc-art" data-anim>${S.art.quadraEmblem(q)}</span>
              <span class="lc-kicker">Твоя квадра</span>
              <span class="lc-title">${q.name}</span>
              <span class="lc-text">${esc(qc.motto || '')}</span>
            </a>
          </div>
        </div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap">
          <h2 class="title-sm reveal">Ещё похоже на</h2>
          <div class="next-grid">${nextCards(res)}</div>
          <h2 class="title-sm reveal gap-top">Четыре шкалы</h2>
          <p class="sub reveal">Какой полюс каждой шкалы тебе ближе. Из них и складывается код из четырёх букв.</p>
          ${ui.axisBars(res.axes)}
          <h2 class="title-sm reveal gap-top">Все 16 типов</h2>
          <p class="sub">Вероятности по всем типам складываются в 100 %. <span class="on-hover">Наведи на строку, чтобы увидеть подробности.</span><span class="on-touch">Нажми на строку, чтобы увидеть подробности.</span></p>
          ${ui.distribution(res)}
        </div>
      </section>

      <section class="sec">
        <div class="wrap">
          <h2 class="title-sm reveal">Сравни с кем угодно</h2>
          <p class="sub reveal">${friend ? `Тебя позвал ${friend.mbti} «${esc(friend.title)}». А вот как ты ладишь с другими типами.` : 'Знаешь тип друга, мамы или коллеги? Выбери — покажем, как устроены ваши отношения.'}</p>
          <div class="reveal">${ui.calc(t.id, friend ? friend.id : dual.id)}</div>
        </div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap">
          <div class="share" data-share>
            <div class="share-preview tilt reveal">
              <canvas class="share-canvas" width="1080" height="1920" role="img" aria-label="Картинка с результатом: ${t.mbti}, ${res.top.pct} %"></canvas>
              <span class="glare" aria-hidden="true"></span>
            </div>
            <div class="share-side reveal" style="--i:1">
              <h2 class="title-sm">Поделись результатом</h2>
              <p class="sub">Картинка для сторис или поста — с твоим типом, процентами и шкалами.</p>
              <div class="seg" role="group" aria-label="Формат картинки">
                <button type="button" data-fmt="story" aria-pressed="true">Сторис</button>
                <button type="button" data-fmt="post" aria-pressed="false">Пост</button>
              </div>
              <div class="share-actions">
                <button class="btn" type="button" data-do="share" hidden>Поделиться</button>
                <button class="btn" type="button" data-do="download">Скачать картинку</button>
                <button class="btn btn-ghost" type="button" data-do="copy">Скопировать текст</button>
              </div>
              ${S.social.bar({ text: plain, url: link, label: 'Поделиться результатом' })}
              <p class="share-status" aria-live="polite"></p>
            </div>
          </div>
        </div>
      </section>

      <section class="sec">
        <div class="wrap">
          <h2 class="title-sm reveal">Mystery box про ${t.mbti}</h2>
          <p class="sub reveal">Случайный факт о твоём типе.</p>
          <div class="reveal">${ui.box({ typeId: t.id, compact: true })}</div>
        </div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap center">
          <p class="reveal"><a class="btn btn-ghost" href="#/test" data-restart-test>Пройти тест заново</a></p>
          <details class="how reveal">
            <summary>Как это считается</summary>
            <p>Каждый ответ сдвигает одну из четырёх шкал. Из суммы по шкале получается вероятность каждого полюса, а вероятность типа — произведение вероятностей его четырёх полюсов, поэтому по 16 типам всегда выходит 100 %.</p>
            <p>Код из четырёх букв — как в MBTI, описания и совместимость — по соционике. Это популярные типологии, а не проверенный научный метод: относись к результату как к поводу понаблюдать за собой, а не как к диагнозу.</p>
          </details>
        </div>
      </section>`;
  }

  function mountShare(root, axes) {
    const box = root.querySelector('[data-share]');
    if (!box) return () => {};
    const canvas = box.querySelector('canvas'), status = box.querySelector('.share-status');
    let fmt = 'story';
    const draw = () => {
      try { S.share.render(canvas, axes, fmt); } catch (e) { status.textContent = 'Не получилось нарисовать картинку'; }
    };
    draw();
    const shareBtn = box.querySelector('[data-do="share"]');
    if (S.share.canShareFiles()) shareBtn.hidden = false;
    box.addEventListener('click', async e => {
      const f = e.target.closest('[data-fmt]');
      if (f) {
        fmt = f.dataset.fmt;
        box.querySelectorAll('[data-fmt]').forEach(b => b.setAttribute('aria-pressed', String(b === f)));
        box.classList.toggle('is-post', fmt === 'post');
        draw();
        return;
      }
      const act = e.target.closest('[data-do]');
      if (!act) return;
      const id = M().type(S.core.scoring.result(axes).top.id).mbti.toLowerCase();
      try {
        if (act.dataset.do === 'share') { await S.share.share(canvas, axes, fmt); status.textContent = ''; }
        if (act.dataset.do === 'download') { S.share.download(await S.share.toBlob(canvas), `socio-nik-${id}-${fmt}.png`); status.textContent = 'Картинка сохранена'; }
        if (act.dataset.do === 'copy') status.textContent = (await S.share.copy(S.share.text(axes))) ? 'Текст скопирован' : 'Не удалось скопировать — выдели текст вручную';
      } catch (err) {
        if (err && err.name !== 'AbortError') status.textContent = 'Не получилось — попробуй «Скачать картинку»';
      }
    });
    // Картинка для сторис уходит файлом, остальные сети берут текст и ссылку на результат
    return S.social.mount(box, {
      text: () => S.share.text(axes, { withUrl: false }),
      url: () => S.share.url(axes),
      image: () => { const c = document.createElement('canvas'); S.share.render(c, axes, 'story'); return S.share.toBlob(c); },
      status: () => status
    });
  }

  V.result = {
    needs: ['types', 'relations', 'functions', 'modelA', 'celebs', 'facts'],
    title: () => {
      const a = S.state.result();
      return a ? 'Твой тип — ' + M().type(S.core.scoring.result(a).top.id).mbti : 'Результат';
    },
    render() {
      const axes = S.state.result();
      if (!axes) {
        return `<section class="sec empty"><div class="wrap center">
          <div class="lost" aria-hidden="true">${S.art.glyphSVG('Ni', S.theme.quadraColor('gamma'), 'lost-svg')}</div>
          <h1 class="title">Результата пока нет</h1>
          <p class="lead">Пройди тест — это 20 вопросов и около 4 минут.</p>
          <p><a class="btn btn-lg" href="#/test">Узнать свой тип</a></p></div></section>`;
      }
      return page(axes);
    },
    mount(root) {
      const axes = S.state.result();
      if (!axes) return () => {};
      const offs = [ui.mountCalc(root), ui.mountBox(root), ui.mountTips(root), mountShare(root, axes), ui.mountInvite(root, axes)];
      if (S.state.justFinished) {
        S.state.justFinished = false;
        const t = M().type(S.core.scoring.result(axes).top.id);
        const c = S.theme.quadraColor(t.quadra);
        setTimeout(() => S.fx.confetti([c, S.color.tone(c, 0.35), S.color.tone(c, -0.2), '#ffffff'], { y: 0.3 }), 450);
      }
      const again = root.querySelector('[data-restart-test]');
      if (again) again.addEventListener('click', () => S.store.del('test'));
      // «Позвать партнёра» в первом экране — к приглашению; после теста, начатого ради приглашения, — сами туда же
      const goInvite = () => {
        const sec = root.querySelector('#invite');
        if (!sec) return;
        sec.scrollIntoView({ behavior: S.dom.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
        sec.focus({ preventScroll: true });
      };
      const onGo = e => { if (e.target.closest('[data-goto-invite]')) goInvite(); };
      root.addEventListener('click', onGo);
      let timer = 0;
      if (S.store.get('intent', null) === 'invite') { S.store.del('intent'); timer = setTimeout(goInvite, 1600); }
      offs.push(() => { root.removeEventListener('click', onGo); clearTimeout(timer); });
      return () => offs.forEach(f => f && f());
    }
  };

  // Страница для того, кто открыл ссылку на чужой результат: чей-то тип + приглашение пройти тест и увидеть пару
  function sharedPage(axes, code) {
    const res = S.core.scoring.result(axes);
    const t = M().type(res.top.id), q = ui.quadra(t.quadra), c = ui.content(t.id);
    const myAxes = S.state.result(), mineId = S.state.myType(), mine = mineId ? M().type(mineId) : null;
    const rel = mine ? M().relation(mine, t) : null;
    const pairHref = myAxes ? `#/pair/${enc(myAxes)}/${code}` : '';
    const test = label => `<a class="btn btn-lg" href="#/test" data-friend>${label}</a>`;
    return `
      <section class="res-hero sh-hero" style="${ui.qStyle(t.quadra)}" data-anim>
        <div class="res-glow" aria-hidden="true"></div>
        <div class="wrap res-top">
          <p class="sh-badge">Тебе прислали результат теста Socio-Nik</p>
          <div class="res-emblem">${ui.emblem(t, { live: true, cls: 'em-big' })}</div>
          <h1 class="res-code" aria-label="${t.mbti}, ${esc(t.title)}">${t.mbti}</h1>
          <p class="res-name">${esc(t.title)}</p>
          <p class="sh-motto"><span>Коротко о типе</span>«${esc(c.tagline || '')}»</p>
          <div class="cta">
            ${mine ? `<a class="btn btn-lg" href="${pairHref}">Наша совместимость</a><a class="link" href="#/test" data-friend>Пройти тест заново</a>`
                   : `${test('Узнать свой тип')}<a class="link" href="#/types/${t.id}">Подробнее о ${t.mbti}</a>`}
          </div>
          <p class="sh-note">20 вопросов, около 4 минут, без регистрации</p>
        </div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap center">
          <h2 class="title">${mine ? `${mine.mbti} и ${t.mbti}: ${esc(humanTitle(rel).toLowerCase())}` : 'А какой тип у тебя?'}</h2>
          <p class="lead">${mine ? esc(pairLine(rel)) : 'Пройди тест и сразу увидишь, как вы устроены вдвоём: где дополняете друг друга, а где нужна бережность.'}</p>
          <div class="sh-pair reveal" data-anim>${mine ? ui.pairScene(mine, t, { labels: ['ты · ' + mine.mbti, t.mbti] }) : S.art.mystery(t)}</div>
          ${mine ? `<p><a class="btn" href="${pairHref}">Открыть экран пары</a></p>` : `<p>${test('Узнать свой тип')}</p>`}
        </div>
      </section>

      <section class="sec">
        <div class="wrap">
          <h2 class="title-sm reveal">Как распределились ответы</h2>
          <p class="sub reveal">Какой полюс каждой шкалы ближе тому, кто прислал ссылку.</p>
          ${ui.axisBars(res.axes)}
          <h2 class="title-sm reveal gap-top">Ещё похоже на</h2>
          <div class="next-grid">${nextCards(res)}</div>
        </div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap narrow">
          <h2 class="title-sm">Про ${t.mbti}</h2>
          <p class="sub">Отрывок из описания, оно написано для человека этого типа. В соционике этот тип называют ${t.code} «${esc(t.alias)}», квадра ${q.name}; совпадение с ним — ${res.top.pct} %.</p>
          <p class="body reveal">${esc((c.about || [])[0] || '')}</p>
          <ul class="checks reveal" style="${ui.qStyle(t.quadra)}">${(c.strengths || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          ${ui.celebLine(t)}
          <p class="reveal gap-top"><a class="link" href="#/types/${t.id}">Всё о ${t.mbti}: описание, модель А, отношения</a></p>
        </div>
      </section>

      <section class="sec final">
        <div class="wrap center">
          <h2 class="title reveal">${mine ? 'Сравни и с другими.' : 'Твоя очередь.'}</h2>
          <p class="lead">${mine ? 'Калькулятор покажет отношения с любым из 16 типов.' : 'Узнай свой тип и как вы с этим человеком дополняете друг друга.'}</p>
          <p>${mine ? '<a class="btn btn-lg" href="#/relations">Открыть калькулятор</a>' : test('Узнать свой тип')}</p>
        </div>
      </section>`;
  }

  V.shared = {
    needs: ['types', 'relations', 'functions', 'modelA', 'celebs', 'facts'],
    title: code => {
      const axes = S.core.payload.decode(code);
      return 'Результат друга — ' + M().type(S.core.scoring.result(axes).top.id).mbti;
    },
    valid: code => Boolean(S.core.payload.decode(code)),
    render(code) { return sharedPage(S.core.payload.decode(code), code); },
    mount(root, code) {
      const axes = S.core.payload.decode(code);
      const onClick = e => {
        if (e.target.closest('[data-friend]')) { S.state.friend = axes; S.store.del('test'); S.core.couple.setDuo(null); }
      };
      root.addEventListener('click', onClick);
      return () => root.removeEventListener('click', onClick);
    }
  };
})(window);
