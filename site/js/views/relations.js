/* Socio-Nik · отношения (#/relations): калькулятор, 14 видов со сценами, матрица 16×16; экран пары (#/relations/ile/sei) */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;
  const M = () => S.core.modelA;
  const NB = '\u00A0';

  // 14 видов в порядке тона; пример — пара с ИЛЭ (для асимметричных — ИЛЭ в роли ревизора / заказчика)
  const KINDS = [
    ['dual', 'dual'], ['activation', 'activation'], ['mirror', 'mirror'], ['semidual', 'semidual'], ['mirage', 'mirage'],
    ['identity', 'identity'], ['kindred', 'kindred'], ['business', 'business'], ['quasi', 'quasi'], ['request', 'beneficiary'],
    ['extinguish', 'extinguish'], ['superego', 'superego'], ['supervision', 'supervisee'], ['conflict', 'conflict']
  ];

  function matrix() {
    const ts = S.data.types;
    return `
      <div class="matrix-wrap reveal">
        <table class="matrix">
          <caption class="sr">Отношения всех пар типов: строка — ты, столбец — партнёр</caption>
          <thead><tr><th scope="col"><span class="sr">Ты \\ партнёр</span></th>${ts.map(t => `<th scope="col">${t.code}</th>`).join('')}</tr></thead>
          <tbody>${ts.map(a => `<tr><th scope="row">${a.code}</th>${ts.map((b, j) => {
            const r = M().relation(a, b);
            const name = r.role ? `${r.name} · ${r.role}` : r.name;
            return `<td><a class="mx t-${r.tone}${a === b ? ' self' : ''}" data-col="${j}" href="#/relations/${a.id}/${b.id}" data-tip="${esc(name)}|${a.code} → ${b.code}" aria-label="${a.code} и ${b.code}: ${esc(name)}"></a></td>`;
          }).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="legend reveal">${['support', 'work', 'tense'].map(tone => ui.toneChip(tone)).join('')}</div>`;
  }

  V.relations = {
    title: () => 'Отношения',
    render() {
      const a = S.state.myType() || 'ile';
      const b = M().partner(M().type(a), 'dual').id;
      const ile = M().type('ile');
      return `
        <section class="page-top page-head rel-head">
          <div class="wrap">
            <p class="eyebrow reveal">Отношения</p>
            <h1 class="h2 reveal"><span class="sv">Отношения</span></h1>
            <p class="lead reveal">Соционика различает 14${NB}видов отношений. Они описывают, насколько легко двум людям понимать и${NB}дополнять друг друга, — а${NB}не${NB}то, кто кому подходит навсегда.</p>
            <div class="reveal gap-top">${ui.calc(a, b)}</div>
          </div>
        </section>

        <section class="sec sec-line rm-sec" id="map">
          <div class="wrap">
            <div class="rm-head">
              <h2 class="h2 reveal"><span class="sv">Карта отношений</span></h2>
              <p class="rm-sub reveal">Чем ближе орбита к${NB}типу, тем легче с${NB}ним. Нажми на${NB}аватар${NB}— увидишь разбор пары.</p>
            </div>
            <div class="rm-holder">${ui.relMap(M().type(a), { uid: 'rmr', pick: true })}</div>
          </div>
        </section>

        <section class="sec sec-white">
          <div class="wrap">
            <h2 class="h2 reveal">14${NB}видов</h2>
            <p class="lead sec-sub reveal">Сцены показаны на${NB}примере ИЛЭ «Дон Кихот»: знак слева — он, справа — партнёр.</p>
            <ol class="numlist kinds">
              ${KINDS.map(([kind, pos], i) => {
                const r = M().relationById(pos), partner = M().partner(ile, pos), txt = ui.relText(kind);
                return `<li class="kind reveal" data-anim>
                  <span class="nl-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
                  <div class="kind-scene">${ui.pairScene(ile, partner, { theme: 'light' })}</div>
                  <div class="kind-copy">
                    <h3 class="nl-title">${ui.kindTitle(kind)}</h3>
                    ${ui.toneChip(r.tone)}
                    <p class="nl-text">${esc(txt.line || '')}</p>
                    <details><summary>Подробнее</summary><p>${esc(txt.about || '')}</p><p class="tip-line"><b>Как ладить.</b> ${esc(txt.tip || '')}</p></details>
                  </div>
                </li>`;
              }).join('')}
            </ol>
          </div>
        </section>

        <section class="sec">
          <div class="wrap">
            <h2 class="h2 reveal"><span class="sv">Все пары</span></h2>
            <p class="lead sec-sub reveal">Строка — ты, столбец — партнёр. Чем светлее клетка, тем легче отношения. Нажми на${NB}клетку, чтобы открыть разбор пары.</p>
            <div class="only-wide">${matrix()}</div>
            <div class="only-narrow reveal">
              ${ui.typeSelect('mlist', a, 'Твой тип')}
              <div class="mlist-out">${ui.relList(M().type(a))}</div>
            </div>
          </div>
        </section>`;
    },
    mount(root) {
      ui.prefetchPair();
      const offs = [ui.mountCalc(root), ui.mountTips(root)];
      offs.push(ui.mountRelMap(root.querySelector('.rm-holder')));
      const sel = root.querySelector('[data-mlist]'), out = root.querySelector('.mlist-out');
      if (sel) sel.addEventListener('change', () => { out.innerHTML = ui.relList(M().type(sel.value)); out.querySelectorAll('.reveal').forEach(S.fx.show); });
      const table = root.querySelector('.matrix');
      if (table) {
        const clear = () => table.querySelectorAll('.hl').forEach(el => el.classList.remove('hl'));
        const hl = e => {
          const cell = e.target.closest && e.target.closest('.mx');
          clear();
          if (!cell) return;
          const tr = cell.closest('tr'), col = Number(cell.dataset.col);
          tr.classList.add('hl');
          table.querySelectorAll('tr').forEach(row => { const c = row.children[col + 1]; if (c) c.classList.add('hl'); });
        };
        table.addEventListener('pointerover', hl);
        table.addEventListener('focusin', hl);
        table.addEventListener('pointerleave', clear);
      }
      return () => offs.forEach(f => f && f());
    }
  };

  // ---------- экран пары (#/relations/<a>/<b>) ----------
  // Сверху — сцена пары и вид отношений. Ниже — ваша пара на каждый день: как выглядит обычная неделя; восемь сфер
  // жизни, где у каждой своя сцена, «у тебя» / «у партнёра» и одно дело на неделю с отметкой «попробовали»;
  // фразы «вместо → скажи», если поссорились, ритуал недели; вопросы на вечер и ссылка партнёру — со своей стороны.
  // Всё, что про пару, считается по модели А обоих (core/pair.js); тексты грузятся по требованию (ui.pairTexts).
  const PR = () => S.core.pair;
  const GROUPS = ['fit', 'common', 'ask', 'care', 'gap'];
  const SECTIONS = [['about', 'Об отношениях'], ['spheres', 'Восемь сфер'], ['tips', 'Советы для пары'], ['questions', 'Вопросы на вечер']];
  const CHEV = '<svg class="ico pr-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9.5 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CHECK = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const triedKey = (a, b) => `socio.tried.${a}-${b}`;
  const tried = (a, b) => { try { return new Set(JSON.parse(localStorage.getItem(triedKey(a, b)) || '[]')); } catch (e) { return new Set(); } };
  const pairUrl = (a, b) => { const base = S.config && S.config.SITE_URL; return base ? base.replace(/\/$/, '') + `/#/relations/${a.id}/${b.id}` : ''; };
  const sendText = (a, b) => `Смотри, как ладят ${a.code} и ${b.code}: сцены из жизни и советы на каждый день — для нас обоих.`;
  const tryLabel = on => (on ? 'Попробовали' : 'Отметить: попробовали');
  // Бейдж сферы — кто здесь что даёт (цвет — от группы): точнее, чем «Дополняете» восемь раз подряд у дуалов
  const BADGE = {
    complement: { me: () => 'Ты даёшь', partner: b => `Даёт ${b.code}` },
    cover: { me: () => 'Ты страхуешь', partner: b => `Страхует ${b.code}` },
    shared: { both: () => 'Общая сила' },
    background: { both: () => 'Оба умеете' },
    ask: { me: () => 'Можно попросить', partner: b => `${b.code} может попросить` },
    values: { me: () => 'Тебе это важнее', partner: b => `${b.code} это важнее` },
    press: { me: () => 'Говори мягче', partner: () => 'Тебе здесь трудно' },
    need: { both: () => 'Не хватает обоим' },
    blind: { both: () => 'Слепая зона' },
    unanswered: { me: () => 'Тебе не хватает', partner: b => `${b.code} не хватает` }
  };
  const badgeOf = (z, b) => { const k = BADGE[z.kind], f = k && (k[z.side] || k.both); return f ? f(b) : ''; };

  // Сфера: в свёрнутом виде — знак, название, вид и первая фраза сцены; раскрытая — сцена, обе стороны и дело на неделю
  function zoneHTML(z, b, P, done, i) {
    const d = P.domains[z.aspect], on = done.has(z.aspect);
    return `<details class="pr-zone pr-${z.group} reveal" data-aspect="${z.aspect}" style="--i:${i % 2}">
      <summary>
        <span class="pr-zi">${S.art.aspectImg(z.aspect, 'violet', 'pr-asp', { sizes: '(max-width: 600px) 52px, 64px' })}</span>
        <span class="pr-zt"><b>${esc(d.short)}</b><small>${esc(d.long)}</small></span>
        <span class="pr-badge" title="${esc(P.groups[z.group].title)}"><i aria-hidden="true"></i>${esc(badgeOf(z, b) || P.groups[z.group].short)}</span>
        ${CHEV}
        <span class="pr-teaser">${esc(PR().firstSentence(z.copy.text, 140))}</span>
      </summary>
      <div class="pr-zbody">
        <p class="pr-scene">${esc(z.copy.text)}</p>
        <div class="pr-sides">
          <p><span class="pr-k">У${NB}тебя</span>${esc(z.own)}</p>
          <p><span class="pr-k">У${NB}${b.code}</span>${esc(z.theirs)}</p>
        </div>
        <div class="pr-deal${on ? ' done' : ''}">
          <p class="pr-k">На этой неделе</p>
          <p class="pr-deal-t">${esc(z.copy.deal)}</p>
          <button class="pr-try" type="button" data-try="${z.aspect}" aria-pressed="${on}">${CHECK}<span>${tryLabel(on)}</span></button>
        </div>
      </div>
    </details>`;
  }

  // «Как это устроено»: куда у партнёра попадают твои две сильные стороны (Эго) и куда у тебя — партнёра
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function howHTML(a, b, P) {
    const ma = M().modelA(a.ego), mb = M().modelA(b.ego), fill = s => s.replace(/\{b\}/g, b.code);
    const row = (who, label, asp, pos, text) => `<div class="pr-how-row">
        <p class="pr-k">${who}</p>
        <p class="pr-how-asp"><b>${esc(cap(ui.PLAIN[asp]))}</b></p>
        <p class="pr-how-pos">${esc(label)} ${esc(ui.FN[pos])}</p>
        <p class="pr-how-t">${esc(fill(text))}</p>
      </div>`;
    const mine = [0, 1].map(i => { const asp = a.ego[i], pos = mb.indexOf(asp) + 1; return row(i ? 'Твой рабочий инструмент' : 'Твоя главная сила', `у${NB}${b.code} —`, asp, pos, P.lands.partner[pos]); });
    const theirs = [0, 1].map(i => { const asp = b.ego[i], pos = ma.indexOf(asp) + 1; return row(i ? `Рабочий инструмент ${b.code}` : `Главная сила ${b.code}`, 'у тебя —', asp, pos, P.lands.you[pos]); });
    return `<div class="pr-how">
        <div class="pr-how-col"><p class="pr-how-h">Ты → ${b.code}</p>${mine.join('')}</div>
        <div class="pr-how-col"><p class="pr-how-h">${b.code} → ты</p>${theirs.join('')}</div>
      </div>`;
  }

  // «Что вы даёте друг другу»: кто какую сферу ведёт, кто поможет по просьбе, кому что важнее, что делить
  function givesHTML(rep, b, P) {
    const chips = list => list.map(asp => `<span class="pr-chip">${esc(P.domains[asp].short)}</span>`).join('');
    const rows = [
      ['Ты ведёшь', rep.lead.me], [`${b.code} ведёт`, rep.lead.partner],
      ['Поможешь, если попросят', rep.can.me], [`${b.code} поможет, если попросить`, rep.can.partner],
      ['Тебе важнее', rep.cares.me], [`${b.code} важнее`, rep.cares.partner],
      ['Делите вдвоём', rep.split]
    ].filter(([, list]) => list.length);
    return `<dl class="pr-gives">${rows.map(([k, list]) => `<div><dt>${esc(k)}</dt><dd>${chips(list)}</dd></div>`).join('')}</dl>`;
  }

  const STAGES = [['start', 'Знакомство'], ['months', 'Через полгода'], ['years', 'Через годы']];
  const CONTEXTS = [['love', 'В паре', 'heart'], ['friends', 'В дружбе', 'bubbles'], ['work', 'В работе', 'handshake']];

  function pairBody(a, b) {
    const P = S.content.pair, rep = PR().report(a, b, P, S.content.modelA), r = rep.relation, rel = rep.rel;
    const txt = ui.relText(r.kind), role = txt.roles && txt.roles[r.id], done = tried(a.id, b.id);
    const more = (P.about && P.about[r.id]) || null;
    // сначала то, на что можно опереться, потом то, где бережнее
    const zones = rep.zones.slice().sort((x, y) => GROUPS.indexOf(x.group) - GROUPS.indexOf(y.group) || PR().ORDER.indexOf(x.aspect) - PR().ORDER.indexOf(y.aspect));
    const legend = GROUPS.filter(g => rep.summary[g]).map(g => `<li class="pr-${g}" title="${esc(P.groups[g].about)}"><i aria-hidden="true"></i>${esc(P.groups[g].short)}<b>${rep.summary[g]}</b></li>`).join('');
    return `
      <section class="sec sec-white pr-about" id="about">
        <div class="wrap narrow">
          <p class="eyebrow reveal">Об отношениях</p>
          <p class="pr-essence reveal">${esc(txt.about || '')}</p>
          ${role ? `<div class="pr-role reveal"><p class="pr-k">С${NB}позиции ${a.code}</p><p>${esc(role)}</p></div>` : ''}

          <h3 class="pr-h3 reveal">Как это устроено</h3>
          <p class="pr-h3-sub reveal">Две сильные стороны каждого и куда они попадают у второго — отсюда и характер пары.</p>
          <div class="reveal">${howHTML(a, b, P)}</div>

          <h3 class="pr-h3 reveal">Что вы даёте друг другу</h3>
          <div class="reveal">${givesHTML(rep, b, P)}</div>

          ${more ? `
          <h3 class="pr-h3 reveal">Как развиваются отношения</h3>
          <ol class="pr-stages">${STAGES.map(([k, name], i) => `<li class="reveal" style="--i:${i}"><p class="pr-k">${name}</p><p>${esc(more.stages[k])}</p></li>`).join('')}</ol>

          <h3 class="pr-h3 reveal">В паре, дружбе и работе</h3>
          <div class="pr-ctx">${CONTEXTS.map(([k, name, em], i) => `<div class="pr-ctx-card reveal" style="--i:${i}">
              <img src="${ui.emoteSrc(em)}" alt="" width="56" height="56" loading="lazy" decoding="async">
              <p class="pr-k">${name}</p><p>${esc(more.contexts[k])}</p></div>`).join('')}</div>

          <div class="pr-pm">
            <div class="pr-pm-col pr-plus reveal"><h3 class="pr-h4">Сильные стороны</h3><ul>${more.plus.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
            <div class="pr-pm-col pr-minus reveal" style="--i:1"><h3 class="pr-h4">Где спотыкаетесь</h3><ul>${more.minus.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
          </div>` : ''}

          <h3 class="pr-h3 reveal">Обычная неделя</h3>
          ${rel.story.map((p, i) => `<p class="body pr-story reveal" style="--i:${i}">${esc(p)}</p>`).join('')}
        </div>
      </section>
      <section class="sec pr-spheres" id="spheres">
        <div class="wrap narrow">
          <div class="pr-head">
            <h2 class="h2 h2-md reveal"><span class="sv">Восемь сфер</span></h2>
            <p class="lead reveal">В${NB}каждой — как это бывает у${NB}вас и${NB}одно дело на${NB}эту неделю. ${esc(P.texts.note)}</p>
          </div>
          <div class="pr-bar reveal">
            <ul class="pr-legend" aria-label="Сферы по видам">${legend}</ul>
            <p class="pr-progress" aria-live="polite"><span class="pr-pbar" aria-hidden="true"><i style="--p:${done.size / 8}"></i></span><span>Попробовали <b>${done.size}</b> из${NB}8</span></p>
          </div>
          <div class="pr-zones">${zones.map((z, i) => zoneHTML(z, b, P, done, i)).join('')}</div>
        </div>
      </section>
      <section class="sec sec-white pr-hard" id="tips">
        <div class="wrap narrow">
          <h2 class="h2 h2-md reveal"><span class="sv">Советы для пары</span></h2>
          <p class="lead sec-sub reveal">${more ? `Восемь шагов на${NB}ближайшие недели — с${NB}примерами из${NB}жизни.` : `Как говорить и${NB}что делать, когда трудно.`}</p>
          ${more ? `<ol class="pr-tips">${more.tips.map((x, i) => `<li class="pr-tip reveal" style="--i:${i % 2}">
              <span class="pr-tip-n" aria-hidden="true">${i + 1}</span>
              <div><h3>${esc(x.t)}</h3><p>${esc(x.d)}</p></div></li>`).join('')}</ol>` : ''}
          <h3 class="pr-h3 reveal">Фразы, которые сближают</h3>
          <div class="pr-scripts">${rel.scripts.map((x, i) => `
            <figure class="pr-script reveal" style="--i:${i}">
              <p class="pr-instead"><span class="pr-k">Вместо</span><s>«${esc(x.instead)}»</s></p>
              <p class="pr-say"><span class="pr-k">Скажи</span>«${esc(x.say)}»</p>
            </figure>`).join('')}
          </div>
          <div class="grid2 pr-cards">
            <div class="pr-card reveal"><h3 class="card-title">Если поссорились</h3><p>${esc(rel.repair)}</p></div>
            <div class="pr-card reveal" style="--i:1"><h3 class="card-title">Ритуал недели</h3><p>${esc(rel.ritual)}</p></div>
          </div>
        </div>
      </section>
      <section class="sec pr-evening" id="questions">
        <div class="wrap narrow center">
          <h2 class="h2 h2-md reveal"><span class="sv">Вопросы на вечер</span></h2>
          <p class="lead sec-sub reveal">Задавайте по${NB}очереди и${NB}отвечайте без спешки. Первый — про то, что для вас сейчас важнее всего.</p>
          <div class="pr-deck reveal" data-deck>
            ${rep.questions.map((q, i) => `<figure class="pr-q${i ? '' : ' on'}"${i ? ' hidden' : ''}><figcaption>${esc(P.domains[q.aspect].short)}</figcaption><blockquote>${esc(q.text)}</blockquote></figure>`).join('')}
            <div class="pr-deck-nav"><span class="pr-qn"><b>1</b> из${NB}${rep.questions.length}</span><button class="btn-ghost" type="button" data-q-next>Следующий вопрос</button></div>
          </div>
          <div class="pr-send reveal">
            <h3 class="h4">Отправь эту страницу ${b.code}</h3>
            <p class="pr-send-sub">У${NB}${b.code} она откроется со своей стороны: те${NB}же сферы, но${NB}свои дела на${NB}неделю.</p>
            ${ui.shareActions({ text: sendText(b, a), url: pairUrl(b, a), primary: `Отправить ${b.code}`, link: true, compact: true })}
          </div>
          <p class="pr-fine">${esc(P.texts.disclaimer)} ${esc(P.texts.third)}</p>
          <p class="pr-fine">${esc(P.texts.safety)}</p>
        </div>
      </section>`;
  }

  // Пока тексты грузятся — белая секция со строками-заглушками на месте будущей «Недели»
  const skeleton = () => `<section class="sec sec-white pr-about" aria-busy="true"><div class="wrap narrow">
      <p class="eyebrow">Об отношениях</p>
      <div class="pr-skel" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></div></section>`;
  // Если тексты не загрузились — короткое описание вида отношений, как было раньше
  const fallback = (a, b) => {
    const txt = ui.relText(M().relation(a, b).kind);
    return `<section class="sec sec-white"><div class="wrap narrow">
      <p class="body pair-about">${esc(txt.about || '')}</p>
      <div class="pr-card"><h3 class="card-title">Как ладить</h3><p>${esc(txt.tip || '')}</p></div></div></section>`;
  };

  function toggleTry(a, b, btn, holder) {
    const set = tried(a.id, b.id), asp = btn.dataset.try;
    if (set.has(asp)) set.delete(asp); else set.add(asp);
    try { localStorage.setItem(triedKey(a.id, b.id), JSON.stringify([...set])); } catch (e) { /* приватный режим */ }
    const on = set.has(asp);
    btn.setAttribute('aria-pressed', String(on));
    btn.lastElementChild.textContent = tryLabel(on);
    btn.closest('.pr-deal').classList.toggle('done', on);
    const prog = holder.querySelector('.pr-progress');
    prog.querySelector('b').textContent = set.size;
    prog.querySelector('.pr-pbar i').style.setProperty('--p', set.size / 8);
    if (on && S.fx.confetti) {
      const r = btn.getBoundingClientRect();
      S.fx.confetti(['#3ddc97', '#ffc84a', '#ff8fb1', '#b4a5ff'], { x: r.left + r.width / 2, y: r.top, n: set.size === 8 ? 70 : 16, power: set.size === 8 ? 0.8 : 0.32 });
    }
  }

  function nextQuestion(deck) {
    const qs = Array.from(deck.querySelectorAll('.pr-q')), i = qs.findIndex(q => q.classList.contains('on')), j = (i + 1) % qs.length;
    qs[i].classList.remove('on');
    qs[i].hidden = true;
    qs[j].hidden = false;
    qs[j].classList.add('on');
    deck.querySelector('.pr-qn b').textContent = j + 1;
    deck.querySelector('[data-q-next]').textContent = j === qs.length - 1 ? 'Сначала' : 'Следующий вопрос';
  }

  V.pair = {
    valid: (a, b) => Boolean(M().type(a) && M().type(b)),
    title: (a, b) => `${M().type(a).code} и ${M().type(b).code}`,
    render(aId, bId) {
      const a = M().type(aId), b = M().type(bId), r = M().relation(a, b), txt = ui.relText(r.kind);
      // Подсветка идёт за фигурами: у заказа и ревизии слева заказчик / ревизор
      const flip = r.id === 'benefactor' || r.id === 'supervisor';
      const [lq, rq] = flip ? [b.quadra, a.quadra] : [a.quadra, b.quadra];
      const here = `#/relations/${a.id}/${b.id}`;
      return `
        <section class="pair-hero" style="--qa:var(--q-${lq});--qb:var(--q-${rq})">
          <div class="wrap center">
            <a class="crumb" href="#/relations">${ui.ICON.back}Отношения</a>
            <p class="eyebrow">${a.code} «${esc(a.alias)}» и${NB}${b.code} «${esc(b.alias)}»</p>
            <h1 class="pair-title display"><span class="sv">${esc(ui.relTitle(r, a, b))}</span></h1>
            <div class="pair-duo">${ui.duo(a, b, { eager: true })}</div>
            <p>${ui.toneChip(r.tone)}</p>
            <p class="lead">${esc(txt.line || '')}</p>
            <nav class="pr-side" aria-label="Чья сторона">
              <a href="${here}" aria-current="page">Сторона ${a.code}</a><a href="#/relations/${b.id}/${a.id}">Сторона ${b.code}</a>
            </nav>
            <nav class="pr-toc" aria-label="На этой странице">${SECTIONS.map(([id, name]) => `<a href="${here}#${id}">${name}</a>`).join('')}</nav>
          </div>
        </section>
        <div class="pr-body" data-pair-body>${ui.pairReady() ? pairBody(a, b) : skeleton()}</div>
        <section class="sec">
          <div class="wrap">
            <div class="grid2">
              ${[a, b].map((t, i) => `<a class="link-card reveal" style="${ui.qStyle(t.quadra)};--i:${i}" href="#/types/${t.id}">
                <span class="lc-art lc-char">${ui.character(t, { sizes: ui.CHAR.ava, alt: '' })}</span>
                <span class="lc-kicker">${ui.quadra(t.quadra).name} · ${esc(t.role)}</span>
                <span class="lc-title">${t.code} «${esc(t.alias)}»</span>
                <span class="lc-text">${esc(ui.content(t.id).tagline || '')}</span>
              </a>`).join('')}
            </div>
            <div class="pair-links reveal"><a class="link" href="#/relations">Выбрать другую пару</a></div>
          </div>
        </section>`;
    },
    mount(root, aId, bId) {
      const a = M().type(aId), b = M().type(bId), holder = root.querySelector('[data-pair-body]');
      let alive = true, offShare = null, offFx = null;
      const wire = () => { offShare = ui.mountShareActions(holder, { text: () => sendText(b, a), url: () => pairUrl(b, a) }); };
      if (holder.querySelector('#spheres')) { S.dom.typo(holder); wire(); }
      else {
        ui.pairTexts().then(() => {
          if (!alive) return;
          holder.innerHTML = pairBody(a, b);
          S.dom.typo(holder);
          offFx = S.fx.mountAll(holder);
          wire();
          // ссылка с якорем (#/relations/a/b#spheres) — доводим до места, когда тексты уже на странице
          const anchor = location.hash.split('#')[2];
          const el = anchor && document.getElementById(anchor);
          if (el) el.scrollIntoView({ block: 'start' });
        }).catch(() => { if (alive) holder.innerHTML = fallback(a, b); });
      }
      const onClick = e => {
        const t = e.target.closest && e.target.closest('[data-try], [data-q-next]');
        if (!t || !holder.contains(t)) return;
        if (t.dataset.try) toggleTry(a, b, t, holder);
        else nextQuestion(t.closest('[data-deck]'));
      };
      holder.addEventListener('click', onClick);
      return () => { alive = false; holder.removeEventListener('click', onClick); if (offShare) offShare(); if (offFx) offFx(); };
    }
  };
})(window);
