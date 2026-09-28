/* Socio-Nik · результат: свой (#/result) и по ссылке (#/r/1-72-64-58-19) */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;
  const M = () => S.core.modelA;

  // Тест пройден по ссылке друга — сразу показываем ваши отношения
  function friendPair(me, fr) {
    const r = M().relation(me, fr), txt = ui.relText(r.kind);
    return `
      <section class="sec sec-alt sh-you">
        <div class="wrap center">
          <p class="eyebrow reveal">Ты и тот, кто прислал ссылку</p>
          <h2 class="title reveal">${me.code} и ${fr.code}</h2>
          <div class="sh-pair reveal" data-anim>${ui.pairScene(me, fr, { labels: ['ты', fr.code] })}</div>
          <h3 class="sh-rel reveal">${esc(ui.relTitle(r, me, fr))}</h3>
          <p class="reveal">${ui.toneChip(r.tone)}</p>
          <p class="lead reveal">${esc(txt.line || '')}</p>
          <p class="reveal"><a class="btn" href="#/relations/${me.id}/${fr.id}">Подробнее о ваших отношениях</a></p>
        </div>
      </section>`;
  }

  function page(axes, { shared = false } = {}) {
    const res = S.core.scoring.result(axes);
    const t = M().type(res.top.id), q = ui.quadra(t.quadra), c = ui.content(t.id);
    const dual = M().partner(t, 'dual');
    const [n1, n2] = res.next.map(r => M().type(r.id));
    const qc = (S.content.quadras || {})[q.id] || {};
    const friend = !shared && S.state.friend ? S.core.scoring.result(S.state.friend).top.id : null;
    const link = shared ? '' : S.share.url(axes), plain = S.share.text(axes, { withUrl: false });

    return `
      <section class="res-hero" style="${ui.qStyle(t.quadra)}" data-anim>
        <div class="res-glow" aria-hidden="true"></div>
        <div class="wrap res-top">
          <p class="eyebrow reveal">${shared ? 'Результат по ссылке' : 'Твой тип'}</p>
          <div class="res-emblem reveal" style="--i:1">${ui.emblem(t, { live: true, cls: 'em-big' })}</div>
          <h1 class="res-code reveal" style="--i:2">${t.code}</h1>
          <p class="res-name reveal" style="--i:3">${esc(t.name)}</p>
          <p class="res-alias reveal" style="--i:3">«${esc(t.alias)}» · ${esc(t.role)} · квадра ${q.name}</p>
          <div class="res-pct reveal" style="--i:4"><span class="big" data-count="${res.top.pct}">${res.top.pct}</span><span class="pc">%</span></div>
          <p class="res-pct-lab reveal" style="--i:4">вероятность этого типа по ${shared ? 'ответам' : 'твоим ответам'}</p>
          ${res.close ? `<p class="res-between reveal" style="--i:5">Результат между ${t.code} и ${n1.code} — загляни в оба описания.</p>` : ''}
          ${shared ? `<p class="reveal" style="--i:5"><a class="btn" href="#/test" data-friend>Пройди тест — узнаем, какие у вас отношения</a></p>` : ''}
        </div>
      </section>
      ${friend ? friendPair(t, M().type(friend)) : ''}

      <section class="sec">
        <div class="wrap">
          <h2 class="title-sm reveal">Ещё похоже на</h2>
          <div class="next-grid">
            ${res.next.map((r, i) => {
              const tt = M().type(r.id);
              return `<a class="next-card tilt reveal" style="${ui.qStyle(tt.quadra)};--i:${i}" href="#/types/${tt.id}">
                <span class="next-art">${ui.emblem(tt, { label: false })}</span>
                <span class="next-code">${tt.code}</span>
                <span class="next-name">${esc(tt.alias)} · ${esc(tt.role)}</span>
                <span class="next-pct">${r.pct} %</span>
                <span class="glare" aria-hidden="true"></span>
              </a>`;
            }).join('')}
          </div>
        </div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap">
          <h2 class="title-sm reveal">Четыре шкалы</h2>
          <p class="sub reveal">Какой полюс каждой пары тебе ближе.</p>
          ${ui.axisBars(res.axes)}
          <h2 class="title-sm reveal gap-top">Все 16 типов</h2>
          <p class="sub reveal">Вероятности по всем типам складываются в 100 %. Наведи на строку — увидишь подробности.</p>
          ${ui.distribution(res)}
        </div>
      </section>

      ${shared ? '' : `
      <section class="sec">
        <div class="wrap">
          <h2 class="title-sm reveal">Коротко о типе</h2>
          <p class="lead-sm reveal">${esc(c.tagline || '')}</p>
          <p class="body reveal">${esc((c.about || [])[0] || '')}</p>
          <p class="reveal"><a class="link" href="#/types/${t.id}">Читать полностью</a></p>
          <div class="grid2 gap-top">
            <a class="card link-card tilt reveal" href="#/quadras#${q.id}" style="${ui.qStyle(q.id)}">
              <span class="lc-art" data-anim>${S.art.quadraEmblem(q)}</span>
              <span class="lc-kicker">Твоя квадра</span>
              <span class="lc-title">${q.name}</span>
              <span class="lc-text">${esc(qc.motto || '')}</span>
              <span class="glare" aria-hidden="true"></span>
            </a>
            <a class="card link-card tilt reveal" href="#/relations/${t.id}/${dual.id}" style="${ui.qStyle(dual.quadra)};--i:1">
              <span class="lc-art">${ui.emblem(dual, { label: false })}</span>
              <span class="lc-kicker">Твой дуал</span>
              <span class="lc-title">${dual.code} «${esc(dual.alias)}»</span>
              <span class="lc-text">${esc(ui.relText('dual').line || '')}</span>
              <span class="glare" aria-hidden="true"></span>
            </a>
          </div>
        </div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap">
          <h2 class="title-sm reveal">Сравни с другом</h2>
          <p class="sub reveal">${friend ? `Результат по ссылке — ${M().type(friend).code} «${esc(M().type(friend).alias)}». Вот как устроены ваши отношения.` : 'Выбери тип близкого человека — покажем, как устроены ваши отношения.'}</p>
          <div class="reveal">${ui.calc(t.id, friend || dual.id)}</div>
        </div>
      </section>

      <section class="sec">
        <div class="wrap">
          <div class="share" data-share>
            <div class="share-preview tilt reveal">
              <canvas class="share-canvas" width="1080" height="1920" role="img" aria-label="Картинка с результатом: ${t.code}, ${res.top.pct} %"></canvas>
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

      <section class="sec sec-alt">
        <div class="wrap">
          <h2 class="title-sm reveal">Mystery box про ${t.code}</h2>
          <p class="sub reveal">Случайный факт о твоём типе.</p>
          <div class="reveal">${ui.box({ typeId: t.id, compact: true })}</div>
        </div>
      </section>`}

      <section class="sec">
        <div class="wrap center">
          <p class="reveal"><a class="btn btn-ghost" href="#/test" data-restart-test>Пройти тест заново</a></p>
          <details class="how reveal">
            <summary>Как это считается</summary>
            <p>Каждый ответ сдвигает одну из четырёх шкал. Из суммы по шкале получается вероятность каждого полюса, а вероятность типа — произведение вероятностей его четырёх полюсов, поэтому по 16 типам всегда выходит 100 %.</p>
            <p>Соционика — популярная типологическая модель, а не проверенный научный метод. Относись к результату как к поводу понаблюдать за собой, а не как к диагнозу.</p>
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
      const id = S.core.scoring.result(axes).top.id;
      try {
        if (act.dataset.do === 'share') { await S.share.share(canvas, axes, fmt); status.textContent = ''; }
        if (act.dataset.do === 'download') { S.share.download(await S.share.toBlob(canvas), `socio-nik-${id}-${fmt}.png`); status.textContent = 'Картинка сохранена'; }
        if (act.dataset.do === 'copy') status.textContent = (await S.share.copy(S.share.text(axes))) ? 'Текст скопирован' : 'Не удалось скопировать — выдели текст вручную';
      } catch (err) {
        if (err && err.name !== 'AbortError') status.textContent = 'Не получилось — попробуй «Скачать картинку»';
      }
    });
    // Instagram берёт картинку сторис, остальные сети — текст и ссылку на результат
    return S.social.mount(box, {
      text: () => S.share.text(axes, { withUrl: false }),
      url: () => S.share.url(axes),
      image: () => { const c = document.createElement('canvas'); S.share.render(c, axes, 'story'); return S.share.toBlob(c); },
      status: () => status
    });

  }

  V.result = {
    title: () => {
      const a = S.state.result();
      return a ? 'Твой тип — ' + M().type(S.core.scoring.result(a).top.id).code : 'Результат';
    },
    render() {
      const axes = S.state.result();
      if (!axes) {
        return `<section class="sec empty"><div class="wrap center">
          <div class="lost" aria-hidden="true">${S.art.glyphSVG('Ni', S.theme.quadraColor('gamma'), 'lost-svg')}</div>
          <h1 class="title">Результата пока нет</h1>
          <p class="lead">Пройди тест — это 20 вопросов и около 4 минут.</p>
          <p><a class="btn btn-lg" href="#/test">Пройти тест</a></p></div></section>`;
      }
      return page(axes);
    },
    mount(root) {
      const axes = S.state.result();
      if (!axes) return () => {};
      const offs = [ui.mountCalc(root), ui.mountBox(root), ui.mountTips(root), mountShare(root, axes)];
      if (S.state.justFinished) {
        S.state.justFinished = false;
        const t = M().type(S.core.scoring.result(axes).top.id);
        const c = S.theme.quadraColor(t.quadra);
        setTimeout(() => S.fx.confetti([c, S.color.tone(c, 0.35), S.color.tone(c, -0.2), '#ffffff'], { y: 0.3 }), 450);
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
    const test = label => `<a class="btn btn-lg" href="#/test" data-friend>${label}</a>`;
    return `
      <section class="res-hero sh-hero" style="${ui.qStyle(t.quadra)}" data-anim>
        <div class="res-glow" aria-hidden="true"></div>
        <div class="wrap res-top">
          <p class="sh-badge reveal"><i aria-hidden="true"></i>Тебе прислали результат теста Socio-Nik</p>
          <div class="res-emblem reveal" style="--i:1">${ui.emblem(t, { live: true, cls: 'em-big' })}</div>
          <h1 class="res-code reveal" style="--i:2">${t.code}</h1>
          <p class="res-name reveal" style="--i:3">${esc(t.name)}</p>
          <p class="res-alias reveal" style="--i:3">«${esc(t.alias)}» · ${esc(t.role)} · квадра ${q.name} · ${res.top.pct} %</p>
          <p class="sh-motto reveal" style="--i:4"><span>Коротко о типе</span>«${esc(c.tagline || '')}»</p>
          <div class="cta reveal" style="--i:5">
            ${mine ? `<a class="btn btn-lg" href="#/relations/${mine.id}/${t.id}">Ваши отношения</a><a class="link" href="#/test" data-friend>Пройти тест заново</a>`
                   : `${test('Узнать свой тип')}<a class="link" href="#/types/${t.id}">Подробнее о ${t.code}</a>`}
          </div>
          <p class="sh-note reveal" style="--i:5">20 вопросов · около 4 минут · без регистрации</p>
        </div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap center">
          <p class="eyebrow reveal">${mine ? 'Вы вдвоём' : 'Твоя очередь'}</p>
          <h2 class="title reveal">${mine ? `${mine.code} и ${t.code}` : 'А какой тип у тебя?'}</h2>
          <p class="lead reveal">${mine ? esc(ui.relText(rel.kind).line || '') : 'Пройди тест — и сразу увидишь, как устроены ваши отношения: дуальные, зеркальные, деловые или ещё какие-то из четырнадцати видов.'}</p>
          <div class="sh-pair reveal" data-anim>${mine ? ui.pairScene(mine, t, { labels: ['ты', t.code] }) : S.art.mystery(t)}</div>
          ${mine ? `<h3 class="sh-rel reveal">${esc(ui.relTitle(rel, mine, t))}</h3><p class="reveal"><a class="btn" href="#/relations/${mine.id}/${t.id}">Подробнее о ваших отношениях</a></p>`
                 : `<p class="reveal">${test('Пройти тест')}</p>`}
        </div>
      </section>

      <section class="sec">
        <div class="wrap">
          <h2 class="title-sm reveal">Как распределились ответы</h2>
          <p class="sub reveal">Какой полюс каждой пары ближе тому, кто прислал ссылку.</p>
          ${ui.axisBars(res.axes)}
          <h2 class="title-sm reveal gap-top">Ещё похоже на</h2>
          <div class="next-grid">
            ${res.next.map((r, i) => {
              const tt = M().type(r.id);
              return `<a class="next-card tilt reveal" style="${ui.qStyle(tt.quadra)};--i:${i}" href="#/types/${tt.id}">
                <span class="next-art">${ui.emblem(tt, { label: false })}</span>
                <span class="next-code">${tt.code}</span>
                <span class="next-name">${esc(tt.alias)} · ${esc(tt.role)}</span>
                <span class="next-pct">${r.pct} %</span>
                <span class="glare" aria-hidden="true"></span>
              </a>`;
            }).join('')}
          </div>
        </div>
      </section>

      <section class="sec sec-alt">
        <div class="wrap narrow">
          <h2 class="title-sm reveal">Что за тип — ${t.code}</h2>
          <p class="sub reveal">Отрывок из описания — оно написано для человека этого типа.</p>
          <p class="body reveal">${esc((c.about || [])[0] || '')}</p>
          <ul class="checks reveal" style="${ui.qStyle(t.quadra)}">${(c.strengths || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          <p class="reveal gap-top"><a class="link" href="#/types/${t.id}">Всё о ${t.code}: описание, модель А, отношения</a></p>
        </div>
      </section>

      <section class="sec final">
        <div class="wrap center">
          <h2 class="title reveal">${mine ? 'Сравни и с другими.' : 'Твоя очередь.'}</h2>
          <p class="lead reveal">${mine ? 'Калькулятор покажет отношения с любым из 16 типов.' : 'Узнай свой соционический тип и то, как вы с этим человеком дополняете друг друга.'}</p>
          <p class="reveal">${mine ? '<a class="btn btn-lg" href="#/relations">Открыть калькулятор</a>' : test('Пройти тест')}</p>
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
      return () => root.removeEventListener('click', onClick);
    }
  };
})(window);
