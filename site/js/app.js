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
    return { name: 'notfound', params: [], anchor: null };
  }

  let cleanup = null, lastPath = null;
  const app = () => document.getElementById('app');

  function render({ instant = false, keepScroll = false } = {}) {
    const r = parse(), view = S.views[r.name];
    const path = location.hash.split('#').slice(0, 2).join('#');
    const samePage = path === lastPath && r.anchor;
    lastPath = path;
    if (samePage) { scrollToAnchor(r.anchor, true); return; }
    const y = scrollY;
    const update = () => {
      if (cleanup) { try { cleanup(); } catch (e) { /* уже убрано */ } cleanup = null; }
      const el = app();
      el.innerHTML = view.render(...r.params);
      document.title = (view.title ? view.title(...r.params) + ' · ' : '') + 'Socio-Nik';
      document.body.setAttribute('data-view', r.name);
      if (keepScroll) {
        scrollTo(0, y);
        el.querySelectorAll('.reveal').forEach(S.fx.show);
      } else if (!r.anchor) {
        scrollTo(0, 0);
      }
      const c1 = view.mount ? view.mount(el, ...r.params) : null;
      const c2 = S.fx.mountAll(el);
      cleanup = () => { if (c1) c1(); if (c2) c2(); };
      document.querySelectorAll('.nav-links a, .menu a').forEach(a => {
        const on = a.dataset.nav === NAV[r.name];
        a.classList.toggle('on', on);
        if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      closeMenu();
      if (r.anchor) scrollToAnchor(r.anchor, false);
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
      ['result', 'test', 'hero', 'box.seen'].forEach(k => S.store.del(k));
      try { sessionStorage.removeItem('socio.friend'); } catch (e) { /* нет доступа */ }
      try { history.replaceState(null, '', location.pathname + (location.hash || '#/')); } catch (e) { /* file:// без history */ }
    }
    S.theme.apply();
    document.documentElement.classList.add('js');

    document.querySelector('[data-menu]').addEventListener('click', () => setMenu(!document.documentElement.classList.contains('menu-open')));
    addEventListener('keydown', e => { if (e.key === 'Escape' && document.documentElement.classList.contains('menu-open')) { closeMenu(); document.querySelector('[data-menu]').focus(); } });
    addEventListener('resize', () => { if (innerWidth >= 960) closeMenu(); });
    S.fx.fitAll(document.querySelector('.footer'));
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
    render: opts => render(opts)
  };

  S.app = { render };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
