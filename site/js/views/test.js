/* Socio-Nik · тест: 20 вопросов по одному, шкала из 5, автопереход, «Назад», клавиатура, сохранение прогресса */
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
        <div class="q-glyph cycling" data-morph-auto>${axisGlyph(q.axis)}</div>
        <p class="q-count">Вопрос ${i + 1} из ${total}</p>
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
          <div class="test-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${qs.length}" aria-valuenow="${i}"><i style="--p:${(i / qs.length) * 100}%"></i></div>
          <div class="test-aurora" aria-hidden="true"></div>
          <div class="wrap test-wrap">
            <div class="test-head">
              <button class="ghost-btn" type="button" data-back${i === 0 ? ' disabled' : ''}>‹ Назад</button>
              <button class="ghost-btn" type="button" data-restart>Начать заново</button>
            </div>
            <div class="q-stage" aria-live="polite">${question(qs[i], i, qs.length, st.answers[qs[i].id])}</div>
            <p class="test-hint">Отвечай так, как обычно бывает, а не как «правильно».<span class="kbd-hint"> Можно нажимать клавиши 1–5.</span></p>
          </div>
          <div class="counting" hidden><div class="counting-orbs" aria-hidden="true"><i></i><i></i><i></i><i></i></div><p>Считаем твой тип…</p></div>
        </section>`;
    },
    mount(root) {
      const qs = S.data.questions;
      let st = load();
      st.index = Math.min(st.index, qs.length - 1);
      const stage = root.querySelector('.q-stage'), bar = root.querySelector('.test-progress'), back = root.querySelector('[data-back]');
      const timers = [];
      let locked = false, cycle = 0;

      const save = () => S.store.set('test', st);
      const startCycle = () => {
        clearInterval(cycle);
        if (S.dom.reducedMotion()) return;
        cycle = setInterval(() => { const g = stage.querySelector('[data-morph-auto]'); if (g) g.classList.toggle('is-b'); }, 1800);
      };

      // Смена вопроса по очереди: старый уезжает, и только потом въезжает новый — без наложения двух вопросов.
      // Высоту сцены держим на время смены, чтобы страница не прыгала.
      function paint(dir) {
        const i = st.index, q = qs[i];
        bar.querySelector('i').style.setProperty('--p', (i / qs.length) * 100 + '%');
        bar.setAttribute('aria-valuenow', i);
        back.disabled = i === 0;
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
        const ov = root.querySelector('.counting');
        ov.hidden = false;
        timers.push(setTimeout(() => { location.hash = '#/result'; }, S.dom.reducedMotion() ? 50 : 1300));
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
      startCycle();
      const first = stage.querySelector('.dot[tabindex="0"]');
      if (first && document.documentElement.classList.contains('kbd')) first.focus({ preventScroll: true });
      return () => {
        root.removeEventListener('click', onClick);
        document.removeEventListener('keydown', onKey);
        timers.forEach(clearTimeout);
        clearInterval(cycle);
      };
    }
  };
})(window);
