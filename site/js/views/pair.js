/* Socio-Nik · пара — главный сценарий сайта.
   #/pair — «Совместимость»: три способа (вдвоём на одном телефоне, ссылкой, «мы знаем свои коды»);
   #/duo — передача телефона в тесте вдвоём; #/i/<код> — приглашение партнёра;
   #/pair/<a>/<b> (и старые #/relations/<a>/<b>) — экран пары: бесплатно — типы и совместимость,
   за пейволом — разбор: карта общих функций и рекомендации. Стороны в ссылке — коды результатов или типы,
   имён в ссылках нет никогда. */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;
  const M = () => S.core.modelA;
  const PR = () => S.core.pair;
  const CP = () => S.core.couple;
  const P = () => (S.content && S.content.pair) || {};
  const enc = axes => S.core.payload.encode(axes);

  // Тексты разбора — по требованию
  const FILES = ['js/content/pair-zones-1.js', 'js/content/pair-zones-2.js', 'js/content/pair-zones-3.js', 'js/content/pair-zones-4.js',
    'js/content/pair-relations-1.js', 'js/content/pair-relations-2.js',
    'js/content/pair-partner-alpha.js', 'js/content/pair-partner-beta.js', 'js/content/pair-partner-gamma.js', 'js/content/pair-partner-delta.js'];
  const reportReady = () => {
    const p = P();
    return Boolean(p.zones && PR().ORDER.every(a => p.zones[a]) && p.relations && Object.keys(p.relations).length >= 16 &&
      p.partnerView && S.data.types.every(t => p.partnerView[t.id]));
  };
  const loadReport = () => S.lazy(FILES, reportReady);

  const base = () => (S.config && S.config.SITE_URL ? S.config.SITE_URL.replace(/\/$/, '') : '');
  const pairUrl = (x, y) => (base() ? `${base()}/#/pair/${x}/${y}` : '');
  const inviteUrl = axes => (base() ? `${base()}/#/i/${enc(axes)}` : '');

  // Подписи функций модели А — человеческими словами
  const POS = { 1: 'главная сила', 2: 'сильная сторона', 3: 'даётся с напряжением', 4: 'уязвимое место', 5: 'очень нужно', 6: 'бодрит', 7: 'умеет, но держит в тени', 8: 'легко, но не всерьёз' };

  const typeLine = t => `${t.mbti} · ${t.title}`;
  const socio = t => `${t.code} «${t.alias}»`;
  const codeOfType = t => t.mbti.toLowerCase();

  // ---------- кто есть кто ----------
  // «Ты» — сторона, совпадающая с результатом этого устройства; иначе первая в ссылке
  function sides(x, y) {
    const a = CP().side(x), b = CP().side(y);
    if (!a || !b) return null;
    const my = S.state.result(), myCode = my ? enc(my) : '', myType = S.state.myType();
    let flip = false;
    if (myCode && b.code === myCode && a.code !== myCode) flip = true;
    else if (myType && a.code !== myCode && b.code !== myCode && b.type.id === myType && a.type.id !== myType) flip = true;
    return flip ? { me: b, partner: a, path: [x, y] } : { me: a, partner: b, path: [x, y] };
  }

  // Переключатель «глазами партнёра» — на время просмотра этой пары
  let persp = { key: '', swapped: false };
  const perspective = sd => {
    const key = sd.path.join('/');
    if (persp.key !== key) persp = { key, swapped: false };
    return persp.swapped ? { me: sd.partner, partner: sd.me, path: sd.path, swapped: true } : Object.assign({ swapped: false }, sd);
  };

  // Подписи сторон: «ты» — та, от чьего лица сейчас написан текст; партнёр — по имени, если оно сохранено
  const partnerLabel = sd => CP().nameFor(sd.partner.code) || 'партнёр';
  const meLabel = () => 'ты';

  // ---------- хаб «Совместимость» ----------
  const ICON = {
    duo: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.8" width="11" height="18.4" rx="2.8" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="10.2" cy="10.5" r="1.9" fill="currentColor"/><circle cx="13.8" cy="13.5" r="1.9" fill="none" stroke="currentColor" stroke-width="1.75"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.2 13.8a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.1 1.1M13.8 10.2a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.1-1.1" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>',
    codes: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="8" height="12" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.75"/><rect x="13" y="6" width="8" height="12" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M5.6 10.5h2.8M15.6 10.5h2.8M5.6 13.5h2.8M15.6 13.5h2.8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>'
  };

  // Выбор кода MBTI: нативный select. Без своего кода — пустой пункт-подсказка: чужую пару не подставляем
  ui.mbtiSelect = (name, selected, label) => `
    <label class="pick"><span class="pick-lab">${esc(label)}</span>
      <span class="pick-box"><select name="${name}" data-${name}>
        ${selected ? '' : '<option value="" selected disabled>Выбери код</option>'}
        ${S.data.types.slice().sort((x, y) => (x.mbti < y.mbti ? -1 : 1)).map(t =>
          `<option value="${codeOfType(t)}"${t.id === selected ? ' selected' : ''}>${t.mbti}, ${esc(t.title)}</option>`).join('')}
      </select></span>
    </label>`;

  // Приглашение партнёра: кнопки сетей, ссылка, «на этом телефоне»
  ui.inviteBox = axes => {
    const t = M().type(S.core.scoring.result(axes).top.id), url = inviteUrl(axes);
    const text = `Мой тип — ${t.mbti} «${t.title}». Пройди тест на 16 типов, это 4 минуты, и посмотрим, как мы устроены вместе.`;
    return `<div class="invite" data-invite-box>
      ${url ? S.social.bar({ text, url, label: 'Позвать партнёра' }) : '<p class="sub">Ссылки появятся, когда сайт выложен.</p>'}
      <p class="invite-alt"><a class="btn btn-ghost" href="#/duo" data-duo-now>Пройти вдвоём</a><a class="link" href="#/pair#codes">Ввести коды</a></p>
      <p class="share-status" aria-live="polite"></p>
    </div>`;
  };
  ui.mountInvite = (scope, axes) => {
    const box = scope.querySelector('[data-invite-box]');
    if (!box) return () => {};
    const t = M().type(S.core.scoring.result(axes).top.id);
    const off = S.social.mount(box, {
      text: () => `Мой тип — ${t.mbti} «${t.title}». Пройди тест на 16 типов, это 4 минуты, и посмотрим, как мы устроены вместе.`,
      url: () => inviteUrl(axes),
      image: () => { const c = document.createElement('canvas'); S.share.render(c, axes, 'story'); return S.share.toBlob(c); },
      status: () => box.querySelector('.share-status')
    });
    const onClick = e => {
      if (e.target.closest('[data-social]')) S.track('invite_created', { net: e.target.closest('[data-social]').dataset.social });
      if (e.target.closest('[data-duo-now]')) { CP().setDuo(2); S.store.del('test'); S.track('pair_start', { mode: 'duo' }); }
    };
    box.addEventListener('click', onClick);
    return () => { off(); box.removeEventListener('click', onClick); };
  };

  V.couple = {
    title: () => 'Совместимость',
    render() {
      const my = S.state.result(), myType = S.state.myType(), p = CP().partner();
      const saved = my && p ? sides(enc(my), p.code) : null;
      return `
        <section class="sec page-head couple-head">
          <div class="wrap center">
            <h1 class="title">Три способа увидеть вашу пару.</h1>
            <p class="lead">Каждый из вас проходит тест на 16 типов: 20 вопросов, около 4 минут. Совместимость покажем сразу и бесплатно.</p>
            ${saved ? `<p><a class="mine" href="#/pair/${saved.path[0]}/${saved.path[1]}">Ваша пара: ${saved.me.type.mbti} и ${saved.partner.type.mbti} ›</a></p>` : ''}
          </div>
          <div class="wrap">
            <div class="ways">
              <article class="card way" id="duo">
                <span class="way-ic">${ICON.duo}</span>
                <h2 class="way-title">Вдвоём на одном телефоне</h2>
                <p>Сначала отвечаешь ты, потом партнёр. Ответы сохранятся отдельно, твой результат никуда не денется.</p>
                <p class="way-cta"><a class="btn" href="#/duo">Пройти вдвоём</a></p>
              </article>
              <article class="card way" id="invite">
                <span class="way-ic">${ICON.link}</span>
                <h2 class="way-title">Позвать по ссылке</h2>
                ${my ? `<p>Отправь ссылку: партнёр пройдёт тест у себя, и вы увидите совместимость.</p>${ui.inviteBox(my)}`
                     : `<p>Сначала пройди тест, потом отправишь партнёру ссылку-приглашение.</p><p class="way-cta"><a class="btn" href="#/test" data-intent="invite">Узнать свой тип</a></p>`}
              </article>
              <article class="card way" id="codes">
                <span class="way-ic">${ICON.codes}</span>
                <h2 class="way-title">Мы знаем свои коды</h2>
                <p>Уже проходили тест на 16 типов? Выберите коды, и сразу покажем вашу пару.</p>
                <form class="codes" data-codes novalidate>
                  ${ui.mbtiSelect('ca', myType || null, 'Ты')}
                  ${ui.mbtiSelect('cb', null, 'Партнёр')}
                  <p class="form-err" role="alert" hidden>Выбери коды обоих: свой и партнёра.</p>
                  <button class="btn" type="submit">Показать пару</button>
                </form>
              </article>
            </div>
            <p class="couple-note">Без регистрации. Ответы остаются на этом устройстве, а в ссылках только коды результатов, без имён.</p>
          </div>
        </section>`;
    },
    mount(root) {
      const form = root.querySelector('[data-codes]');
      const onSubmit = e => {
        e.preventDefault();
        const x = form.querySelector('[data-ca]').value, y = form.querySelector('[data-cb]').value;
        const err = form.querySelector('.form-err');
        if (!x || !y) {
          err.hidden = false;
          (x ? form.querySelector('[data-cb]') : form.querySelector('[data-ca]')).focus();
          return;
        }
        err.hidden = true;
        S.track('pair_start', { mode: 'codes' });
        location.hash = `#/pair/${x}/${y}`;
      };
      const onChange = () => { const err = form.querySelector('.form-err'); if (err) err.hidden = true; };
      if (form) { form.addEventListener('submit', onSubmit); form.addEventListener('change', onChange); }
      const onIntent = e => { if (e.target.closest('[data-intent="invite"]')) S.store.set('intent', 'invite'); };
      root.addEventListener('click', onIntent);
      const my = S.state.result();
      const offs = [my ? ui.mountInvite(root, my) : null];
      return () => { if (form) { form.removeEventListener('submit', onSubmit); form.removeEventListener('change', onChange); } root.removeEventListener('click', onIntent); offs.forEach(f => f && f()); };
    }
  };

  // ---------- тест вдвоём: передача телефона ----------
  V.duo = {
    title: () => 'Тест вдвоём',
    render() {
      const d = CP().duo(), my = S.state.result();
      const t = my ? M().type(S.core.scoring.result(my).top.id) : null;
      if (d && d.step === 2 && t) {
        // передача хода — ритуал теста вдвоём: телефон один раз переезжает из руки в руку, без вечного парения
        return `
          <section class="sec page-head duo-page" style="${ui.qStyle(t.quadra)}">
            <div class="wrap center narrow">
              <div class="duo-hand handoff" aria-hidden="true">${ICON.duo}</div>
              <p class="duo-you"><span class="duo-you-em" aria-hidden="true">${ui.emblem(t, { label: false, cls: 'em-mini' })}</span>Твой тип: ${t.mbti}, ${esc(t.title)}</p>
              <h1 class="title">Теперь передай телефон партнёру.</h1>
              <p class="lead">Партнёру те же 20 вопросов и около 4 минут. Ответы сохранятся отдельно: твой результат останется на месте.</p>
              <p><a class="btn btn-lg" href="#/test" data-duo-go>Начать тест партнёра</a></p>
              <p><button class="ghost-btn subtle" type="button" data-duo-cancel>Отменить тест вдвоём</button></p>
            </div>
          </section>`;
      }
      return `
        <section class="sec page-head duo-page">
          <div class="wrap center narrow">
            <div class="duo-hand" aria-hidden="true">${ICON.duo}</div>
            <h1 class="title">Один телефон, двое.</h1>
            <p class="lead">Сначала отвечаешь ты, потом передаёшь телефон партнёру. После второго теста сразу откроется ваша совместимость.</p>
            ${t ? `<p class="duo-you"><span class="duo-you-em" aria-hidden="true">${ui.emblem(t, { label: false, cls: 'em-mini' })}</span>Твой тип уже есть: ${t.mbti}, ${esc(t.title)}</p>
                  <div class="cta"><button class="btn btn-lg" type="button" data-duo-reuse>Сразу к тесту партнёра</button><button class="ghost-btn" type="button" data-duo-start>Пройти мой тест заново</button></div>`
                : `<p><button class="btn btn-lg" type="button" data-duo-start>Начать с меня</button></p>`}
            <p class="sh-note">20 вопросов на каждого, около 4 минут, без регистрации</p>
          </div>
        </section>`;
    },
    mount(root) {
      const onClick = e => {
        if (e.target.closest('[data-duo-start]')) { CP().setDuo(1); S.store.del('test'); S.track('pair_start', { mode: 'duo' }); location.hash = '#/test'; }
        if (e.target.closest('[data-duo-reuse]')) { CP().setDuo(2); S.store.del('test'); S.track('pair_start', { mode: 'duo' }); S.app.render({ instant: true }); }
        if (e.target.closest('[data-duo-go]')) { S.store.del('test'); }
        if (e.target.closest('[data-duo-cancel]')) { CP().setDuo(null); S.store.del('test'); location.hash = '#/pair'; }
      };
      root.addEventListener('click', onClick);
      return () => root.removeEventListener('click', onClick);
    }
  };

  // ---------- приглашение партнёра ----------
  V.invite = {
    needs: ['types'],
    valid: code => Boolean(S.core.payload.decode(code)),
    title: () => 'Приглашение в пару',
    render(code) {
      const axes = S.core.payload.decode(code), t = M().type(S.core.scoring.result(axes).top.id), c = ui.content(t.id);
      const my = S.state.result();
      return `
        <section class="sec page-head invite-hero" style="${ui.qStyle(t.quadra)}">
          <div class="wrap center narrow">
            <div class="two" aria-hidden="true"><span class="two-c two-them">${t.mbti}</span><span class="two-c two-you">ты?</span></div>
            <h1 class="title">Тебя позвали проверить вашу пару.</h1>
            <p class="lead">${my ? 'Твой тип уже есть, поэтому совместимость откроется сразу.' : 'Пройди тест на 16 типов: 20 вопросов, около 4 минут. Потом вы оба увидите вашу совместимость.'}</p>
            <div class="cta">
              ${my ? `<a class="btn btn-lg" href="#/pair/${enc(my)}/${code}" data-invite-pair>Смотреть нашу совместимость</a>`
                   : '<a class="btn btn-lg" href="#/test" data-invite-go>Узнать свой тип</a>'}
            </div>
            <p class="sh-note">Без регистрации, ответы остаются на твоём телефоне</p>
          </div>
        </section>
        <section class="sec sec-alt">
          <div class="wrap">
            <div class="inviter" style="${ui.qStyle(t.quadra)}">
              <span class="inviter-em" aria-hidden="true">${ui.emblem(t, { label: false })}</span>
              <div>
                <p class="inviter-k">Кто тебя позвал</p>
                <h2 class="title-sm">${t.mbti}, ${esc(t.title)}</h2>
                <p class="body">${esc(c.tagline || '')}</p>
              </div>
            </div>
            <h2 class="title-sm gap-top">Что будет дальше</h2>
            <ol class="plan-steps">
              <li><h3>Узнать свой тип</h3><p>Код, название и пара фраз, в которых легко узнать себя.</p></li>
              <li><h3>Увидеть вашу пару</h3><p>Вид отношений, где вы дополняете друг друга и где нужна бережность.</p></li>
              <li><h3>Отправить ссылку обратно</h3><p>Совместимость увидите оба.</p></li>
            </ol>
          </div>
        </section>`;
    },
    mount(root, code) {
      const axes = S.core.payload.decode(code);
      S.track('invite_opened', {});
      const onClick = e => {
        if (e.target.closest('[data-invite-go]')) { S.state.friend = axes; S.store.del('test'); CP().setDuo(null); }
        if (e.target.closest('[data-invite-pair]')) CP().setPartner(code, { via: 'invite' });
      };
      root.addEventListener('click', onClick);
      return () => root.removeEventListener('click', onClick);
    }
  };

  // ---------- экран пары ----------
  function personCard(t, who, i) {
    const c = ui.content(t.id);
    return `<a class="card link-card person" style="${ui.qStyle(t.quadra)};--i:${i}" href="#/types/${t.id}">
      <span class="lc-art">${ui.emblem(t, { label: false })}</span>
      <span class="lc-kicker">${esc(who)}</span>
      <span class="lc-title">${t.mbti}, ${esc(t.title)}</span>
      <span class="lc-text">${esc(c.tagline || '')}</span>
    </a>`;
  }

  function teaser(sd) {
    const a = sd.me.type, b = sd.partner.type, zones = PR().map(a, b), sum = PR().summary(a, b), G = P().groups || {}, D = P().domains;
    const price = S.paywall.price(pairKey(sd)), sample = sampleOf(zones);
    return `
      <section class="sec offer-sec" id="razbor">
        <div class="wrap">
          <h2 class="title">Карта вашей пары.</h2>
          <p class="lead">Кто что ведёт в восьми сферах жизни и что с этим делать на этой неделе.</p>
          <div class="teaser">
            <div class="teaser-map">
              ${ui.pairVenn(a, b, { zones, mode: 'locked', sample, pname: partnerLabel(sd) })}
              <ul class="pv-legend teaser-counts" aria-label="Зоны вашей пары">${PR().GROUPS.map(g => `<li class="${sum[g.id] ? '' : 'zero'}">${S.art.groupIcon(g.id)}<span>${esc((G[g.id] || {}).short || g.id)}</span><b>${sum[g.id]}</b></li>`).join('')}</ul>
            </div>
            <div class="teaser-side">
              <div class="card sample reveal" data-sample="${sample.aspect}">
                <p class="sample-k">${S.art.groupIcon(sample.group)}<span>Открыто бесплатно</span></p>
                <h3 class="sample-title">${esc(D[sample.aspect].short)} <small>${esc(whoOf(sample))}</small></h3>
                <p class="sample-text" data-sample-text>${esc((G[sample.group] || {}).about || '')}</p>
              </div>
              <div class="offer-cta reveal">
                <button class="btn btn-lg" type="button" data-offer>Открыть все 8 сфер за ${S.paywall.rub(price)}</button>
                <button class="ghost-btn" type="button" data-offer-gift>Подарить разбор</button>
              </div>
            </div>
          </div>
          ${ui.offerInside()}
        </div>
      </section>`;
  }

  // Ключ пары для цены: одинаковый у обоих партнёров, в каком бы порядке ни стояли стороны в ссылке
  const pairKey = sd => sd.path.slice().sort().join('|');

  function reportShell(sd) {
    // скелет в раскладке разбора: два круга карты и две карточки сфер — понятно, что сейчас появится
    return `<section class="sec report" id="razbor" data-report="${esc(sd.path.join('/'))}">
      <div class="wrap"><div class="report-loading" aria-busy="true">
        <p class="sr" aria-live="polite">Собираем разбор…</p>
        <div class="sk sk-title"></div>
        <div class="sk-map" aria-hidden="true"><i></i><i></i></div>
        <div class="sk-zones" aria-hidden="true"><i></i><i></i></div>
      </div></div>
    </section>`;
  }

  // Подпись стороны: «ты — главная сила»
  const chip = (who, pos) => `<span class="who"><b>${esc(who)}</b> — ${POS[pos]}</span>`;

  // Сфера в разборе — коротко: кто где силён и одна фраза «вместе». Подробности (как у тебя, как у партнёра,
  // что сделать на неделе) — в шторке по кнопке «Подробнее»; карточку можно нажать целиком
  function zoneItem(z, sd) {
    const D = P().domains[z.aspect], copy = z.copy || {};
    const gist = copy.text ? PR().firstSentence(copy.text, 170) : '';
    const ink = S.theme.token('--muted');
    return `<li class="zone">
      <article class="zone-card" aria-labelledby="zn-${z.aspect}">
        <span class="zone-head"><span class="zone-glyph" aria-hidden="true">${S.art.glyphSVG(z.aspect, ink, 'zone-svg')}</span>
          <span class="zone-name"><h5 id="zn-${z.aspect}">${esc(D.short)}</h5><small>${esc(D.long)}</small></span></span>
        <span class="zone-who">${chip(meLabel(sd), z.posA)}${chip(partnerLabel(sd), z.posB)}</span>
        ${gist ? `<p class="zone-text">${esc(gist)}</p>` : ''}
        <button type="button" class="zone-more-btn" data-aspect="${z.aspect}" aria-haspopup="dialog" aria-label="${esc(D.short)}: подробнее">Подробнее</button>
      </article>
    </li>`;
  }

  // ---------- карта пары: Венн «мы двое» ----------
  // Кто ведёт сферу — человеческими словами; без рода и без имён внутри фразы
  const WHO = {
    complement: s => (s === 'me' ? 'ведёшь ты' : 'ведёт партнёр'),
    cover: s => (s === 'me' ? 'ведёшь ты, незаметно' : 'ведёт партнёр, незаметно'),
    ask: s => (s === 'me' ? 'партнёр сможет, если попросишь' : 'ты сможешь, если партнёр попросит'),
    values: s => (s === 'me' ? 'сильны вместе, тебе это важнее' : 'сильны вместе, партнёру это важнее'),
    press: s => (s === 'me' ? 'тебе легко, партнёру трудно' : 'партнёру легко, тебе трудно'),
    shared: () => 'сильны вместе и цените это',
    background: () => 'получается у вас двоих, без лишнего значения',
    need: () => 'нужно вам двоим, а дать некому',
    blind: () => 'трудно вам двоим',
    unanswered: s => (s === 'me' ? 'тебе нужно, партнёру трудно' : 'партнёру нужно, тебе трудно')
  };
  const whoOf = z => (WHO[z.kind] ? WHO[z.kind](z.side) : '');

  // Сфера, которую тизер показывает бесплатно: лучше всего — где ты дополняешь партнёра
  const SAMPLE = [z => z.group === 'fit' && z.side === 'me', z => z.group === 'fit', z => z.group === 'common', z => z.group === 'ask', z => z.group === 'care', () => true];
  function sampleOf(zones) {
    for (const f of SAMPLE) { const z = zones.find(f); if (z) return z; }
    return zones[0];
  }

  // mode: open — разбор (фишки открывают шторку сферы), locked — тизер (имена скрыты, кроме одной сферы),
  // demo — пример на главной. Фишка стоит у того, кто в сфере силён; значок — вид зоны
  ui.pairVenn = (a, b, { zones, mode = 'open', sample = null, pname = 'партнёр', label = '' } = {}) => {
    const PV = S.art.pairVenn, D = P().domains, G = P().groups || {};
    const z0 = zones || PR().map(a, b), L = PV.layout(z0), c = PV.colors(a, b, S.theme.resolved());
    const locked = mode === 'locked', interactive = mode !== 'demo';
    const cap = { me: 'Ведёшь ты', both: 'Сильны вместе', partner: `Ведёт ${pname}` };
    const chip = (s, i) => {
      const z = s.z, free = locked && sample && z.aspect === sample.aspect, hidden = locked && !free;
      const name = D[z.aspect].short, gt = (G[z.group] || {}).title || '';
      const tag = interactive ? 'button' : 'span';
      const attrs = !interactive ? 'aria-hidden="true"'
        : hidden ? 'type="button" data-offer aria-label="Закрытая сфера — откроется в разборе"'
        : `type="button" data-aspect="${z.aspect}" aria-label="${esc(name)}: ${esc(whoOf(z))}. ${esc(gt)}"`;
      const pos = s.region === 'none' ? `--d:${i}` : `--x:${s.x};--y:${s.y.toFixed(2)};--d:${i}`;
      return `<${tag} class="pv-chip g-${z.group}${hidden ? ' locked' : ''}${free ? ' free' : ''}" data-region="${s.region}" data-sphere="${esc(hidden ? '' : name)}" data-who="${esc(hidden ? '' : whoOf(z))}" data-gtitle="${esc(hidden ? '' : gt)}" ${attrs} style="${pos}">
        <span class="pv-ic">${hidden ? S.art.lockIcon('gi') : S.art.groupIcon(z.group)}</span><span class="pv-name">${hidden ? '<i class="pv-blur">•••••</i>' : esc(name)}</span>
      </${tag}>`;
    };
    const inStage = L.slots.filter(s => s.region !== 'none'), outside = L.slots.filter(s => s.region === 'none');
    const hint = locked ? `Открыта 1 сфера из 8 — остальные в разборе` : interactive ? 'Нажми на сферу — расскажем, как она устроена у вас' : 'Сфера стоит у того, кто в ней силён';
    return `<figure class="pv pv-${mode} reveal" data-pv style="--ca:${c.me};--cb:${c.partner}">
      <div class="pv-caps" aria-hidden="true">${['me', 'both', 'partner'].map((reg, i) => `<span class="pv-cap${L.count[reg] ? '' : ' zero'}" style="--i:${i}"><b title="${esc(cap[reg])}">${esc(cap[reg])}</b><i>${L.count[reg]}</i></span>`).join('')}</div>
      <div class="pv-stage">
        <div class="pv-aura" aria-hidden="true"></div>
        ${PV.svg(a, b, { label: label || `Карта пары ${a.mbti} и ${b.mbti}` })}
        <span class="pv-flash" aria-hidden="true"></span>
        ${inStage.map((s, i) => chip(s, i)).join('')}
      </div>
      ${outside.length ? `<div class="pv-gap"><span class="pv-gap-cap">Не хватает паре <i>${outside.length}</i></span><div class="pv-gap-row">${outside.map((s, i) => chip(s, inStage.length + i)).join('')}</div></div>` : ''}
      <figcaption class="pv-readout" aria-live="polite">${esc(hint)}</figcaption>
    </figure>`;
  };

  // Наведение и фокус: подсвечиваем фишку и её регион, остальное приглушаем, в строке под картой — что это за сфера
  ui.mountVenn = scope => {
    const offs = [];
    scope.querySelectorAll('[data-pv]').forEach(fig => {
      const out = fig.querySelector('.pv-readout'), def = out.textContent;
      const set = ch => {
        fig.querySelectorAll('.pv-chip.on').forEach(x => x.classList.remove('on'));
        fig.classList.toggle('focus', Boolean(ch));
        fig.dataset.focus = ch ? ch.dataset.region : '';
        out.textContent = '';
        if (!ch) { out.textContent = def; return; }
        ch.classList.add('on');
        if (ch.classList.contains('locked')) { out.textContent = 'Закрытая сфера откроется в разборе'; return; }
        const b = document.createElement('b'), g = document.createElement('small');
        b.textContent = ch.dataset.sphere;
        g.textContent = ch.dataset.gtitle;
        out.append(b, `: ${ch.dataset.who}`, document.createElement('br'), g);
      };
      // при фокусе с клавиатуры имя фишки и так прозвучит — подпись под картой озвучиваем только для мыши
      const over = e => {
        const ch = e.target.closest && e.target.closest('.pv-chip');
        if (!ch || !fig.contains(ch)) return;
        out.setAttribute('aria-live', e.type === 'focusin' ? 'off' : 'polite');
        set(ch);
      };
      const leave = e => { if (!e.relatedTarget || !fig.contains(e.relatedTarget)) set(null); };
      fig.addEventListener('pointerover', over);
      fig.addEventListener('focusin', over);
      fig.addEventListener('pointerleave', leave);
      fig.addEventListener('focusout', leave);
      offs.push(() => { fig.removeEventListener('pointerover', over); fig.removeEventListener('focusin', over); fig.removeEventListener('pointerleave', leave); fig.removeEventListener('focusout', leave); });
    });
    return () => offs.forEach(f => f());
  };

  function mapBlock(sd, zones) {
    const a = sd.me.type, b = sd.partner.type, sum = PR().summary(a, b), G = P().groups;
    return `<div class="pv-wrap">
      ${ui.pairVenn(a, b, { zones, mode: 'open', pname: partnerLabel(sd) })}
      <ul class="pv-legend" aria-label="Виды зон">${PR().GROUPS.map(g => `<li class="${sum[g.id] ? '' : 'zero'}">${S.art.groupIcon(g.id)}<span>${esc(G[g.id].short)}</span><b>${sum[g.id]}</b></li>`).join('')}</ul>
    </div>`;
  }

  function reportHTML(sd) {
    const a = sd.me.type, b = sd.partner.type, rep = PR().report(a, b, P(), S.content.modelA), G = P().groups, D = P().domains, T = P().texts || {};
    const rel = rep.rel || {};
    const groups = PR().GROUPS.filter(g => rep.summary[g.id]);
    const leadList = list => list.map(asp => `<li><b>${esc(D[asp].short)}</b> — ${esc(D[asp].long)}</li>`).join('');
    const pname = partnerLabel(sd);
    // карточки «кто за что»: показываем только непустые
    const roles = [
      [rep.lead.me, `Ведёшь ты · ${a.mbti}`, 'то, что тебе легко, а партнёру нужно'],
      [rep.lead.partner, `Ведёт ${pname} · ${b.mbti}`, 'то, что партнёру легко, а тебе нужно'],
      [rep.can.partner, `${pname === 'партнёр' ? 'Партнёр' : pname} возьмёт, если попросишь`, 'умеет, но без просьбы не предложит'],
      [rep.can.me, 'Возьмёшь ты, если партнёр попросит', 'умеешь, но для тебя эта сфера не главная'],
      [rep.cares.me, 'Тебе это важнее', 'договоритесь, что последнее слово здесь — твоё'],
      [rep.cares.partner, 'Партнёру это важнее', 'здесь последнее слово — за партнёром'],
      [rep.split, 'Делите договорённостью', 'роли сами не делятся — распределите их явно']
    ].filter(([list]) => list.length);
    // Порядок — по тому, что паре важнее: карта → что делать на этой неделе → как мириться → сферы подробно →
    // кто за что → как устроена пара → когда звать третьего → тёплый финал «вечер вдвоём» с картинкой карты
    const nav = [['rp-map', 'Карта'], ['rp-deals', 'Что делать'], rel.repair ? ['rp-repair', 'Как мириться'] : null, ['rp-spheres', 'Сферы'], ['rp-evening', 'Вечер вдвоём']].filter(Boolean);
    return `
      <div class="wrap">
        <h2 class="title" tabindex="-1" data-report-title>Карта вашей пары.</h2>
        <div class="persp seg" role="group" aria-label="Чьими глазами читать разбор">
          <button type="button" data-persp="0" aria-pressed="${!sd.swapped}">С твоей стороны</button>
          <button type="button" data-persp="1" aria-pressed="${sd.swapped}">Глазами партнёра</button>
        </div>
        ${sd.swapped ? `<p class="persp-note">Теперь «ты» в тексте — это ${a.mbti}, а «партнёр» — ${b.mbti}. Так партнёр прочитает разбор о вас.</p>` : ''}
        <nav class="rp-nav" aria-label="Разделы разбора">${nav.map(([id, label], k) => `<button type="button" data-goto="${id}"${k === 0 ? ' aria-current="true"' : ''}>${label}</button>`).join('')}</nav>
        <div class="rp-anchor" id="rp-map">${mapBlock(sd, rep.zones)}</div>

        <section class="rp" id="rp-deals">
          <h3 class="rp-title">Пять договорённостей на эту неделю</h3>
          <ol class="deals">${rep.deals.map(d => `<li><span class="deal-dom">${S.art.groupIcon(d.group)}${esc(D[d.aspect].short)}</span>${esc(d.text)}</li>`).join('')}</ol>
        </section>

        ${rel.repair ? `<section class="rp" id="rp-repair">
          <h3 class="rp-title">Как мириться</h3>
          <p class="body">${esc(rel.repair)}</p>
          <ul class="scripts">${(rel.scripts || []).map(s => `<li><span class="sc-no"><i>Вместо</i>«${esc(s.instead.replace(/^«|»$/g, ''))}»</span><span class="sc-yes"><i>Скажи</i>«${esc(s.say.replace(/^«|»$/g, ''))}»</span></li>`).join('')}</ul>
        </section>` : ''}

        <section class="rp" id="rp-spheres">
          <h3 class="rp-title">Восемь сфер</h3>
          <div class="zone-groups">
            ${groups.map(g => `<section class="zg">
              <h4 class="zg-title">${S.art.groupIcon(g.id)}<span>${esc(G[g.id].title)}</span><b>${rep.summary[g.id]}</b></h4>
              <p class="zg-about">${esc(G[g.id].about)}</p>
              <ul class="zones">${rep.zones.filter(z => z.group === g.id).map(z => zoneItem(z, sd)).join('')}</ul>
            </section>`).join('')}
          </div>
        </section>

        <section class="rp">
          <h3 class="rp-title">Кто за что в паре</h3>
          <div class="grid2 lead-grid">
            ${roles.map(([list, title, hint]) => `<div class="card"><p class="lc-kicker">${esc(title)}</p><p class="role-hint">${esc(hint)}</p><ul>${leadList(list)}</ul></div>`).join('')}
          </div>
        </section>

        ${rel.story ? `<section class="rp">
          <h3 class="rp-title">Как устроена ваша пара</h3>
          ${rel.story.map(p => `<p class="body">${esc(p)}</p>`).join('')}
        </section>` : ''}

        <section class="rp">
          <h3 class="rp-title">Когда звать третьего</h3>
          <p class="body">${esc(T.third || '')}</p>
          <p class="safety">${esc(T.safety || '')}</p>
        </section>

        <section class="rp rp-evening" id="rp-evening">
          <h3 class="rp-title">Вечер вдвоём</h3>
          ${rel.ritual ? `<div class="card ritual"><h4 class="ritual-k">Ритуал на неделю</h4><p>${esc(rel.ritual)}</p></div>` : ''}
          <h4 class="rp-sub">Вопросы, которые стоит задать друг другу</h4>
          <ol class="questions">${rep.questions.map(q => `<li>${esc(q.text)}</li>`).join('')}</ol>
          <div class="rp-export" data-export>
            <button class="btn" type="button" data-map-story>Сохранить карту картинкой</button>
            <button class="btn btn-ghost" type="button" data-print>Сохранить в PDF</button>
            <p class="share-status" aria-live="polite"></p>
          </div>
        </section>
        ${S.paywall.inSurvey() ? ui.priceSurvey() : ''}
        <p class="rp-disc">${esc(T.disclaimer || '')}</p>
      </div>`;
  }

  // Шторка сферы: как это у тебя (свой текст модели А), что у партнёра, что вместе
  function zoneSheet(sd, aspect, from) {
    const a = sd.me.type, b = sd.partner.type;
    const rep = PR().report(a, b, P(), S.content.modelA), z = rep.zones.find(x => x.aspect === aspect);
    const D = P().domains[aspect], G = P().groups[z.group], F = S.data.functions, C = S.content;
    const own = C.modelA && C.modelA[a.id] && C.modelA[a.id][z.posA];
    const html = `<article class="fn zsheet" style="${ui.qStyle(a.quadra)}">
      <header class="fn-head sheet-drag">
        <div class="fn-art"><span class="fn-float">${S.art.glyphSVG(aspect, S.theme.quadraColor(a.quadra), 'fn-svg')}</span></div>
        <div class="fn-titles">
          <p class="fn-kicker">${S.art.groupIcon(z.group)} ${esc(G.title)}</p>
          <h2 class="fn-title">${esc(D.short)}</h2>
          <p class="fn-aspect">${esc(D.long)}</p>
        </div>
      </header>
      ${z.copy ? `<section class="fn-sec fn-main"><h3>Вместе</h3><p>${esc(z.copy.text)}</p><p class="fn-tip"><b>На этой неделе.</b> ${esc(z.copy.deal)}</p></section>` : ''}
      <section class="fn-sec"><h3>У тебя, ${a.mbti}: ${POS[z.posA]}</h3>
        <p>${esc(own ? own.text : C.positions[z.posA])}</p></section>
      <section class="fn-sec"><h3>У партнёра, ${b.mbti}: ${POS[z.posB]}</h3>
        <p>${esc(z.theirs || C.positions[z.posB])}</p></section>
    </article>`;
    return ui.openSheet({ label: `${D.short}: разбор сферы`, from, render: () => html });
  }

  // base — кто есть кто для этого устройства (шапка, бесплатная часть, шер); view — с чьей стороны читается разбор
  function pairPage(sd, view) {
    const a = sd.me.type, b = sd.partner.type, r = M().relation(a, b), txt = ui.relText(r.kind);
    const title = (P().titles || {})[r.id] || ui.kindTitle(r.kind);
    const line = (P().lines || {})[r.id] || txt.line || '';
    const helps = r.tone === 'tense' ? ((P().helps || {})[r.id] || []) : [];
    const role = txt.roles && txt.roles[r.id];
    const pName = CP().nameFor(sd.partner.code);
    const flip = r.id === 'benefactor' || r.id === 'supervisor';
    const [lq, rq] = flip ? [b.quadra, a.quadra] : [a.quadra, b.quadra];
    // коды типов — подписями под фигурами: «ты · ENTP», «партнёр · ISFJ» (или имя) — отдельная строка кодов не нужна
    const shortName = s => (s.length > 12 ? s.slice(0, 11).trimEnd() + '…' : s);
    const labels = [`${meLabel(sd)} · ${a.mbti}`, `${pName ? shortName(pName) : 'партнёр'} · ${b.mbti}`];
    const mine = S.state.result(), isMyPair = mine && (sd.me.code === enc(mine) || sd.partner.code === enc(mine));
    const unlocked = S.paywall.unlocked();
    return `
      <section class="pair-hero" data-anim>
        <div class="pair-glow" aria-hidden="true" style="--qa:var(--q-${lq});--qb:var(--q-${rq})"></div>
        <div class="wrap center">
          <div class="pair-scene reveal">${ui.pairScene(a, b, { labels })}</div>
          <h1 class="title">${esc(title)}</h1>
          <p class="lead">${esc(line)}</p>
          ${helps.length ? `<div class="help-card"><h2 class="help-title">Таким парам помогает</h2><ul class="help-list">${helps.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div>` : ''}
        </div>
      </section>

      <section class="sec">
        <div class="wrap narrow">
          <h2 class="title-sm">Как вы устроены</h2>
          <p class="body">${esc(txt.about || '')}</p>
          ${role ? `<div class="card soft"><h3 class="card-title">С твоей позиции</h3><p>${esc(role)}</p></div>` : ''}
          <div class="card tip-card"><h3 class="card-title">Один совет</h3><p>${esc(txt.tip || '')}</p></div>
          <details class="term-more"><summary>Как это называется в соционике</summary><p class="pair-term">${esc(ui.relTitle(r, a, b))} ${ui.toneChip(r.tone)}</p></details>
        </div>
        <div class="wrap gap-top">
          <div class="grid2">${personCard(a, 'Ты', 0)}${personCard(b, pName || 'Партнёр', 1)}</div>
          <p class="pair-name"><button class="ghost-btn" type="button" data-name>${pName ? `Партнёр: <span class="nm" title="${esc(pName)}">${esc(pName)}</span>, изменить имя` : 'Как зовут партнёра?'}</button></p>
        </div>
      </section>

      ${unlocked ? reportShell(view) : teaser(sd)}

      <section class="sec sec-alt">
        <div class="wrap">
          <div class="share" data-share-pair>
            <div class="share-preview tilt reveal">
              <canvas class="share-canvas" width="1080" height="1920" role="img" aria-label="Картинка пары: ${a.mbti} и ${b.mbti}, ${esc(title)}"></canvas>
              <span class="glare" aria-hidden="true"></span>
            </div>
            <div class="share-side reveal" style="--i:1">
              <h2 class="title-sm">Поделиться парой</h2>
              <p class="sub">Картинка для сторис — с вашими типами и видом отношений. Имён на ней нет.</p>
              ${S.social.bar({ text: shareText(a, b, title), url: base() ? base() + '/' : '', label: 'Поделиться парой' })}
              ${isMyPair && pairUrl(...sd.path) ? `<p class="gap-sm"><button class="btn btn-ghost" type="button" data-copy-pair>Скопировать ссылку на нашу пару</button></p><p class="sub small">Отправь её партнёру — так совместимость увидите оба.</p>` : ''}
              <p class="share-status" aria-live="polite"></p>
            </div>
          </div>
        </div>
      </section>

      <section class="sec">
        <div class="wrap center pair-more">
          <p><a class="btn btn-ghost" href="#/pair">Проверить другую пару</a></p>
          <p class="links-row"><a class="link" href="#/types/${a.id}">Всё о ${a.mbti}</a><a class="link" href="#/types/${b.id}">Всё о ${b.mbti}</a><a class="link" href="#/relations">16 видов отношений</a></p>
          ${CP().partner() && CP().partner().code === sd.partner.code ? '<p><button class="ghost-btn danger" type="button" data-forget>Забыть партнёра на этом устройстве</button></p>' : ''}
          <p class="rp-disc">${esc((P().texts || {}).disclaimer || '')}</p>
        </div>
      </section>`;
  }

  // Имя партнёра: только на этом устройстве, только в заголовках — в ссылки и картинки не попадает
  function nameSheet(code, from) {
    const cur = CP().nameFor(code);
    const sheet = ui.openSheet({ label: 'Имя партнёра', from, render: () => `
      <form class="name-sheet" data-name-form>
        <h2 class="title-sm">Как зовут партнёра?</h2>
        <p class="sub">Имя останется только на этом устройстве: в ссылки и картинки оно не попадёт. Покажем его в заголовках вместо слова «партнёр».</p>
        <label class="name-field"><span class="sr">Имя</span><input type="text" name="n" maxlength="${CP().NAME_MAX}" autocomplete="off" value="${esc(cur)}" placeholder="Например, Саша" aria-describedby="name-count"></label>
        <p class="name-count" id="name-count">${cur.length} из ${CP().NAME_MAX} знаков</p>
        <div class="offer-actions"><button class="btn" type="submit">Сохранить</button>${cur ? '<button class="ghost-btn" type="button" data-name-clear>Убрать имя</button>' : ''}</div>
      </form>` });
    const form = sheet.dlg.querySelector('[data-name-form]');
    // счётчик знаков: имя не обрезается молча — видно, сколько осталось, на пределе об этом скажет и скринридер
    const count = sheet.dlg.querySelector('.name-count'), max = CP().NAME_MAX;
    form.n.addEventListener('input', () => {
      const n = form.n.value.length;
      count.textContent = `${n} из ${max} знаков`;
      count.classList.toggle('full', n >= max);
      if (n >= max) S.dom.announce(`Это максимум: ${max} знака`);
    });
    const done = v => { CP().setName(code, v); sheet.close(); setTimeout(() => S.app.render({ instant: true, keepScroll: true }), 360); };
    form.addEventListener('submit', e => { e.preventDefault(); done(form.n.value); });
    const clear = sheet.dlg.querySelector('[data-name-clear]');
    if (clear) clear.addEventListener('click', () => done(''));
    setTimeout(() => form.n.focus(), 380);
  }

  // Тизер на экране — подгружаем тексты и показываем начало одной сферы бесплатно
  function mountSample(root, sd) {
    const card = root.querySelector('[data-sample]');
    if (!card || !('IntersectionObserver' in window)) return () => {};
    let alive = true;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      loadReport().then(() => {
        if (!alive) return;
        const z = PR().report(sd.me.type, sd.partner.type, P()).zones.find(x => x.aspect === card.dataset.sample);
        const el = card.querySelector('[data-sample-text]');
        if (z && z.copy && el) {
          el.textContent = S.dom.typoText(PR().firstSentence(z.copy.text, 200)) + '\u00a0…';
          card.classList.add('loaded');
        }
      }).catch(() => {});
    }, { rootMargin: '0px 0px 200px 0px' });
    io.observe(card);
    return () => { alive = false; io.disconnect(); };
  }

  const shareText = (a, b, title) => `Наша пара по 16 типам: ${a.mbti} и ${b.mbti} — «${title}». Проверьте свою на Socio-Nik`;

  // Разбор дорисовывается, когда загрузились тексты. reportShown — обещание этой вставки: его ждёт открытие разбора.
  // В тихой перерисовке (S.app.quiet) всё появляется сразу на месте — без пустых кругов и проявления текста
  let reportShown = Promise.resolve(null);
  function mountReport(root, sd) {
    const box = root.querySelector('[data-report]');
    if (!box) { reportShown = Promise.resolve(null); return () => {}; }
    const quiet = S.app.quiet;
    let alive = true, offSurvey = null, offReveal = null, offVenn = null, offNav = null;
    reportShown = loadReport().then(() => {
      if (!alive) return null;
      box.innerHTML = reportHTML(sd);
      S.dom.typo(box);
      box.classList.add('ready');
      if (quiet) box.querySelectorAll('.reveal').forEach(S.fx.show);
      else offReveal = S.fx.reveal(box);
      offVenn = ui.mountVenn(box);
      offSurvey = ui.mountSurvey(box);
      offNav = mountReportNav(box);
      S.app.restoreFocus(box);
      return box;
    }).catch(() => {
      if (alive) box.querySelector('.report-loading').textContent = 'Не получилось загрузить разбор — обнови страницу.';
      return null;
    });
    return () => { alive = false; [offSurvey, offReveal, offVenn, offNav].forEach(f => f && f()); };
  }

  function mountReportNav(box) {
    const nav = box.querySelector('.rp-nav');
    if (!nav) return () => {};
    const btns = Array.from(nav.querySelectorAll('[data-goto]'));
    const onClick = e => {
      const b = e.target.closest('[data-goto]');
      const t = b && box.querySelector('#' + b.dataset.goto);
      if (!t) return;
      t.setAttribute('tabindex', '-1');
      t.scrollIntoView({ behavior: S.dom.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      t.focus({ preventScroll: true });
    };
    nav.addEventListener('click', onClick);
    if (!('IntersectionObserver' in window)) return () => nav.removeEventListener('click', onClick);
    const seen = new Map();
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => seen.set(en.target.id, en.isIntersecting));
      const cur = btns.find(b => seen.get(b.dataset.goto)) || null;
      if (cur) btns.forEach(b => (b === cur ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
    }, { rootMargin: '-120px 0px -55% 0px' });
    btns.forEach(b => { const t = box.querySelector('#' + b.dataset.goto); if (t) io.observe(t); });
    return () => { nav.removeEventListener('click', onClick); io.disconnect(); };
  }

  // ---------- открытие разбора — пик продукта ----------
  // Шторка уже уехала (paywall ждёт её закрытия). Подводим карту тизера под шапку, затем одной View Transition
  // перерисовываем экран тихо и переворачиваем те же фишки на месте: замок уходит ребром, сфера выходит из ребра.
  // Порядок — как фишки стоят на карте, шаг 70 мс; бесплатная сфера не переворачивается. В конце — искры из пересечения,
  // фокус на заголовке разбора и сообщение для скринридера. Без View Transitions — тот же переворот через WAAPI,
  // в щадящем режиме — просто новый экран
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const navH = () => (document.querySelector('.nav') || {}).offsetHeight || 44;
  const FLIP_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

  function alignMap(box, top0) {
    const st = box.querySelector('.pv-stage');
    if (!st || top0 == null) return;
    const dy = st.getBoundingClientRect().top - top0;
    if (Math.abs(dy) > 1) scrollBy(0, dy);
  }

  function flipChips(box) {
    if (!document.body.animate) return;
    box.querySelectorAll('[data-pv] .pv-chip').forEach((c, i) => c.animate(
      [{ transform: 'perspective(520px) rotateY(-90deg)', opacity: 0.35 }, { transform: 'none', opacity: 1 }],
      { duration: 380, delay: 120 + i * 70, easing: FLIP_EASE, fill: 'backwards' }));
  }

  function afterUnveil(box, sd) {
    if (!box) return;
    box.dataset.unveiled = '1';
    const title = box.querySelector('[data-report-title]');
    if (title) title.focus({ preventScroll: true });
    S.dom.announce('Разбор открыт: все 8 сфер вашей пары и что с ними делать');
    const stage = box.querySelector('.pv-stage');
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const c = S.art.pairVenn.colors(sd.me.type, sd.partner.type, S.theme.resolved());
    S.fx.confetti([c.me, c.partner, S.color.tone(c.me, 0.4), S.color.tone(c.partner, 0.4), '#ffffff'],
      { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight, n: 70 });
  }

  async function unveil(root, sd) {
    const reduce = S.dom.reducedMotion();
    const oldFig = root.querySelector('.pv-locked'), oldStage = oldFig && oldFig.querySelector('.pv-stage');
    // карта тизера должна быть видна целиком: на телефоне кнопка — под картой, и экран уже прокручен ниже
    if (oldFig && !reduce) {
      const r = oldFig.getBoundingClientRect(), top = navH() + 16;
      if (r.top < top || r.bottom > innerHeight - 16) {
        scrollBy({ top: r.top - top, behavior: 'smooth' });
        await wait(440);
      }
    }
    await loadReport().catch(() => {});
    const top0 = oldStage ? oldStage.getBoundingClientRect().top : null;
    const show = async () => {
      S.app.render({ instant: true, keepScroll: true });
      const box = await reportShown;
      if (box) alignMap(box, top0);
      return box;
    };
    if (reduce || !document.startViewTransition || !oldStage) {
      const box = await show();
      if (box && !reduce) flipChips(box);
      afterUnveil(box, sd);
      return;
    }
    const chips = Array.from(oldFig.querySelectorAll('.pv-chip'));
    const freeAt = chips.findIndex(c => c.classList.contains('free'));
    const name = i => 'pv-chip-' + i;
    oldStage.style.viewTransitionName = 'pv-stage';
    chips.forEach((c, i) => { c.style.viewTransitionName = name(i); });
    const style = document.createElement('style');
    style.textContent = chips.map((c, i) => {
      const group = `html.vt-unveil::view-transition-group(${name(i)}) { animation-duration: 420ms; animation-timing-function: ${FLIP_EASE}; }`;
      if (i === freeAt) return group;
      const d = i * 70;
      return `${group}
html.vt-unveil::view-transition-old(${name(i)}) { animation: pv-vt-out 170ms cubic-bezier(0.4, 0, 1, 1) ${d}ms both; }
html.vt-unveil::view-transition-new(${name(i)}) { animation: pv-vt-in 380ms var(--spring-soft) ${d + 170}ms both; }`;
    }).join('\n');
    document.head.appendChild(style);
    const de = document.documentElement;
    de.classList.add('vt-unveil');
    let box = null;
    const vt = document.startViewTransition(async () => {
      box = await show();
      const fig = box && box.querySelector('[data-pv]');
      if (!fig) return;
      fig.querySelector('.pv-stage').style.viewTransitionName = 'pv-stage';
      fig.querySelectorAll('.pv-chip').forEach((c, i) => { c.style.viewTransitionName = name(i); });
    });
    vt.ready.catch(() => {});
    try { await vt.finished; } catch (e) { /* переход прерван — экран уже новый */ }
    de.classList.remove('vt-unveil');
    style.remove();
    if (box) box.querySelectorAll('.pv-stage, .pv-chip').forEach(el => { el.style.viewTransitionName = ''; });
    afterUnveil(box, sd);
  }

  // ---------- «Глазами партнёра»: экран тот же, вы меняетесь местами ----------
  // Тихая перерисовка, а поверх — FLIP за 400 мс: круги переезжают навстречу друг другу, фишки перелетают
  // к тому, кто теперь «ты» или «партнёр», карта плавно уступает место пояснению. В щадящем режиме — сразу на месте
  async function swapPerspective(root, swapped) {
    const fig0 = root.querySelector('[data-report] [data-pv]');
    const st0 = fig0 && fig0.querySelector('.pv-stage').getBoundingClientRect();
    const first = {};
    if (fig0) fig0.querySelectorAll('.pv-chip[data-aspect]').forEach(c => { first[c.dataset.aspect] = c.getBoundingClientRect(); });
    persp.swapped = swapped;
    S.app.render({ instant: true, keepScroll: true });
    const box = await reportShown;
    const fig = box && box.querySelector('[data-pv]');
    if (!fig || !st0 || S.dom.reducedMotion() || !document.body.animate) return;
    const st = fig.querySelector('.pv-stage').getBoundingClientRect();
    const opts = { duration: 400, easing: FLIP_EASE };
    const from = (el, tf) => { if (el) el.animate([{ transform: tf }, { transform: 'none' }], opts); };
    const shift = st0.top - st.top;
    if (Math.abs(shift) > 0.5) from(fig.closest('.pv-wrap') || fig, `translateY(${shift.toFixed(1)}px)`);
    fig.querySelectorAll('.pv-chip[data-aspect]').forEach(c => {
      const was = first[c.dataset.aspect];
      if (!was) return;
      const now = c.getBoundingClientRect();
      const dx = (was.left - st0.left) - (now.left - st.left), dy = (was.top - st0.top) - (now.top - st.top);
      if (Math.abs(dx) + Math.abs(dy) > 0.5) from(c, `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`);
    });
    // круги и коды — в единицах SVG: новый левый круг приезжает справа, правый — слева
    const d = S.art.pairVenn.CX[1] - S.art.pairVenn.CX[0], codes = fig.querySelectorAll('.pv-code');
    from(fig.querySelector('.pv-c-me'), `translateX(${d}px)`);
    from(fig.querySelector('.pv-c-partner'), `translateX(${-d}px)`);
    from(codes[0], `translateX(${d + 124}px)`);
    from(codes[1], `translateX(${-(d + 124)}px)`);
    const aura = fig.querySelector('.pv-aura'), note = box.querySelector('.persp-note');
    if (aura) aura.animate([{ opacity: 0.25 }, { opacity: 1 }], opts);
    if (note) note.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
  }

  V.pair = {
    needs: ['types', 'relations', 'functions', 'modelA'],
    valid: (x, y) => Boolean(CP().side(x) && CP().side(y)),
    title: (x, y) => { const sd = sides(x, y); return `${sd.me.type.mbti} и ${sd.partner.type.mbti}`; },
    render: (x, y) => { const sd = sides(x, y); return pairPage(sd, perspective(sd)); },
    mount(root, x, y) {
      const sd = sides(x, y), view = perspective(sd);
      const a = sd.me.type, b = sd.partner.type;
      const title = (P().titles || {})[M().relation(a, b).id] || '';
      S.track('pair_view', { relation: M().relation(a, b).id, unlocked: S.paywall.unlocked() });
      if (!S.paywall.unlocked()) S.track('offer_view', { product: 'pair', price: S.paywall.price(pairKey(sd)), mode: S.paywall.mode() });
      const offs = [mountReport(root, view), ui.mountVenn(root), mountSample(root, sd)];

      // картинка пары
      const shareBox = root.querySelector('[data-share-pair]');
      const canvas = shareBox && shareBox.querySelector('canvas'), status = shareBox && shareBox.querySelector('.share-status');
      if (canvas) {
        try { S.share.renderPair(canvas, a, b); } catch (e) { status.textContent = 'Не получилось нарисовать картинку'; }
        offs.push(S.social.mount(shareBox, {
          text: () => shareText(a, b, title),
          url: () => (base() ? base() + '/' : ''),
          image: () => { const c = document.createElement('canvas'); S.share.renderPair(c, a, b); return S.share.toBlob(c); },
          status: () => status
        }));
      }

      const onClick = async e => {
        const unlocked = () => unveil(root, sd);
        const offerFrom = e.target.closest('[data-offer]');
        if (offerFrom) ui.openOffer({ from: offerFrom, ctx: { relation: M().relation(a, b).id, pair: pairKey(sd), from: offerFrom.classList.contains('pv-chip') ? 'map' : 'button' }, onUnlock: unlocked });
        if (e.target.closest('[data-offer-gift]')) ui.openOffer({ gift: true, from: e.target.closest('[data-offer-gift]'), ctx: { relation: M().relation(a, b).id, pair: pairKey(sd) }, onUnlock: unlocked });
        // сфера: фишка на карте, кнопка «Подробнее» или сама карточка
        const card = e.target.closest('.zone-card');
        const asp = e.target.closest('[data-aspect]') || (card && !e.target.closest('a, button') ? card.querySelector('[data-aspect]') : null);
        if (asp && root.querySelector('[data-report].ready')) zoneSheet(view, asp.dataset.aspect, asp);
        const p = e.target.closest('[data-persp]');
        if (p && (p.dataset.persp === '1') !== view.swapped) swapPerspective(root, p.dataset.persp === '1');
        if (e.target.closest('[data-name]')) nameSheet(sd.partner.code, e.target.closest('[data-name]'));
        const forgetBtn = e.target.closest('[data-forget]');
        if (forgetBtn) {
          const ok = await ui.confirm({
            title: 'Забыть партнёра на этом устройстве?',
            text: 'Пара пропадёт из «Совместимости» и с главной, имя сотрётся. Вернуть её можно будет только по ссылке на пару.',
            yes: 'Забыть партнёра', no: 'Оставить', danger: true, from: forgetBtn
          });
          if (ok) {
            CP().forget();
            S.app.render({ instant: true, keepScroll: true });
            const next = root.querySelector('.pair-more a.btn');
            if (next) next.focus({ preventScroll: true });
          }
        }
        if (e.target.closest('[data-copy-pair]')) {
          const ok = await S.share.copy(pairUrl(...sd.path));
          if (status) status.textContent = ok ? 'Ссылка на вашу пару скопирована' : 'Не удалось скопировать ссылку';
          S.track('invite_created', { net: 'pair-link' });
        }
        if (e.target.closest('[data-print]')) { S.track('report_print', {}); window.print(); }
        if (e.target.closest('[data-map-story]')) {
          const st = root.querySelector('[data-export] .share-status');
          try {
            const c = document.createElement('canvas');
            S.share.renderMap(c, a, b);
            const blob = await S.share.toBlob(c);
            const file = new File([blob], `socio-nik-${a.mbti}-${b.mbti}-karta.png`.toLowerCase(), { type: 'image/png' });
            S.track('map_shared', {});
            if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file] });
            else { S.share.download(blob, file.name); if (st) st.textContent = 'Картинка карты сохранена'; }
          } catch (err) {
            if (st && (!err || err.name !== 'AbortError')) st.textContent = 'Не получилось — попробуй ещё раз';
          }
        }
      };
      root.addEventListener('click', onClick);
      return () => { root.removeEventListener('click', onClick); offs.forEach(f => f && f()); };
    }
  };

  // Для проверок и сборки разбора в Node
  S.pairView = { FILES, reportReady, loadReport, sides, reportHTML, POS };
})(window);
