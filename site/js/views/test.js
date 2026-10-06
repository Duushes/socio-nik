/* Socio-Nik · тест: 20 вопросов по одному. У каждого варианта — 3D-картинка и заголовок в 2–3 слова, чтобы отвечать,
   не вчитываясь; нажатие на карточку — «точно», оттенки — на шкале из 5. Автопереход, «Назад», клавиши 1–5,
   прогресс сохраняется.
   Как держим людей до конца (по исследованиям опросов): честное время «≈ N мин» по твоему же темпу вместо голых
   «вопрос 3 из 20»; прогресс-кольцо и 20 делений вместо полоски, которая ползёт медленно; редкие подбадривания
   на четверти, половине и трёх четвертях (постоянные сообщения работают хуже); «С возвращением» при продолжении.
   В конце — сцена раскрытия: портреты мелькают и останавливаются на твоём типе. */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;
  const NB = '\u00A0';

  const VALUES = [-2, -1, 0, 1, 2];
  const LABELS = { '-2': 'Точно А', '-1': 'Скорее А', 0: 'Поровну', 1: 'Скорее Б', 2: 'Точно Б' };
  // подбадривания после 5-го, 10-го и 15-го ответа
  const MILESTONES = {
    5: ['img/emotes/sparkles.webp', 'Отличный темп! Четверть позади'],
    10: ['img/emotes/puzzle.webp', `Половина! Твой персонаж уже собирается`],
    15: ['img/q/x-popper.webp', `Финишная прямая: осталось 5${NB}вопросов`]
  };
  const art = (q, side) => `img/q/${q.id}-${side}.webp`;
  const load = () => {
    const st = S.store.get('test', null);
    return st && st.answers && Number.isInteger(st.index) ? st : { answers: {}, index: 0 };
  };

  function card(q, side, value) {
    const a = side === 'a', v = a ? -2 : 2, head = a ? q.as : q.bs;
    const on = value != null && (a ? value < 0 : value > 0), off = value != null && (a ? value > 0 : value < 0);
    return `<button type="button" class="q-card q-${side}${on ? ' on' : ''}${off ? ' off' : ''}" data-v="${v}" aria-label="${esc(`${LABELS[v]}: ${head} — ${q[side]}`)}">
        <span class="q-art"><img src="${art(q, side)}" alt="" width="240" height="240" decoding="async" draggable="false"></span>
        <span class="q-tag" aria-hidden="true">${a ? 'А' : 'Б'}</span>
        <span class="q-head">${esc(head)}</span>
        <span class="q-text">${esc(q[side])}</span>
      </button>`;
  }

  function question(q, i, total, value) {
    return `
      <div class="q" data-q="${q.id}">
        <p class="q-count sr">Вопрос ${i + 1} из ${total}</p>
        <h1 class="q-prompt">${esc(q.prompt)}</h1>
        <div class="q-cards">${card(q, 'a', value)}${card(q, 'b', value)}</div>
        <div class="q-scale" role="radiogroup" aria-label="Насколько: от «точно А» до «точно Б»">
          <span class="q-track" aria-hidden="true"></span>
          ${VALUES.map(v => `<button type="button" role="radio" class="dot d${v + 2}" data-v="${v}" aria-checked="${value === v}" aria-label="${LABELS[v]}" tabindex="${value === v || (value == null && v === 0) ? 0 : -1}"><span></span></button>`).join('')}
        </div>
        <div class="q-legend" aria-hidden="true"><span>Точно А</span><span>Поровну</span><span>Точно Б</span></div>
      </div>`;
  }

  // Сколько осталось: по твоему темпу (медиана последних ответов), пока его нет — 10 с на вопрос
  function eta(left, times) {
    const last = times.slice(-6).sort((x, y) => x - y);
    const per = last.length ? Math.min(16000, Math.max(3500, last[Math.floor(last.length / 2)])) : 10000;
    const sec = left * per / 1000;
    return sec < 50 ? `меньше минуты` : `≈${NB}${Math.max(1, Math.round(sec / 60))}${NB}мин`;
  }

  V.test = {
    title: () => 'Тест',
    render() {
      const qs = S.data.questions, st = load();
      const i = Math.min(st.index, qs.length - 1);
      return `
        <section class="test">
          <div class="wrap test-wrap">
            <div class="test-top">
              <button class="ghost-btn" type="button" data-back${i === 0 ? ' disabled' : ''}>‹ Назад</button>
              <div class="t-meter">
                <span class="t-ring" aria-hidden="true">
                  <svg viewBox="0 0 48 48"><circle class="t-ring-bg" cx="24" cy="24" r="21"/><circle class="t-ring-fg" cx="24" cy="24" r="21" pathLength="100" style="--p:${(i / qs.length * 100).toFixed(1)}"/></svg>
                  <img src="img/emotes/question.webp" alt="" width="100" height="100">
                </span>
                <span class="t-count"><b data-n>${i + 1}</b>${NB}из${NB}${qs.length}<span class="t-eta" data-eta> · ${eta(qs.length - i, [])}</span></span>
              </div>
              <button class="ghost-btn t-restart" type="button" data-restart aria-label="Начать тест заново"><span class="t-lab">Заново</span>${ui.ICON.cycle}</button>
            </div>
            <div class="t-steps" role="progressbar" aria-label="Прогресс теста" aria-valuemin="0" aria-valuemax="${qs.length}" aria-valuenow="${i}">${qs.map((q, k) => `<i class="${k < i ? 'done' : k === i ? 'now' : ''}"></i>`).join('')}</div>
            <p class="t-toast" aria-live="polite" hidden></p>
            <div class="q-stage" aria-live="polite">${question(qs[i], i, qs.length, st.answers[qs[i].id])}</div>
            <p class="test-hint">Нажми на${NB}карточку${NB}— это «точно». Если не${NB}так однозначно, выбери оттенок на${NB}шкале.<span class="kbd-hint"> Клавиши 1–5 тоже работают.</span></p>
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
      const stage = root.querySelector('.q-stage'), steps = root.querySelector('.t-steps'), back = root.querySelector('[data-back]');
      const ring = root.querySelector('.t-ring'), ringFg = root.querySelector('.t-ring-fg');
      const nEl = root.querySelector('[data-n]'), etaEl = root.querySelector('[data-eta]'), toast = root.querySelector('.t-toast');
      const timers = [], times = [], shown = new Set();
      let locked = false, warmed = false, shownAt = performance.now(), toastT = 0;

      const save = () => S.store.set('test', st);
      // Портреты для сцены раскрытия подгружаем заранее, ближе к концу теста
      const warm = () => {
        if (warmed || st.index < 11) return;
        warmed = true;
        S.data.types.forEach(t => { const im = new Image(); im.src = ui.charSrc(t).src; });
      };
      // картинки следующего вопроса — заранее, чтобы он появился сразу целиком
      const prefetch = i => { const q = qs[i]; if (q) ['a', 'b'].forEach(s => { const im = new Image(); im.src = art(q, s); }); };

      const say = (src, text) => {
        clearTimeout(toastT);
        toast.innerHTML = `<img src="${src}" alt="" width="100" height="100">${esc(text)}`;
        toast.hidden = false;
        toast.classList.remove('in');
        void toast.offsetWidth;
        toast.classList.add('in');
        ring.classList.remove('pop');
        void ring.offsetWidth;
        ring.classList.add('pop');
        toastT = setTimeout(() => { toast.classList.remove('in'); timers.push(setTimeout(() => { toast.hidden = true; }, 300)); }, 2800);
      };

      function meter() {
        const i = st.index, left = qs.length - i;
        ringFg.style.setProperty('--p', (i / qs.length * 100).toFixed(1));
        nEl.textContent = i + 1;
        etaEl.textContent = i === qs.length - 1 ? ' · последний вопрос' : ` · ${eta(left, times)}`;
        steps.setAttribute('aria-valuenow', i);
        Array.from(steps.children).forEach((s, k) => { s.className = k < i ? 'done' : k === i ? 'now' : ''; });
        back.disabled = i === 0;
      }

      // Смена вопроса по очереди: старый уезжает, и только потом въезжает новый — без наложения двух вопросов.
      // Высоту сцены держим на время смены, чтобы страница не прыгала.
      function paint(dir) {
        const i = st.index, q = qs[i];
        meter();
        warm();
        prefetch(i + 1);
        const old = stage.querySelector('.q');
        const tmp = document.createElement('div');
        tmp.innerHTML = question(q, i, qs.length, st.answers[q.id]);
        const next = tmp.firstElementChild;
        const enter = () => {
          stage.replaceChildren(next);
          shownAt = performance.now();
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
        const fresh = st.answers[q.id] == null;
        st.answers[q.id] = v;
        save();
        if (fresh) times.push(performance.now() - shownAt);
        const cur = stage.querySelector('.q:last-child');
        cur.querySelectorAll('.dot').forEach(d => {
          const on = Number(d.dataset.v) === v;
          d.setAttribute('aria-checked', String(on));
          d.tabIndex = on ? 0 : -1;
          d.classList.toggle('pop', on);
        });
        cur.querySelector('.q-a').classList.toggle('on', v < 0);
        cur.querySelector('.q-a').classList.toggle('off', v > 0);
        cur.querySelector('.q-b').classList.toggle('on', v > 0);
        cur.querySelector('.q-b').classList.toggle('off', v < 0);
        cur.classList.toggle('even', v === 0);
        if (navigator.vibrate && !S.fx.fineMouse()) { try { navigator.vibrate(8); } catch (e) { /* без вибрации */ } }
        const done = st.index + 1;
        if (fresh && MILESTONES[done] && !shown.has(done)) { shown.add(done); say(...MILESTONES[done]); }
        locked = true;
        timers.push(setTimeout(() => { locked = false; st.index < qs.length - 1 ? go(1) : finish(); }, S.dom.reducedMotion() ? 60 : 430));
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
        ringFg.style.setProperty('--p', '100');
        Array.from(steps.children).forEach(s => { s.className = 'done'; });
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
        const n = 12;
        let at = 0;
        for (let k = 0; k < n; k++) {
          at += 55 + 190 * Math.pow(k / (n - 1), 2.2);
          const t = k === n - 1 ? me : others[k % others.length];
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
        const pick = e.target.closest('.dot, .q-card');
        if (pick && stage.contains(pick) && !pick.closest('.q-out-l, .q-out-r')) choose(Number(pick.dataset.v));
        if (e.target.closest('[data-back]')) go(-1);
        if (e.target.closest('[data-restart]')) {
          st = { answers: {}, index: 0 };
          times.length = 0;
          shown.clear();
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
          const dots = Array.from(dot.parentNode.querySelectorAll('.dot'));
          const j = Math.max(0, Math.min(4, dots.indexOf(dot) + (e.key === 'ArrowRight' ? 1 : -1)));
          dots.forEach((d, k) => { d.tabIndex = k === j ? 0 : -1; });
          dots[j].focus();
        }
      };
      root.addEventListener('click', onClick);
      document.addEventListener('keydown', onKey);
      prefetch(st.index + 1);
      // вернулись к начатому тесту — скажем, откуда продолжаем
      const answered = Object.keys(st.answers).length;
      if (st.index > 0 && answered) timers.push(setTimeout(() => say('img/q/x-book.webp', `С возвращением! Продолжаем с вопроса ${st.index + 1}`), 450));
      const first = stage.querySelector('.dot[tabindex="0"]');
      if (first && document.documentElement.classList.contains('kbd')) first.focus({ preventScroll: true });
      return () => {
        root.removeEventListener('click', onClick);
        document.removeEventListener('keydown', onKey);
        timers.forEach(clearTimeout);
        clearTimeout(toastT);
      };
    }
  };
})(window);
