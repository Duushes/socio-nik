/* Socio-Nik · приложение: состояние, роутер на hash, навигация, отладочный хук. Тема одна — тёмная. */
(function (root) {
  const S = root.Socio;

  root.addEventListener('error', e => document.documentElement.setAttribute('data-error', String(e.message || e.error)));

  // ---------- состояние ----------
  const validAxes = axes => Boolean(axes && S.core.payload.decode(S.core.payload.encode(axes)));
  S.state = {
    demo: null,          // ?demo=ile — показать результат без теста (для проверок и скриншотов)
    // Результат друга, если тест начали по его ссылке; живёт до закрытия вкладки
    _friend: null,
    get friend() {
      if (this._friend) return this._friend;
      try {
        const v = JSON.parse(root.sessionStorage.getItem('socio.friend'));
        return validAxes(v) ? v : null;
      } catch (e) {
        return null;
      }
    },
    set friend(v) {
      this._friend = v;
      try { root.sessionStorage.setItem('socio.friend', JSON.stringify(v)); } catch (e) { /* только в памяти */ }
    },
    justFinished: false,
    result() {
      if (this.demo) return this.demo;
      const r = S.store.get('result', null);
      // «ровный» результат (все ответы «поровну») типом не считаем: тест такой больше не сохраняет, старые — не показываем
      return r && validAxes(r.axes) && !S.core.scoring.flat(r.axes) ? r.axes : null;
    },
    saveResult(axes) {
      this.demo = null;
      S.store.set('result', { axes, at: Date.now() });
      // тип отдельно — его читает скрипт в <head>, чтобы герой главной сразу был «твоим» (с предзагрузкой портрета)
      S.store.set('mine', S.core.scoring.result(axes).top.id);
    },
    myType() {
      const a = this.result();
      return a ? S.core.scoring.result(a).top.id : null;
    },
    // Явное «пройти заново» — сразу к первому вопросу, без экрана «тест уже пройден»
    restartTest() { S.store.set('test', { answers: {}, index: 0 }); }
  };

  // Ответы, которые ведут к типу: «точно» в 2 из 3 вопросов, «скорее» в остальных
  function demoAxes(typeId) {
    const t = S.core.modelA.type(typeId);
    if (!t) return null;
    const d = S.core.modelA.dichotomies(t.ego), answers = {};
    S.data.questions.forEach((q, i) => {
      const v = i % 3 === 0 ? 1 : 2;
      answers[q.id] = q.aPole === d[q.axis] ? -v : v;
    });
    return S.core.scoring.score(answers, S.data.questions).axes;
  }

  // ---------- роутер ----------
  const ROUTES = [
    [/^\/?$/, 'home'],
    [/^\/test$/, 'test'],
    [/^\/result$/, 'result'],
    [/^\/r\/([0-9-]{9,18})$/, 'shared'],
    [/^\/types$/, 'types'],
    [/^\/types\/([a-z]{3})$/, 'type'],
    [/^\/quadras$/, 'quadras'],
    [/^\/relations$/, 'relations'],
    [/^\/relations\/([a-z]{3})\/([a-z]{3})$/, 'pair'],
    [/^\/box(?:\/([a-z]{3}))?$/, 'box'],
    [/^\/about$/, 'about']
  ];
  const NAV = { test: 'test', result: 'test', types: 'types', type: 'types', quadras: 'quadras', relations: 'relations', pair: 'relations', box: 'box', about: 'about' };

  function parse() {
    const raw = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
    const [path, anchor] = raw.split('#');
    for (const [re, name] of ROUTES) {
      const m = path.match(re);
      if (m) {
        const params = m.slice(1);
        const view = S.views[name];
        if (view.valid && !view.valid(...params)) break;
        return { name, params, anchor };
      }
    }
    // ссылка на результат, которая не читается (обрезалась в мессенджере, опечатка) — отдельный экран с выходом
    if (/^\/r(\/|$)/.test(path)) return { name: 'badlink', params: [], anchor: null };
    return { name: 'notfound', params: [], anchor: null };
  }

  let cleanup = null, lastPath = null;
  const app = () => document.getElementById('app');

  // ---------- прокрутка: «Назад» возвращает туда, где ты был ----------
  // Каждой записи истории даём номер (history.state.sid) и помним, где на ней остановились. Запись с номером —
  // значит, сюда вернулись кнопкой «Назад»/«Вперёд» или перезагрузкой: восстанавливаем место. Новая запись — с начала.
  // Если history недоступна (редкий встроенный браузер), всё работает как раньше: каждый переход — с начала страницы.
  const SCROLL_KEY = 'socio.scroll';
  let scrolls = {}, curSid = null, sidSeq = 0, stopRestore = null;
  try { scrolls = JSON.parse(root.sessionStorage.getItem(SCROLL_KEY)) || {}; } catch (e) { scrolls = {}; }
  try { history.scrollRestoration = 'manual'; } catch (e) { /* нет — не страшно */ }
  const keepScrolls = () => {
    if (curSid) scrolls[curSid] = Math.round(scrollY);
    const keys = Object.keys(scrolls);
    if (keys.length > 60) keys.slice(0, keys.length - 60).forEach(k => delete scrolls[k]);
    try { root.sessionStorage.setItem(SCROLL_KEY, JSON.stringify(scrolls)); } catch (e) { /* только в памяти */ }
  };
  // Номер текущей записи истории; known — запись уже была открыта раньше
  function entry() {
    try {
      const st = history.state;
      if (st && st.sid) return { sid: st.sid, known: true };
      const sid = Date.now().toString(36) + '-' + (++sidSeq);
      history.replaceState({ sid }, '');
      return { sid, known: false };
    } catch (e) {
      return { sid: null, known: false };
    }
  }
  // Страница может дорастать (тексты пары, картинки) — доводим прокрутку несколько раз, пока человек сам не начал листать
  function restoreScroll(y) {
    if (stopRestore) stopRestore();
    const EV = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
    let tries = 0, t = 0;
    const stop = () => { clearTimeout(t); EV.forEach(n => removeEventListener(n, stop, true)); stopRestore = null; };
    stopRestore = stop;
    EV.forEach(n => addEventListener(n, stop, { capture: true, passive: true }));
    const step = () => {
      scrollTo(0, y);
      if (Math.abs(scrollY - y) > 2 && tries++ < 16) t = setTimeout(step, 70); else stop();
    };
    step();
  }

  // «Тест» в шапке после теста ведёт к результату: иначе кажется, что результат пропал
  function syncNav(name) {
    const has = Boolean(S.state.result());
    document.querySelectorAll('.nav-links a, .menu a').forEach(a => {
      if (a.dataset.nav === 'test') {
        a.textContent = has ? 'Мой тип' : 'Тест';
        a.setAttribute('href', has ? '#/result' : '#/test');
      }
      const on = a.dataset.nav === NAV[name] && !(has && name === 'test' && a.dataset.nav === 'test');
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function render({ instant = false, keepScroll = false } = {}) {
    const r = parse(), view = S.views[r.name];
    const path = location.hash.split('#').slice(0, 2).join('#');
    const samePath = path === lastPath;
    lastPath = path;
    // где остановились на странице, с которой уходим
    const y = scrollY;
    if (stopRestore) stopRestore();
    keepScrolls();
    const en = entry();
    // перерисовка на месте (S.app.render) — не возврат по истории: место не восстанавливаем
    const sameEntry = Boolean(en.sid) && en.sid === curSid;
    curSid = en.sid;
    const back = en.known && !sameEntry && !keepScroll && scrolls[en.sid] != null ? scrolls[en.sid] : null;
    // та же страница: якорь — плавно к нему; «Назад» от якоря — на прежнее место, без перерисовки
    if (samePath && !keepScroll && !instant && (r.anchor || back != null)) {
      if (back != null) scrollTo({ top: back, behavior: S.dom.reducedMotion() ? 'auto' : 'smooth' });
      else scrollToAnchor(r.anchor, true);
      return;
    }
    const update = () => {
      if (cleanup) { try { cleanup(); } catch (e) { /* уже убрано */ } cleanup = null; }
      const el = app();
      el.innerHTML = view.render(...r.params);
      document.title = (view.title ? view.title(...r.params) + ' · ' : '') + 'Socio-Nik';
      document.body.setAttribute('data-view', r.name);
      if (keepScroll) {
        scrollTo(0, y);
        el.querySelectorAll('.reveal').forEach(S.fx.show);
      } else if (back != null) {
        // вернулись — страница уже знакома, показываем её сразу целиком
        el.querySelectorAll('.reveal').forEach(S.fx.show);
      } else if (!r.anchor) {
        scrollTo(0, 0);
      }
      const c1 = view.mount ? view.mount(el, ...r.params) : null;
      const c2 = S.fx.mountAll(el);
      cleanup = () => { if (c1) c1(); if (c2) c2(); };
      syncNav(r.name);
      closeMenu();
      if (back != null) restoreScroll(back);
      else if (r.anchor) scrollToAnchor(r.anchor, false);
      if (!instant && !keepScroll) el.focus({ preventScroll: true });
    };
    if (instant) update(); else S.fx.transition(update);
  }

  function scrollToAnchor(id, smooth) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: smooth && !S.dom.reducedMotion() ? 'smooth' : 'auto', block: 'start' });
  }

  // ---------- навигация ----------
  function setMenu(open) {
    const de = document.documentElement, b = document.querySelector('[data-menu]');
    de.classList.toggle('menu-open', open);
    // Открытое меню закрывает страницу целиком. То, что под ним, выключаем: Tab не уходит в невидимое
    document.querySelectorAll('.skip, #app, .footer').forEach(el => { el.inert = open; });
    if (b) {
      b.setAttribute('aria-expanded', String(open));
      b.setAttribute('aria-label', open ? 'Закрыть меню' : 'Меню');
    }
  }
  const closeMenu = () => setMenu(false);

  function init() {
    const q = new URLSearchParams(location.search);
    if (q.get('demo')) S.state.demo = demoAxes(q.get('demo'));
    // ?reset — сброс своего результата и прогресса теста, чтобы увидеть сайт глазами нового посетителя.
    // Только локально (file:// и localhost): по чужой ссылке результат не сотрётся.
    if (q.has('reset') && /^(file:|https?:\/\/(localhost|127\.0\.0\.1)[:/])/.test(location.href)) {
      ['result', 'mine', 'test', 'hero', 'box.seen'].forEach(k => S.store.del(k));
      try { sessionStorage.removeItem('socio.friend'); } catch (e) { /* нет доступа */ }
      try { history.replaceState(null, '', location.pathname + (location.hash || '#/')); } catch (e) { /* file:// без history */ }
    }
    // результат, сохранённый до того, как появился ключ «mine», — дописываем
    if (!S.state.demo) {
      const mine = S.state.myType();
      if (mine && S.store.get('mine', null) !== mine) S.store.set('mine', mine);
      if (!mine && S.store.get('mine', null)) S.store.del('mine');
    }
    S.theme.apply();
    document.documentElement.classList.add('js');

    document.querySelector('[data-menu]').addEventListener('click', () => setMenu(!document.documentElement.classList.contains('menu-open')));
    // Пункт раздела, который уже открыт, адрес не меняет — меню закрываем сами и возвращаем фокус на кнопку
    document.getElementById('menu').addEventListener('click', e => {
      const a = e.target.closest('a');
      if (a && a.getAttribute('href') === (location.hash || '#/')) { closeMenu(); document.querySelector('[data-menu]').focus({ preventScroll: true }); }
    });
    // «К содержимому» — переход к main, а не маршрут: иначе роутер принял бы #app за адрес и показал «Тут пусто»
    const skip = document.querySelector('.skip');
    if (skip) skip.addEventListener('click', e => { e.preventDefault(); app().focus(); app().scrollIntoView({ block: 'start' }); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && document.documentElement.classList.contains('menu-open')) { closeMenu(); document.querySelector('[data-menu]').focus(); } });
    addEventListener('resize', () => { if (innerWidth >= 960) closeMenu(); });
    S.fx.fitAll(document.querySelector('.footer'));
    // Фокус переносим программно только тем, кто пользуется клавиатурой, — мышь и палец не видят лишних рамок
    addEventListener('keydown', e => { if (e.key === 'Tab' || e.key.startsWith('Arrow') || /^[1-5]$/.test(e.key)) document.documentElement.classList.add('kbd'); }, true);
    addEventListener('pointerdown', () => document.documentElement.classList.remove('kbd'), true);
    addEventListener('hashchange', () => render());
    addEventListener('pagehide', keepScrolls);
    addEventListener('scroll', () => document.body.classList.toggle('scrolled', scrollY > 8), { passive: true });
    // Компьютер ↔ телефон: окно растянули или сузили через границу (или подключили мышь к планшету) — меняем класс flat
    // и перерисовываем страницу на месте: 3D-иллюстрации и плоские марки рисуются разной разметкой (ui.rich)
    if (root.matchMedia) {
      const mq = root.matchMedia(S.ui.RICH_MQ), de = document.documentElement;
      de.classList.toggle('flat', !mq.matches);
      const onMode = () => {
        if (de.classList.contains('flat') === !mq.matches) return;
        de.classList.toggle('flat', !mq.matches);
        render({ instant: true, keepScroll: true });
      };
      if (mq.addEventListener) mq.addEventListener('change', onMode); else if (mq.addListener) mq.addListener(onMode);
    }
    render({ instant: true });
  }

  // ---------- отладочный хук ----------
  S.debug = {
    state: () => ({ route: parse(), result: S.state.result(), test: S.store.get('test', null) }),
    demo(typeId) { S.state.demo = demoAxes(typeId); render({ instant: true }); return S.state.demo; },
    answerAll(typeId) { const axes = demoAxes(typeId); S.state.saveResult(axes); location.hash = '#/result'; return axes; },
    render: opts => render(opts)
  };

  S.app = { render };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
