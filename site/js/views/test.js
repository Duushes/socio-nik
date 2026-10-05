/* Socio-Nik · тест: 20 вопросов по одному, шкала из 5, автопереход, «Назад», клавиатура, сохранение прогресса;
   в конце — сцена раскрытия: портреты мелькают и останавливаются на твоём типе */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;

  const VALUES = [-2, -1, 0, 1, 2];
  const LABELS = { '-2': 'Точно А', '-1': 'Скорее А', 0: 'Поровну', 1: 'Скорее Б', 2: 'Точно Б' };
  const load = () => {
    const st = S.store.get('test', null);
    return st && st.answers && Number.isInteger(st.index) ? st : { answers: {}, index: 0 };
  };

  function question(q, i, total, value) {
    return `
      <div class="q" data-q="${q.id}">
        <p class="q-count caption">Вопрос ${i + 1} из ${total}</p>
        <h1 class="q-prompt">${esc(q.prompt)}</h1>
        <div class="q-cards">
          <div class="q-st q-a${value < 0 ? ' lean' : ''}"><span class="q-tag">А</span><p>${esc(q.a)}</p></div>
          <div class="q-st q-b${value > 0 ? ' lean' : ''}"><span class="q-tag">Б</span><p>${esc(q.b)}</p></div>
        </div>
        <div class="q-scale" role="radiogroup" aria-label="Что тебе ближе: А или Б">
          ${VALUES.map(v => `<button type="button" role="radio" class="dot d${v + 2}" data-v="${v}" aria-checked="${value === v}" aria-label="${LABELS[v]}" tabindex="${value === v || (value == null && v === 0) ? 0 : -1}"><span></span></button>`).join('')}
        </div>
        <div class="q-legend" aria-hidden="true"><span>Точно А</span><span>Поровну</span><span>Точно Б</span></div>
      </div>`;
  }

  V.test = {
    title: () => 'Тест',
    render() {
      const qs = S.data.questions, st = load();
      const i = Math.min(st.index, qs.length - 1);
      return `
        <section class="test">
          <div class="test-progress" role="progressbar" aria-label="Прогресс теста" aria-valuemin="0" aria-valuemax="${qs.length}" aria-valuenow="${i}"><i style="--p:${(i / qs.length) * 100}%"></i></div>
          <div class="wrap test-wrap">
            <div class="test-head">
              <button class="ghost-btn" type="button" data-back${i === 0 ? ' disabled' : ''}>‹ Назад</button>
              <button class="ghost-btn" type="button" data-restart>Начать заново</button>
            </div>
            <div class="q-stage" aria-live="polite">${question(qs[i], i, qs.length, st.answers[qs[i].id])}</div>
            <p class="test-hint">Отвечай так, как обычно бывает, а не как «правильно».<span class="kbd-hint"> Можно нажимать клавиши 1–5.</span></p>
          </div>
          <div class="counting" hidden>
            <div class="slot" style="--q:var(--paper)"><span class="slot-glow" aria-hidden="true"></span><img class="slot-img" alt="" width="520" height="650" decoding="async"></div>
            <p class="slot-cap caption" aria-live="polite">Считаем твой тип…</p>
          </div>
        </section>`;
    },
    mount(root) {
      const qs = S.data.questions;
      let st = load();
      st.index = Math.min(st.index, qs.length - 1);
      const stage = root.querySelector('.q-stage'), bar = root.querySelector('.test-progress'), back = root.querySelector('[data-back]');
      const timers = [];
      let locked = false, warmed = false;

      const save = () => S.store.set('test', st);
      // Портреты для сцены раскрытия подгружаем заранее, ближе к концу теста
      const warm = () => {
        if (warmed || st.index < 11) return;
        warmed = true;
        S.data.types.forEach(t => { const im = new Image(); im.src = ui.charSrc(t).src; });
      };

      // Смена вопроса по очереди: старый уезжает, и только потом въезжает новый — без наложения двух вопросов.
      // Высоту сцены держим на время смены, чтобы страница не прыгала.
      function paint(dir) {
        const i = st.index, q = qs[i];
        bar.querySelector('i').style.setProperty('--p', (i / qs.length) * 100 + '%');
        bar.setAttribute('aria-valuenow', i);
        back.disabled = i === 0;
        warm();
        const old = stage.querySelector('.q');
        const tmp = document.createElement('div');
        tmp.innerHTML = question(q, i, qs.length, st.answers[q.id]);
        const next = tmp.firstElementChild;
        const enter = () => {
          stage.replaceChildren(next);
          if (!S.dom.reducedMotion()) next.classList.add(dir > 0 ? 'q-in-r' : 'q-in-l');
          const focus = next.querySelector('.dot[tabindex="0"]');
          if (focus && document.documentElement.classList.contains('kbd')) focus.focus({ preventScroll: true });
          locked = false;
          timers.push(setTimeout(() => { stage.style.minHeight = ''; }, 450));
        };
        if (S.dom.reducedMotion() || !old) { enter(); return; }
        locked = true;
        stage.style.minHeight = stage.offsetHeight + 'px';
        old.classList.add(dir > 0 ? 'q-out-l' : 'q-out-r');
        timers.push(setTimeout(enter, 200));
      }

      function choose(v) {
        if (locked) return;
        const q = qs[st.index];
        st.answers[q.id] = v;
        save();
        const cur = stage.querySelector('.q:last-child');
        cur.querySelectorAll('.dot').forEach(d => {
          const on = Number(d.dataset.v) === v;
          d.setAttribute('aria-checked', String(on));
          d.tabIndex = on ? 0 : -1;
          d.classList.toggle('pop', on);
        });
        cur.querySelector('.q-a').classList.toggle('lean', v < 0);
        cur.querySelector('.q-b').classList.toggle('lean', v > 0);
        locked = true;
        timers.push(setTimeout(() => { locked = false; st.index < qs.length - 1 ? go(1) : finish(); }, S.dom.reducedMotion() ? 60 : 260));
      }

      function go(dir) {
        if (locked) return;
        const n = st.index + dir;
        if (n < 0 || n >= qs.length) return;
        st.index = n;
        save();
        paint(dir);
      }

      function finish() {
        const res = S.core.scoring.score(st.answers, qs);
        S.state.saveResult(res.axes);
        S.store.del('test');
        S.state.justFinished = true;
        bar.querySelector('i').style.setProperty('--p', '100%');
        const me = S.core.modelA.type(S.core.scoring.result(res.axes).top.id);
        reveal(me, () => { location.hash = '#/result'; });
      }

      // Слот: портреты мелькают всё медленнее и останавливаются на твоём типе (~2 с)
      function reveal(me, done) {
        const ov = root.querySelector('.counting'), slot = ov.querySelector('.slot'), img = ov.querySelector('.slot-img'), cap = ov.querySelector('.slot-cap');
        const put = t => { img.src = ui.charSrc(t).src; slot.style.setProperty('--q', `var(--q-${t.quadra})`); };
        ov.hidden = false;
        if (S.dom.reducedMotion()) { put(me); cap.textContent = `${me.code} · ${me.alias}`; timers.push(setTimeout(done, 700)); return; }
        const others = S.data.types.filter(t => t.id !== me.id).sort(() => Math.random() - 0.5);
        const steps = 12;
        let at = 0;
        for (let n = 0; n < steps; n++) {
          at += 55 + 190 * Math.pow(n / (steps - 1), 2.2);
          const t = n === steps - 1 ? me : others[n % others.length];
          timers.push(setTimeout(() => {
            put(t);
            slot.classList.remove('tick');
            void slot.offsetWidth;
            slot.classList.add(t === me ? 'land' : 'tick');
            if (t === me) cap.textContent = `${me.code} · ${me.alias}`;
          }, at));
        }
        timers.push(setTimeout(done, at + 650));
      }

      const onClick = e => {
        const dot = e.target.closest('.dot');
        if (dot && stage.contains(dot) && !dot.closest('.q-out-l, .q-out-r')) choose(Number(dot.dataset.v));
        if (e.target.closest('[data-back]')) go(-1);
        if (e.target.closest('[data-restart]')) {
          st = { answers: {}, index: 0 };
          save();
          paint(-1);
        }
      };
      const onKey = e => {
        if (e.target.matches && e.target.matches('input, select, textarea')) return;
        if (/^[1-5]$/.test(e.key)) { e.preventDefault(); choose(Number(e.key) - 3); return; }
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
      document.addEventListener('keydown', onKey);
      const first = stage.querySelector('.dot[tabindex="0"]');
      if (first && document.documentElement.classList.contains('kbd')) first.focus({ preventScroll: true });
      return () => {
        root.removeEventListener('click', onClick);
        document.removeEventListener('keydown', onKey);
        timers.forEach(clearTimeout);
      };
    }
  };
})(window);
