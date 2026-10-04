/* Socio-Nik · тест: 20 вопросов по одному, шкала из 5, автопереход, «Назад», клавиатура, сохранение прогресса.
   Тест вдвоём на одном телефоне: шаг 1 — отвечаешь ты (результат сохраняется как твой), шаг 2 — партнёр
   (результат хранится отдельно и не затирает твой), после второго теста сразу открывается экран пары. */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const { esc } = S.dom;

  const VALUES = [-2, -1, 0, 1, 2];
  const LABELS = { '-2': 'Точно А', '-1': 'Скорее А', 0: 'Поровну', 1: 'Скорее Б', 2: 'Точно Б' };
  const AXIS_PAIR = { EI: ['Te', 'Ti'], NS: ['Ne', 'Se'], TF: ['Te', 'Fe'], RP: null };

  const load = () => {
    const st = S.store.get('test', null);
    return st && st.answers && Number.isInteger(st.index) ? st : { answers: {}, index: 0 };
  };

  function axisGlyph(axis) {
    const c = S.theme.resolved() === 'dark' ? '#2997ff' : '#0071e3';
    const pair = AXIS_PAIR[axis];
    if (!pair) {
      return `<svg class="morph" viewBox="-70 -70 140 140" aria-hidden="true">
        <g class="m-a"><path d="M-56 42 H-28 V14 H0 V-14 H28 V-42 H56" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g class="m-b"><path d="M-58 0 C-44 -46 -26 -46 -14 0 S16 46 30 0 S52 -40 58 -18" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/></g></svg>`;
    }
    return `<svg class="morph" viewBox="-70 -70 140 140" aria-hidden="true"><g class="m-a">${S.art.toSVG(S.art.glyphOf(pair[0], c))}</g><g class="m-b">${S.art.toSVG(S.art.glyphOf(pair[1], c))}</g></svg>`;
  }

  function question(q, i, total, value) {
    return `
      <div class="q" data-q="${q.id}">
        <div class="q-glyph${value > 0 ? ' is-b' : ''}" data-q-glyph>${axisGlyph(q.axis)}</div>
        <p class="q-count">Вопрос ${i + 1} из ${total}</p>
        <h1 class="q-prompt">${esc(q.prompt)}</h1>
        <div class="q-cards">
          <div class="q-st q-a${value < 0 ? ' lean' : ''}" data-pick="-1"><span class="q-tag">А</span><p>${esc(q.a)}</p></div>
          <div class="q-st q-b${value > 0 ? ' lean' : ''}" data-pick="1"><span class="q-tag">Б</span><p>${esc(q.b)}</p></div>
        </div>
        <div class="q-scale" role="radiogroup" aria-label="Что тебе ближе: А или Б">
          ${VALUES.map(v => `<button type="button" role="radio" class="dot d${v + 2}" data-v="${v}" aria-checked="${value === v}" aria-label="${LABELS[v]}" tabindex="${value === v || (value == null && v === 0) ? 0 : -1}"><span></span></button>`).join('')}
        </div>
        <div class="q-legend" aria-hidden="true"><span>Точно <i>А</i></span><span>Скорее <i>А</i></span><span>Поровну</span><span>Скорее <i>Б</i></span><span>Точно <i>Б</i></span></div>
      </div>`;
  }

  V.test = {
    title: () => 'Тест',
    render() {
      const qs = S.data.questions, st = load();
      const i = Math.min(st.index, qs.length - 1);
      const duo = S.core.couple.duo();
      const who = duo ? (duo.step === 2 ? '<p class="duo-chip on">Отвечает партнёр</p>' : '<p class="duo-chip">Отвечаешь ты · потом партнёр</p>') : '';
      return `
        <section class="test">
          <div class="test-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${qs.length}" aria-valuenow="${i}"><i style="--p:${(i / qs.length) * 100}%"></i></div>
          <div class="test-aurora" aria-hidden="true"></div>
          <div class="wrap test-wrap">
            <div class="test-head">
              <button class="ghost-btn" type="button" data-back${i === 0 ? ' disabled' : ''}>‹ Назад</button>
              ${who}
              <button class="ghost-btn subtle" type="button" data-restart${i === 0 && !Object.keys(st.answers).length ? ' disabled' : ''}>Начать заново</button>
            </div>
            <div class="q-stage" aria-live="polite">${question(qs[i], i, qs.length, st.answers[qs[i].id])}</div>
            <p class="test-hint">Отвечай так, как обычно бывает, а не как «правильно».<span class="kbd-hint"> Можно нажимать клавиши 1–5.</span></p>
          </div>
          <div class="counting" hidden><div class="counting-orbs" aria-hidden="true"><i></i><i></i><i></i><i></i></div><p>${duo && duo.step === 2 ? 'Считаем тип партнёра…' : 'Считаем твой тип…'}</p></div>
        </section>`;
    },
    mount(root) {
      const qs = S.data.questions;
      let st = load();
      st.index = Math.min(st.index, qs.length - 1);
      const stage = root.querySelector('.q-stage'), bar = root.querySelector('.test-progress'), back = root.querySelector('[data-back]');
      const restart = root.querySelector('[data-restart]');
      const timers = [];
      let locked = false, pendingQ = null;

      const save = () => S.store.set('test', st);
      // Знак над вопросом не крутится сам: он склоняется к тому полюсу, на который смотришь или который выбрал
      const lean = v => { const g = stage.querySelector('.q:last-child [data-q-glyph]'); if (g) g.classList.toggle('is-b', v > 0); };

      // Смена вопроса по очереди: старый уезжает, и только потом въезжает новый — без наложения двух вопросов.
      // Высоту сцены держим на время смены, чтобы страница не прыгала.
      // Ответ — самое частое действие (по 20 на каждого): смена вопроса короткая — уход 120 мс, въезд 240 мс;
      // с клавиатуры — только мягкая смена прозрачности
      function paint(dir, viaKey = false) {
        const i = st.index, q = qs[i];
        bar.querySelector('i').style.setProperty('--p', (i / qs.length) * 100 + '%');
        bar.setAttribute('aria-valuenow', i);
        back.disabled = i === 0;
        restart.disabled = i === 0 && !Object.keys(st.answers).length;
        const old = stage.querySelector('.q');
        const tmp = document.createElement('div');
        tmp.innerHTML = question(q, i, qs.length, st.answers[q.id]);
        const next = tmp.firstElementChild;
        const enter = () => {
          stage.replaceChildren(next);
          if (!S.dom.reducedMotion()) next.classList.add(viaKey ? 'q-fade-in' : dir > 0 ? 'q-in-r' : 'q-in-l');
          const focus = next.querySelector('.dot[tabindex="0"]');
          if (focus && document.documentElement.classList.contains('kbd')) focus.focus({ preventScroll: true });
          locked = false;
          timers.push(setTimeout(() => { stage.style.minHeight = ''; }, 300));
        };
        if (S.dom.reducedMotion() || !old) { enter(); return; }
        locked = true;
        stage.style.minHeight = stage.offsetHeight + 'px';
        old.classList.add(viaKey ? 'q-fade-out' : dir > 0 ? 'q-out-l' : 'q-out-r');
        timers.push(setTimeout(enter, viaKey ? 90 : 120));
      }

      // Отметить ответ на текущем вопросе: точки шкалы, карточки, знак
      function mark(v) {
        const cur = stage.querySelector('.q:last-child');
        cur.querySelectorAll('.dot').forEach(d => {
          const on = Number(d.dataset.v) === v;
          d.setAttribute('aria-checked', String(on));
          d.tabIndex = on ? 0 : -1;
          d.classList.toggle('pop', on);
        });
        cur.querySelector('.q-a').classList.toggle('lean', v < 0);
        cur.querySelector('.q-b').classList.toggle('lean', v > 0);
        lean(v);
      }

      function choose(v, viaKey = false) {
        if (locked) return;
        const q = qs[st.index];
        st.answers[q.id] = v;
        save();
        mark(v);
        locked = true;
        pendingQ = q.id;
        timers.push(setTimeout(() => {
          locked = false;
          pendingQ = null;
          st.index < qs.length - 1 ? go(1, viaKey) : finish();
        }, S.dom.reducedMotion() ? 60 : viaKey ? 120 : 180));
      }

      // Карточка утверждения — тоже ответ: нажатие — «скорее А / Б», второе нажатие, пока вопрос не сменился, — «точно»
      function pickCard(sign) {
        const q = qs[st.index];
        if (locked && pendingQ === q.id && st.answers[q.id] === sign) {
          st.answers[q.id] = sign * 2;
          save();
          mark(sign * 2);
          return;
        }
        choose(sign);
      }

      function go(dir, viaKey = false) {
        if (locked) return;
        const n = st.index + dir;
        if (n < 0 || n >= qs.length) return;
        st.index = n;
        save();
        paint(dir, viaKey);
      }

      function finish() {
        const res = S.core.scoring.score(st.answers, qs);
        const CP = S.core.couple, duo = CP.duo(), mine = S.state.result(), enc = S.core.payload.encode;
        let next = '#/result';
        S.store.del('test');
        if (duo && duo.step === 2 && mine) {
          // второй в паре на том же телефоне: результат партнёра — отдельно, свой не трогаем
          const code = enc(res.axes);
          CP.setPartner(code, { via: 'duo' });
          CP.setDuo(null);
          S.track('partner_test_done', { mode: 'duo' });
          next = `#/pair/${enc(mine)}/${code}`;
        } else {
          S.state.saveResult(res.axes);
          S.state.justFinished = true;
          S.track('test_finish', { type: S.core.modelA.type(res.top.id).mbti, close: Boolean(res.close) });
          if (duo && duo.step === 1) { CP.setDuo(2); next = '#/duo'; S.state.justFinished = false; }
          else if (S.state.friend) {
            CP.setPartner(enc(S.state.friend), { via: 'invite' });
            S.track('partner_test_done', { mode: 'invite' });
          }
        }
        bar.querySelector('i').style.setProperty('--p', '100%');
        const ov = root.querySelector('.counting');
        ov.hidden = false;
        timers.push(setTimeout(() => { location.hash = next; }, S.dom.reducedMotion() ? 50 : 1300));
      }

      const leaving = el => Boolean(el.closest('.q-out-l, .q-out-r, .q-fade-out'));
      const onClick = e => {
        const dot = e.target.closest('.dot');
        if (dot && stage.contains(dot) && !leaving(dot)) choose(Number(dot.dataset.v));
        const card = e.target.closest('[data-pick]');
        if (card && stage.contains(card) && !leaving(card)) pickCard(Number(card.dataset.pick));
        if (e.target.closest('[data-back]')) go(-1);
        const rb = e.target.closest('[data-restart]');
        if (rb) {
          S.ui.confirm({
            title: 'Начать тест заново?',
            text: 'Ответы этого прохождения сотрутся. Результат, сохранённый раньше, останется.',
            yes: 'Стереть ответы', no: 'Продолжить тест', danger: true, from: rb
          }).then(ok => {
            if (!ok) return;
            st = { answers: {}, index: 0 };
            save();
            paint(-1);
          });
        }
      };
      // наведение: знак показывает полюс, к которому тянется рука; ушли — знак возвращается к выбранному ответу
      const onOver = e => {
        const t = e.target.closest && e.target.closest('[data-pick], .dot');
        if (!t || !stage.contains(t)) return;
        const v = t.dataset.pick != null ? Number(t.dataset.pick) : Number(t.dataset.v);
        if (v) lean(v);
      };
      const onLeave = () => lean(st.answers[qs[st.index].id] || 0);
      const onKey = e => {
        if (e.target.matches && e.target.matches('input, select, textarea')) return;
        if (/^[1-5]$/.test(e.key)) { e.preventDefault(); choose(Number(e.key) - 3, true); return; }
        if (e.key === 'Backspace') { e.preventDefault(); go(-1); return; }
        const dot = e.target.closest && e.target.closest('.dot');
        if (dot && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
          e.preventDefault();
          const dots = Array.from(dot.parentNode.children);
          const j = Math.max(0, Math.min(4, dots.indexOf(dot) + (e.key === 'ArrowRight' ? 1 : -1)));
          dots.forEach((d, k) => { d.tabIndex = k === j ? 0 : -1; });
          dots[j].focus();
        }
      };
      root.addEventListener('click', onClick);
      stage.addEventListener('pointerover', onOver);
      stage.addEventListener('pointerleave', onLeave);
      document.addEventListener('keydown', onKey);
      const first = stage.querySelector('.dot[tabindex="0"]');
      if (first && document.documentElement.classList.contains('kbd')) first.focus({ preventScroll: true });
      return () => {
        root.removeEventListener('click', onClick);
        stage.removeEventListener('pointerover', onOver);
        stage.removeEventListener('pointerleave', onLeave);
        document.removeEventListener('keydown', onKey);
        timers.forEach(clearTimeout);
      };
    }
  };
})(window);
