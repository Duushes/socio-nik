/* Socio-Nik · приложение: состояние, роутер на hash, навигация, тема, отладочный хук */
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
      return r && validAxes(r.axes) ? r.axes : null;
    },
    saveResult(axes) {
      this.demo = null;
      S.store.set('result', { axes, at: Date.now() });
    },
    myType() {
      const a = this.result();
      return a ? S.core.scoring.result(a).top.id : null;
    }
  };

  // Ответы, которые ведут к типу: «точно» в 2 из 3 вопросов, «скорее» в остальных
  function demoAxes(typeId) {
    const t = S.core.modelA.find(typeId);
    if (!t) return null;
    const d = S.core.modelA.dichotomies(t.ego), answers = {};
    S.data.questions.forEach((q, i) => {
      const v = i % 3 === 0 ? 1 : 2;
      answers[q.id] = q.aPole === d[q.axis] ? -v : v;
    });
    return S.core.scoring.score(answers, S.data.questions).axes;
  }

  // ---------- роутер ----------
  // Сторона пары в адресе — код результата (1-72-64-58-19) или тип (entp / ile)
  const SIDE = '([0-9a-z-]{3,18})';
  const ROUTES = [
    [/^\/?$/, 'home'],
    [/^\/pair$/, 'couple'],
    [new RegExp(`^/pair/${SIDE}/${SIDE}$`), 'pair'],
    [/^\/duo$/, 'duo'],
    [/^\/i\/([0-9-]{9,18})$/, 'invite'],
    [/^\/test$/, 'test'],
    [/^\/result$/, 'result'],
    [/^\/r\/([0-9-]{9,18})$/, 'shared'],
    [/^\/library$/, 'library'],
    [/^\/types$/, 'types'],
    [/^\/types\/([a-z]{3,4})$/, 'type'],
    [/^\/quadras$/, 'quadras'],
    [/^\/relations$/, 'relations'],
    [/^\/relations\/([a-z]{3,4})\/([a-z]{3,4})$/, 'pair'],
    [/^\/box(?:\/([a-z]{3,4}))?$/, 'box'],
    [/^\/about$/, 'about']
  ];
  const NAV = {
    couple: 'pair', pair: 'pair', duo: 'pair', invite: 'pair',
    test: 'test', result: 'test', shared: 'test',
    library: 'library', types: 'library', type: 'library', quadras: 'library', relations: 'library', box: 'library',
    about: 'about'
  };

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
    return { name: 'notfound', params: [], anchor: null };
  }

  let cleanup = null, lastPath = null, pendingFocus = null;
  const app = () => document.getElementById('app');

  // Перерисовка «на месте» (тема, «глазами партнёра», имя, открытие разбора) не должна терять фокус:
  // запоминаем, на каком элементе он стоял, по его data-атрибуту и ставим на такой же в новой разметке.
  // Части экрана, которые дорисовываются позже (разбор пары), зовут restoreFocus сами
  const focusKey = el => {
    if (!el || el === document.body || !app().contains(el) || el === app()) return null;
    const name = el.getAttributeNames().find(n => n.startsWith('data-'));
    if (!name) return null;
    const v = el.getAttribute(name);
    return v ? `[${name}="${v.replace(/["\\]/g, '\\$&')}"]` : `[${name}]`;
  };
  const restoreFocus = scope => {
    if (!pendingFocus) return false;
    const el = (scope || app()).querySelector(pendingFocus);
    if (!el) return false;
    el.focus({ preventScroll: true });
    pendingFocus = null;
    return true;
  };

  // ---------- тексты по требованию ----------
  // Главной, тесту и «Совместимости» тексты библиотеки не нужны: они грузятся только там, где их читают
  // (view.needs). Порядок наборов важен: факты собираются из уже загруженных типов и отношений.
  // В однофайловой сборке всё встроено — READY сразу говорит «на месте», и ничего не грузится
  const PACKS = {
    types: ['js/content/types-alpha.js', 'js/content/types-beta.js', 'js/content/types-gamma.js', 'js/content/types-delta.js'],
    relations: ['js/content/relations.js'],
    functions: ['js/content/functions.js'],
    modelA: ['js/content/modelA-alpha.js', 'js/content/modelA-beta.js', 'js/content/modelA-gamma.js', 'js/content/modelA-delta.js'],
    celebs: ['js/content/celebs.js'],
    facts: ['js/content/facts.js']
  };
  const C = () => S.content || {};
  const READY = {
    types: () => Boolean(C().types && S.data.types.every(t => C().types[t.id])),
    relations: () => Boolean(C().relations && Object.keys(C().relations).length),
    functions: () => Boolean(C().positions),
    modelA: () => Boolean(C().modelA && S.data.types.every(t => C().modelA[t.id])),
    celebs: () => Boolean(C().celebs),
    facts: () => Boolean(S.facts)
  };
  const PACK_ORDER = ['types', 'relations', 'functions', 'modelA', 'celebs', 'facts'];
  const missingFor = view => PACK_ORDER.filter(n => (view.needs || []).includes(n) && !READY[n]());

  // Пока тексты едут — скелет той же ширины; если не доехали — честное сообщение и кнопка «Обновить»
  function showLoading() {
    const el = app();
    if (el.querySelector('.page-loading')) return;
    if (cleanup) { try { cleanup(); } catch (e) { /* уже убрано */ } cleanup = null; }
    el.innerHTML = `<section class="sec page-loading" aria-busy="true"><div class="wrap"><p class="sr" aria-live="polite">Загружаем…</p>
      <div class="sk sk-title"></div><div class="sk sk-line"></div><div class="sk sk-line"></div><div class="sk sk-line sk-short"></div></div></section>`;
    document.body.setAttribute('data-view', 'loading');
  }
  function showLoadError() {
    app().innerHTML = `<section class="sec page-head"><div class="wrap center narrow">
      <h1 class="title">Не получилось загрузить страницу.</h1>
      <p class="lead">Похоже, связь пропала на полпути. Проверь интернет и обнови страницу — ответы и результат на месте.</p>
      <p><button class="btn btn-lg" type="button" onclick="location.reload()">Обновить</button></p></div></section>`;
  }

  function render({ instant = false, keepScroll = false } = {}) {
    const r = parse(), view = S.views[r.name];
    const missing = missingFor(view);
    if (missing.length) {
      showLoading();
      S.lazy(missing.flatMap(n => PACKS[n])).then(() => { lastPath = null; render({ instant: true, keepScroll }); }, showLoadError);
      return;
    }
    const path = location.hash.split('#').slice(0, 2).join('#');
    const samePage = path === lastPath && r.anchor;
    lastPath = path;
    if (samePage) { scrollToAnchor(r.anchor, true); return; }
    const y = scrollY;
    pendingFocus = keepScroll ? focusKey(document.activeElement) : null;
    const update = () => {
      if (cleanup) { try { cleanup(); } catch (e) { /* уже убрано */ } cleanup = null; }
      const el = app();
      el.innerHTML = view.render(...r.params);
      document.title = (view.title ? view.title(...r.params) + ' · ' : '') + 'Socio-Nik';
      document.body.setAttribute('data-view', r.name);
      // quiet: экран тот же, поменялось состояние — входные анимации не повторяем, всё сразу на месте
      el.classList.toggle('quiet', keepScroll);
      S.app.quiet = keepScroll;
      if (keepScroll) {
        scrollTo(0, y);
        el.querySelectorAll('.reveal').forEach(S.fx.show);
      } else if (!r.anchor) {
        scrollTo(0, 0);
      }
      const c1 = view.mount ? view.mount(el, ...r.params) : null;
      const c2 = S.fx.mountAll(el);
      cleanup = () => { if (c1) c1(); if (c2) c2(); };
      document.querySelectorAll('.nav-links a').forEach(a => a.classList.toggle('on', a.dataset.nav === NAV[r.name]));
      closeMenu();
      if (r.anchor) scrollToAnchor(r.anchor, false);
      if (keepScroll) restoreFocus(el);
      else if (!instant) el.focus({ preventScroll: true });
    };
    if (instant) update(); else S.fx.transition(update);
  }

  function scrollToAnchor(id, smooth) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: smooth && !S.dom.reducedMotion() ? 'smooth' : 'auto', block: 'start' });
  }

  // ---------- навигация ----------
  // Меню на телефоне закрывает экран целиком: пока оно открыто, контент под ним недоступен (inert),
  // фокус — на первом пункте, Esc закрывает и возвращает фокус на кнопку меню
  const overlayMenu = () => Boolean(root.matchMedia && root.matchMedia('(max-width: 834px)').matches);
  function setMenu(open, { focus = true } = {}) {
    const nav = document.querySelector('.nav'), b = document.querySelector('[data-menu]');
    if (!nav || !b) return;
    const was = nav.classList.contains('open');
    nav.classList.toggle('open', open);
    b.setAttribute('aria-expanded', String(open));
    const cover = open && overlayMenu();
    [app(), document.querySelector('.footer')].forEach(el => { if (el) el.inert = cover; });
    if (!focus) return;
    if (open) { const first = nav.querySelector('.nav-links a'); if (first) first.focus(); }
    else if (was && nav.contains(document.activeElement)) b.focus();
  }
  function closeMenu() { setMenu(false, { focus: false }); }

  function toggleTheme(btn) {
    const next = S.theme.resolved() === 'dark' ? 'light' : 'dark';
    S.store.set('theme', next);
    const r = btn.getBoundingClientRect();
    S.fx.transition(() => {
      S.theme.apply();
      render({ instant: true, keepScroll: true });
    }, { theme: true, x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }

  function init() {
    const q = new URLSearchParams(location.search);
    if (q.get('demo')) S.state.demo = demoAxes(q.get('demo'));
    S.theme.apply();
    document.documentElement.classList.add('js');

    document.querySelector('[data-theme-toggle]').addEventListener('click', e => toggleTheme(e.currentTarget));
    document.querySelector('[data-menu]').addEventListener('click', () => setMenu(!document.querySelector('.nav').classList.contains('open')));
    addEventListener('keydown', e => { if (e.key === 'Escape' && document.querySelector('.nav.open')) setMenu(false); });
    // «К содержимому» — сразу к первому экрану, без смены адреса: хеш здесь занят роутером, а #app — не страница
    const skip = document.querySelector('.skip');
    if (skip) skip.addEventListener('click', e => { e.preventDefault(); app().focus(); });
    if (root.matchMedia) {
      root.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (S.theme.preferred() === 'auto') { S.theme.apply(); render({ instant: true, keepScroll: true }); }
      });
    }
    // Фокус переносим программно только тем, кто пользуется клавиатурой, — мышь и палец не видят лишних рамок
    addEventListener('keydown', e => { if (e.key === 'Tab' || e.key.startsWith('Arrow') || /^[1-5]$/.test(e.key)) document.documentElement.classList.add('kbd'); }, true);
    addEventListener('pointerdown', () => document.documentElement.classList.remove('kbd'), true);
    addEventListener('hashchange', () => render());
    addEventListener('scroll', () => document.body.classList.toggle('scrolled', scrollY > 8), { passive: true });
    render({ instant: true });
  }

  // ---------- отладочный хук ----------
  S.debug = {
    state: () => ({ route: parse(), result: S.state.result(), test: S.store.get('test', null) }),
    demo(typeId) { S.state.demo = demoAxes(typeId); render({ instant: true }); return S.state.demo; },
    answerAll(typeId) { const axes = demoAxes(typeId); S.state.saveResult(axes); location.hash = '#/result'; return axes; },
    axesOf: typeId => demoAxes(typeId),
    render: opts => render(opts)
  };

  S.app = { render, restoreFocus, quiet: false };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
